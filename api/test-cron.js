import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";

const supabase = createClient(
  "https://fabxmporizzqflnftavs.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8"
);

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

    console.log(currentEndDate);

    // Check if the end dates are different
    if (newEndDate > currentEndDate) {
      console.log(archiveData);
      // Read current upload.json
      const uploadJson = JSON.parse(await fs.readFile("upload.json", "utf-8"));

      console.log("Current end date:", uploadJson[0].endDate);
      console.log("Latest archive date:", archiveData[0].archive_at);
      console.log(
        "Would update?",
        new Date(archiveData[0].end_date) > new Date(uploadJson[0].endDate)
      );
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testCronLogic();
