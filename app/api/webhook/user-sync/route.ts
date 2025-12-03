/**
 * Webhook Receiver Endpoint
 * Info Hub → LMS User Synchronization
 *
 * Handles user.created and user.updated events
 * Uses HMAC-SHA256 signature verification (X-Webhook-Signature header)
 *
 * @version 1.1.0
 * @date 2025-11-19
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSSOConfig } from "@/lib/config/sso";
import {
  WebhookPayload,
  WebhookResponse,
  InfoHubUser,
  WebhookEventType,
} from "@/types/sso";
import { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["user_role"];
type CourseType = Database["public"]["Enums"]["course_type"];

/**
 * 驗證 Webhook 簽章
 * 使用 HMAC-SHA256 + timing-safe comparison 防止 timing attacks
 *
 * Info Hub 發送格式: X-Webhook-Signature: <HMAC-SHA256-hex>
 *
 * @param request - Incoming request
 * @param body - Request body (JSON string)
 * @returns true if signature is valid
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const receivedSignature = request.headers.get("x-webhook-signature");
  const config = getSSOConfig();

  if (!receivedSignature) {
    console.error("[Webhook] Missing X-Webhook-Signature header");
    return false;
  }

  // Compute HMAC-SHA256 signature using Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(config.webhookSecret);
  const messageData = encoder.encode(body);

  // Import secret as HMAC key
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Compute signature
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);

  // Convert to hex string
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  if (receivedSignature.length !== expectedSignature.length) {
    return false;
  }

  let isValid = true;
  for (let i = 0; i < receivedSignature.length; i++) {
    if (receivedSignature.charCodeAt(i) !== expectedSignature.charCodeAt(i)) {
      isValid = false;
    }
  }

  return isValid;
}

/**
 * Info Hub 角色對應到 LMS 角色
 *
 * @param infohubRole - Info Hub role
 * @returns LMS role
 */
/**
 * Map Info Hub role to LMS role
 *
 * Info Hub Roles → LMS Roles:
 * - admin → admin (full system access)
 * - office_member → office_member (read-only access to all grades)
 * - head → head (grade + course type management)
 * - teacher → teacher (own classes only)
 * - viewer → DENIED (no access)
 */
function mapRole(infohubRole: string): UserRole {
  switch (infohubRole) {
    case "admin":
      return "admin";
    case "office_member":
      return "office_member"; // Read-only access to all grades
    case "head":
      return "head";
    case "teacher":
      return "teacher";
    default:
      throw new Error(`Unsupported Info Hub role: ${infohubRole}`);
  }
}

/**
 * 建立或更新 Supabase 使用者
 *
 * @param user - Info Hub user data
 * @param eventType - Event type (created/updated)
 * @returns User ID in Supabase
 */
async function syncUserToSupabase(
  user: InfoHubUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _eventType: WebhookEventType // Prefixed with _ to indicate intentionally unused
): Promise<string> {
  const supabase = createServiceRoleClient();

  // Reject viewer role
  if (user.role === "viewer") {
    throw new Error("Viewer role is not allowed in LMS");
  }

  // Map Info Hub role to LMS role
  const lmsRole = mapRole(user.role);

  // Map teacher_type to course_type if applicable
  let courseType: CourseType | null = null;
  if (user.track) {
    courseType = user.track as CourseType;
  } else if (user.teacher_type) {
    // Fallback for backward compatibility
    courseType = user.teacher_type as CourseType;
  }

  // Grade band for head teachers (Migration 023)
  const gradeBand = user.grade_band || (user.grade ? String(user.grade) : null);

  // First, get or create Auth user to get the canonical ID
  let authUserId = "";

  // Check if auth user already exists by listing users with pagination
  // (default listUsers has a limit, so we need to paginate to find all users)
  let existingAuthUser: { id: string; email?: string } | null | undefined = null;
  let page = 1;
  const perPage = 1000;

  while (!existingAuthUser) {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (listError) {
      console.error("[Webhook] Error listing users:", listError);
      break;
    }

    existingAuthUser = usersData?.users.find(
      (u) => u.email?.toLowerCase() === user.email.toLowerCase()
    );

    // If found, or if we've exhausted all users, break
    if (existingAuthUser || !usersData?.users || usersData.users.length < perPage) {
      break;
    }

    page++;
    // Safety limit to prevent infinite loop
    if (page > 10) {
      console.warn("[Webhook] Reached page limit while searching for user");
      break;
    }
  }

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
    console.log(`[Webhook] Found existing Auth user: ${authUserId}`);

    // Update auth user metadata (including full_name from Google/Info Hub)
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      authUserId,
      {
        user_metadata: {
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          infohub_user_id: user.infohub_user_id,
        },
      }
    );

    if (updateAuthError) {
      console.warn("[Webhook] Failed to update auth user metadata:", updateAuthError);
      // Non-fatal - continue with the sync
    } else {
      console.log(`[Webhook] Updated auth user metadata for: ${user.email}`);
    }
  } else {
    // Create new auth user
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        infohub_user_id: user.infohub_user_id,
      },
    });

    if (authError) {
      // Handle race condition: another process may have created the user
      if (authError.code === 'email_exists') {
        console.log("[Webhook] Race condition detected, retrying user lookup...");
        // Retry lookup
        const { data: retryData } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const retryUser = retryData?.users.find(
          (u) => u.email?.toLowerCase() === user.email.toLowerCase()
        );
        if (retryUser) {
          authUserId = retryUser.id;
          console.log(`[Webhook] Found user on retry: ${authUserId}`);
        } else {
          throw new Error(`User exists but cannot be found: ${user.email}`);
        }
      } else {
        console.error("[Webhook] Failed to create auth user:", authError);
        throw authError;
      }
    } else if (newAuthUser?.user) {
      authUserId = newAuthUser.user.id;
      console.log(`[Webhook] Created new Auth user: ${authUserId}`);
    } else {
      throw new Error("Failed to create auth user: no user returned");
    }
  }

  // Check if user exists in public.users table
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email)
    .single();

  if (existingUser) {
    // User exists - check if ID matches Auth user ID
    if (existingUser.id !== authUserId) {
      // ID mismatch! Need to delete old row and create new one with correct ID
      console.warn(`[Webhook] ID mismatch detected! public.users.id=${existingUser.id}, auth.id=${authUserId}`);
      console.log("[Webhook] Deleting old user row and creating new one with correct ID...");

      // Delete old row
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", existingUser.id);

      if (deleteError) {
        console.error("[Webhook] Failed to delete old user row:", deleteError);
        throw deleteError;
      }

      // Create new row with correct ID
      const { error: insertError } = await supabase.from("users").insert({
        id: authUserId,
        email: user.email,
        full_name: user.full_name,
        role: lmsRole,
        teacher_type: courseType,
        grade_band: gradeBand,
        grade: user.grade,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("[Webhook] Failed to create user with correct ID:", insertError);
        throw insertError;
      }

      console.log(`[Webhook] Recreated user with correct ID: ${user.email} (${authUserId})`);
      return authUserId;
    }

    // ID matches - just update existing user
    const { error: updateError } = await supabase
      .from("users")
      .update({
        full_name: user.full_name,
        role: lmsRole,
        teacher_type: courseType,
        grade_band: gradeBand,
        grade: user.grade,
      })
      .eq("id", existingUser.id);

    if (updateError) {
      console.error("[Webhook] Failed to update user:", updateError);
      throw updateError;
    }

    console.log(`[Webhook] Updated user: ${user.email} (${existingUser.id})`);
    return existingUser.id;
  }

  // No existing user in public.users - create new row with Auth user ID
  const { error: userError } = await supabase.from("users").insert({
    id: authUserId,
    email: user.email,
    full_name: user.full_name,
    role: lmsRole,
    teacher_type: courseType,
    grade_band: gradeBand,
    grade: user.grade,
    created_at: new Date().toISOString(),
  });

  if (userError) {
    console.error("[Webhook] Failed to create public user:", userError);
    throw userError;
  }

  console.log(`[Webhook] Created user: ${user.email} (${authUserId})`);
  return authUserId;
}

/**
 * POST /api/webhook/user-sync
 * 處理 Info Hub 的使用者同步 Webhook
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const bodyText = await request.text();
    let payload: WebhookPayload;

    try {
      payload = JSON.parse(bodyText) as WebhookPayload;
    } catch (error) {
      console.error("[Webhook] Invalid JSON payload:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON payload",
          timestamp: new Date().toISOString(),
        } satisfies WebhookResponse,
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(request, bodyText);
    if (!isValidSignature) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook signature",
          timestamp: new Date().toISOString(),
        } satisfies WebhookResponse,
        { status: 401 }
      );
    }

    // 3. Validate event type
    // Info Hub only sends user.created and user.updated events
    const validEvents: WebhookEventType[] = ["user.created", "user.updated"];
    if (!validEvents.includes(payload.event)) {
      console.error("[Webhook] Invalid event type:", payload.event);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid event type: ${payload.event}`,
          timestamp: new Date().toISOString(),
        } satisfies WebhookResponse,
        { status: 400 }
      );
    }

    // 4. Handle event
    let userId: string;

    switch (payload.event) {
      case "user.created":
      case "user.updated":
        userId = await syncUserToSupabase(payload.user, payload.event);
        break;

      default:
        throw new Error(`Unsupported event type: ${payload.event}`);
    }

    // 5. Return success response
    const response: WebhookResponse = {
      success: true,
      lms_user_id: userId,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[Webhook] Successfully processed ${payload.event} for ${payload.user.email}`
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    const response: WebhookResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/webhook/user-sync
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "LMS Webhook receiver is running",
    timestamp: new Date().toISOString(),
  });
}
