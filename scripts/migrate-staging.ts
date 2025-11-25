import fs from "fs";
import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";

// Load staging environment variables
dotenv.config({ path: ".env.staging" });

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing in .env.staging");
    process.exit(1);
  }

  console.log(`🔌 Connecting to database...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
  });

  try {
    await client.connect();
    console.log("✅ Connected successfully.");

    // Get all SQL files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Ensure alphabetical order

    console.log(`📂 Found ${files.length} migration files.`);

    // Check if we need to apply baseline schema
    const { rows: tableRows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'classes'
      );
    `);

    const hasBaseline = tableRows[0].exists;

    if (!hasBaseline) {
      console.log(
        "⚠️  Baseline schema not found. Applying 001_initial_schema.sql..."
      );
      const baselinePath = path.join(
        process.cwd(),
        "db",
        "schemas",
        "001_initial_schema.sql"
      );

      if (fs.existsSync(baselinePath)) {
        const baselineSql = fs.readFileSync(baselinePath, "utf-8");
        try {
          await client.query("BEGIN");
          await client.query(baselineSql);
          // Mark 001 as applied if it exists in migrations folder, or just proceed
          // If 001 is NOT in migrations folder, we are good.
          // If it IS, we should mark it.
          // Based on file list, 001 is NOT in db/migrations.
          await client.query("COMMIT");
          console.log("✅ Baseline schema applied successfully.");
        } catch (err) {
          await client.query("ROLLBACK");
          console.error("❌ Failed to apply baseline schema:", err);
          process.exit(1);
        }
      } else {
        console.error("❌ Baseline schema file not found at:", baselinePath);
        process.exit(1);
      }
    }

    // Create migrations table if not exists (idempotent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const { rows: appliedRows } = await client.query(
      "SELECT name FROM _migrations"
    );
    const appliedMigrations = new Set(appliedRows.map((row) => row.name));

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`▶️  Applying ${file}...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log(`✅ Applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ Failed to apply ${file}:`, err);
        process.exit(1);
      }
    }

    console.log("🎉 All migrations applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
