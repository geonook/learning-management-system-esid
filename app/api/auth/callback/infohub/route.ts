/**
 * OAuth Callback Handler
 * Info Hub → LMS OAuth 2.0 + PKCE Callback
 *
 * Handles authorization code exchange and session creation
 *
 * @version 1.0.0
 * @date 2025-11-13
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSSOConfig, getOAuthCallbackUrl } from "@/lib/config/sso";
import { buildRedirectUrl } from "@/lib/utils/url";
import {
  OAuthTokenRequest,
  OAuthTokenResponse,
  SSOCallbackParams,
  CreateSupabaseUserParams,
} from "@/types/sso";
import { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["user_role"];
type CourseType = Database["public"]["Enums"]["course_type"];

/**
 * Exchange authorization code for user data
 *
 * @param code - Authorization code from callback
 * @param codeVerifier - PKCE code verifier
 * @returns User data from Info Hub
 */
async function exchangeToken(
  code: string,
  codeVerifier: string
): Promise<OAuthTokenResponse> {
  const config = getSSOConfig();

  const tokenRequest: OAuthTokenRequest = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: getOAuthCallbackUrl(), // Use unified helper function
  };

  console.log("[OAuth/exchangeToken] Request to:", config.tokenUrl);
  console.log("[OAuth/exchangeToken] Redirect URI:", tokenRequest.redirect_uri);
  console.log("[OAuth/exchangeToken] Code length:", code.length);
  console.log("[OAuth/exchangeToken] Verifier length:", codeVerifier.length);

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tokenRequest),
  });

  console.log("[OAuth/exchangeToken] Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OAuth/exchangeToken] Failed with status:", response.status);
    console.error("[OAuth/exchangeToken] Error body:", errorText);
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const tokenData = (await response.json()) as OAuthTokenResponse;

  console.log(
    "[OAuth/exchangeToken] Success! User email:",
    tokenData.user.email
  );
  console.log("[OAuth/exchangeToken] User role:", tokenData.user.role);
  console.log(
    "[OAuth/exchangeToken] Webhook success:",
    tokenData.webhook_status.success
  );

  return tokenData;
}

/**
 * Map Info Hub role to LMS role
 *
 * Info Hub Roles → LMS Roles:
 * - admin → admin (full system access)
 * - office_member → office_member (read-only access to all grades)
 * - head → head (grade + course type management)
 * - teacher → teacher (own classes only)
 * - viewer → DENIED (no access)
 *
 * @param infohubRole - Info Hub role
 * @returns LMS role
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
 * Create or update user in Supabase (compensatory sync)
 * Called if webhook failed or user doesn't exist
 *
 * @param params - User creation parameters
 * @returns User ID
 */
async function createOrUpdateUser(
  params: CreateSupabaseUserParams
): Promise<string> {
  const supabase = createServiceRoleClient();

  // First, get or create Auth user to get the canonical ID
  let authUserId = "";

  // Try to find existing user by listing users with pagination
  // Note: listUsers returns paginated results, we search through pages
  let existingAuthUser: { id: string; email?: string } | null | undefined = null;
  let page = 1;
  const perPage = 1000;

  while (!existingAuthUser) {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (listError) {
      console.error("[OAuth] Error listing users:", listError);
      break;
    }

    existingAuthUser = usersData?.users.find(
      (u) => u.email?.toLowerCase() === params.email.toLowerCase()
    );

    // If we found the user or there are no more pages, stop
    if (existingAuthUser || !usersData?.users || usersData.users.length < perPage) {
      break;
    }

    page++;
    // Safety limit to prevent infinite loop
    if (page > 10) {
      console.warn("[OAuth] Reached page limit while searching for user");
      break;
    }
  }

  if (existingAuthUser) {
    // User already exists in Auth
    authUserId = existingAuthUser.id;
    console.log(`[OAuth] Found existing Auth user: ${authUserId}`);
  } else {
    // User doesn't exist, create new one
    console.log(`[OAuth] Auth user not found, creating new one for: ${params.email}`);
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      email_confirm: true,
      user_metadata: {
        full_name: params.fullName,
        avatar_url: params.avatarUrl,
        infohub_user_id: params.infohubUserId,
      },
    });

    if (authError) {
      // Check if it's "already exists" error - handle race condition
      if (authError.code === 'email_exists') {
        console.log(`[OAuth] Race condition: user was created between check and create, retrying lookup...`);
        // Retry with fresh listUsers call
        const { data: retryData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const retryUser = retryData?.users.find(
          (u) => u.email?.toLowerCase() === params.email.toLowerCase()
        );
        if (retryUser) {
          authUserId = retryUser.id;
          console.log(`[OAuth] Found Auth user on retry: ${authUserId}`);
        } else {
          console.error("[OAuth] Still cannot find user after retry");
          throw authError;
        }
      } else {
        console.error("[OAuth] Failed to create auth user:", authError);
        throw authError;
      }
    } else if (newAuthUser?.user) {
      authUserId = newAuthUser.user.id;
      console.log(`[OAuth] Created new Auth user: ${authUserId}`);
    } else {
      throw new Error("No user returned from auth.createUser");
    }
  }

  // Check if user exists in public.users table
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", params.email)
    .single();

  if (existingUser) {
    // User exists - check if ID matches Auth user ID
    if (existingUser.id !== authUserId) {
      // ID mismatch! Need to delete old row and create new one with correct ID
      console.warn(`[OAuth] ID mismatch detected! public.users.id=${existingUser.id}, auth.id=${authUserId}`);
      console.log("[OAuth] Deleting old user row and creating new one with correct ID...");

      // Delete old row
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", existingUser.id);

      if (deleteError) {
        console.error("[OAuth] Failed to delete old user row:", deleteError);
        throw deleteError;
      }

      // Create new row with correct ID
      const { error: insertError } = await supabase.from("users").insert({
        id: authUserId,
        email: params.email,
        full_name: params.fullName,
        role: params.role,
        teacher_type: params.teacherType as CourseType | null,
        track: params.track,
        grade: params.grade || null,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("[OAuth] Failed to create user with correct ID:", insertError);
        throw insertError;
      }

      console.log(`[OAuth] Recreated user with correct ID: ${params.email} (${authUserId})`);
      return authUserId;
    }

    // ID matches - just update existing user
    const { error } = await supabase
      .from("users")
      .update({
        full_name: params.fullName,
        role: params.role,
        teacher_type: params.teacherType as CourseType | null,
        track: params.track,
        grade: params.grade || null,
      })
      .eq("id", existingUser.id);

    if (error) {
      console.error("[OAuth] Failed to update user:", error);
      throw error;
    }

    console.log(`[OAuth] Updated user via compensatory sync: ${params.email}`);
    return existingUser.id;
  }

  // No existing user in public.users - create new row with Auth user ID
  const { error: userError } = await supabase.from("users").insert({
    id: authUserId,
    email: params.email,
    full_name: params.fullName,
    role: params.role,
    teacher_type: params.teacherType as CourseType | null,
    track: params.track,
    grade: params.grade || null,
    created_at: new Date().toISOString(),
  });

  if (userError) {
    console.error("[OAuth] Failed to create public user:", userError);
    throw userError;
  }

  console.log(`[OAuth] Created user via compensatory sync: ${params.email} (${authUserId})`);
  return authUserId;
}

/**
 * Generate OTP link for client-side session setup
 *
 * NEW APPROACH (2025-11-18):
 * Instead of creating session server-side (which doesn't set browser cookies),
 * we generate a magic link OTP and redirect to client-side page to verify it.
 *
 * Flow:
 * 1. Server: Generate magic link OTP (hashed_token)
 * 2. Server: Redirect to /auth/set-session with token_hash
 * 3. Client: Verify OTP in browser context (sets cookies)
 * 4. Client: Redirect to dashboard
 *
 * @param email - User email
 * @returns URL with OTP hash for client-side verification
 */
async function createSupabaseSession(email: string): Promise<{
  url: string;
  error: Error | null;
}> {
  const supabase = createServiceRoleClient();

  try {
    // Generate magic link OTP for the user
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (error || !data) {
      console.error("[OAuth] Failed to generate magic link:", error);
      throw error || new Error("No data returned from generateLink");
    }

    // Extract the hashed_token from the response
    const tokenHash = data.properties.hashed_token;

    if (!tokenHash) {
      throw new Error("Missing hashed_token from generateLink");
    }

    console.log(`[OAuth] Generated OTP for: ${email}`);

    // Redirect to client-side session setup page with token_hash
    // The /auth/set-session page will:
    // 1. Call supabase.auth.verifyOtp() in browser context
    // 2. This sets session cookies in browser
    // 3. Then redirect to dashboard
    return {
      url: `/auth/set-session?token_hash=${encodeURIComponent(
        tokenHash
      )}&type=magiclink&email=${encodeURIComponent(email)}`,
      error: null,
    };
  } catch (error) {
    console.error("[OAuth] OTP generation error:", error);
    return {
      url: "/auth/login?error=session_creation_failed",
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

/**
 * GET /api/auth/callback/infohub
 * OAuth callback endpoint - receives authorization code from Info Hub
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse callback parameters
  const callbackParams: SSOCallbackParams = {
    code: searchParams.get("code") || "",
    state: searchParams.get("state") || "",
    error: searchParams.get("error") || undefined,
    error_description: searchParams.get("error_description") || undefined,
  };

  // Handle authorization errors
  if (callbackParams.error) {
    console.error("[OAuth] Authorization error:", callbackParams.error);
    return NextResponse.redirect(
      buildRedirectUrl(
        `/auth/login?error=${
          callbackParams.error
        }&description=${encodeURIComponent(
          callbackParams.error_description || ""
        )}`
      )
    );
  }

  // Validate required parameters
  if (!callbackParams.code || !callbackParams.state) {
    console.error("[OAuth] Missing code or state parameter");
    return NextResponse.redirect(
      buildRedirectUrl("/auth/login?error=invalid_callback")
    );
  }

  try {
    console.log("[OAuth] ===== SSO CALLBACK START =====");
    console.log("[OAuth] Callback params:", {
      hasCode: !!callbackParams.code,
      hasState: !!callbackParams.state,
      codeLength: callbackParams.code?.length || 0,
    });

    // 1. Retrieve and validate state from cookie (Server-side validation)
    const cookies = request.cookies;
    const cookieState = cookies.get("sso_state")?.value;
    const pkceVerifier = cookies.get("pkce_verifier")?.value;

    // Debug: Log all cookies for troubleshooting
    console.log("[OAuth] === COOKIE DEBUG ===");
    console.log("[OAuth] All cookies:", Array.from(cookies.getAll()).map(c => c.name));
    console.log("[OAuth] sso_state cookie:", cookieState ? `${cookieState.substring(0, 10)}...` : "MISSING");
    console.log("[OAuth] pkce_verifier cookie:", pkceVerifier ? `${pkceVerifier.substring(0, 10)}...` : "MISSING");
    console.log("[OAuth] Expected state (from URL):", callbackParams.state ? `${callbackParams.state.substring(0, 10)}...` : "MISSING");
    console.log("[OAuth] Request URL:", request.url);
    console.log("[OAuth] Request headers origin:", request.headers.get("origin"));
    console.log("[OAuth] Request headers referer:", request.headers.get("referer"));

    if (!cookieState || cookieState !== callbackParams.state) {
      console.error("[OAuth] ❌ State validation failed");
      console.error(
        "[OAuth] Cookie state:",
        cookieState ? `Present (${cookieState.substring(0, 10)}...)` : "MISSING"
      );
      console.error("[OAuth] Param state:", callbackParams.state ? `${callbackParams.state.substring(0, 10)}...` : "MISSING");
      console.error("[OAuth] Match:", cookieState === callbackParams.state);

      // Additional debug: Check if cookies are blocked
      if (!cookieState && !pkceVerifier) {
        console.error("[OAuth] Both cookies missing - likely SameSite/Secure issue or browser blocking");
      }

      return NextResponse.redirect(
        buildRedirectUrl("/auth/login?error=invalid_state")
      );
    }

    console.log("[OAuth] ✓ State validated successfully");

    // 2. Get code verifier from secure cookie
    const codeVerifier = cookies.get("pkce_verifier")?.value;

    if (!codeVerifier) {
      console.error("[OAuth] Missing code_verifier in cookie");
      return NextResponse.redirect(
        buildRedirectUrl("/auth/login?error=missing_code_verifier")
      );
    }

    console.log("[OAuth] ✓ Code verifier retrieved from cookie");

    // 3. Exchange authorization code for user data
    console.log("[OAuth] Step 3: Exchanging authorization code...");
    const tokenData = await exchangeToken(callbackParams.code, codeVerifier);

    // Normalize email to lowercase immediately
    tokenData.user.email = tokenData.user.email.toLowerCase();

    console.log("[OAuth] ✓ Token exchange successful");
    console.log("[OAuth] User email (normalized):", tokenData.user.email);
    console.log("[OAuth] User role:", tokenData.user.role);

    // 4. Check for viewer role (denied access)
    if (tokenData.user.role === "viewer") {
      console.warn("[OAuth] Viewer role denied access:", tokenData.user.email);
      return NextResponse.redirect(
        buildRedirectUrl(
          "/auth/login?error=access_denied&description=Viewer_role_not_allowed"
        )
      );
    }

    // 5. Compensatory sync if webhook failed
    console.log("[OAuth] Step 5: Checking webhook status...");
    if (!tokenData.webhook_status.success) {
      console.warn("[OAuth] ⚠ Webhook failed, performing compensatory sync");
      console.log("[OAuth] Webhook error:", tokenData.webhook_status.error);

      const userParams: CreateSupabaseUserParams = {
        email: tokenData.user.email,
        fullName: tokenData.user.full_name,
        role: mapRole(tokenData.user.role),
        teacherType: tokenData.user.teacher_type,
        grade: tokenData.user.grade,
        track: tokenData.user.track,
        infohubUserId: tokenData.user.infohub_user_id,
        avatarUrl: tokenData.user.avatar_url,
      };

      console.log("[OAuth] Compensatory sync params:", {
        email: userParams.email,
        role: userParams.role,
        hasTeacherType: !!userParams.teacherType,
      });

      await createOrUpdateUser(userParams);
      console.log("[OAuth] ✓ Compensatory sync completed");
    } else {
      console.log(
        "[OAuth] ✓ Webhook sync successful, skipping compensatory sync"
      );
    }

    // 6. Create Supabase session
    console.log(
      "[OAuth] Step 6: Creating Supabase session for:",
      tokenData.user.email
    );
    const { url, error } = await createSupabaseSession(tokenData.user.email);

    if (error) {
      console.error("[OAuth] ✗ Session creation failed!");
      console.error("[OAuth] Error details:", error);
      return NextResponse.redirect(
        buildRedirectUrl("/auth/login?error=session_creation_failed")
      );
    }

    console.log("[OAuth] ✓ Session created successfully");

    // 7. Clear cookies (security best practice)
    const response = NextResponse.redirect(buildRedirectUrl(url));

    const cookieOptions = {
      path: "/",
      maxAge: 0, // Immediately expire
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
    };

    response.cookies.set("pkce_verifier", "", cookieOptions);
    response.cookies.set("sso_state", "", cookieOptions);

    console.log("[OAuth] Cleared security cookies");

    // 8. Redirect to dashboard (or specified redirect URL)
    console.log("[OAuth] Step 8: Redirecting to dashboard");
    console.log(
      `[OAuth] ===== SSO LOGIN SUCCESSFUL for: ${tokenData.user.email} =====`
    );
    return response;
  } catch (error) {
    console.error("[OAuth] ===== CALLBACK ERROR =====");
    console.error(
      "[OAuth] Error type:",
      error instanceof Error ? error.constructor.name : typeof error
    );
    console.error(
      "[OAuth] Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "[OAuth] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Log full error object for debugging
    if (error && typeof error === "object") {
      try {
        console.error("[OAuth] Error object:", JSON.stringify(error, null, 2));
      } catch (e) {
        console.error("[OAuth] Error object (not stringifiable):", error);
      }
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? String((error as any).message)
        : JSON.stringify(error);

    console.error("[OAuth] Redirecting to login with error:", errorMessage);

    return NextResponse.redirect(
      buildRedirectUrl(
        `/auth/login?error=oauth_callback_failed&description=${encodeURIComponent(
          errorMessage
        )}`
      )
    );
  }
}
