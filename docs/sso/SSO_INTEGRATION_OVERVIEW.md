# SSO Integration Overview - Info Hub ↔ LMS

> **Document Version**: 1.0
> **Last Updated**: 2025-11-13
> **Status**: Planning & Design Phase
> **Target Go-Live**: Week of 2025-12-09

---

## 📋 Executive Summary

This document outlines the Single Sign-On (SSO) integration between **Info Hub** (Identity Provider) and **LMS** (Service Provider), enabling seamless authentication for KCIS LK ESID teachers and administrators.

### Key Objectives

- ✅ **Unified Authentication**: Users log in once via Info Hub, access both systems
- ✅ **Zero Service Key Sharing**: LMS maintains complete control over Supabase credentials
- ✅ **Industry Standard Security**: OAuth 2.0 + PKCE implementation
- ✅ **Supabase as Single Source of Truth**: All user data managed in Supabase Cloud

### Success Criteria

- **Security**: OWASP compliant, no Service Role Key exposure
- **Functionality**: 100% of authorized users can SSO login
- **Performance**: Complete SSO flow in < 5 seconds
- **Reliability**: Webhook success rate > 99%
- **Data Consistency**: Bidirectional sync between Info Hub and Supabase

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Login Flow                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Info Hub (Identity Provider)                               │
│  - URL: https://kcislk-infohub.zeabur.app                  │
│  - Tech: Next.js 14 + PostgreSQL + Google OAuth 2.0        │
│  - Role: SSO Gateway + User Management                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ OAuth 2.0 + PKCE
                            │ Authorization Code Flow
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Cloud (User Data Store)                          │
│  - URL: https://piwbooidofbaqklhijup.supabase.co          │
│  - Function: Auth + PostgreSQL Database                    │
│  - Managed By: LMS (Service Role Key ownership)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Supabase Session Token
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LMS (Service Provider / Resource Server)                   │
│  - Path: /Users/chenzehong/Desktop/LMS                      │
│  - Tech: Next.js 14 + Supabase Client                      │
│  - Roles: admin, head (Head Teacher), teacher               │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow (8 Steps)

```
1. User → LMS Login Page
   └─> Clicks "Login with Info Hub SSO" button

2. LMS → Info Hub OAuth Authorization
   └─> GET /api/oauth/authorize?
       client_id=lms&
       redirect_uri=https://lms/callback&
       code_challenge=<PKCE_CHALLENGE>&
       state=<CSRF_TOKEN>

3. Info Hub → Google OAuth (if not logged in)
   └─> User authenticates via Google Workspace

4. Info Hub → Supabase User Sync (Webhook)
   └─> POST https://lms/api/webhook/user-sync
       { user: {...}, event: "user.created" }

5. Info Hub → LMS Callback with Authorization Code
   └─> Redirect: https://lms/callback?code=<CODE>&state=<STATE>

6. LMS → Info Hub Token Exchange
   └─> POST /api/oauth/token
       { code, code_verifier, client_secret }

7. LMS → Supabase Session Creation
   └─> Admin API: generateLink({ type: 'magiclink', email })

8. User → LMS Dashboard
   └─> Fully authenticated with Supabase session
```

---

## 🔑 Key Technical Decisions

### Decision 1: OAuth 2.0 + PKCE (Not Magic Link Sharing)

**Problem**: Original proposal (方案 B) suggested Info Hub generate Supabase tokens using LMS's Service Role Key.

**Security Issues**:
- ❌ Service Role Key bypasses all 49 RLS policies
- ❌ Exposes LMS to complete data breach if Info Hub is compromised
- ❌ Violates principle of least privilege

**Solution**: Standard OAuth 2.0 Authorization Code Flow with PKCE
- ✅ Info Hub returns authorization code (single-use, 5-minute expiry)
- ✅ LMS exchanges code for user data (server-side)
- ✅ LMS creates Supabase user using its own Service Role Key
- ✅ Zero credential sharing

**Status**: ✅ Approved by both teams

---

### Decision 2: Supabase as Single Source of Truth

**Rationale**:
- LMS already uses Supabase Cloud for all operations
- 49 optimized RLS policies protect data access
- Existing users table with complex role structure (admin/head/teacher)

**Implementation**:
- Info Hub syncs users to Supabase via LMS Webhook
- LMS owns Supabase credentials (no sharing)
- Bidirectional sync: `lms_user_id` stored in Info Hub for reference

**Data Flow**:
```
Info Hub User Registration
    ↓
Webhook → LMS
    ↓
LMS creates user in Supabase (auth.users + public.users)
    ↓
LMS returns lms_user_id to Info Hub
    ↓
Info Hub stores lms_user_id for future reference
```

---

### Decision 3: Authorization Code Storage in PostgreSQL

**Options Considered**:
- Option A: Redis (fast, but requires infrastructure)
- Option B: PostgreSQL (existing, reliable)

**Selected**: PostgreSQL

**Rationale**:
- Info Hub already uses PostgreSQL (Zeabur)
- No additional infrastructure needed
- Sufficient performance for 5-minute TTL codes
- Built-in ACID guarantees

**Implementation**:
```sql
CREATE TABLE oauth_authorization_codes (
  code VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  code_challenge VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_expires (expires_at)
);
```

---

### Decision 4: Role Mapping Strategy

**Challenge**: Info Hub has 4-tier permissions, LMS has 3 roles + teacher types

**Mapping Rules**:

| Info Hub Role | LMS Role | Teacher Type | Grade | Track |
|---------------|----------|--------------|-------|-------|
| admin | admin | null | null | null |
| office_member | head | null | null (set by Admin) | null |
| teacher (IT domain) | teacher | IT | null | international |
| teacher (LT domain) | teacher | LT | null | local |
| teacher (KCFS domain) | teacher | KCFS | null | null |
| viewer | ❌ Denied | - | - | - |

**Teacher Type Determination**:
1. **Priority 1**: Admin manual setting in Info Hub UI
2. **Fallback**: Email domain inference (@it.kcis → IT)
3. **Default**: IT (if unable to determine)

**Grade Level** (Head Teachers only):
- Set manually by Admin in Info Hub
- Defaults to `null` if not set
- LMS Admin can adjust later if needed

---

### Decision 5: Webhook Retry Strategy

**Problem**: Network failures could cause user sync issues

**Solution**: Exponential backoff with 3 retries

**Implementation**:
```typescript
Retry Schedule:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Attempt 4: 4 seconds delay

If all fail:
  - Log error
  - Return webhook_status: "failed" in Token Exchange
  - LMS performs compensatory sync during login
```

**Compensatory Mechanism**:
```typescript
// LMS Token Exchange Handler
if (tokenData.webhook_status !== 'completed') {
  await createUserInSupabase(tokenData.user)
}
```

---

## 🔒 Security Considerations

### Security Measures Implemented

1. **PKCE (Proof Key for Code Exchange)**
   - Prevents authorization code interception
   - Code verifier (43-128 chars) stored client-side
   - Code challenge (SHA-256) sent to Info Hub
   - Info Hub verifies verifier matches challenge

2. **CSRF Protection**
   - State token generated by LMS
   - Stored in HTTP-only cookie (server-side)
   - Validated on callback
   - Single-use mechanism

3. **Webhook Secret Verification**
   - Shared secret between Info Hub and LMS
   - HMAC signature on webhook payload
   - Prevents unauthorized user creation

4. **Service Role Key Isolation**
   - LMS keeps Supabase Service Role Key
   - Never shared with Info Hub
   - Only used server-side (never in browser)

5. **RLS Policy Enforcement**
   - All Supabase queries respect RLS policies
   - Even with Service Role Key, LMS uses role-based access
   - 49 optimized policies protect data

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Authorization Code Interception | PKCE code_challenge verification |
| CSRF Attack | State token + HTTP-only cookie |
| Man-in-the-Middle | HTTPS only (enforced) |
| Info Hub Compromise | Zero credential sharing, LMS maintains control |
| Token Replay | Single-use codes, 5-minute expiry |
| Webhook Spoofing | HMAC signature verification |

---

## 👥 Role & Responsibility Matrix

### Info Hub Team Responsibilities

**Phase 1: Database (1-1.5 days)**
- Add SSO fields to User model
- Create `oauth_authorization_codes` table
- Add bidirectional sync fields (lms_user_id, lms_synced_at)

**Phase 2: OAuth Server (4-5 days)**
- Implement `/api/oauth/authorize` endpoint
- Implement `/api/oauth/token` endpoint
- Implement PKCE verification
- Implement webhook retry logic

**Phase 3: Role Management (2-3 days)**
- Implement role mapper (Info Hub → LMS)
- Create Admin UI for teacher_type/grade_level
- Implement access denial for Viewer role

**Phase 4-6: Config, Testing, Docs (3-4 days)**
- Environment configuration
- Unit & integration tests
- Technical documentation

**Deliverables to LMS**:
- OAuth Client ID: `lms` ✅
- OAuth Client Secret: (256-bit, production-grade) ⏳ Pending
- Webhook Secret: (256-bit, production-grade) ⏳ Pending
- Test accounts (admin, head, teacher×3, viewer) ⏳ Pending
- OAuth endpoint URLs ✅

---

### LMS Team Responsibilities

**Phase 1: Environment (0.5 days)**
- Configure environment variables
- Set up OAuth client credentials

**Phase 2: Webhook Receiver (1.5 days)**
- Implement `/api/webhook/user-sync` endpoint
- Implement user creation in Supabase
- Implement role mapping validation

**Phase 3: OAuth Client (2 days)**
- Implement PKCE flow
- Implement SSO login button
- Implement state token management

**Phase 4: Callback Handler (2.5 days)**
- Implement token exchange
- Implement compensatory sync
- Implement Supabase session creation

**Phase 5-7: Error, Testing, Docs (4 days)**
- Error handling & UX
- Unit/integration/E2E tests
- Documentation & deployment

**Waiting For**:
- OAuth Client Secret from Info Hub ⏳
- Webhook Secret from Info Hub ⏳
- Test accounts from Info Hub ⏳

---

## 📊 Implementation Timeline

### Gantt Chart Overview

```
Week 1 (Parallel Development):
  Info Hub: [████████████░░░░░░░░] Phase 1-2 (DB + OAuth Server)
  LMS:      [███████████████░░░░░] Phase 1-3 (Env + Webhook + Client)
  Joint:    [░░░░░░░░██░░░░░░░░░░] Day 3 Checkpoint (Webhook test)

Week 2 (Integration):
  Info Hub: [████████████████░░░░] Phase 3-4 (Roles + Config)
  LMS:      [██████████████████░░] Phase 4-5 (Callback + Errors)
  Joint:    [░░░░░░░░░░░░░░░░██░░] Day 7 Checkpoint (OAuth E2E)

Week 3 (Testing):
  Info Hub: [████████████████████] Phase 5-6 (Test + Docs)
  LMS:      [████████████████████] Phase 6-7 (Test + Docs)
  Joint:    [████████████████████] Staging deployment

Week 4 (Production):
  Both:     [████████████████████] Production deployment
  Joint:    [░░░░░░░░░░░░░░░░░░██] Go-live (Day 21)
```

### Key Milestones

| Date | Milestone | Owner | Status |
|------|-----------|-------|--------|
| Day 0 | Planning Complete | Both | ✅ Done |
| Day 3 | Webhook Integration Test | Both | ⏳ Pending |
| Day 7 | OAuth E2E Test | Both | ⏳ Pending |
| Day 14 | Staging Deployment | Both | ⏳ Pending |
| Day 21 | Production Go-Live | Both | ⏳ Pending |

---

## 🎯 Success Metrics

### Functional Metrics

- **SSO Login Success Rate**: Target > 99%
- **First-Time User Creation**: < 3 seconds
- **Returning User Login**: < 2 seconds
- **Webhook Sync Success**: > 99%

### Performance Metrics

- **OAuth Flow Duration**: < 5 seconds
- **Token Exchange Latency**: < 500ms
- **Webhook Delivery Time**: < 2 seconds
- **Supabase Session Creation**: < 1 second

### Security Metrics

- **PKCE Verification Pass Rate**: 100%
- **State Token Validation Pass Rate**: 100%
- **Webhook Signature Validation**: 100%
- **RLS Policy Enforcement**: 100%

### User Experience Metrics

- **Login Confusion Rate**: < 5% (users know to use SSO)
- **Error Recovery Time**: < 30 seconds
- **Support Tickets (SSO-related)**: < 10/month

---

## ⚠️ Risk Register

| Risk ID | Risk Description | Impact | Probability | Mitigation | Owner |
|---------|------------------|--------|-------------|------------|-------|
| R1 | Info Hub webhook fails | Medium | Low | Compensatory sync in Token Exchange | LMS |
| R2 | PKCE verification errors | Low | Low | Comprehensive unit tests | Both |
| R3 | RLS policy conflicts | High | Medium | Staging validation before production | LMS |
| R4 | Session creation failures | Medium | Low | Fallback to Email/Password login | LMS |
| R5 | Production deployment issues | High | Medium | Staged rollout, rollback plan | Both |
| R6 | Info Hub downtime | Medium | Low | Status page, fallback authentication | Info Hub |
| R7 | Role mapping errors | Medium | Medium | Admin manual override capability | Both |

---

## 📚 Related Documents

- [SSO Technical Specification](./SSO_TECHNICAL_SPECIFICATION.md) - Detailed API specs
- [SSO Security Analysis](./SSO_SECURITY_ANALYSIS.md) - Security review results
- [SSO Implementation Plan - LMS](./SSO_IMPLEMENTATION_PLAN_LMS.md) - LMS tasks
- [SSO Implementation Plan - Info Hub](./SSO_IMPLEMENTATION_PLAN_INFOHUB.md) - Info Hub tasks
- [SSO API Reference](./SSO_API_REFERENCE.md) - API documentation
- [SSO Testing Guide](./SSO_TESTING_GUIDE.md) - Test strategy
- [SSO Deployment Guide](./SSO_DEPLOYMENT_GUIDE.md) - Deployment steps

---

## 📝 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | LMS Team | Initial document creation based on planning discussions |

---

## ✅ Approval & Sign-off

**Info Hub Team**: ⏳ Pending approval
**LMS Team**: ✅ Approved
**Project Stakeholders**: ⏳ Pending review

**Next Steps**:
1. Info Hub team to provide OAuth Client Secret & Webhook Secret
2. Both teams begin Phase 1 implementation
3. Schedule Day 3 checkpoint meeting for webhook integration test

---

*Document prepared by LMS Development Team*
*For questions, contact: [LMS Team Lead]*
