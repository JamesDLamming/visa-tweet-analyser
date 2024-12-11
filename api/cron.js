/* global process */
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const supabase = createClient(
  "https://fabxmporizzqflnftavs.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8"
);

export default async function handler(req, res) {
  // Verify the request is from Vercel Cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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

    // Check if the end dates are different
    if (newEndDate > currentEndDate) {
      // Run the processing script
      await execAsync("python3 process_all.py");

      return res.status(200).json({
        message: "Data updated and processing completed",
        oldEndDate: currentEndDate,
        newEndDate: newEndDate,
      });
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
