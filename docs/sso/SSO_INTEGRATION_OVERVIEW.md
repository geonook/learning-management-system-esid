# SSO Integration Overview - Info Hub ↔ LMS

> **Document Version**: 2.0
> **Last Updated**: 2025-11-18
> **Status**: LMS Ready ✅ | Awaiting Info Hub Implementation ⏳
> **Target Go-Live**: TBD (pending Info Hub completion)

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

## 📊 Implementation Status (Updated: 2025-11-18)

### LMS (Service Provider) - 100% Complete ✅

| Phase | Component | Status | Date | Lines of Code |
|-------|-----------|--------|------|---------------|
| Phase 1 | Environment Config | ✅ Complete | 2025-11-13 | ~50 |
| Phase 2 | Webhook Receiver | ✅ Complete | 2025-11-13 | 270 |
| Phase 3 | OAuth PKCE Client | ✅ Complete | 2025-11-13 | 400 |
| Phase 4 | Callback Handler | ✅ Complete | 2025-11-13 | 400 |
| Phase 4.5 | RLS Fix (Migration 019e) | ✅ Complete | 2025-11-18 | - |
| Testing | SSO Login E2E | ✅ Verified | 2025-11-18 | - |
| **Total** | **All Components** | **✅ Ready** | - | **~1,570** |

**LMS Implementation Summary**:
- ✅ **8 files created**: Types, PKCE, State, Webhook, Callback, Session, UI
- ✅ **1 file modified**: Login page with SSO button
- ✅ **1 database migration**: RLS infinite recursion fix
- ✅ **TypeScript**: 0 compilation errors
- ✅ **All blockers resolved**: RLS policies fixed, session creation working
- ✅ **Ready for integration**: Awaiting Info Hub OAuth server

### Info Hub (Identity Provider) - 0% Complete ⏳

| Phase | Component | Status | Estimated | Priority |
|-------|-----------|--------|-----------|----------|
| Phase 1 | Database Schema | ⏳ Pending | 1-2 hours | High |
| Phase 2 | OAuth Server | ⏳ Pending | 3-4 hours | High |
| Phase 3 | PKCE Verification | ⏳ Pending | 2 hours | High |
| Phase 4 | Webhook Sender | ⏳ Pending | 2 hours | Medium |
| Phase 5 | Role Mapping | ⏳ Pending | 1-2 hours | Medium |
| Phase 6 | Admin UI | ⏳ Pending | 2-3 hours | Low |
| **Total** | **All Phases** | **⏳ Pending** | **11-15 hours** | - |

**Info Hub Resources Available**:
- ✅ Complete technical specifications (5 documents, ~2,500 lines)
- ✅ Implementation checklist with verification steps
- ✅ API contracts and TypeScript interfaces
- ✅ Security guidelines and test scenarios
- ✅ curl test examples for all endpoints

**Recommended Start**: Phase 1 (Database Schema) → Phase 2 (OAuth Server)

---

## 📚 Technical Documentation for Info Hub

Complete SSO integration documentation package delivered (5 documents):

1. **[Technical Spec Summary](./TECHNICAL_SPEC_SUMMARY.md)** - Start here (650 lines)
   - Complete OAuth 2.0 + PKCE flow diagram
   - Database schema requirements
   - Environment variables
   - Role mapping specification

2. **[Implementation Checklist](./INFOHUB_IMPLEMENTATION_CHECKLIST.md)** - Phase-by-phase guide (550 lines)
   - 6 phases with detailed steps
   - Verification methods
   - Success criteria
   - Rollback plans

3. **[API Contract](./API_CONTRACT.md)** - Complete API specifications (480 lines)
   - Endpoint specifications with examples
   - TypeScript interfaces
   - curl test examples
   - Error handling

4. **[Security Checklist](./SECURITY_CHECKLIST.md)** - Security implementation guide (420 lines)
   - PKCE implementation code
   - CSRF protection
   - Webhook signature verification
   - Test cases

5. **[Test Scenarios](./TEST_SCENARIOS.md)** - Testing and validation (400 lines)
   - E2E test flow
   - Unit tests
   - Integration tests
   - Error scenarios

**Total Documentation**: ~2,500 lines of comprehensive technical specifications

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

| Info Hub Role | LMS Role | Permissions | Teacher Type | Grade | Track |
|---------------|----------|-------------|--------------|-------|-------|
| admin | admin | Full system access | null | null | null |
| office_member | office_member | **Read-only** all grades (G1-G6) | null | null | null |
| head | head | Grade + course type management | null | null (set by Admin) | course_type |
| teacher (IT) | teacher | Own classes only | IT | null | international |
| teacher (LT) | teacher | Own classes only | LT | null | local |
| teacher (KCFS) | teacher | Own classes only | KCFS | null | null |
| viewer | ❌ Denied | No access | - | - | - |

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

**✅ Phase 1-4: Core Implementation (COMPLETE - 2025-11-13)**
- ✅ Environment configuration complete
- ✅ Webhook receiver operational (270 lines)
- ✅ PKCE implementation complete (180 lines)
- ✅ OAuth callback handler functional (280 lines)
- ✅ SSO login button integrated
- ✅ Session management working

**✅ Phase 4.5: RLS Fix (COMPLETE - 2025-11-18)**
- ✅ Migration 019e deployed
- ✅ Infinite recursion resolved
- ✅ All SSO endpoints operational

**⏳ Phase 5-7: Remaining Tasks (Pending Info Hub)**
- ⏳ Integration testing (requires Info Hub OAuth server)
- ⏳ Production deployment
- ⏳ Monitoring setup

**LMS Deliverables Ready**:
- ✅ OAuth Client ready (awaiting secrets from Info Hub)
- ✅ Webhook receiver ready (awaiting test requests)
- ✅ Callback handler ready (awaiting authorization codes)
- ✅ 5 comprehensive technical documents for Info Hub team

---

## 📊 Implementation Timeline

### Gantt Chart Overview (Updated)

```
LMS Implementation (COMPLETE ✅):
  2025-11-13: [████████████████████] Phase 1-4 (All components)
  2025-11-18: [████████████████████] RLS Fix + E2E Testing
  Status:     [████████████████████] 100% Ready for Integration

Info Hub Implementation (PENDING ⏳):
  Phase 1-2:  [░░░░░░░░░░░░░░░░░░░░] DB + OAuth Server (11-15 hours)
  Phase 3-4:  [░░░░░░░░░░░░░░░░░░░░] PKCE + Webhook
  Phase 5-6:  [░░░░░░░░░░░░░░░░░░░░] Roles + Admin UI
  Status:     [░░░░░░░░░░░░░░░░░░░░] Awaiting start

Integration Testing (PENDING ⏳):
  Joint:      [░░░░░░░░░░░░░░░░░░░░] Requires Info Hub OAuth Server
  E2E Flow:   [░░░░░░░░░░░░░░░░░░░░] Awaiting OAuth endpoints
  Staging:    [░░░░░░░░░░░░░░░░░░░░] Awaiting integration tests
```

### Key Milestones

| Date | Milestone | Owner | Status |
|------|-----------|-------|--------|
| 2025-11-13 | LMS Phase 1-4 Complete | LMS | ✅ Done |
| 2025-11-13 | Documentation Delivered | LMS | ✅ Done |
| 2025-11-18 | RLS Issues Resolved | LMS | ✅ Done |
| 2025-11-18 | LMS E2E Testing (OTP) | LMS | ✅ Done |
| TBD | Info Hub Implementation Start | Info Hub | ⏳ Pending |
| TBD | OAuth E2E Test | Both | ⏳ Pending |
| TBD | Staging Deployment | Both | ⏳ Pending |
| TBD | Production Go-Live | Both | ⏳ Pending |

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

## ⚠️ Risk Register (Updated)

| Risk ID | Risk Description | Impact | Probability | Mitigation | Status |
|---------|------------------|--------|-------------|------------|--------|
| ~~R1~~ | ~~Info Hub webhook fails~~ | ~~Medium~~ | ~~Low~~ | Compensatory sync implemented | ✅ Mitigated |
| ~~R2~~ | ~~PKCE verification errors~~ | ~~Low~~ | ~~Low~~ | PKCE RFC 7636 compliant | ✅ Mitigated |
| ~~R3~~ | ~~RLS policy conflicts~~ | ~~High~~ | ~~Medium~~ | Migration 019e deployed | ✅ Resolved |
| ~~R4~~ | ~~Session creation failures~~ | ~~Medium~~ | ~~Low~~ | OTP approach tested | ✅ Resolved |
| R5 | Production deployment issues | High | Medium | Staged rollout, rollback plan | ⏳ Active |
| R6 | Info Hub implementation delays | Medium | High | Complete docs provided | ⏳ Active |
| R7 | Info Hub downtime (post-launch) | Medium | Low | Fallback authentication available | ⏳ Active |

**Risks Resolved**: R1-R4 (LMS-side risks fully mitigated)
**Active Risks**: R5-R7 (deployment and Info Hub dependency risks)

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

**LMS Team**: ✅ Implementation Complete (Phase 1-4) | Ready for Integration
**Info Hub Team**: ⏳ Awaiting implementation start
**Project Stakeholders**: ⏳ Pending review

**Next Steps**:
1. ✅ ~~LMS implementation complete~~ (Done - 2025-11-18)
2. ✅ ~~Technical documentation delivered~~ (Done - 2025-11-18)
3. ⏳ Info Hub team to begin implementation using provided documentation
4. ⏳ Schedule integration testing session after Info Hub Phase 2 complete
5. ⏳ Staging deployment and final validation

---

## 📋 Quick Start for Info Hub Team

**Recommended Reading Order**:
1. Read `TECHNICAL_SPEC_SUMMARY.md` first (20 minutes)
2. Follow `INFOHUB_IMPLEMENTATION_CHECKLIST.md` step-by-step
3. Reference `API_CONTRACT.md` for endpoint specifications
4. Use `SECURITY_CHECKLIST.md` for security implementation
5. Test with `TEST_SCENARIOS.md` at each phase

**Estimated Implementation Time**: 11-15 hours total (1.5-2 days)

**Support**: Contact LMS team for clarifications or questions

---

*Document prepared by LMS Development Team*
*Last reviewed: 2025-11-18*
*Version: 2.0*
