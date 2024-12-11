/* global process */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
dotenv.config();

const supabase = createClient(
  "https://fabxmporizzqflnftavs.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8"
);

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
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

async function testCronLogic() {
  try {
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

    // Check if the end dates are different
    if (newEndDate > currentEndDate) {
      console.log(archiveData);
      console.log("Current end date:", uploadJson[0].endDate);
      console.log("Latest archive date:", archiveData[0].archive_at);
      console.log(
        "Would update?",
        new Date(archiveData[0].end_date) > new Date(uploadJson[0].endDate)
      );

      // Send email notification
      await sendNotificationEmail(currentEndDate, newEndDate);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testCronLogic();
