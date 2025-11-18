# Info Hub SSO Integration - Technical Specification Summary

> **Version**: 1.0.0
> **Date**: 2025-11-18
> **Status**: LMS Implementation Complete ✅ | Info Hub Implementation Pending ⏳

---

## 📋 Overview

This document provides a complete technical specification for the SSO integration between **Info Hub** (Identity Provider) and **LMS** (Service Provider) using OAuth 2.0 with PKCE.

### Key Objectives

1. ✅ **Unified Authentication**: Users login once via Info Hub, access both systems
2. ✅ **Zero Service Key Sharing**: LMS maintains complete control over Supabase
3. ✅ **Industry Standard**: OAuth 2.0 + PKCE (RFC 7636)
4. ✅ **Security First**: PKCE, CSRF protection, Webhook signature verification

---

## 🔄 OAuth 2.0 + PKCE Flow Diagram

```
┌─────────┐                                    ┌──────────┐                                    ┌─────────┐
│   User  │                                    │ Info Hub │                                    │   LMS   │
└────┬────┘                                    └────┬─────┘                                    └────┬────┘
     │                                              │                                               │
     │ 1. Click "Login with Info Hub SSO"           │                                               │
     │──────────────────────────────────────────────┼──────────────────────────────────────────────>│
     │                                              │                                               │
     │                                              │  2. Generate PKCE challenge                   │
     │                                              │     code_verifier (random 43-128 chars)       │
     │                                              │     code_challenge = SHA256(code_verifier)    │
     │<─────────────────────────────────────────────┼───────────────────────────────────────────────│
     │                                              │                                               │
     │ 3. Redirect to /oauth/authorize              │                                               │
     │    + client_id, redirect_uri,                │                                               │
     │      code_challenge, state, scope            │                                               │
     │─────────────────────────────────────────────>│                                               │
     │                                              │                                               │
     │ 4. Show Google OAuth login                   │                                               │
     │<─────────────────────────────────────────────│                                               │
     │                                              │                                               │
     │ 5. User authorizes with Google               │                                               │
     │─────────────────────────────────────────────>│                                               │
     │                                              │                                               │
     │                                              │  6. Verify user, create authorization_code    │
     │                                              │     Store: code, code_challenge, redirect_uri │
     │                                              │                                               │
     │ 7. Redirect to LMS callback                  │                                               │
     │    + authorization_code, state                │                                               │
     │<─────────────────────────────────────────────│                                               │
     │                                              │                                               │
     │ 8. LMS verifies state (CSRF protection)      │                                               │
     │──────────────────────────────────────────────┼──────────────────────────────────────────────>│
     │                                              │                                               │
     │ 9. POST /oauth/token                         │                                               │
     │    + code, code_verifier, redirect_uri       │                                               │
     │<─────────────────────────────────────────────┼───────────────────────────────────────────────│
     │──────────────────────────────────────────────>│                                               │
     │                                              │                                               │
     │                                              │  10. Verify PKCE:                             │
     │                                              │      SHA256(code_verifier) == code_challenge  │
     │                                              │      Verify redirect_uri matches              │
     │                                              │      Delete authorization_code (single-use)   │
     │                                              │                                               │
     │ 11. Return user data (email, role, etc.)     │                                               │
     │<─────────────────────────────────────────────│                                               │
     │──────────────────────────────────────────────┼──────────────────────────────────────────────>│
     │                                              │                                               │
     │                                              │  12. Trigger webhook: user.created/updated    │
     │                                              │      POST https://lms.com/api/webhook/user-sync│
     │                                              │      + user data, signature                   │
     │                                              │──────────────────────────────────────────────>│
     │                                              │                                               │
     │                                              │                                               │  13. Verify webhook signature
     │                                              │                                               │      Create/update user in Supabase
     │                                              │                                               │
     │                                              │  14. Webhook success                          │
     │                                              │<──────────────────────────────────────────────│
     │                                              │                                               │
     │                                              │                                               │  15. Create Supabase session (OTP)
     │                                              │                                               │      Redirect to dashboard
     │ 16. User logged into LMS                     │                                               │
     │<─────────────────────────────────────────────┼───────────────────────────────────────────────│
     │                                              │                                               │
```

---

## 🔧 System Components

### Info Hub (Identity Provider) - **TO BE IMPLEMENTED**

| Component | Status | Description |
|-----------|--------|-------------|
| OAuth Authorization Server | ⏳ Pending | `/api/oauth/authorize`, `/api/oauth/token` |
| Google OAuth Integration | ⏳ Pending | Google SSO for user authentication |
| PKCE Verification | ⏳ Pending | Validate code_challenge against code_verifier |
| User Sync Webhook Sender | ⏳ Pending | Trigger LMS user sync on auth success |
| Role Mapping Logic | ⏳ Pending | Map Info Hub roles → LMS roles |
| Admin UI | ⏳ Pending | Configure SSO settings, client credentials |

### LMS (Service Provider) - **IMPLEMENTED ✅**

| Component | Status | Description |
|-----------|--------|-------------|
| OAuth Client (PKCE) | ✅ Complete | Generate code_verifier, code_challenge |
| SSO Login UI | ✅ Complete | `/components/auth/SSOLoginButton.tsx` |
| OAuth Callback Handler | ✅ Complete | `/app/api/auth/callback/infohub/route.ts` |
| Webhook Receiver | ✅ Complete | `/app/api/webhook/user-sync/route.ts` |
| Session Management | ✅ Complete | `/app/auth/set-session/page.tsx` |
| RLS Policies | ✅ Complete | Fixed in Migration 019e |

---

## 📊 Database Schema Requirements

### Info Hub Database Changes

#### 1. Add SSO Fields to Users Table

```sql
-- Add SSO provider tracking
ALTER TABLE users ADD COLUMN sso_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN sso_id VARCHAR(255);
ALTER TABLE users ADD COLUMN teacher_type VARCHAR(10); -- 'LT', 'IT', 'KCFS'
ALTER TABLE users ADD COLUMN grade_level INTEGER; -- 1-6 for head teachers

-- Create unique index for SSO lookups
CREATE UNIQUE INDEX idx_users_sso ON users(sso_provider, sso_id);
```

#### 2. Create OAuth Authorization Codes Table

```sql
CREATE TABLE oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id VARCHAR(255) NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge VARCHAR(255) NOT NULL,
  code_challenge_method VARCHAR(10) DEFAULT 'S256',
  scope TEXT,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-delete expired codes
CREATE INDEX idx_oauth_codes_expires ON oauth_authorization_codes(expires_at);
```

### LMS Database (No Changes Required)

LMS uses existing Supabase `auth.users` and `public.users` tables. Webhook receiver creates/updates users via Service Role client.

---

## 🔐 Security Mechanisms

### 1. PKCE (Proof Key for Code Exchange) - RFC 7636

**Purpose**: Prevent authorization code interception attacks

**Implementation**:

```typescript
// Step 1: LMS generates code_verifier (random 43-128 chars)
const code_verifier = base64url(crypto.randomBytes(32)) // 43 chars

// Step 2: LMS calculates code_challenge
const code_challenge = base64url(sha256(code_verifier))

// Step 3: Info Hub stores code_challenge with authorization_code

// Step 4: LMS sends code_verifier when exchanging code for token

// Step 5: Info Hub verifies: sha256(code_verifier) === code_challenge
if (sha256(received_verifier) !== stored_challenge) {
  throw new Error('Invalid code_verifier')
}
```

### 2. CSRF Protection (State Token)

**Purpose**: Prevent cross-site request forgery attacks

**Implementation**:

```typescript
// Step 1: LMS generates random state token
const state = crypto.randomBytes(32).toString('hex') // 64 chars

// Step 2: LMS stores state in sessionStorage
sessionStorage.setItem(`sso_state_${state}`, JSON.stringify({ ... }))

// Step 3: Info Hub returns state in redirect

// Step 4: LMS verifies state matches
const storedState = sessionStorage.getItem(`sso_state_${state}`)
if (!storedState) {
  throw new Error('Invalid state - possible CSRF attack')
}
```

### 3. Webhook Signature Verification

**Purpose**: Verify webhook requests come from Info Hub

**Implementation**:

```typescript
// Info Hub calculates signature
const payload = JSON.stringify(webhookData)
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex')

// Send in header: X-Webhook-Signature

// LMS verifies signature
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(receivedPayload)
  .digest('hex')

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature')
}
```

### 4. Authorization Code Security

- ✅ **Single-use**: Delete immediately after token exchange
- ✅ **Time-limited**: Expire after 10 minutes
- ✅ **Bound to client**: Verify redirect_uri matches

---

## 🌐 API Endpoints

### Info Hub Endpoints (TO BE IMPLEMENTED)

#### `GET /api/oauth/authorize`

**Purpose**: Initiate OAuth flow, show Google login

**Parameters**:
```typescript
{
  client_id: string        // LMS client ID (from env)
  redirect_uri: string     // https://lms-esid.zeabur.app/api/auth/callback/infohub
  response_type: 'code'    // Always 'code'
  code_challenge: string   // SHA256 hash (base64url)
  code_challenge_method: 'S256'
  state: string            // CSRF token
  scope: string            // 'openid profile email'
}
```

**Response**: Redirect to Google OAuth → Return to redirect_uri with `code`

---

#### `POST /api/oauth/token`

**Purpose**: Exchange authorization code for user data

**Request Body**:
```typescript
{
  grant_type: 'authorization_code'
  code: string             // Authorization code from /authorize
  redirect_uri: string     // Must match original redirect_uri
  client_id: string        // LMS client ID
  code_verifier: string    // PKCE verifier (43-128 chars)
}
```

**Response**:
```typescript
{
  user: {
    id: string             // Info Hub user ID
    email: string          // User email
    full_name: string      // Display name
    role: string           // 'admin' | 'head' | 'teacher' | 'office_member'
    teacher_type?: string  // 'LT' | 'IT' | 'KCFS'
    grade_level?: number   // 1-6 (for head teachers)
  }
}
```

---

#### Webhook Sender (Triggered after OAuth success)

**Purpose**: Sync user to LMS Supabase database

**Endpoint**: `POST https://lms-esid.zeabur.app/api/webhook/user-sync`

**Headers**:
```
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-signature>
```

**Body**:
```typescript
{
  event: 'user.created' | 'user.updated'
  user: {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'head' | 'teacher' | 'office_member'
    teacher_type?: 'LT' | 'IT' | 'KCFS'
    grade?: number
  }
  timestamp: string  // ISO 8601
}
```

---

### LMS Endpoints (ALREADY IMPLEMENTED ✅)

#### `GET /api/auth/callback/infohub`

**Purpose**: Receive authorization code, exchange for user data

**Implementation**: `/app/api/auth/callback/infohub/route.ts`

---

#### `POST /api/webhook/user-sync`

**Purpose**: Receive user data from Info Hub, create/update in Supabase

**Implementation**: `/app/api/webhook/user-sync/route.ts`

---

## 🔗 Role Mapping

| Info Hub Role | LMS Role | Teacher Type | Grade | Track | Notes |
|---------------|----------|--------------|-------|-------|-------|
| admin | admin | null | null | null | Full system access |
| office_member | office_member | null | null | null | Read-only access |
| teacher (IT) | teacher | IT | null | international | International teacher |
| teacher (LT) | teacher | LT | null | local | Local teacher |
| teacher (KCFS) | teacher | KCFS | null | null | KCFS teacher |
| head (IT, G4) | head | IT | 4 | international | Grade 4 IT head teacher |
| head (LT, G6) | head | LT | 6 | local | Grade 6 LT head teacher |
| viewer | ❌ DENIED | - | - | - | No LMS access |

---

## 🔑 Environment Variables

### Info Hub `.env`

```bash
# OAuth Server Configuration
OAUTH_CLIENT_ID=lms-esid-client-id
OAUTH_CLIENT_SECRET=your-secret-key-here

# LMS Integration
LMS_WEBHOOK_URL=https://lms-esid.zeabur.app/api/webhook/user-sync
LMS_WEBHOOK_SECRET=shared-webhook-secret

# Google OAuth (existing)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### LMS `.env.local` (ALREADY CONFIGURED ✅)

```bash
# Info Hub SSO Configuration
NEXT_PUBLIC_INFOHUB_CLIENT_ID=lms-esid-client-id
NEXT_PUBLIC_INFOHUB_AUTH_URL=https://infohub.com/api/oauth/authorize
NEXT_PUBLIC_INFOHUB_TOKEN_URL=https://infohub.com/api/oauth/token
NEXT_PUBLIC_INFOHUB_REDIRECT_URI=https://lms-esid.zeabur.app/api/auth/callback/infohub
INFOHUB_WEBHOOK_SECRET=shared-webhook-secret

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # KEEP SECRET!
```

---

## ✅ Implementation Status

### LMS (100% Complete)

- [x] Environment configuration
- [x] PKCE implementation (RFC 7636)
- [x] SSO state management (CSRF protection)
- [x] OAuth callback handler
- [x] Webhook receiver
- [x] SSO login UI component
- [x] Session management
- [x] RLS policies fixed (Migration 019e)
- [x] TypeScript type system (40+ interfaces)
- [x] Error handling & logging
- [x] Testing ready

### Info Hub (0% Complete)

- [ ] Database schema updates
- [ ] OAuth authorization server
- [ ] PKCE verification logic
- [ ] Google OAuth integration
- [ ] Webhook sender
- [ ] Role mapping implementation
- [ ] Admin UI for SSO config
- [ ] Testing & deployment

---

## 📚 Related Documentation

- [SSO Implementation Plan - LMS](./SSO_IMPLEMENTATION_PLAN_LMS.md)
- [SSO Security Analysis](./SSO_SECURITY_ANALYSIS.md)
- [SSO API Reference](./SSO_API_REFERENCE.md)
- [Info Hub Implementation Checklist](./INFOHUB_IMPLEMENTATION_CHECKLIST.md) ⭐ **Start Here**
- [API Contract Specification](./API_CONTRACT.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)
- [Test Scenarios](./TEST_SCENARIOS.md)

---

## 🎯 Next Steps for Info Hub

1. **Read**: [INFOHUB_IMPLEMENTATION_CHECKLIST.md](./INFOHUB_IMPLEMENTATION_CHECKLIST.md)
2. **Implement**: Phase 1-6 according to checklist
3. **Test**: Use test scenarios from [TEST_SCENARIOS.md](./TEST_SCENARIOS.md)
4. **Verify**: Use API contract from [API_CONTRACT.md](./API_CONTRACT.md)
5. **Secure**: Follow [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintained By**: LMS Development Team
