import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();

  // 1. Sign out from Supabase (clears auth cookies)
  await supabase.auth.signOut();

  // 2. Manually clear SSO handshake cookies
  const cookieStore = cookies();
  cookieStore.delete("sso_state");
  cookieStore.delete("pkce_verifier");

  // 3. Redirect to login page
  const loginUrl = new URL("/auth/login", request.nextUrl.origin);
  return NextResponse.redirect(loginUrl);
}
