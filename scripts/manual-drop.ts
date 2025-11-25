import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.staging
dotenv.config({ path: path.resolve(process.cwd(), ".env.staging") });

async function manualDrop() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const tables = [
      "classes",
      "courses",
      "students",
      "student_courses",
      "exams",
      "scores",
      "assessment_titles",
      "assessment_codes",
    ];

    for (const table of tables) {
      console.log(`Dropping policies on ${table}...`);
      // Drop with underscores
      await client.query(
        `DROP POLICY IF EXISTS "office_member_read_${table}" ON ${table}`
      );
      // Drop with spaces
      await client.query(
        `DROP POLICY IF EXISTS "office_member read ${table}" ON ${table}`
      );
    }

    console.log("✅ Dropped all policies successfully");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

manualDrop();
