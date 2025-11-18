# SSO API Contract Specification

> **Document Version**: 1.0
> **Last Updated**: 2025-11-18
> **Purpose**: Complete API specifications for Info Hub ↔ LMS SSO integration

---

## OAuth 2.0 Authorization Endpoint

### `GET /api/oauth/authorize`

**Purpose**: Initiate OAuth 2.0 authorization code flow with PKCE

#### Request (Query Parameters)

```typescript
interface AuthorizationRequest {
  client_id: string        // OAuth client identifier
  redirect_uri: string     // Callback URL (must be pre-registered)
  response_type: 'code'    // Always 'code' for authorization code flow
  code_challenge: string   // PKCE challenge (base64url encoded SHA256 hash)
  code_challenge_method: 'S256'  // Always 'S256' for SHA256
  state: string           // CSRF protection token (min 16 chars)
  scope?: string          // Space-separated scopes (default: 'profile email')
}
```

#### Zod Validation Schema

```typescript
import { z } from 'zod'

export const authorizeRequestSchema = z.object({
  client_id: z.string()
    .min(1, 'Client ID is required')
    .max(255, 'Client ID too long'),

  redirect_uri: z.string()
    .url('Invalid redirect URI')
    .refine(uri => uri.startsWith('https://'), 'Redirect URI must use HTTPS'),

  response_type: z.literal('code'),

  code_challenge: z.string()
    .min(43, 'Code challenge too short')
    .max(128, 'Code challenge too long')
    .regex(/^[A-Za-z0-9\-._~]+$/, 'Invalid code challenge format'),

  code_challenge_method: z.literal('S256'),

  state: z.string()
    .min(16, 'State too short for security')
    .max(500, 'State too long'),

  scope: z.string()
    .regex(/^[a-z\s]+$/, 'Invalid scope format')
    .optional()
    .default('profile email')
})
```

#### Response (Redirect)

**Success Response (302 Redirect)**:
```
Location: https://lms.kcis.com/api/auth/callback/infohub?code=SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ&state=xyz789state
```

**Error Response (302 Redirect)**:
```
Location: https://lms.kcis.com/api/auth/callback/infohub?error=invalid_request&error_description=Invalid+client_id&state=xyz789state
```

#### Error Codes

| Error | Description | HTTP Status |
|-------|-------------|------------|
| `invalid_request` | Missing or invalid parameters | 302 (redirect with error) |
| `unauthorized_client` | Client not authorized | 302 (redirect with error) |
| `access_denied` | User denied authorization | 302 (redirect with error) |
| `unsupported_response_type` | Response type not 'code' | 302 (redirect with error) |
| `invalid_scope` | Invalid scope requested | 302 (redirect with error) |
| `server_error` | Internal server error | 500 (JSON response) |

#### Complete cURL Example

```bash
# Full authorization request
curl -v -G "https://kcislk-infohub.zeabur.app/api/oauth/authorize" \
  --data-urlencode "client_id=lms-esid-2025" \
  --data-urlencode "redirect_uri=https://lms-esid.zeabur.app/api/auth/callback/infohub" \
  --data-urlencode "response_type=code" \
  --data-urlencode "code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM" \
  --data-urlencode "code_challenge_method=S256" \
  --data-urlencode "state=abc123xyz789state" \
  --data-urlencode "scope=profile email"

# Response headers will include:
# < HTTP/2 302
# < Location: https://lms-esid.zeabur.app/api/auth/callback/infohub?code=SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ&state=abc123xyz789state
```

---

## OAuth 2.0 Token Endpoint

### `POST /api/oauth/token`

**Purpose**: Exchange authorization code for user data with PKCE verification

#### Request (JSON Body)

```typescript
interface TokenRequest {
  grant_type: 'authorization_code'  // Always 'authorization_code'
  code: string                      // Authorization code from /authorize
  client_id: string                 // OAuth client identifier
  client_secret: string             // OAuth client secret
  redirect_uri: string              // Must match /authorize request
  code_verifier: string             // PKCE verifier (43-128 chars)
}
```

#### Zod Validation Schema

```typescript
import { z } from 'zod'

export const tokenRequestSchema = z.object({
  grant_type: z.literal('authorization_code'),

  code: z.string()
    .min(20, 'Invalid authorization code')
    .max(500, 'Authorization code too long'),

  client_id: z.string()
    .min(1, 'Client ID is required')
    .max(255, 'Client ID too long'),

  client_secret: z.string()
    .min(32, 'Invalid client secret')
    .max(255, 'Client secret too long'),

  redirect_uri: z.string()
    .url('Invalid redirect URI')
    .refine(uri => uri.startsWith('https://'), 'Redirect URI must use HTTPS'),

  code_verifier: z.string()
    .min(43, 'Code verifier too short')
    .max(128, 'Code verifier too long')
    .regex(/^[A-Za-z0-9\-._~]+$/, 'Invalid code verifier format')
})
```

#### Response (JSON)

**Success Response (200 OK)**:

```typescript
interface TokenResponse {
  access_token: string    // Base64 encoded user data (temporary)
  token_type: 'Bearer'    // Always 'Bearer'
  expires_in: 3600        // Token lifetime in seconds
  user: {
    id: string           // Info Hub user ID
    email: string        // User email
    name: string         // Full name
    role: 'admin' | 'head' | 'teacher'
    teacher_type?: 'LT' | 'IT' | 'KCFS'
    grade?: number       // 1-6 for grade level
  }
}
```

**Example Success Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIiwiZW1haWwiOiJqb2huLnNtaXRoQGtjaXMuZWR1LnR3IiwiZXhwaXJlc19hdCI6MTcwMDAwMDAwMDAwMH0.abc123",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "usr_abc123xyz",
    "email": "john.smith@kcis.edu.tw",
    "name": "John Smith",
    "role": "teacher",
    "teacher_type": "LT",
    "grade": null
  }
}
```

**Error Response (400/401 Bad Request)**:

```typescript
interface TokenErrorResponse {
  error: string              // OAuth error code
  error_description: string  // Human-readable description
  details?: any             // Optional validation details
}
```

**Example Error Response**:
```json
{
  "error": "invalid_grant",
  "error_description": "PKCE verification failed",
  "details": {
    "expected_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    "received_verifier_hash": "L7v2w3Xm9Yz1AbC4DeF6GhI8JkL0MnO2PqR4StU6VwX8"
  }
}
```

#### HTTP Status Codes

| Status | Condition |
|--------|-----------|
| 200 | Successful token exchange |
| 400 | Invalid request (bad code, expired, PKCE mismatch) |
| 401 | Invalid client credentials |
| 500 | Internal server error |

#### Complete cURL Example

```bash
# Token exchange request
curl -X POST https://kcislk-infohub.zeabur.app/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "SplxlOBeZQQYbYS6WxSbIA52cz3H5kFJ",
    "client_id": "lms-esid-2025",
    "client_secret": "INFOHUB_CLIENT_SECRET_PLACEHOLDER_DO_NOT_COMMIT",
    "redirect_uri": "https://lms-esid.zeabur.app/api/auth/callback/infohub",
    "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
  }'

# Success response:
# HTTP/2 200
# {
#   "access_token": "eyJhbGci...",
#   "token_type": "Bearer",
#   "expires_in": 3600,
#   "user": { ... }
# }
```

---

## Webhook User Sync Endpoint

### `POST /api/webhook/user-sync` (LMS Receiver)

**Purpose**: Receive user data from Info Hub for synchronization

#### Request Headers

```typescript
interface WebhookHeaders {
  'Content-Type': 'application/json'
  'X-Webhook-Signature': string  // HMAC-SHA256 signature
}
```

#### Request Body

```typescript
interface UserSyncPayload {
  event: 'user.created' | 'user.updated' | 'user.deleted'
  timestamp: string  // ISO 8601 format
  data: {
    id: string       // Info Hub user ID
    email: string
    name: string
    role: 'admin' | 'head' | 'teacher'
    teacher_type?: 'LT' | 'IT' | 'KCFS'
    grade?: number   // 1-6 for grade level
    track?: 'local' | 'international'
    metadata?: {
      google_id?: string
      picture?: string
      last_login?: string
      [key: string]: any
    }
  }
}
```

#### Zod Validation Schema

```typescript
import { z } from 'zod'

export const userSyncPayloadSchema = z.object({
  event: z.enum(['user.created', 'user.updated', 'user.deleted']),

  timestamp: z.string()
    .refine(ts => !isNaN(Date.parse(ts)), 'Invalid timestamp'),

  data: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1).max(255),
    role: z.enum(['admin', 'head', 'teacher']),
    teacher_type: z.enum(['LT', 'IT', 'KCFS']).optional(),
    grade: z.number().int().min(1).max(6).optional(),
    track: z.enum(['local', 'international']).optional(),
    metadata: z.record(z.any()).optional()
  })
})
```

#### Signature Calculation (Info Hub - Node.js)

```typescript
import crypto from 'crypto'

function generateWebhookSignature(
  payload: UserSyncPayload,
  secret: string
): string {
  const data = JSON.stringify(payload)
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
}

// Example usage
const payload: UserSyncPayload = {
  event: 'user.created',
  timestamp: '2025-11-18T10:30:00.000Z',
  data: {
    id: 'usr_abc123',
    email: 'john.smith@kcis.edu.tw',
    name: 'John Smith',
    role: 'teacher',
    teacher_type: 'LT',
    grade: 4
  }
}

const secret = 'whsec_K7w2v9Xm5Yz3AbC6DeF8GhI0JkL2MnO4'
const signature = generateWebhookSignature(payload, secret)
console.log('X-Webhook-Signature:', signature)
// Output: X-Webhook-Signature: 5d61b7b3e4f8c2a9d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9
```

#### Signature Verification (LMS - TypeScript)

```typescript
import crypto from 'crypto'

function verifyWebhookSignature(
  payload: string,      // Raw request body
  signature: string,    // From X-Webhook-Signature header
  secret: string       // Shared webhook secret
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// Example usage in API route
export async function POST(request: Request) {
  const signature = request.headers.get('X-Webhook-Signature')
  const rawBody = await request.text()
  const secret = process.env.WEBHOOK_SECRET!

  if (!verifyWebhookSignature(rawBody, signature!, secret)) {
    return new Response('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  // Process webhook...
}
```

#### Response

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "User synchronized successfully",
  "data": {
    "supabase_id": "550e8400-e29b-41d4-a716-446655440000",
    "synced_at": "2025-11-18T10:30:05.123Z"
  }
}
```

**Error Response (400/401/500)**:
```json
{
  "success": false,
  "error": "Invalid signature",
  "details": "HMAC verification failed"
}
```

#### Complete cURL Example

```bash
# Calculate signature
PAYLOAD='{"event":"user.created","timestamp":"2025-11-18T10:30:00.000Z","data":{"id":"usr_abc123","email":"john.smith@kcis.edu.tw","name":"John Smith","role":"teacher","teacher_type":"LT","grade":4}}'
SECRET='whsec_K7w2v9Xm5Yz3AbC6DeF8GhI0JkL2MnO4'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Send webhook
curl -X POST https://lms-esid.zeabur.app/api/webhook/user-sync \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d "$PAYLOAD"

# Expected response:
# HTTP/2 200
# {
#   "success": true,
#   "message": "User synchronized successfully",
#   "data": {
#     "supabase_id": "550e8400-e29b-41d4-a716-446655440000",
#     "synced_at": "2025-11-18T10:30:05.123Z"
#   }
# }
```

---

## Complete TypeScript Interfaces

### Shared Types (`/types/sso-api.ts`)

```typescript
// ============================================
// OAuth 2.0 Types
// ============================================

export interface OAuthClientConfig {
  client_id: string
  client_secret: string
  redirect_uris: string[]
  allowed_scopes: string[]
}

export interface AuthorizationCode {
  code: string
  client_id: string
  user_id: string
  redirect_uri: string
  scope?: string
  code_challenge?: string
  code_challenge_method?: 'S256' | 'plain'
  expires_at: Date
  used_at?: Date
}

// ============================================
// User Types
// ============================================

export type UserRole = 'admin' | 'head' | 'teacher'
export type TeacherType = 'LT' | 'IT' | 'KCFS'
export type TrackType = 'local' | 'international'

export interface SSOUser {
  id: string
  email: string
  name: string
  role: UserRole
  teacher_type?: TeacherType
  grade?: number
  track?: TrackType
  metadata?: Record<string, any>
}

// ============================================
// API Request/Response Types
// ============================================

export interface OAuthAuthorizeParams {
  client_id: string
  redirect_uri: string
  response_type: 'code'
  code_challenge: string
  code_challenge_method: 'S256'
  state: string
  scope?: string
}

export interface OAuthTokenRequest {
  grant_type: 'authorization_code'
  code: string
  client_id: string
  client_secret: string
  redirect_uri: string
  code_verifier: string
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: SSOUser
}

export interface OAuthErrorResponse {
  error: string
  error_description: string
  details?: any
}

export interface WebhookPayload<T = any> {
  event: string
  timestamp: string
  data: T
}

export interface UserSyncWebhookPayload extends WebhookPayload<SSOUser> {
  event: 'user.created' | 'user.updated' | 'user.deleted'
}

export interface WebhookResponse {
  success: boolean
  message?: string
  error?: string
  data?: any
}

// ============================================
// Utility Types
// ============================================

export interface PKCEParams {
  code_verifier: string
  code_challenge: string
  code_challenge_method: 'S256'
}

export interface CSRFState {
  state: string
  created_at: number
  expires_at: number
  data?: Record<string, any>
}
```

---

## Error Handling Best Practices

### OAuth Error Response Format

All OAuth errors should follow RFC 6749 Section 5.2:

```typescript
interface OAuthError {
  error: 'invalid_request' | 'invalid_client' | 'invalid_grant' |
         'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' |
         'server_error' | 'temporarily_unavailable'
  error_description?: string
  error_uri?: string
}
```

### Error Handling Example

```typescript
// Info Hub OAuth endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = tokenRequestSchema.safeParse(body)

    if (!validation.success) {
      return Response.json({
        error: 'invalid_request',
        error_description: 'Invalid request parameters',
        details: validation.error.flatten()
      }, { status: 400 })
    }

    // Process request...

  } catch (error) {
    console.error('Token endpoint error:', error)

    // Never expose internal errors
    return Response.json({
      error: 'server_error',
      error_description: 'An unexpected error occurred'
    }, { status: 500 })
  }
}
```

### Webhook Error Handling

```typescript
// LMS webhook receiver
export async function POST(request: Request) {
  // Verify signature first
  const signature = request.headers.get('X-Webhook-Signature')
  if (!signature) {
    return Response.json({
      success: false,
      error: 'Missing signature header'
    }, { status: 401 })
  }

  try {
    const rawBody = await request.text()

    // Verify signature
    if (!verifySignature(rawBody, signature)) {
      return Response.json({
        success: false,
        error: 'Invalid signature'
      }, { status: 401 })
    }

    // Parse and validate
    const payload = JSON.parse(rawBody)
    const validation = userSyncPayloadSchema.safeParse(payload)

    if (!validation.success) {
      return Response.json({
        success: false,
        error: 'Invalid payload',
        details: validation.error.flatten()
      }, { status: 400 })
    }

    // Process webhook...

    return Response.json({
      success: true,
      message: 'Webhook processed successfully'
    })

  } catch (error) {
    console.error('Webhook error:', error)

    return Response.json({
      success: false,
      error: 'Processing failed',
      details: error.message
    }, { status: 500 })
  }
}
```

---

## Rate Limiting & Security Headers

### Recommended Headers

```typescript
// OAuth endpoints
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
}

// Rate limiting (example with express-rate-limit)
const rateLimiter = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  message: 'Too many requests'
}
```

---

## Testing Endpoints

### Health Check

```bash
# Info Hub OAuth health check
curl https://kcislk-infohub.zeabur.app/api/oauth/health

# Expected: {"status":"healthy","endpoints":["/authorize","/token"]}
```

### Complete Flow Test

```bash
#!/bin/bash
# test-sso-flow.sh

# 1. Generate PKCE
VERIFIER=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
CHALLENGE=$(echo -n "$VERIFIER" | openssl dgst -binary -sha256 | base64 | tr '+/' '-_' | tr -d '=')
STATE=$(openssl rand -hex 16)

echo "PKCE Verifier: $VERIFIER"
echo "PKCE Challenge: $CHALLENGE"
echo "State: $STATE"

# 2. Build authorization URL
AUTH_URL="https://kcislk-infohub.zeabur.app/api/oauth/authorize?"
AUTH_URL="${AUTH_URL}client_id=lms-esid-2025&"
AUTH_URL="${AUTH_URL}redirect_uri=https%3A%2F%2Flms-esid.zeabur.app%2Fapi%2Fauth%2Fcallback%2Finfohub&"
AUTH_URL="${AUTH_URL}response_type=code&"
AUTH_URL="${AUTH_URL}code_challenge=${CHALLENGE}&"
AUTH_URL="${AUTH_URL}code_challenge_method=S256&"
AUTH_URL="${AUTH_URL}state=${STATE}&"
AUTH_URL="${AUTH_URL}scope=profile%20email"

echo "Authorization URL: $AUTH_URL"

# 3. After getting code, exchange for token
read -p "Enter authorization code: " CODE

curl -X POST https://kcislk-infohub.zeabur.app/api/oauth/token \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"$CODE\",
    \"client_id\": \"lms-esid-2025\",
    \"client_secret\": \"INFOHUB_CLIENT_SECRET_PLACEHOLDER_DO_NOT_COMMIT\",
    \"redirect_uri\": \"https://lms-esid.zeabur.app/api/auth/callback/infohub\",
    \"code_verifier\": \"$VERIFIER\"
  }"
```