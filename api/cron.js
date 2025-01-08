/* global process */
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";

dotenv.config();

const execAsync = promisify(exec);

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION, // e.g., "us-east-1"
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendNotificationEmail(oldEndDate, newEndDate) {
  const params = {
    Source: process.env.AWS_SES_SENDER_EMAIL,
    Destination: {
      ToAddresses: ["james@jameslamming.com"],
    },
    Message: {
      Subject: {
        Data: "Visakanv tweet analyser - Data Update Notification",
      },
      Body: {
        Html: {
          Data: `
            <h2>Visakanv tweet analyser - Data Update Notification</h2>
            <p>Tweet data has been updated. Check it worked correctly</p>
            <p><strong>Old End Date:</strong> ${oldEndDate}</p>
            <p><strong>New End Date:</strong> ${newEndDate}</p>
          `,
        },
        Text: {
          Data: `Data has been updated!\nOld End Date: ${oldEndDate}\nNew End Date: ${newEndDate}`,
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    console.log("Email notification sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

const supabase = createClient(
  "https://fabxmporizzqflnftavs.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8"
);

export async function handler(req, res) {
  // Verify the request is from Vercel Cron
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: "Unauthorized" });
  // }

  try {
    // Get the latest archive upload data from Supabase
    const { data: archiveData, error } = await supabase
      .from("archive_upload")
      .select("*")
      .eq("account_id", "16884623")
      .order("archive_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    // Read the current upload.json file
    const uploadJson = JSON.parse(await fs.readFile("upload.json", "utf-8"));
    const currentEndDate = new Date(uploadJson[0].endDate);
    const newEndDate = new Date(archiveData[0].archive_at);

    await sendNotificationEmail(currentEndDate, newEndDate);

    // Check if the end dates are different
    if (newEndDate > currentEndDate) {
      try {
        const lockFile = "/tmp/process_all.lock";
        await fs.writeFile(lockFile, Date.now().toString());

        await execAsync("npm run process-data");

        await fs.unlink(lockFile);
        await sendNotificationEmail(currentEndDate, newEndDate);

        return res.status(200).json({
          message: "Data updated and processing completed",
          oldEndDate: currentEndDate,
          newEndDate: newEndDate,
        });
      } catch (processError) {
        console.error("Processing error:", processError);
        try {
          await fs.unlink("/tmp/process_all.lock");
        } catch {
          // Ignore if file doesn't exist
        }
        throw processError;
      }
    }

    return res.status(200).json({
      message: "No updates needed",
      currentEndDate,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
