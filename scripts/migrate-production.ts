import fs from "fs";
import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";

// Load production environment variables
// We try to load .env.production first, but also respect existing env vars (e.g. from CI/CD)
dotenv.config({ path: ".env.production" });

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "❌ DATABASE_URL is missing. Please ensure it is set in .env.production or as an environment variable."
    );
    process.exit(1);
  }

  console.log(`Connecting to PRODUCTION database...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
  });

  try {
    await client.connect();
    console.log("✅ Connected successfully to PRODUCTION.");

    // Get all SQL files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Ensure alphabetical order

    console.log(`Found ${files.length} migration files.`);

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
        const baselineSql = fs.readFileSync(baselinePath, "utf8");
        await client.query(baselineSql);
        console.log("✅ Baseline schema applied.");
      } else {
        console.error("❌ Baseline schema file not found!");
        process.exit(1);
      }
    }

    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const { rows: appliedRows } = await client.query(
      "SELECT name FROM migrations"
    );
    const appliedMigrations = new Set(appliedRows.map((row) => row.name));

    // Apply new migrations
    for (const file of files) {
      if (!appliedMigrations.has(file)) {
        console.log(`Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

        try {
          await client.query("BEGIN");
          await client.query(sql);
          await client.query("INSERT INTO migrations (name) VALUES ($1)", [
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
    }

    console.log("🎉 All migrations applied successfully to PRODUCTION.");
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
