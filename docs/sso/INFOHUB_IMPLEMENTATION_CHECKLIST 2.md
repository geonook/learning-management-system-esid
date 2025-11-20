# Info Hub SSO Implementation Checklist

> **Document Version**: 1.0
> **Last Updated**: 2025-11-18
> **Purpose**: Step-by-step implementation guide for Info Hub SSO OAuth 2.0 + PKCE server

---

## Phase 1: Database Schema (1-2 hours)

### 1.1 User Table SSO Fields

```sql
-- Add SSO fields to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  sso_provider VARCHAR(50) DEFAULT 'google',
  sso_id VARCHAR(255) UNIQUE,
  sso_metadata JSONB DEFAULT '{}',
  lms_user_id UUID,
  lms_sync_status VARCHAR(20) DEFAULT 'pending',
  lms_last_sync_at TIMESTAMP WITH TIME ZONE,
  created_via_sso BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_sso_id ON users(sso_id);
CREATE INDEX IF NOT EXISTS idx_users_lms_user_id ON users(lms_user_id);
CREATE INDEX IF NOT EXISTS idx_users_lms_sync_status ON users(lms_sync_status);
```

### 1.2 OAuth Authorization Codes Table

```sql
-- Create authorization codes table
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope VARCHAR(500),
  code_challenge VARCHAR(255),
  code_challenge_method VARCHAR(10),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_challenge_method CHECK (
    code_challenge_method IN ('S256', 'plain') OR code_challenge_method IS NULL
  ),
  CONSTRAINT single_use CHECK (
    (used_at IS NULL) OR (used_at IS NOT NULL AND expires_at > used_at)
  )
);

-- Indexes for query performance
CREATE INDEX idx_oauth_codes_code ON oauth_authorization_codes(code);
CREATE INDEX idx_oauth_codes_expires ON oauth_authorization_codes(expires_at);
CREATE INDEX idx_oauth_codes_user ON oauth_authorization_codes(user_id);

-- Automatic cleanup of expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_authorization_codes
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
```

### 1.3 Verification Queries

```sql
-- Verify schema changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('sso_provider', 'sso_id', 'lms_user_id', 'lms_sync_status');

-- Verify oauth_authorization_codes table
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'oauth_authorization_codes') as column_count,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'oauth_authorization_codes') as constraint_count
FROM information_schema.tables
WHERE table_name = 'oauth_authorization_codes';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('users', 'oauth_authorization_codes')
  AND indexname LIKE '%sso%' OR indexname LIKE '%oauth%' OR indexname LIKE '%lms%';
```

### Success Criteria
- [ ] All columns added to users table
- [ ] oauth_authorization_codes table created with all constraints
- [ ] All indexes created successfully
- [ ] Verification queries return expected results
- [ ] No foreign key violations

### Rollback Plan
```sql
-- Rollback Phase 1 changes
DROP TABLE IF EXISTS oauth_authorization_codes CASCADE;
ALTER TABLE users
  DROP COLUMN IF EXISTS sso_provider,
  DROP COLUMN IF EXISTS sso_id,
  DROP COLUMN IF EXISTS sso_metadata,
  DROP COLUMN IF EXISTS lms_user_id,
  DROP COLUMN IF EXISTS lms_sync_status,
  DROP COLUMN IF EXISTS lms_last_sync_at,
  DROP COLUMN IF EXISTS created_via_sso;
```

---

## Phase 2: OAuth Server Endpoints (3-4 hours)

### 2.1 Authorization Endpoint Implementation

**File**: `/api/oauth/authorize/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase/server'

// Validation schema
const authorizeSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  response_type: z.literal('code'),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal('S256'),
  state: z.string().min(1),
  scope: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate parameters
    const params = authorizeSchema.parse({
      client_id: searchParams.get('client_id'),
      redirect_uri: searchParams.get('redirect_uri'),
      response_type: searchParams.get('response_type'),
      code_challenge: searchParams.get('code_challenge'),
      code_challenge_method: searchParams.get('code_challenge_method'),
      state: searchParams.get('state'),
      scope: searchParams.get('scope')
    })

    // Verify client_id matches expected LMS client
    if (params.client_id !== process.env.OAUTH_CLIENT_ID) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Unknown client_id' },
        { status: 401 }
      )
    }

    // Verify redirect_uri matches registered URI
    if (params.redirect_uri !== process.env.OAUTH_REDIRECT_URI) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Redirect URI mismatch' },
        { status: 400 }
      )
    }

    // Get current user session
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      // Redirect to login with return URL
      const returnUrl = `/api/oauth/authorize?${searchParams.toString()}`
      return NextResponse.redirect(
        `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      )
    }

    // Generate authorization code
    const authCode = crypto.randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store authorization code in database
    const { error: dbError } = await supabase
      .from('oauth_authorization_codes')
      .insert({
        code: authCode,
        client_id: params.client_id,
        user_id: user.id,
        redirect_uri: params.redirect_uri,
        scope: params.scope,
        code_challenge: params.code_challenge,
        code_challenge_method: params.code_challenge_method,
        expires_at: expiresAt.toISOString()
      })

    if (dbError) {
      console.error('Failed to store authorization code:', dbError)
      return NextResponse.json(
        { error: 'server_error', error_description: 'Failed to generate authorization code' },
        { status: 500 }
      )
    }

    // Redirect back to LMS with authorization code
    const redirectUrl = new URL(params.redirect_uri)
    redirectUrl.searchParams.set('code', authCode)
    redirectUrl.searchParams.set('state', params.state)

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Authorization endpoint error:', error)
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2.2 Token Endpoint Implementation

**File**: `/api/oauth/token/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase/server'

// Validation schema
const tokenSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uri: z.string().url(),
  code_verifier: z.string().min(43).max(128)
})

// PKCE verification function
function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return hash === codeChallenge
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const params = tokenSchema.parse(body)

    // Verify client credentials
    if (params.client_id !== process.env.OAUTH_CLIENT_ID ||
        params.client_secret !== process.env.OAUTH_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client credentials' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Retrieve authorization code from database
    const { data: authCode, error: fetchError } = await supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', params.code)
      .single()

    if (fetchError || !authCode) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid authorization code' },
        { status: 400 }
      )
    }

    // Verify code hasn't been used
    if (authCode.used_at) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Authorization code already used' },
        { status: 400 }
      )
    }

    // Verify code hasn't expired
    if (new Date(authCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Authorization code expired' },
        { status: 400 }
      )
    }

    // Verify redirect_uri matches
    if (authCode.redirect_uri !== params.redirect_uri) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
        { status: 400 }
      )
    }

    // Verify PKCE
    if (authCode.code_challenge && !verifyPKCE(params.code_verifier, authCode.code_challenge)) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'PKCE verification failed' },
        { status: 400 }
      )
    }

    // Mark code as used
    await supabase
      .from('oauth_authorization_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('code', params.code)

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, teacher_type, grade_level')
      .eq('id', authCode.user_id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'server_error', error_description: 'Failed to retrieve user data' },
        { status: 500 }
      )
    }

    // Generate access token (for simplicity, using user data directly)
    const accessToken = Buffer.from(JSON.stringify({
      user_id: userData.id,
      email: userData.email,
      expires_at: Date.now() + 3600000 // 1 hour
    })).toString('base64')

    // Return token response
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        teacher_type: userData.teacher_type,
        grade_level: userData.grade_level
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid request parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Token endpoint error:', error)
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2.3 Test Commands

```bash
# Test authorization endpoint
curl -v "https://infohub.com/api/oauth/authorize?\
client_id=lms-esid-2025&\
redirect_uri=https%3A%2F%2Flms.kcis.com%2Fapi%2Fauth%2Fcallback%2Finfohub&\
response_type=code&\
code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&\
code_challenge_method=S256&\
state=abc123xyz&\
scope=profile%20email"

# Test token endpoint
curl -X POST https://infohub.com/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ",
    "client_id": "lms-esid-2025",
    "client_secret": "sk_live_abc123xyz789",
    "redirect_uri": "https://lms.kcis.com/api/auth/callback/infohub",
    "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
  }'
```

### Success Criteria
- [ ] /api/oauth/authorize returns 302 redirect with code
- [ ] /api/oauth/token validates PKCE correctly
- [ ] Authorization codes expire after 10 minutes
- [ ] Single-use enforcement works
- [ ] Error responses follow OAuth 2.0 spec

### Rollback Plan
```bash
# Remove endpoint files
rm -f /api/oauth/authorize/route.ts
rm -f /api/oauth/token/route.ts

# Clear test data from database
DELETE FROM oauth_authorization_codes WHERE client_id = 'lms-esid-2025';
```

---

## Phase 3: PKCE Verification (2 hours)

### 3.1 PKCE Implementation Module

**File**: `/lib/auth/pkce.ts`

```typescript
import crypto from 'crypto'

/**
 * Generate cryptographically secure code verifier
 * RFC 7636: 43-128 characters, [A-Z] [a-z] [0-9] - . _ ~
 */
export function generateCodeVerifier(): string {
  const verifier = crypto.randomBytes(32).toString('base64url')
  // Ensure minimum length of 43 characters
  if (verifier.length < 43) {
    return generateCodeVerifier() // Recursive retry
  }
  return verifier
}

/**
 * Generate code challenge from verifier
 * RFC 7636: SHA256(verifier) encoded as base64url
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

/**
 * Verify PKCE parameters
 */
export function verifyPKCE(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    return verifier === challenge
  }

  const computedChallenge = generateCodeChallenge(verifier)
  return computedChallenge === challenge
}

/**
 * Validate code verifier format
 */
export function isValidCodeVerifier(verifier: string): boolean {
  // RFC 7636: 43-128 characters
  if (verifier.length < 43 || verifier.length > 128) {
    return false
  }

  // Must match [A-Za-z0-9\-._~]
  const validPattern = /^[A-Za-z0-9\-._~]+$/
  return validPattern.test(verifier)
}
```

### 3.2 Unit Tests

**File**: `/lib/auth/__tests__/pkce.test.ts`

```typescript
import {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyPKCE,
  isValidCodeVerifier
} from '../pkce'
import crypto from 'crypto'

describe('PKCE Implementation', () => {
  describe('generateCodeVerifier', () => {
    it('generates verifier with correct length', () => {
      const verifier = generateCodeVerifier()
      expect(verifier.length).toBeGreaterThanOrEqual(43)
      expect(verifier.length).toBeLessThanOrEqual(128)
    })

    it('generates unique verifiers', () => {
      const verifiers = new Set()
      for (let i = 0; i < 100; i++) {
        verifiers.add(generateCodeVerifier())
      }
      expect(verifiers.size).toBe(100)
    })

    it('generates valid base64url characters', () => {
      const verifier = generateCodeVerifier()
      expect(isValidCodeVerifier(verifier)).toBe(true)
    })
  })

  describe('generateCodeChallenge', () => {
    it('generates consistent challenge for same verifier', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      const challenge1 = generateCodeChallenge(verifier)
      const challenge2 = generateCodeChallenge(verifier)
      expect(challenge1).toBe(challenge2)
    })

    it('generates correct SHA256 challenge', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
      const challenge = generateCodeChallenge(verifier)
      expect(challenge).toBe(expectedChallenge)
    })
  })

  describe('verifyPKCE', () => {
    it('verifies valid PKCE pair', () => {
      const verifier = generateCodeVerifier()
      const challenge = generateCodeChallenge(verifier)
      expect(verifyPKCE(verifier, challenge)).toBe(true)
    })

    it('rejects invalid verifier', () => {
      const verifier1 = generateCodeVerifier()
      const verifier2 = generateCodeVerifier()
      const challenge = generateCodeChallenge(verifier1)
      expect(verifyPKCE(verifier2, challenge)).toBe(false)
    })

    it('rejects tampered challenge', () => {
      const verifier = generateCodeVerifier()
      const challenge = generateCodeChallenge(verifier)
      const tamperedChallenge = challenge.slice(0, -1) + 'X'
      expect(verifyPKCE(verifier, tamperedChallenge)).toBe(false)
    })

    it('handles plain method correctly', () => {
      const verifier = 'plain-text-verifier'
      expect(verifyPKCE(verifier, verifier, 'plain')).toBe(true)
      expect(verifyPKCE(verifier, 'wrong', 'plain')).toBe(false)
    })
  })

  describe('isValidCodeVerifier', () => {
    it('validates correct verifier', () => {
      const valid = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
      expect(isValidCodeVerifier(valid)).toBe(true)
    })

    it('rejects too short verifier', () => {
      const tooShort = 'a'.repeat(42)
      expect(isValidCodeVerifier(tooShort)).toBe(false)
    })

    it('rejects too long verifier', () => {
      const tooLong = 'a'.repeat(129)
      expect(isValidCodeVerifier(tooLong)).toBe(false)
    })

    it('rejects invalid characters', () => {
      const invalid = 'a'.repeat(43) + '!@#$'
      expect(isValidCodeVerifier(invalid)).toBe(false)
    })
  })
})
```

### 3.3 Integration Test

```bash
#!/bin/bash
# test-pkce.sh

echo "=== PKCE Integration Test ==="

# Generate PKCE parameters
CODE_VERIFIER=$(node -e "
  const crypto = require('crypto');
  const verifier = crypto.randomBytes(32).toString('base64url');
  console.log(verifier);
")

CODE_CHALLENGE=$(node -e "
  const crypto = require('crypto');
  const verifier = '$CODE_VERIFIER';
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  console.log(challenge);
")

echo "Code Verifier: $CODE_VERIFIER"
echo "Code Challenge: $CODE_CHALLENGE"

# Verify PKCE locally
node -e "
  const crypto = require('crypto');
  const verifier = '$CODE_VERIFIER';
  const challenge = '$CODE_CHALLENGE';
  const computed = crypto.createHash('sha256').update(verifier).digest('base64url');
  const valid = computed === challenge;
  console.log('PKCE Verification:', valid ? 'PASSED' : 'FAILED');
  process.exit(valid ? 0 : 1);
"

if [ $? -eq 0 ]; then
  echo "✅ PKCE verification successful"
else
  echo "❌ PKCE verification failed"
  exit 1
fi
```

### Success Criteria
- [ ] Code verifier generation passes all tests
- [ ] Code challenge calculation correct
- [ ] PKCE verification works bidirectionally
- [ ] Invalid inputs properly rejected
- [ ] Performance: < 10ms per verification

### Rollback Plan
```bash
# Remove PKCE module
rm -rf /lib/auth/pkce.ts
rm -rf /lib/auth/__tests__/pkce.test.ts
```

---

## Phase 4: Webhook Sender (2 hours)

### 4.1 Webhook Implementation

**File**: `/lib/webhooks/lms-sync.ts`

```typescript
import crypto from 'crypto'

interface UserSyncPayload {
  event: 'user.created' | 'user.updated'
  timestamp: string
  data: {
    id: string
    email: string
    name: string
    role: 'admin' | 'head' | 'teacher'
    teacher_type?: 'LT' | 'IT' | 'KCFS'
    grade?: number
    track?: 'local' | 'international'
    metadata?: Record<string, any>
  }
}

/**
 * Generate webhook signature
 */
export function generateWebhookSignature(
  payload: UserSyncPayload,
  secret: string
): string {
  const data = JSON.stringify(payload)
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Send user sync webhook to LMS
 */
export async function sendUserSyncWebhook(
  user: UserSyncPayload['data'],
  event: UserSyncPayload['event'] = 'user.created'
): Promise<void> {
  const webhookUrl = process.env.LMS_WEBHOOK_URL!
  const webhookSecret = process.env.LMS_WEBHOOK_SECRET!

  const payload: UserSyncPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: user
  }

  const signature = generateWebhookSignature(payload, webhookSecret)

  let retries = 3
  let lastError: Error | null = null

  while (retries > 0) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      // Success - update sync status
      await updateSyncStatus(user.id, 'synced')

      console.log(`✅ User sync webhook sent successfully for ${user.email}`)
      return

    } catch (error) {
      lastError = error as Error
      retries--

      if (retries > 0) {
        console.log(`⚠️ Webhook failed, retrying... (${retries} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))) // Exponential backoff
      }
    }
  }

  // All retries failed
  await updateSyncStatus(user.id, 'failed')
  console.error(`❌ Webhook failed after 3 attempts:`, lastError)
  throw lastError
}

/**
 * Update user sync status in database
 */
async function updateSyncStatus(
  userId: string,
  status: 'synced' | 'failed' | 'pending'
): Promise<void> {
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()

  await supabase
    .from('users')
    .update({
      lms_sync_status: status,
      lms_last_sync_at: new Date().toISOString()
    })
    .eq('id', userId)
}

/**
 * Batch sync users to LMS
 */
export async function batchSyncUsers(
  userIds: string[]
): Promise<{ success: string[], failed: string[] }> {
  const results = {
    success: [] as string[],
    failed: [] as string[]
  }

  for (const userId of userIds) {
    try {
      // Get user data
      const { createServerClient } = await import('@/lib/supabase/server')
      const supabase = createServerClient()

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !user) {
        results.failed.push(userId)
        continue
      }

      // Send webhook
      await sendUserSyncWebhook({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teacher_type: user.teacher_type,
        grade: user.grade_level,
        track: user.track
      }, 'user.updated')

      results.success.push(userId)
    } catch (error) {
      results.failed.push(userId)
    }
  }

  return results
}
```

### 4.2 Webhook Trigger Integration

**File**: `/api/auth/google/callback/route.ts` (addition)

```typescript
// Add to existing Google OAuth callback
import { sendUserSyncWebhook } from '@/lib/webhooks/lms-sync'

// After successful Google login/signup
if (isNewUser || userData.lms_sync_status !== 'synced') {
  // Trigger webhook to sync with LMS
  await sendUserSyncWebhook({
    id: userData.id,
    email: userData.email,
    name: userData.name,
    role: mapGoogleRoleToInfoHubRole(userData),
    teacher_type: extractTeacherType(userData),
    grade: extractGradeLevel(userData),
    track: extractTrack(userData),
    metadata: {
      google_id: googleUser.id,
      picture: googleUser.picture
    }
  }, isNewUser ? 'user.created' : 'user.updated')
}
```

### 4.3 Test Examples

```bash
# Manual webhook test
curl -X POST https://lms.kcis.com/api/webhook/user-sync \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $(echo -n '{"event":"user.created","timestamp":"2025-11-18T10:00:00Z","data":{"id":"123","email":"test@kcis.com","name":"Test User","role":"teacher","teacher_type":"LT","grade":4}}' | openssl dgst -sha256 -hmac 'webhook_secret_key' | cut -d' ' -f2)" \
  -d '{
    "event": "user.created",
    "timestamp": "2025-11-18T10:00:00Z",
    "data": {
      "id": "123",
      "email": "test@kcis.com",
      "name": "Test User",
      "role": "teacher",
      "teacher_type": "LT",
      "grade": 4
    }
  }'

# Test with retry simulation
# Temporarily block LMS endpoint to test retry logic
```

### Success Criteria
- [ ] Webhook signature generation correct
- [ ] Retry logic with exponential backoff works
- [ ] Sync status updates in database
- [ ] Timeout handling (10 seconds)
- [ ] Batch sync processes multiple users

### Rollback Plan
```bash
# Remove webhook implementation
rm -rf /lib/webhooks/lms-sync.ts

# Reset sync status
UPDATE users SET
  lms_sync_status = 'pending',
  lms_last_sync_at = NULL
WHERE lms_sync_status IS NOT NULL;
```

---

## Phase 5: Role Mapping (1-2 hours)

### 5.1 Role Mapping Implementation

**File**: `/lib/auth/role-mapper.ts`

```typescript
interface GoogleUserData {
  email: string
  name: string
  hd?: string // Hosted domain
  metadata?: any
}

interface MappedRole {
  role: 'admin' | 'head' | 'teacher'
  teacher_type?: 'LT' | 'IT' | 'KCFS'
  grade?: number
  track?: 'local' | 'international'
}

/**
 * Map Google user to Info Hub role
 */
export function mapGoogleUserToRole(googleUser: GoogleUserData): MappedRole {
  const email = googleUser.email.toLowerCase()

  // Admin mapping (by email pattern or domain admin list)
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  if (adminEmails.includes(email) || email.endsWith('@kcis-admin.edu.tw')) {
    return { role: 'admin' }
  }

  // Head Teacher mapping
  if (email.includes('.head@') || email.includes('_head@')) {
    const grade = extractGradeFromEmail(email)
    const teacherType = extractTeacherTypeFromEmail(email)

    return {
      role: 'head',
      teacher_type: teacherType,
      grade: grade
    }
  }

  // Regular Teacher mapping
  const teacherType = extractTeacherTypeFromEmail(email)
  const track = teacherType === 'IT' ? 'international' :
                teacherType === 'LT' ? 'local' : undefined

  return {
    role: 'teacher',
    teacher_type: teacherType,
    track: track
  }
}

/**
 * Extract teacher type from email
 */
function extractTeacherTypeFromEmail(email: string): 'LT' | 'IT' | 'KCFS' | undefined {
  const emailLower = email.toLowerCase()

  // Pattern matching for teacher types
  if (emailLower.includes('.it@') || emailLower.includes('_it@') || emailLower.includes('international')) {
    return 'IT'
  }
  if (emailLower.includes('.lt@') || emailLower.includes('_lt@') || emailLower.includes('local')) {
    return 'LT'
  }
  if (emailLower.includes('.kcfs@') || emailLower.includes('_kcfs@') || emailLower.includes('futureskill')) {
    return 'KCFS'
  }

  // Default mapping based on domain
  if (emailLower.includes('@kcis-it.')) return 'IT'
  if (emailLower.includes('@kcis-lt.')) return 'LT'
  if (emailLower.includes('@kcis-kcfs.')) return 'KCFS'

  return undefined
}

/**
 * Extract grade level from email
 */
function extractGradeFromEmail(email: string): number | undefined {
  // Look for patterns like g1, g2, grade1, grade2, etc.
  const gradeMatch = email.match(/[gG](?:rade)?([1-6])/i)
  if (gradeMatch) {
    return parseInt(gradeMatch[1])
  }

  return undefined
}

/**
 * Validate and enhance role mapping with database lookup
 */
export async function enhanceRoleMapping(
  email: string,
  initialMapping: MappedRole
): Promise<MappedRole> {
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()

  // Check if user exists in role_mappings table (manual override)
  const { data: override } = await supabase
    .from('role_mappings')
    .select('*')
    .eq('email', email)
    .single()

  if (override) {
    return {
      role: override.role,
      teacher_type: override.teacher_type,
      grade: override.grade_level,
      track: override.track
    }
  }

  return initialMapping
}
```

### 5.2 Database Table for Manual Overrides

```sql
-- Create role mappings table for manual overrides
CREATE TABLE IF NOT EXISTS role_mappings (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'head', 'teacher')),
  teacher_type VARCHAR(10) CHECK (teacher_type IN ('LT', 'IT', 'KCFS')),
  grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 6),
  track VARCHAR(20) CHECK (track IN ('local', 'international')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample override mappings
INSERT INTO role_mappings (email, role, teacher_type, grade_level, notes) VALUES
('john.smith@kcis.edu.tw', 'head', 'LT', 4, 'G4 Local Head Teacher'),
('jane.doe@kcis.edu.tw', 'head', 'IT', 3, 'G3 International Head Teacher'),
('admin@kcis.edu.tw', 'admin', NULL, NULL, 'System Administrator');
```

### 5.3 Test Cases

```typescript
// test-role-mapping.ts
import { mapGoogleUserToRole } from './role-mapper'

const testCases = [
  {
    input: { email: 'admin@kcis.edu.tw', name: 'Admin User' },
    expected: { role: 'admin' }
  },
  {
    input: { email: 'john.lt.head@kcis.edu.tw', name: 'John Head' },
    expected: { role: 'head', teacher_type: 'LT' }
  },
  {
    input: { email: 'mary.g4.head@kcis.edu.tw', name: 'Mary Head' },
    expected: { role: 'head', grade: 4 }
  },
  {
    input: { email: 'bob.it@kcis.edu.tw', name: 'Bob Teacher' },
    expected: { role: 'teacher', teacher_type: 'IT', track: 'international' }
  },
  {
    input: { email: 'alice.lt@kcis.edu.tw', name: 'Alice Teacher' },
    expected: { role: 'teacher', teacher_type: 'LT', track: 'local' }
  },
  {
    input: { email: 'tom.kcfs@kcis.edu.tw', name: 'Tom KCFS' },
    expected: { role: 'teacher', teacher_type: 'KCFS' }
  }
]

testCases.forEach(({ input, expected }) => {
  const result = mapGoogleUserToRole(input)
  console.log(`Testing ${input.email}:`,
    JSON.stringify(result) === JSON.stringify(expected) ? '✅ PASS' : '❌ FAIL',
    result
  )
})
```

### Success Criteria
- [ ] Admin emails correctly identified
- [ ] Head teachers mapped with grade/type
- [ ] Regular teachers get correct type/track
- [ ] Manual overrides work
- [ ] Unknown patterns handled gracefully

### Rollback Plan
```sql
-- Remove role mapping table
DROP TABLE IF EXISTS role_mappings CASCADE;

-- Clear role data from users
UPDATE users SET
  role = 'teacher',
  teacher_type = NULL,
  grade_level = NULL,
  track = NULL
WHERE role IN ('admin', 'head', 'teacher');
```

---

## Phase 6: Admin UI (2-3 hours)

### 6.1 SSO Configuration Page

**File**: `/app/admin/sso/page.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SSOAdminPage() {
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    webhookUrl: '',
    webhookSecret: ''
  })
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load current configuration
    fetchConfig()
  }, [])

  async function fetchConfig() {
    const response = await fetch('/api/admin/sso/config')
    const data = await response.json()
    setConfig(data)
  }

  async function saveConfig() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/sso/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        alert('Configuration saved successfully')
      } else {
        alert('Failed to save configuration')
      }
    } finally {
      setLoading(false)
    }
  }

  async function testOAuthFlow() {
    setLoading(true)
    setTestResult(null)

    try {
      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      const state = generateState()

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
        scope: 'profile email'
      })

      const authUrl = `/api/oauth/authorize?${params.toString()}`

      setTestResult({
        success: true,
        authUrl,
        codeVerifier,
        codeChallenge,
        state,
        message: 'OAuth flow test initiated. Check the authorization URL.'
      })
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        message: 'OAuth flow test failed'
      })
    } finally {
      setLoading(false)
    }
  }

  async function testWebhook() {
    setLoading(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/admin/sso/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          webhookSecret: config.webhookSecret,
          testUser: {
            id: 'test-123',
            email: 'test@kcis.edu.tw',
            name: 'Test User',
            role: 'teacher',
            teacher_type: 'LT'
          }
        })
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        message: 'Webhook test failed'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">SSO Configuration</h1>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="test">Testing</TabsTrigger>
          <TabsTrigger value="users">User Sync Status</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>OAuth 2.0 Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  placeholder="lms-esid-2025"
                />
              </div>

              <div>
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                  placeholder="sk_live_..."
                />
              </div>

              <div>
                <Label htmlFor="redirectUri">Redirect URI</Label>
                <Input
                  id="redirectUri"
                  value={config.redirectUri}
                  onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                  placeholder="https://lms.kcis.com/api/auth/callback/infohub"
                />
              </div>

              <div>
                <Label htmlFor="webhookUrl">LMS Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  placeholder="https://lms.kcis.com/api/webhook/user-sync"
                />
              </div>

              <div>
                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  value={config.webhookSecret}
                  onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                  placeholder="whsec_..."
                />
              </div>

              <Button onClick={saveConfig} disabled={loading}>
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test SSO Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testOAuthFlow} disabled={loading}>
                  Test OAuth Flow
                </Button>
                <Button onClick={testWebhook} disabled={loading}>
                  Test Webhook
                </Button>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? 'default' : 'destructive'}>
                  <AlertDescription>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserSyncStatus />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function generateState(): string {
  return Math.random().toString(36).substring(2, 15)
}
```

### 6.2 User Sync Status Component

**File**: `/app/admin/sso/UserSyncStatus.tsx`

```tsx
import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function UserSyncStatus() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/sync-status')
      const data = await response.json()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  async function syncUser(userId: string) {
    const response = await fetch(`/api/admin/users/${userId}/sync`, {
      method: 'POST'
    })

    if (response.ok) {
      fetchUsers() // Refresh list
    }
  }

  async function batchSync() {
    const response = await fetch('/api/admin/users/batch-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds: users.filter(u => u.lms_sync_status !== 'synced').map(u => u.id)
      })
    })

    if (response.ok) {
      fetchUsers() // Refresh list
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">User Sync Status</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={batchSync}>
            Batch Sync Pending
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>LMS Sync Status</TableHead>
            <TableHead>Last Sync</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>
                <Badge>{user.role}</Badge>
                {user.teacher_type && (
                  <Badge variant="outline" className="ml-2">
                    {user.teacher_type}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={
                  user.lms_sync_status === 'synced' ? 'success' :
                  user.lms_sync_status === 'failed' ? 'destructive' :
                  'secondary'
                }>
                  {user.lms_sync_status || 'pending'}
                </Badge>
              </TableCell>
              <TableCell>
                {user.lms_last_sync_at ?
                  new Date(user.lms_last_sync_at).toLocaleString() :
                  'Never'
                }
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => syncUser(user.id)}
                  disabled={user.lms_sync_status === 'synced'}
                >
                  Sync
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Success Criteria
- [ ] Configuration UI saves to environment/database
- [ ] OAuth flow test generates valid parameters
- [ ] Webhook test sends actual request
- [ ] User sync status displays correctly
- [ ] Batch sync processes multiple users

### Rollback Plan
```bash
# Remove admin UI files
rm -rf /app/admin/sso/

# Clear configuration from database
DELETE FROM sso_config WHERE client_id = 'lms-esid-2025';
```

---

## Final Verification Checklist

### Database
- [ ] All migrations applied successfully
- [ ] Indexes created and working
- [ ] No foreign key violations
- [ ] Cleanup job scheduled

### OAuth Endpoints
- [ ] /api/oauth/authorize responds correctly
- [ ] /api/oauth/token validates PKCE
- [ ] Authorization codes expire properly
- [ ] Single-use enforcement works

### PKCE Security
- [ ] Code verifier generation secure
- [ ] Challenge calculation correct
- [ ] Verification bidirectional
- [ ] All tests passing

### Webhook Integration
- [ ] Signature generation correct
- [ ] Retry logic works
- [ ] Sync status updates
- [ ] Batch sync functional

### Role Mapping
- [ ] Email patterns recognized
- [ ] Manual overrides work
- [ ] Grade/type extraction correct
- [ ] Unknown patterns handled

### Admin Interface
- [ ] Configuration saves correctly
- [ ] Test tools functional
- [ ] User sync status accurate
- [ ] Batch operations work

---

## Production Deployment

### Pre-deployment
1. Backup database
2. Test all endpoints in staging
3. Verify environment variables
4. Check SSL certificates

### Deployment
1. Apply database migrations
2. Deploy OAuth endpoints
3. Configure webhook URLs
4. Update DNS if needed
5. Enable monitoring

### Post-deployment
1. Verify OAuth flow end-to-end
2. Test webhook delivery
3. Check error logs
4. Monitor performance
5. Document any issues

---

**Estimated Total Time**: 11-14 hours
**Critical Path**: Database → OAuth Endpoints → PKCE → Webhooks
**Dependencies**: LMS webhook receiver must be ready before Phase 4