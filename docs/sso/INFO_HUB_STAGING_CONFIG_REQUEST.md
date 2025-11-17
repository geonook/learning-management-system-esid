# Info Hub Staging Environment Configuration Request

> **To**: Info Hub Development Team
> **From**: LMS Development Team
> **Date**: 2025-11-17
> **Priority**: 🔴 HIGH (Blocking SSO integration testing)
> **Estimated Fix Time**: 15-30 minutes

---

## 📋 Executive Summary

Info Hub Staging environment is currently configured with localhost URLs, preventing LMS-Info Hub SSO integration testing. This requires immediate attention to unblock the testing phase.

**Good News First** ✅:
- We confirmed Info Hub has already implemented 30-day session management
- All security features (HttpOnly, Secure cookies, Database sessions) are in place
- No code changes needed - only environment variable updates

**Issue** ❌:
- Info Hub Staging redirects to `localhost:3001` and `localhost:8080` instead of `next14-landing.zeabur.app`
- This prevents OAuth flow completion

---

## 🚨 Problem Description

### Observed Behavior (Current - INCORRECT)

When LMS initiates SSO login:

**Step 1**: LMS redirects to Info Hub OAuth endpoint ✅
```
https://next14-landing.zeabur.app/api/oauth/authorize?
  client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208
  &redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub
  &response_type=code
  &code_challenge=3N1PzhPjckl7JMS5ubH5R7Ojb45RqrBgLbKk32x5shc
  &code_challenge_method=S256
  &state=WO0ZPWKj6TwMtyEgSlf6pYbFtIV3rOZZ
  &scope=openid+profile+email
```

**Step 2**: Info Hub redirects to incorrect URL ❌
```
http://localhost:3001/login?returnUrl=https://localhost:8080/api/oauth/authorize?...
                      ↑                            ↑
                  ERROR 1                      ERROR 2
                (should be                  (should be
           next14-landing.zeabur.app)  next14-landing.zeabur.app)
```

**Result**: Browser shows "localhost refused to connect" error

### Expected Behavior (CORRECT)

**Step 2 should redirect to**:
```
https://next14-landing.zeabur.app/login?returnUrl=https://next14-landing.zeabur.app/api/oauth/authorize?...
```

---

## 🔧 Required Fix

### Environment Variables to Update

Please verify and update Info Hub Staging environment variables on **Zeabur** (or your deployment platform):

```bash
# ========================================
# BASE URLs - ALL should be Staging domain
# ========================================
BASE_URL=https://next14-landing.zeabur.app
FRONTEND_URL=https://next14-landing.zeabur.app
BACKEND_URL=https://next14-landing.zeabur.app
API_URL=https://next14-landing.zeabur.app/api

# ========================================
# OAuth Endpoints
# ========================================
OAUTH_AUTHORIZE_URL=https://next14-landing.zeabur.app/api/oauth/authorize
OAUTH_TOKEN_URL=https://next14-landing.zeabur.app/api/oauth/token
OAUTH_CALLBACK_URL=https://next14-landing.zeabur.app/api/oauth/callback

# ========================================
# Login Page URL
# ========================================
LOGIN_URL=https://next14-landing.zeabur.app/login
LOGIN_PAGE_URL=https://next14-landing.zeabur.app/login

# ========================================
# Environment Settings
# ========================================
NODE_ENV=production  # Or 'staging' if you prefer
ENVIRONMENT=staging
DEPLOY_ENV=staging

# ========================================
# REMOVE or UPDATE localhost references
# ========================================
# If these exist, they should NOT point to localhost:
# NEXT_PUBLIC_API_URL (should be https://next14-landing.zeabur.app/api)
# NEXT_PUBLIC_BASE_URL (should be https://next14-landing.zeabur.app)
```

### Common Variable Names to Check

Depending on your framework, check these variable names:

**Next.js**:
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`

**General**:
- `BASE_URL`
- `API_URL`
- `SITE_URL`
- `PUBLIC_URL`
- `DOMAIN`

**OAuth-specific**:
- `OAUTH_ISSUER`
- `OAUTH_BASE_URL`

---

## ✅ Verification Steps

After updating environment variables and redeploying:

### 1. Test OAuth Redirect URL

Run this curl command to check the redirect:

```bash
curl -i "https://next14-landing.zeabur.app/api/oauth/authorize?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208&redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub&response_type=code&code_challenge=test&code_challenge_method=S256&state=test&scope=openid+profile+email"
```

**Expected Result**:
```http
HTTP/1.1 302 Found
Location: https://next14-landing.zeabur.app/login?returnUrl=https://next14-landing.zeabur.app/api/oauth/authorize?...
```

**Incorrect Result (current)**:
```http
Location: http://localhost:3001/login?returnUrl=https://localhost:8080/...
```

### 2. Browser Test

1. Open https://lms-staging.zeabur.app/auth/login
2. Click "Login with Google"
3. Browser should redirect to `https://next14-landing.zeabur.app/login` (NOT localhost)
4. URL bar should show Info Hub Staging domain

### 3. Session Functionality (Already Working ✅)

Once redirects are fixed, confirm:
- Access token: 4 hours ✅
- Refresh token: 30 days ✅
- HttpOnly + Secure cookies ✅

---

## 📊 Impact Assessment

### Current Status
- ❌ LMS SSO integration: **BLOCKED** (cannot test)
- ❌ Staging environment: **UNUSABLE** for OAuth testing
- ✅ Session management: **IMPLEMENTED** (good work!)
- ✅ LMS code: **READY** (no changes needed)

### After Fix
- ✅ LMS SSO integration: **UNBLOCKED**
- ✅ Full end-to-end testing: **POSSIBLE**
- ✅ Production deployment: **ON TRACK** (target 2025-12-09)

---

## 🕐 Timeline

| Task | Estimated Time | Responsible |
|------|---------------|-------------|
| Update environment variables | 5 minutes | Info Hub DevOps |
| Redeploy Staging (Zeabur) | 5-10 minutes | Zeabur Auto-deploy |
| Verify OAuth redirects | 5 minutes | Info Hub Team |
| Notify LMS team | 1 minute | Info Hub Team |
| **Total** | **15-20 minutes** | |

**LMS Team Ready to Test**: Immediately after fix ✅

---

## 📞 Contact Information

If you have questions or need clarification:

**LMS Team**:
- Lead Developer: [Your Name]
- Email: [your.email@kcislk.ntpc.edu.tw]
- Preferred Communication: Slack / Email / GitHub Issues

**Documentation References**:
- Updated Session Management Request: [`docs/sso/INFOHUB_SESSION_MANAGEMENT_REQUEST.md`](./INFOHUB_SESSION_MANAGEMENT_REQUEST.md)
- SSO Integration Overview: [`docs/sso/SSO_INTEGRATION_OVERVIEW.md`](./SSO_INTEGRATION_OVERVIEW.md)
- SSO Testing Guide: [`docs/sso/SSO_INTEGRATION_TEST_GUIDE.md`](./SSO_INTEGRATION_TEST_GUIDE.md)

---

## 🎯 Success Criteria

When this is fixed, the following should work:

- [ ] OAuth URL redirects to `https://next14-landing.zeabur.app/login` (not localhost)
- [ ] returnUrl parameter contains `https://next14-landing.zeabur.app` (not localhost)
- [ ] User can complete SSO login flow: LMS → Info Hub → Google → LMS Dashboard
- [ ] 30-day session persists across browser restarts
- [ ] LMS can proceed with integration testing

---

## 🙏 Acknowledgments

**Thank you for**:
- ✅ Implementing 30-day session management
- ✅ Setting up HttpOnly + Secure cookies
- ✅ Database-backed session storage
- ✅ OAuth 2.0 + PKCE support

These features are exactly what we need. The only issue is the environment configuration, which should be quick to fix.

We appreciate your prompt attention to this matter! 🚀

---

**Status**: ⏳ Awaiting Info Hub team response
**Next Action**: Info Hub to update Staging environment variables and notify LMS team

---

_This is part of the LMS-Info Hub SSO Integration Project. For technical details, see the complete documentation in `docs/sso/`._
