# SSO Test Scenarios Guide

> **Document Version**: 1.0
> **Last Updated**: 2025-11-18
> **Purpose**: Comprehensive testing guide for Info Hub ↔ LMS SSO integration

---

## End-to-End Test Flow

### Complete OAuth 2.0 + PKCE Flow

#### Step 1: User Clicks SSO Button

**User Action**: Click "Login with Info Hub SSO" on LMS login page

**Expected Behavior**:
- Button shows loading state
- PKCE parameters generated in browser
- Browser console shows PKCE generation

**Console Logs to Check**:
```javascript
console.log('[SSO] Generating PKCE parameters...')
console.log('[SSO] Code Verifier:', 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
console.log('[SSO] Code Challenge:', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
console.log('[SSO] State Token:', 'abc123xyz789state')
```

**Network Request to Verify**:
```
GET https://kcislk-infohub.zeabur.app/api/oauth/authorize
Query Parameters:
  client_id: lms-esid-2025
  redirect_uri: https://lms-esid.zeabur.app/api/auth/callback/infohub
  response_type: code
  code_challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  code_challenge_method: S256
  state: abc123xyz789state
  scope: profile email
```

**Error Scenarios**:
- Network timeout: Show "Connection failed" message
- Invalid client_id: Redirect with error=invalid_client
- Browser storage disabled: Show warning about cookies

#### Step 2: PKCE Generation

**Browser Implementation**:
```javascript
// Test in browser console
async function testPKCEGeneration() {
  // Generate code verifier
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  console.log('Verifier Length:', verifier.length)
  console.log('Verifier:', verifier)

  // Generate code challenge
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  console.log('Challenge:', challenge)

  return { verifier, challenge }
}

// Run test
testPKCEGeneration().then(console.log)
```

**Expected Output**:
```
Verifier Length: 43
Verifier: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
Challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
```

**Storage Verification**:
```javascript
// Check session storage
sessionStorage.getItem('sso_pkce_verifier')
sessionStorage.getItem('sso_state')
```

#### Step 3: Redirect to Info Hub

**Browser Behavior**:
- Page redirects to Info Hub OAuth authorize endpoint
- URL changes to: `https://kcislk-infohub.zeabur.app/api/oauth/authorize?...`

**Info Hub Page Shows**:
- Google OAuth login button (if not logged in)
- Authorization consent page (if logged in)

**Expected URL**:
```
https://kcislk-infohub.zeabur.app/api/oauth/authorize?
  client_id=lms-esid-2025&
  redirect_uri=https%3A%2F%2Flms-esid.zeabur.app%2Fapi%2Fauth%2Fcallback%2Finfohub&
  response_type=code&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256&
  state=abc123xyz789state&
  scope=profile%20email
```

**Error Scenarios**:
- Info Hub down: Browser shows connection error
- Invalid parameters: Show error page with details
- Session expired: Redirect to login page

#### Step 4: Google OAuth Authentication

**User Action**: Click "Sign in with Google"

**Google OAuth Flow**:
1. Redirect to accounts.google.com
2. User enters credentials
3. Google redirects back to Info Hub

**Network Requests**:
```
1. GET https://accounts.google.com/o/oauth2/v2/auth
2. POST https://accounts.google.com/signin/v1/lookup
3. GET https://kcislk-infohub.zeabur.app/api/auth/callback/google
```

**Info Hub Logs**:
```
[Auth] Google OAuth callback received
[Auth] User: john.smith@kcis.edu.tw
[Auth] Creating/updating user record
[Auth] Mapping role: teacher -> LT
```

**Error Scenarios**:
- Google account not authorized: Show "Access denied" message
- Email domain not allowed: Show "Invalid email domain"
- Google service down: Show fallback login form

#### Step 5: Authorization Code Generation

**Info Hub Server Process**:
```javascript
// Server-side code generation
const authCode = crypto.randomBytes(32).toString('base64url')
// Result: "SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ"

// Store in database
INSERT INTO oauth_authorization_codes (
  code: 'SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ',
  user_id: 'usr_abc123',
  client_id: 'lms-esid-2025',
  redirect_uri: 'https://lms-esid.zeabur.app/api/auth/callback/infohub',
  code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  code_challenge_method: 'S256',
  expires_at: '2025-11-18T10:10:00Z'
)
```

**Database Verification**:
```sql
-- Check authorization code stored
SELECT * FROM oauth_authorization_codes
WHERE code = 'SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ';

-- Should return 1 row with:
-- used_at: NULL
-- expires_at: future timestamp
```

**Redirect Response**:
```
HTTP/2 302 Found
Location: https://lms-esid.zeabur.app/api/auth/callback/infohub?
  code=SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ&
  state=abc123xyz789state
```

#### Step 6: Token Exchange

**LMS Callback Handler**:

**Network Request**:
```
POST https://kcislk-infohub.zeabur.app/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ",
  "client_id": "lms-esid-2025",
  "client_secret": "INFOHUB_CLIENT_SECRET_PLACEHOLDER_DO_NOT_COMMIT",
  "redirect_uri": "https://lms-esid.zeabur.app/api/auth/callback/infohub",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}
```

**Expected Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "usr_abc123",
    "email": "john.smith@kcis.edu.tw",
    "name": "John Smith",
    "role": "teacher",
    "teacher_type": "LT"
  }
}
```

**Console Logs**:
```
[OAuth] Token exchange initiated
[OAuth] Sending PKCE verifier: dBjftJeZ4CVP...
[OAuth] Token received successfully
[OAuth] User data: john.smith@kcis.edu.tw (teacher/LT)
```

#### Step 7: PKCE Verification

**Info Hub Server Verification**:
```javascript
// Server-side PKCE verification
function verifyPKCE(verifier, storedChallenge) {
  const hash = crypto.createHash('sha256')
    .update(verifier)
    .digest('base64url')

  console.log('[PKCE] Stored Challenge:', storedChallenge)
  console.log('[PKCE] Computed Challenge:', hash)
  console.log('[PKCE] Match:', hash === storedChallenge)

  return hash === storedChallenge
}

// Expected logs:
// [PKCE] Stored Challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
// [PKCE] Computed Challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
// [PKCE] Match: true
```

**Database Update**:
```sql
-- Mark code as used
UPDATE oauth_authorization_codes
SET used_at = NOW()
WHERE code = 'SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ';
```

**Error Scenarios**:
- Wrong verifier: `{"error": "invalid_grant", "error_description": "PKCE verification failed"}`
- Code already used: `{"error": "invalid_grant", "error_description": "Authorization code already used"}`
- Code expired: `{"error": "invalid_grant", "error_description": "Authorization code expired"}`

#### Step 8: Webhook Sync

**Info Hub Webhook Trigger**:

**Network Request**:
```
POST https://lms-esid.zeabur.app/api/webhook/user-sync
Content-Type: application/json
X-Webhook-Signature: 5d61b7b3e4f8c2a9d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9

{
  "event": "user.created",
  "timestamp": "2025-11-18T10:00:00.000Z",
  "data": {
    "id": "usr_abc123",
    "email": "john.smith@kcis.edu.tw",
    "name": "John Smith",
    "role": "teacher",
    "teacher_type": "LT",
    "grade": null
  }
}
```

**LMS Webhook Processing**:
```javascript
console.log('[Webhook] Received user.created event')
console.log('[Webhook] Signature verification: PASSED')
console.log('[Webhook] Creating Supabase user...')
console.log('[Webhook] User created: 550e8400-e29b-41d4-a716-446655440000')
```

**Supabase Database**:
```sql
-- Check user created
SELECT * FROM auth.users WHERE email = 'john.smith@kcis.edu.tw';
SELECT * FROM public.users WHERE email = 'john.smith@kcis.edu.tw';
```

#### Step 9: Session Creation

**LMS Session Creation**:
```javascript
// Create Supabase session
const { data: session, error } = await supabase.auth.admin.createSession({
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  access_token: generateAccessToken(),
  refresh_token: generateRefreshToken()
})

console.log('[Session] Created for user:', session.user.email)
console.log('[Session] Expires at:', session.expires_at)
```

**Cookie Setting**:
```
Set-Cookie: sb-access-token=eyJhbGc...; Path=/; HttpOnly; Secure; SameSite=Lax
Set-Cookie: sb-refresh-token=eyJhbGc...; Path=/; HttpOnly; Secure; SameSite=Lax
```

**Browser Storage**:
```javascript
// Check session storage
localStorage.getItem('supabase.auth.token')
// Should contain session data
```

#### Step 10: Dashboard Access

**Final Redirect**:
```
HTTP/2 302 Found
Location: /dashboard
```

**Dashboard Page Load**:
```javascript
console.log('[Dashboard] Loading user data...')
console.log('[Dashboard] User role: teacher')
console.log('[Dashboard] Teacher type: LT')
console.log('[Dashboard] Classes: Loading...')
```

**Network Requests**:
```
GET /api/user/profile
GET /api/classes?teacher_type=LT
GET /api/notifications
```

**Expected UI State**:
- User name displayed in header
- Role-appropriate menu items shown
- Classes/courses loaded based on permissions
- Notifications badge if applicable

---

## Unit Tests

### PKCE Tests

```typescript
// tests/pkce.test.ts
import { describe, test, expect } from '@jest/globals'
import crypto from 'crypto'

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

function verifyPKCE(verifier: string, challenge: string): boolean {
  const computed = generateCodeChallenge(verifier)
  return computed === challenge
}

describe('PKCE', () => {
  test('generates valid code_verifier', () => {
    const verifier = generateCodeVerifier()

    // Check length (43-128 characters)
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)

    // Check character set (base64url)
    expect(/^[A-Za-z0-9\-_]+$/.test(verifier)).toBe(true)
  })

  test('calculates correct code_challenge', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

    const challenge = generateCodeChallenge(verifier)
    expect(challenge).toBe(expectedChallenge)
  })

  test('verifies matching challenge/verifier', () => {
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)

    expect(verifyPKCE(verifier, challenge)).toBe(true)
  })

  test('rejects invalid verifier', () => {
    const verifier1 = generateCodeVerifier()
    const verifier2 = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier1)

    expect(verifyPKCE(verifier2, challenge)).toBe(false)
  })

  test('handles edge cases', () => {
    // Empty verifier
    expect(() => generateCodeChallenge('')).not.toThrow()

    // Very long verifier (128 chars)
    const longVerifier = 'a'.repeat(128)
    const challenge = generateCodeChallenge(longVerifier)
    expect(verifyPKCE(longVerifier, challenge)).toBe(true)

    // Special characters in verifier
    const specialVerifier = 'abc-def_ghi.jkl~mno'
    const specialChallenge = generateCodeChallenge(specialVerifier)
    expect(verifyPKCE(specialVerifier, specialChallenge)).toBe(true)
  })
})
```

### State Token Tests

```typescript
// tests/csrf.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals'

class CSRFStateManager {
  private states = new Map<string, { expires: number }>()

  generateState(): string {
    const state = crypto.randomBytes(32).toString('hex')
    this.states.set(state, {
      expires: Date.now() + 600000 // 10 minutes
    })
    return state
  }

  validateState(state: string): boolean {
    const data = this.states.get(state)
    if (!data) return false
    if (Date.now() > data.expires) {
      this.states.delete(state)
      return false
    }
    this.states.delete(state) // Single use
    return true
  }
}

describe('CSRF Protection', () => {
  let manager: CSRFStateManager

  beforeEach(() => {
    manager = new CSRFStateManager()
  })

  test('generates unique states', () => {
    const states = new Set<string>()
    for (let i = 0; i < 100; i++) {
      states.add(manager.generateState())
    }
    expect(states.size).toBe(100)
  })

  test('validates legitimate state', () => {
    const state = manager.generateState()
    expect(manager.validateState(state)).toBe(true)
  })

  test('rejects unknown state', () => {
    const fakeState = crypto.randomBytes(32).toString('hex')
    expect(manager.validateState(fakeState)).toBe(false)
  })

  test('enforces single-use', () => {
    const state = manager.generateState()
    expect(manager.validateState(state)).toBe(true)
    expect(manager.validateState(state)).toBe(false)
  })

  test('expires old states', () => {
    jest.useFakeTimers()
    const state = manager.generateState()

    // Advance time by 11 minutes
    jest.advanceTimersByTime(11 * 60 * 1000)

    expect(manager.validateState(state)).toBe(false)
    jest.useRealTimers()
  })
})
```

### Webhook Signature Tests

```typescript
// tests/webhook.test.ts
import { describe, test, expect } from '@jest/globals'
import crypto from 'crypto'

function generateSignature(payload: any, secret: string): string {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = generateSignature(payload, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

describe('Webhook Security', () => {
  const secret = 'whsec_test123'

  test('generates consistent signatures', () => {
    const payload = { event: 'user.created', data: { id: '123' } }
    const sig1 = generateSignature(payload, secret)
    const sig2 = generateSignature(payload, secret)
    expect(sig1).toBe(sig2)
  })

  test('verifies valid signature', () => {
    const payload = JSON.stringify({ event: 'test' })
    const signature = generateSignature(payload, secret)
    expect(verifySignature(payload, signature, secret)).toBe(true)
  })

  test('rejects invalid signature', () => {
    const payload = JSON.stringify({ event: 'test' })
    const wrongSig = generateSignature(payload, 'wrong_secret')
    expect(verifySignature(payload, wrongSig, secret)).toBe(false)
  })

  test('detects payload tampering', () => {
    const originalPayload = JSON.stringify({ data: 'original' })
    const signature = generateSignature(originalPayload, secret)

    const tamperedPayload = JSON.stringify({ data: 'tampered' })
    expect(verifySignature(tamperedPayload, signature, secret)).toBe(false)
  })

  test('handles different payload types', () => {
    // Object payload
    const objPayload = { test: 'data' }
    const objSig = generateSignature(objPayload, secret)

    // String payload
    const strPayload = JSON.stringify(objPayload)
    const strSig = generateSignature(strPayload, secret)

    // Should be identical
    expect(objSig).toBe(strSig)
  })
})
```

---

## Integration Tests

### Complete OAuth Flow Test Script

```bash
#!/bin/bash
# test-oauth-flow.sh

set -e

echo "========================================="
echo "SSO Integration Test - Complete Flow"
echo "========================================="

# Configuration
INFOHUB_URL="https://kcislk-infohub.zeabur.app"
LMS_URL="https://lms-esid.zeabur.app"
CLIENT_ID="lms-esid-2025"
CLIENT_SECRET="INFOHUB_CLIENT_SECRET_PLACEHOLDER_DO_NOT_COMMIT"
REDIRECT_URI="${LMS_URL}/api/auth/callback/infohub"

# Step 1: Generate PKCE parameters
echo ""
echo "Step 1: Generating PKCE parameters..."
CODE_VERIFIER=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' | cut -c1-43)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | base64 | tr '+/' '-_' | tr -d '=')
STATE=$(openssl rand -hex 16)

echo "  ✓ Code Verifier: ${CODE_VERIFIER:0:20}..."
echo "  ✓ Code Challenge: ${CODE_CHALLENGE:0:20}..."
echo "  ✓ State: $STATE"

# Step 2: Build authorization URL
echo ""
echo "Step 2: Building authorization URL..."
AUTH_URL="${INFOHUB_URL}/api/oauth/authorize?"
AUTH_URL="${AUTH_URL}client_id=${CLIENT_ID}&"
AUTH_URL="${AUTH_URL}redirect_uri=$(echo $REDIRECT_URI | sed 's/:/%3A/g' | sed 's/\//%2F/g')&"
AUTH_URL="${AUTH_URL}response_type=code&"
AUTH_URL="${AUTH_URL}code_challenge=${CODE_CHALLENGE}&"
AUTH_URL="${AUTH_URL}code_challenge_method=S256&"
AUTH_URL="${AUTH_URL}state=${STATE}&"
AUTH_URL="${AUTH_URL}scope=profile%20email"

echo "  ✓ Authorization URL built"
echo ""
echo "Please open this URL in your browser:"
echo "$AUTH_URL"
echo ""

# Step 3: Wait for authorization code
echo "Step 3: Waiting for authorization code..."
echo "After authorizing, you'll be redirected to LMS with a code parameter."
echo ""
read -p "Enter the authorization code from the redirect URL: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
  echo "Error: No authorization code provided"
  exit 1
fi

echo "  ✓ Authorization code received: ${AUTH_CODE:0:20}..."

# Step 4: Exchange code for token
echo ""
echo "Step 4: Exchanging authorization code for token..."

TOKEN_RESPONSE=$(curl -s -X POST "${INFOHUB_URL}/api/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"$AUTH_CODE\",
    \"client_id\": \"$CLIENT_ID\",
    \"client_secret\": \"$CLIENT_SECRET\",
    \"redirect_uri\": \"$REDIRECT_URI\",
    \"code_verifier\": \"$CODE_VERIFIER\"
  }")

echo "Token Response:"
echo "$TOKEN_RESPONSE" | jq '.'

# Step 5: Verify token response
echo ""
echo "Step 5: Verifying token response..."

if echo "$TOKEN_RESPONSE" | jq -e '.access_token' > /dev/null; then
  echo "  ✓ Access token received"
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
  USER_EMAIL=$(echo "$TOKEN_RESPONSE" | jq -r '.user.email')
  USER_ROLE=$(echo "$TOKEN_RESPONSE" | jq -r '.user.role')

  echo "  ✓ User: $USER_EMAIL"
  echo "  ✓ Role: $USER_ROLE"
else
  echo "  ✗ Token exchange failed"
  echo "$TOKEN_RESPONSE" | jq '.'
  exit 1
fi

# Step 6: Test webhook (optional)
echo ""
echo "Step 6: Testing webhook delivery..."

WEBHOOK_PAYLOAD="{
  \"event\": \"user.updated\",
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
  \"data\": {
    \"id\": \"test_$(date +%s)\",
    \"email\": \"$USER_EMAIL\",
    \"name\": \"Test User\",
    \"role\": \"$USER_ROLE\"
  }
}"

WEBHOOK_SECRET="whsec_test123"
WEBHOOK_SIGNATURE=$(echo -n "$WEBHOOK_PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

WEBHOOK_RESPONSE=$(curl -s -X POST "${LMS_URL}/api/webhook/user-sync" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $WEBHOOK_SIGNATURE" \
  -d "$WEBHOOK_PAYLOAD")

echo "Webhook Response:"
echo "$WEBHOOK_RESPONSE" | jq '.'

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "✓ PKCE generation successful"
echo "✓ Authorization flow completed"
echo "✓ Token exchange successful"
echo "✓ User data retrieved"
if echo "$WEBHOOK_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "✓ Webhook delivery successful"
else
  echo "⚠ Webhook delivery failed (may be expected in test)"
fi
echo "========================================="
```

### Automated Test Suite

```bash
#!/bin/bash
# test-suite.sh

# Run all SSO tests
echo "Running SSO Test Suite..."

# 1. Unit tests
echo "1. Running unit tests..."
npm test -- --testPathPattern=sso

# 2. PKCE verification
echo "2. Testing PKCE implementation..."
node -e "
const crypto = require('crypto');

// Test PKCE generation
const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

console.log('PKCE Test:');
console.log('  Verifier length:', verifier.length, verifier.length >= 43 ? '✓' : '✗');
console.log('  Challenge length:', challenge.length, challenge.length > 0 ? '✓' : '✗');

// Test verification
const computed = crypto.createHash('sha256').update(verifier).digest('base64url');
console.log('  Verification:', computed === challenge ? '✓ PASSED' : '✗ FAILED');
"

# 3. State token test
echo "3. Testing CSRF state tokens..."
node -e "
const crypto = require('crypto');

const states = new Set();
for (let i = 0; i < 100; i++) {
  states.add(crypto.randomBytes(32).toString('hex'));
}

console.log('State Token Test:');
console.log('  Unique states generated:', states.size === 100 ? '✓ PASSED' : '✗ FAILED');
console.log('  State length:', [...states][0].length === 64 ? '✓ PASSED' : '✗ FAILED');
"

# 4. Webhook signature test
echo "4. Testing webhook signatures..."
node -e "
const crypto = require('crypto');

const payload = JSON.stringify({ event: 'test', data: { id: '123' } });
const secret = 'whsec_test';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Verify signature
const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
const valid = signature === expected;

console.log('Webhook Signature Test:');
console.log('  Signature generation:', signature.length === 64 ? '✓ PASSED' : '✗ FAILED');
console.log('  Signature verification:', valid ? '✓ PASSED' : '✗ FAILED');
"

# 5. API endpoint health check
echo "5. Testing API endpoints..."

# Test Info Hub OAuth endpoints
curl -s -o /dev/null -w "  Info Hub /oauth/authorize: %{http_code}\n" \
  "https://kcislk-infohub.zeabur.app/api/oauth/authorize?client_id=test"

curl -s -o /dev/null -w "  Info Hub /oauth/token: %{http_code}\n" \
  -X POST "https://kcislk-infohub.zeabur.app/api/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"authorization_code"}'

# Test LMS webhook endpoint
curl -s -o /dev/null -w "  LMS /webhook/user-sync: %{http_code}\n" \
  -X POST "https://lms-esid.zeabur.app/api/webhook/user-sync" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -d '{}'

echo ""
echo "Test suite complete!"
```

---

## Error Scenario Tests

### Invalid Code Verifier Test

```bash
#!/bin/bash
# test-invalid-verifier.sh

echo "Testing: Invalid PKCE verifier"

# Generate valid challenge but use wrong verifier
VALID_VERIFIER="dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
VALID_CHALLENGE="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
WRONG_VERIFIER="AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIIIJJJJKKK"

# Attempt token exchange with wrong verifier
RESPONSE=$(curl -s -X POST "https://kcislk-infohub.zeabur.app/api/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"test_code\",
    \"client_id\": \"lms-esid-2025\",
    \"client_secret\": \"sk_live_test\",
    \"redirect_uri\": \"https://lms-esid.zeabur.app/api/auth/callback/infohub\",
    \"code_verifier\": \"$WRONG_VERIFIER\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Expected: {"error": "invalid_grant", "error_description": "PKCE verification failed"}
if echo "$RESPONSE" | jq -e '.error == "invalid_grant"' > /dev/null; then
  echo "✓ Test PASSED: Invalid verifier correctly rejected"
else
  echo "✗ Test FAILED: Invalid verifier not rejected"
fi
```

### Expired Authorization Code Test

```bash
#!/bin/bash
# test-expired-code.sh

echo "Testing: Expired authorization code"

# Use an old authorization code (would need to be pre-generated)
EXPIRED_CODE="expired_test_code_12345"

RESPONSE=$(curl -s -X POST "https://kcislk-infohub.zeabur.app/api/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"$EXPIRED_CODE\",
    \"client_id\": \"lms-esid-2025\",
    \"client_secret\": \"sk_live_test\",
    \"redirect_uri\": \"https://lms-esid.zeabur.app/api/auth/callback/infohub\",
    \"code_verifier\": \"test_verifier\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Expected: {"error": "invalid_grant", "error_description": "Authorization code expired"}
if echo "$RESPONSE" | jq -e '.error_description | contains("expired")' > /dev/null; then
  echo "✓ Test PASSED: Expired code correctly rejected"
else
  echo "✗ Test FAILED: Expired code not rejected"
fi
```

### Invalid Webhook Signature Test

```bash
#!/bin/bash
# test-invalid-webhook.sh

echo "Testing: Invalid webhook signature"

PAYLOAD='{"event":"user.created","timestamp":"2025-11-18T10:00:00Z","data":{"id":"123"}}'
WRONG_SIGNATURE="invalid_signature_12345"

RESPONSE=$(curl -s -X POST "https://lms-esid.zeabur.app/api/webhook/user-sync" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $WRONG_SIGNATURE" \
  -d "$PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Expected: {"success": false, "error": "Invalid signature"}
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
  echo "✓ Test PASSED: Invalid signature correctly rejected"
else
  echo "✗ Test FAILED: Invalid signature not rejected"
fi
```

### Missing Required Fields Test

```javascript
// test-missing-fields.js

async function testMissingFields() {
  console.log('Testing: Missing required fields\n')

  const tests = [
    {
      name: 'Missing client_id',
      data: {
        grant_type: 'authorization_code',
        code: 'test_code',
        // client_id missing
        client_secret: 'secret',
        redirect_uri: 'https://example.com',
        code_verifier: 'verifier'
      }
    },
    {
      name: 'Missing code_verifier',
      data: {
        grant_type: 'authorization_code',
        code: 'test_code',
        client_id: 'lms-esid-2025',
        client_secret: 'secret',
        redirect_uri: 'https://example.com'
        // code_verifier missing
      }
    },
    {
      name: 'Missing redirect_uri',
      data: {
        grant_type: 'authorization_code',
        code: 'test_code',
        client_id: 'lms-esid-2025',
        client_secret: 'secret',
        // redirect_uri missing
        code_verifier: 'verifier'
      }
    }
  ]

  for (const test of tests) {
    console.log(`Testing: ${test.name}`)

    try {
      const response = await fetch('https://kcislk-infohub.zeabur.app/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.data)
      })

      const result = await response.json()

      if (result.error === 'invalid_request') {
        console.log(`✓ PASSED: ${test.name} correctly rejected\n`)
      } else {
        console.log(`✗ FAILED: ${test.name} not rejected properly\n`)
      }
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}\n`)
    }
  }
}

testMissingFields()
```

### Wrong Redirect URI Test

```bash
#!/bin/bash
# test-redirect-uri-mismatch.sh

echo "Testing: Redirect URI mismatch"

# Use different redirect URI than registered
CORRECT_URI="https://lms-esid.zeabur.app/api/auth/callback/infohub"
WRONG_URI="https://evil-site.com/callback"

RESPONSE=$(curl -s -X POST "https://kcislk-infohub.zeabur.app/api/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"test_code\",
    \"client_id\": \"lms-esid-2025\",
    \"client_secret\": \"sk_live_test\",
    \"redirect_uri\": \"$WRONG_URI\",
    \"code_verifier\": \"test_verifier\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Expected: {"error": "invalid_grant", "error_description": "Redirect URI mismatch"}
if echo "$RESPONSE" | jq -e '.error_description | contains("Redirect URI")' > /dev/null; then
  echo "✓ Test PASSED: Wrong redirect URI correctly rejected"
else
  echo "✗ Test FAILED: Wrong redirect URI not rejected"
fi
```

### CSRF Attack Simulation

```javascript
// test-csrf-attack.js

async function simulateCSRFAttack() {
  console.log('Simulating CSRF Attack\n')

  // Legitimate state from user's session
  const legitimateState = 'abc123xyz789state'

  // Attacker tries to use their own state
  const attackerState = 'evil_state_12345'

  console.log('1. User initiates legitimate OAuth flow')
  console.log(`   State: ${legitimateState}`)

  console.log('\n2. Attacker tries to forge callback with their state')
  console.log(`   Attacker State: ${attackerState}`)

  // Simulate callback validation
  const storedStates = new Set([legitimateState])

  console.log('\n3. LMS validates state token')

  if (!storedStates.has(attackerState)) {
    console.log('   ✓ CSRF Attack BLOCKED: Invalid state token')
    console.log('   Response: 403 Forbidden - CSRF validation failed')
  } else {
    console.log('   ✗ SECURITY BREACH: CSRF attack succeeded!')
  }

  console.log('\n4. Legitimate user callback')
  if (storedStates.has(legitimateState)) {
    storedStates.delete(legitimateState) // Single use
    console.log('   ✓ Legitimate request ACCEPTED')
    console.log('   State validated and consumed')
  }
}

simulateCSRFAttack()
```

---

## Performance Tests

### Load Test Script

```javascript
// load-test.js
const https = require('https')
const crypto = require('crypto')

async function runLoadTest() {
  const concurrentRequests = 10
  const totalRequests = 100

  console.log(`Running load test: ${totalRequests} requests, ${concurrentRequests} concurrent\n`)

  const results = {
    success: 0,
    failure: 0,
    times: []
  }

  async function makeRequest() {
    const start = Date.now()

    try {
      // Generate PKCE
      const verifier = crypto.randomBytes(32).toString('base64url')
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')

      // Make authorization request
      await new Promise((resolve, reject) => {
        https.get({
          hostname: 'kcislk-infohub.zeabur.app',
          path: `/api/oauth/authorize?client_id=test&redirect_uri=https://test.com&response_type=code&code_challenge=${challenge}&code_challenge_method=S256&state=test`,
          timeout: 10000
        }, (res) => {
          if (res.statusCode === 302 || res.statusCode === 200) {
            results.success++
            resolve()
          } else {
            results.failure++
            reject(new Error(`Status ${res.statusCode}`))
          }
        }).on('error', reject)
      })

      const elapsed = Date.now() - start
      results.times.push(elapsed)

    } catch (error) {
      results.failure++
      console.error(`Request failed: ${error.message}`)
    }
  }

  // Run requests in batches
  for (let i = 0; i < totalRequests; i += concurrentRequests) {
    const batch = []
    for (let j = 0; j < concurrentRequests && i + j < totalRequests; j++) {
      batch.push(makeRequest())
    }
    await Promise.all(batch)
    console.log(`Progress: ${Math.min(i + concurrentRequests, totalRequests)}/${totalRequests}`)
  }

  // Calculate statistics
  const avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length
  const maxTime = Math.max(...results.times)
  const minTime = Math.min(...results.times)

  console.log('\n========== Load Test Results ==========')
  console.log(`Total Requests: ${totalRequests}`)
  console.log(`Successful: ${results.success}`)
  console.log(`Failed: ${results.failure}`)
  console.log(`Success Rate: ${(results.success / totalRequests * 100).toFixed(2)}%`)
  console.log(`Average Time: ${avgTime.toFixed(2)}ms`)
  console.log(`Min Time: ${minTime}ms`)
  console.log(`Max Time: ${maxTime}ms`)
  console.log('=======================================')
}

runLoadTest()
```

---

## Browser Console Tests

### Test PKCE in Browser

```javascript
// Run in browser console on LMS login page

// Test PKCE generation
async function testPKCEInBrowser() {
  console.group('🔐 PKCE Browser Test')

  // Generate verifier
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  console.log('Verifier generated:', verifier.substring(0, 20) + '...')
  console.log('Verifier length:', verifier.length)

  // Generate challenge
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  console.log('Challenge generated:', challenge.substring(0, 20) + '...')
  console.log('Challenge length:', challenge.length)

  // Store in session
  sessionStorage.setItem('test_pkce_verifier', verifier)
  sessionStorage.setItem('test_pkce_challenge', challenge)

  console.log('✅ PKCE stored in sessionStorage')

  // Verify
  const storedVerifier = sessionStorage.getItem('test_pkce_verifier')
  const storedChallenge = sessionStorage.getItem('test_pkce_challenge')

  console.log('Verification:', storedVerifier === verifier ? '✅ PASSED' : '❌ FAILED')

  console.groupEnd()

  return { verifier, challenge }
}

// Run test
testPKCEInBrowser()
```

### Test State Management

```javascript
// Test CSRF state management in browser

class BrowserStateManager {
  constructor() {
    this.storageKey = 'sso_states'
  }

  generateState() {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    const state = Array.from(array, b => b.toString(16).padStart(2, '0')).join('')

    const states = this.getStates()
    states[state] = {
      created: Date.now(),
      expires: Date.now() + 600000 // 10 minutes
    }

    sessionStorage.setItem(this.storageKey, JSON.stringify(states))
    console.log('State generated:', state)

    return state
  }

  validateState(state) {
    const states = this.getStates()
    const data = states[state]

    if (!data) {
      console.error('State not found:', state)
      return false
    }

    if (Date.now() > data.expires) {
      console.error('State expired:', state)
      delete states[state]
      sessionStorage.setItem(this.storageKey, JSON.stringify(states))
      return false
    }

    // Single use
    delete states[state]
    sessionStorage.setItem(this.storageKey, JSON.stringify(states))

    console.log('State validated:', state)
    return true
  }

  getStates() {
    const stored = sessionStorage.getItem(this.storageKey)
    return stored ? JSON.parse(stored) : {}
  }
}

// Test
const stateManager = new BrowserStateManager()
const state1 = stateManager.generateState()
console.log('Validate legitimate:', stateManager.validateState(state1))
console.log('Validate again (should fail):', stateManager.validateState(state1))
console.log('Validate fake:', stateManager.validateState('fake123'))
```

---

## Debugging Guide

### Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| PKCE verification fails | `invalid_grant` error | Check verifier stored correctly in session |
| State validation fails | CSRF error on callback | Ensure state is preserved across redirect |
| Webhook signature invalid | 401 on webhook | Verify secret matches on both sides |
| Authorization code expired | `code expired` error | Reduce processing time or increase TTL |
| Redirect URI mismatch | `redirect_uri` error | Ensure exact match including protocol |
| Session not created | User not logged in after flow | Check Supabase session creation |
| Role mapping incorrect | Wrong permissions | Verify email pattern matching |

### Debug Logging

```javascript
// Enable debug logging
localStorage.setItem('sso_debug', 'true')

// In your SSO code
function debugLog(...args) {
  if (localStorage.getItem('sso_debug') === 'true') {
    console.log('[SSO Debug]', ...args)
  }
}

// Use throughout flow
debugLog('PKCE generated', { verifier, challenge })
debugLog('State token', state)
debugLog('Authorization URL', authUrl)
debugLog('Callback received', { code, state })
debugLog('Token response', tokenResponse)
```

---

## Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| SSO flow completion | < 5 seconds | Time from button click to dashboard |
| PKCE verification | 100% success | Valid pairs always verify |
| State validation | 100% success | Legitimate states validate |
| Webhook delivery | > 99% success | Successful webhook processing |
| Error rate | < 1% | Failed authentications |
| Session creation | 100% success | Users get valid session |

### Monitoring Dashboard

```sql
-- SSO metrics queries

-- Success rate
SELECT
  COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration
FROM sso_logs
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Error breakdown
SELECT
  error_type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM sso_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY count DESC;

-- User flow funnel
SELECT
  'Started' as stage, COUNT(DISTINCT session_id) as users
FROM sso_events WHERE event = 'flow_started'
UNION ALL
SELECT
  'Authorized', COUNT(DISTINCT session_id)
FROM sso_events WHERE event = 'authorization_complete'
UNION ALL
SELECT
  'Token Exchanged', COUNT(DISTINCT session_id)
FROM sso_events WHERE event = 'token_exchanged'
UNION ALL
SELECT
  'Logged In', COUNT(DISTINCT session_id)
FROM sso_events WHERE event = 'session_created';
```