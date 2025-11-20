import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let client: Client | null = null;

  try {
    // 1. Check for DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // 2. Connect to database directly
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });

    await client.connect();

    // 3. Execute SQL to fix the schema
    // We drop the 'track' column (which has wrong type 'course_type')
    // and re-add it with correct type 'track_type'
    const sql = `
      DO $$
      BEGIN
          -- Drop column if it exists (ignore errors if it doesn't)
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'track') THEN
              ALTER TABLE users DROP COLUMN track;
          END IF;
          
          -- Add column with correct type
          ALTER TABLE users ADD COLUMN track track_type;
      END$$;
    `;

    await client.query(sql);

    return NextResponse.json({
      success: true,
      message:
        "Schema fixed successfully: users.track column recreated with track_type",
    });
  } catch (error: any) {
    console.error("Schema fix failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end();
    }
  }
}
