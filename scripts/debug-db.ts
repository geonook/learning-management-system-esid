import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.staging
dotenv.config({ path: path.resolve(process.cwd(), ".env.staging") });

async function debugDB() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // List all policies
    console.log("\n=== POLICIES ===");
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    policies.rows.forEach((r) => {
      console.log(`${r.tablename}: "${r.policyname}"`);
    });

    // List all functions in public and auth
    console.log("\n=== FUNCTIONS ===");
    const functions = await client.query(`
      SELECT n.nspname, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname IN ('public', 'auth')
      AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade')
      ORDER BY n.nspname, p.proname;
    `);
    functions.rows.forEach((r) => {
      console.log(`${r.nspname}.${r.proname}`);
    });

    // Check dependencies for is_office_member
    console.log("\n=== DEPENDENCIES for is_office_member ===");
    // This is complex query, skipping for now, relying on policy names.
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

debugDB();
