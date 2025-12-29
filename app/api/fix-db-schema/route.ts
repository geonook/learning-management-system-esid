import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // Security: Require CRON_SECRET for dangerous operations
  const authHeader = _request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid CRON_SECRET required' },
      { status: 401 }
    )
  }

  try {
    // 1. Check for required environment variables
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error("Supabase credentials not configured");
    }

    // 2. Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Execute SQL to fix the schema
    // We drop the 'track' column (which has wrong type 'course_type')
    // and re-add it with correct type 'track_type'
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        DO $$
        BEGIN
            -- Drop column if it exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'track') THEN
                ALTER TABLE users DROP COLUMN track;
            END IF;
            
            -- Add column with correct type
            ALTER TABLE users ADD COLUMN track track_type;
        END$$;
      `,
    });

    if (error) {
      // If exec_sql RPC doesn't exist, we need to create it first
      if (
        error.message?.includes("function") &&
        error.message?.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "exec_sql function not available",
            message: "Please run the SQL manually in Supabase SQL Editor",
            sql: `
-- Run this in Supabase SQL Editor:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'track') THEN
        ALTER TABLE users DROP COLUMN track;
    END IF;
    ALTER TABLE users ADD COLUMN track track_type;
END$$;
          `,
          },
          { status: 500 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message:
        "Schema fixed successfully: users.track column recreated with track_type",
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Schema fix failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details || error.hint || "No additional details",
        sql: `
-- Run this in Supabase SQL Editor:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'track') THEN
        ALTER TABLE users DROP COLUMN track;
    END IF;
    ALTER TABLE users ADD COLUMN track track_type;
END$$;
      `,
      },
      { status: 500 }
    );
  }
}
