/**
 * Auto-Lock Periods Cron API
 *
 * This endpoint is called by an external cron service (Vercel Cron, GitHub Actions)
 * to automatically lock periods that have passed their deadline.
 *
 * It also updates periods approaching their deadline to 'closing' status.
 *
 * Security: Protected by CRON_SECRET environment variable.
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/auto-lock-periods",
 *     "schedule": "0 0 * * *"  // Daily at midnight UTC
 *   }]
 * }
 */

import { NextResponse } from "next/server";
import { processAutoLocks } from "@/lib/actions/academic-period";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if no secret is set (development) or if secret matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[Auto-Lock] Unauthorized request - invalid CRON_SECRET");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("[Auto-Lock] Starting auto-lock process...");

  try {
    const result = await processAutoLocks();

    console.log("[Auto-Lock] Process completed:", {
      processed: result.processed,
      locked: result.locked.length,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        processed: result.processed,
        locked: result.locked.length,
        errors: result.errors.length,
        lockedIds: result.locked,
        errorMessages: result.errors,
      },
    });
  } catch (error) {
    console.error("[Auto-Lock] Process failed:", error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST method for manual triggering (Admin only)
export async function POST(request: Request) {
  // This can be called manually by an admin
  // In production, you'd add auth check here

  console.log("[Auto-Lock] Manual trigger started...");

  try {
    const result = await processAutoLocks();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        processed: result.processed,
        locked: result.locked.length,
        errors: result.errors.length,
        lockedIds: result.locked,
        errorMessages: result.errors,
      },
    });
  } catch (error) {
    console.error("[Auto-Lock] Manual trigger failed:", error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
