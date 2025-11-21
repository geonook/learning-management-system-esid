import fs from "fs";
import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });

async function applyHotfix() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing.");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to PRODUCTION database...");
    await client.connect();
    console.log("✅ Connected.");

    const hotfixPath = path.join(
      process.cwd(),
      "db",
      "migrations",
      "production_hotfix_20251121.sql"
    );
    const sql = fs.readFileSync(hotfixPath, "utf8");

    console.log("Applying hotfix...");
    await client.query(sql);
    console.log("✅ Hotfix applied successfully!");
  } catch (err) {
    console.error("❌ Hotfix failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyHotfix();
