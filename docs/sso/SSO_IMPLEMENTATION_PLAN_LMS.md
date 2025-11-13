# SSO Implementation Plan - LMS Side

> **Document Version**: 1.0
> **Last Updated**: 2025-11-13
> **Estimated Duration**: 10.5 days (2-2.5 weeks)
> **Status**: ⏳ Waiting for Info Hub secrets

---

## 📋 Prerequisites

### Required from Info Hub Team

- [ ] **OAuth Client Secret** (256-bit, production-grade)
  ```bash
  # Info Hub to execute and provide result
  openssl rand -base64 32
  ```

- [ ] **Webhook Secret** (256-bit, production-grade)
  ```bash
  # Info Hub to execute and provide result
  openssl rand -base64 32
  ```

- [ ] **Test Accounts** (5 roles)
  - Admin test account
  - Office Member (Head Teacher) test account
  - Teacher (IT) test account
  - Teacher (LT) test account
  - Viewer test account (should be denied)

- [ ] **Info Hub OAuth Endpoints** (confirm URLs)
  - Staging Authorization: `https://next14-landing.zeabur.app/api/oauth/authorize`
  - Staging Token: `https://next14-landing.zeabur.app/api/oauth/token`
  - Production Authorization: `https://kcislk-infohub.zeabur.app/api/oauth/authorize`
  - Production Token: `https://kcislk-infohub.zeabur.app/api/oauth/token`

### LMS Current State

- ✅ Supabase Cloud configured (`https://piwbooidofbaqklhijup.supabase.co`)
- ✅ RLS policies optimized (49 policies, Migration 015)
- ✅ Users table structure ready
- ✅ Service Role Key secured (not shared)
- ✅ Next.js 14 + TypeScript setup
- ✅ Development environment: `localhost:3000`

---

## 📊 Implementation Phases

### Phase 1: Environment Configuration (0.5 days)

**Duration**: 4 hours

**Tasks**:
- [ ] Add environment variables to `.env.local`
- [ ] Update `.env.example`
- [ ] Verify environment variable loading

**New Environment Variables**:
```env
# .env.local

# ==========================================
# Info Hub SSO Configuration
# ==========================================
NEXT_PUBLIC_INFOHUB_OAUTH_AUTH_URL=https://kcislk-infohub.zeabur.app/api/oauth/authorize
INFOHUB_OAUTH_TOKEN_URL=https://kcislk-infohub.zeabur.app/api/oauth/token
INFOHUB_OAUTH_CLIENT_ID=lms
INFOHUB_OAUTH_CLIENT_SECRET=<from-info-hub> # ⏳ Pending

# Webhook Configuration
INFOHUB_WEBHOOK_SECRET=<from-info-hub> # ⏳ Pending

# Redirect URIs
NEXT_PUBLIC_LMS_URL=http://localhost:3000
NEXT_PUBLIC_LMS_CALLBACK_URL=http://localhost:3000/auth/callback/sso
```

**Acceptance Criteria**:
- [ ] All environment variables load correctly
- [ ] No TypeScript errors on `process.env` access
- [ ] Development server starts without errors

---

### Phase 2: Webhook Receiver Endpoint (1.5 days)

**Duration**: 12 hours

**New Files**:
1. `app/api/webhook/user-sync/route.ts` (API route)
2. `lib/auth/webhook-handler.ts` (business logic)
3. `lib/auth/role-mapper.ts` (role mapping logic)
4. `lib/auth/types.ts` (TypeScript types)

**Core Functionality**:

```typescript
// app/api/webhook/user-sync/route.ts

POST /api/webhook/user-sync

Request Headers:
  Authorization: Bearer <WEBHOOK_SECRET>
  Content-Type: application/json

Request Body:
{
  "event": "user.created" | "user.updated" | "user.deleted",
  "timestamp": "2025-01-13T10:30:00Z",
  "user": {
    "email": "teacher@kcislk.ntpc.edu.tw",
    "full_name": "John Doe",
    "infohub_user_id": "uuid-from-infohub",
    "google_id": "google-oauth-sub",
    "avatar_url": "https://...",
    "role": "teacher" | "admin" | "head",
    "teacher_type": "LT" | "IT" | "KCFS" | null,
    "grade_level": 1-6 | null,
    "track": "local" | "international" | null,
    "is_active": true
  }
}

Response (200 OK):
{
  "success": true,
  "lms_user_id": "uuid-in-supabase",
  "synced_at": "2025-01-13T10:30:05Z"
}

Response (401 Unauthorized):
{
  "error": "Unauthorized",
  "message": "Invalid webhook secret"
}
```

**Role Mapping Rules**:
```typescript
// lib/auth/role-mapper.ts

Info Hub Role → LMS Role
- admin → admin (teacher_type: null, grade: null)
- office_member → head (grade: null initially)
- teacher (IT) → teacher (teacher_type: IT, track: international)
- teacher (LT) → teacher (teacher_type: LT, track: local)
- teacher (KCFS) → teacher (teacher_type: KCFS, track: null)
- viewer → ❌ Reject (should never receive webhook)
```

**Error Handling**:
- 401: Invalid webhook secret
- 400: Invalid payload format
- 500: Supabase operation failed

**Testing**:
```bash
# Unit tests
npm test lib/auth/role-mapper.test.ts
npm test lib/auth/webhook-handler.test.ts

# Integration test
curl -X POST http://localhost:3000/api/webhook/user-sync \
  -H "Authorization: Bearer test-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user.created",
    "user": {
      "email": "test.teacher@kcislk.ntpc.edu.tw",
      "full_name": "Test IT Teacher",
      "infohub_user_id": "test-uuid-123",
      "google_id": "google-123",
      "role": "teacher",
      "teacher_type": "IT",
      "track": "international",
      "is_active": true
    }
  }'
```

**Acceptance Criteria**:
- [ ] Webhook receives and verifies secret
- [ ] User created in Supabase `auth.users`
- [ ] User created in `public.users` table
- [ ] Role mapping correct for all 5 types
- [ ] RLS policies apply (test with different roles)
- [ ] Unit test coverage > 80%

---

### Phase 3: OAuth PKCE Client (2 days)

**Duration**: 16 hours

**New Files**:
1. `lib/auth/pkce.ts` (PKCE utilities)
2. `lib/auth/oauth-client.ts` (OAuth client logic)
3. `app/api/auth/sso/initiate/route.ts` (SSO initiation)
4. `app/auth/login/page.tsx` (update - add SSO button)

**PKCE Implementation**:
```typescript
// lib/auth/pkce.ts

export function generateCodeVerifier(): string {
  // Generate 43-128 character random string
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  // SHA-256(verifier) → Base64 URL encode
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
```

**SSO Initiation Flow**:
```typescript
// app/api/auth/sso/initiate/route.ts

GET /api/auth/sso/initiate

Flow:
1. Generate code_verifier (random)
2. Generate code_challenge (SHA-256 of verifier)
3. Generate state token (random UUID)
4. Store verifier + state in HTTP-only cookies
5. Redirect to Info Hub OAuth endpoint

Cookies Set:
  oauth_verifier: <code_verifier> (HttpOnly, Secure, SameSite=Lax, MaxAge=300)
  oauth_state: <state> (HttpOnly, Secure, SameSite=Lax, MaxAge=300)

Redirect URL:
https://kcislk-infohub.zeabur.app/api/oauth/authorize?
  client_id=lms&
  redirect_uri=http://localhost:3000/auth/callback/sso&
  response_type=code&
  code_challenge=<challenge>&
  code_challenge_method=S256&
  state=<state>
```

**Login Page Update**:
```typescript
// app/auth/login/page.tsx

// Add SSO button
<Button
  onClick={() => window.location.href = '/api/auth/sso/initiate'}
  className="w-full mb-4"
  variant="outline"
>
  <BuildingLibrary className="mr-2 h-5 w-5" />
  Login with Info Hub SSO
</Button>

// Divider
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-2 bg-white text-gray-500">Or continue with</span>
  </div>
</div>

// Existing Email/Password login
<Button onClick={() => router.push('/auth/login/email')}>
  Login with Email & Password
</Button>

// Error message display
{error && (
  <Alert variant="destructive">
    <AlertDescription>{getErrorMessage(error)}</AlertDescription>
  </Alert>
)}
```

**Acceptance Criteria**:
- [ ] PKCE verifier/challenge generation works
- [ ] State token stored in HTTP-only cookie
- [ ] Redirects to Info Hub correctly
- [ ] SSO button visible and functional
- [ ] Error messages display properly
- [ ] Unit tests pass (PKCE functions)

---

### Phase 4: OAuth Callback Handler (2.5 days)

**Duration**: 20 hours

**New Files**:
1. `app/auth/callback/sso/route.ts` (Server-side callback)
2. `app/auth/set-session/page.tsx` (Client-side session setup)
3. `lib/auth/token-exchange.ts` (Token exchange logic)
4. `lib/auth/session-manager.ts` (Session creation)

**Callback Flow**:
```typescript
// app/auth/callback/sso/route.ts

GET /auth/callback/sso?code=<code>&state=<state>

Flow:
1. Validate state token (CSRF protection)
2. Retrieve code_verifier from cookie
3. Call Info Hub Token Exchange API
4. Check webhook_status
   - "completed": User already synced
   - "pending"/"failed": Perform compensatory sync
5. Create Supabase session using Admin API
6. Redirect to /auth/set-session with tokens

Error Handling:
- invalid_state → Redirect to /auth/login?error=csrf_failed
- token_exchange_failed → Redirect to /auth/login?error=sso_failed
- user_sync_failed → Redirect to /auth/login?error=sync_failed
```

**Token Exchange Implementation**:
```typescript
// lib/auth/token-exchange.ts

async function exchangeCodeForUser(code: string, verifier: string) {
  const response = await fetch(process.env.INFOHUB_OAUTH_TOKEN_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.NEXT_PUBLIC_LMS_CALLBACK_URL!,
      client_id: process.env.INFOHUB_OAUTH_CLIENT_ID!,
      client_secret: process.env.INFOHUB_OAUTH_CLIENT_SECRET!,
      code_verifier: verifier
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new OAuth2Error(error)
  }

  return await response.json()
  /*
  Returns:
  {
    "user": {
      "email": "...",
      "full_name": "...",
      "infohub_user_id": "...",
      "lms_role": "teacher",
      "teacher_type": "IT",
      ...
    },
    "webhook_status": "completed" | "pending" | "failed",
    "lms_user_id": "supabase-uuid" (if synced)
  }
  */
}
```

**Compensatory Sync**:
```typescript
// If webhook failed, LMS performs sync
if (tokenData.webhook_status !== 'completed') {
  const supabase = createServiceRoleClient()

  // Create auth user
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: tokenData.user.email,
    email_confirm: true,
    user_metadata: {
      full_name: tokenData.user.full_name,
      infohub_user_id: tokenData.user.infohub_user_id,
      google_id: tokenData.user.google_id
    }
  })

  // Create users table entry
  await supabase.from('users').upsert({
    id: authUser.user.id,
    email: tokenData.user.email,
    full_name: tokenData.user.full_name,
    role: tokenData.user.lms_role,
    teacher_type: tokenData.user.teacher_type,
    grade: tokenData.user.grade_level,
    track: tokenData.user.track,
    is_active: true
  })
}
```

**Session Creation**:
```typescript
// Using Admin generateLink (方案 A)
const { data: linkData } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email
})

// Redirect to client-side session setup
return redirect(
  `/auth/set-session?access=${linkData.properties.access_token}&refresh=${linkData.properties.refresh_token}`
)
```

**Client-side Session Setup**:
```typescript
// app/auth/set-session/page.tsx

'use client'

export default function SetSessionPage() {
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const access = searchParams.get('access')
    const refresh = searchParams.get('refresh')

    if (!access || !refresh) {
      router.push('/auth/login?error=missing_tokens')
      return
    }

    supabase.auth.setSession({
      access_token: access,
      refresh_token: refresh
    }).then(({ error }) => {
      if (error) {
        router.push('/auth/login?error=session_failed')
      } else {
        router.push('/dashboard')
      }
    })
  }, [])

  return <LoadingSpinner message="Completing your login..." />
}
```

**Acceptance Criteria**:
- [ ] Authorization code exchanges successfully
- [ ] PKCE verifier validation works
- [ ] Webhook failure triggers compensatory sync
- [ ] Supabase session created correctly
- [ ] User redirected to Dashboard
- [ ] RLS policies apply correctly

---

### Phase 5: Error Handling & UX (1 day)

**Duration**: 8 hours

**New Files**:
1. `lib/auth/errors.ts` (Error definitions)
2. `lib/auth/logger.ts` (Logging utilities)
3. `components/auth/ErrorAlert.tsx` (Error display component)

**Error Types**:
```typescript
// lib/auth/errors.ts

export class SSOError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public details?: any
  ) {
    super(userMessage)
  }
}

export const SSO_ERRORS = {
  INVALID_STATE: {
    code: 'invalid_state',
    message: 'Security validation failed. Please try again.'
  },
  ACCESS_DENIED: {
    code: 'access_denied',
    message: 'You do not have permission to access LMS. Please contact administrator.'
  },
  TOKEN_EXCHANGE_FAILED: {
    code: 'token_exchange_failed',
    message: 'Failed to complete login. Please try again.'
  },
  SESSION_FAILED: {
    code: 'session_failed',
    message: 'Failed to create session. Please contact support.'
  },
  INFOHUB_UNAVAILABLE: {
    code: 'infohub_unavailable',
    message: 'Authentication service is temporarily unavailable. Please try again later.'
  },
  WEBHOOK_TIMEOUT: {
    code: 'webhook_timeout',
    message: 'User synchronization is taking longer than expected. Please wait a moment and try again.'
  }
}
```

**Logging**:
```typescript
// lib/auth/logger.ts

export function logSSOEvent(
  level: 'info' | 'warning' | 'error',
  event: string,
  details?: any
) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details
  }

  console.log(`[SSO ${level.toUpperCase()}]`, log)

  // Production: Send to monitoring service (e.g., Sentry)
  if (process.env.NODE_ENV === 'production') {
    // await sendToSentry(log)
  }
}
```

**Acceptance Criteria**:
- [ ] All errors have user-friendly messages
- [ ] Loading states clearly visible
- [ ] Errors logged to console (dev) / Sentry (prod)
- [ ] Retry mechanisms work

---

### Phase 6: Testing (2 days)

**Duration**: 16 hours

**Test Files**:
1. `tests/unit/pkce.test.ts`
2. `tests/unit/role-mapper.test.ts`
3. `tests/integration/webhook.test.ts`
4. `tests/integration/oauth-flow.test.ts`
5. `tests/e2e/sso-login.spec.ts`
6. `tests/security/csrf.test.ts`
7. `tests/security/rls.test.ts`

**Test Coverage Goals**:
- Unit tests: > 80%
- Integration tests: Critical paths
- E2E tests: All user flows
- Security tests: OWASP Top 10

**Key Test Scenarios**:
- [ ] IT Teacher SSO login (happy path)
- [ ] LT Teacher SSO login
- [ ] KCFS Teacher SSO login
- [ ] Head Teacher SSO login
- [ ] Admin SSO login
- [ ] Viewer SSO login (should fail with 403)
- [ ] Webhook failure → compensatory sync
- [ ] Invalid state token → CSRF error
- [ ] Invalid PKCE verifier → error
- [ ] RLS policies enforcement

---

### Phase 7: Documentation & Deployment (1 day)

**Duration**: 8 hours

**Documentation**:
- [ ] Update `CLAUDE.md` with SSO section
- [ ] Update `README.md` with SSO features
- [ ] Create deployment checklist

**Staging Deployment**:
- [ ] Update environment variables (Staging)
- [ ] Deploy to Staging
- [ ] Joint test with Info Hub Staging

**Production Deployment**:
- [ ] Environment variables (Production)
- [ ] DNS configuration
- [ ] SSL certificate
- [ ] Monitoring setup
- [ ] Rollback plan

---

## 📊 Timeline Summary

| Phase | Duration | Dependencies | Output |
|-------|----------|--------------|--------|
| 1. Environment | 0.5 days | Info Hub secrets | `.env.local` configured |
| 2. Webhook | 1.5 days | Phase 1 | User sync working |
| 3. OAuth Client | 2 days | Phase 1 | SSO button functional |
| 4. Callback | 2.5 days | Phase 2-3, Info Hub OAuth Server | Full OAuth flow |
| 5. Error Handling | 1 day | Phase 4 | Production-ready UX |
| 6. Testing | 2 days | Phase 1-5 | Test coverage complete |
| 7. Docs & Deploy | 1 day | Phase 6 | Production deployment |

**Total: 10.5 days (2-2.5 weeks)**

---

## ✅ Acceptance Criteria (Final)

**Functionality**:
- [ ] Info Hub users can SSO login to LMS
- [ ] First-time login creates Supabase account
- [ ] Roles correctly mapped (admin/head/teacher)
- [ ] Viewer role correctly denied
- [ ] Existing users can login via Email/Password (fallback)

**Security**:
- [ ] PKCE verification enforced
- [ ] CSRF state validation works
- [ ] Webhook secret verified
- [ ] RLS policies applied
- [ ] No Service Key exposure

**Performance**:
- [ ] SSO flow completes in < 5 seconds
- [ ] Webhook sync in < 2 seconds
- [ ] Session creation in < 1 second

**Reliability**:
- [ ] Webhook retry mechanism works
- [ ] Compensatory sync works when webhook fails
- [ ] Error handling comprehensive
- [ ] Logging clear and actionable

---

## 🚨 Blockers & Dependencies

**Current Blockers**:
- ⏳ Waiting for OAuth Client Secret from Info Hub
- ⏳ Waiting for Webhook Secret from Info Hub
- ⏳ Waiting for test accounts from Info Hub

**External Dependencies**:
- Info Hub OAuth Server completion (Week 2, Day 7)
- Info Hub Webhook sender implementation (Week 1, Day 3)
- Info Hub Staging environment availability

**Critical Path Items**:
1. Secrets from Info Hub (blocks Phase 1)
2. Info Hub Webhook ready (blocks Phase 2 integration test)
3. Info Hub OAuth Server ready (blocks Phase 4 integration test)

---

**Next Step**: Await Info Hub team to provide secrets, then begin Phase 1 implementation.

---

*Document prepared by LMS Development Team*
*Last reviewed: 2025-11-13*
