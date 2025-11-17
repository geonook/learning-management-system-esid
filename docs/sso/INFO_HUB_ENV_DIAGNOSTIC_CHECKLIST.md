# Info Hub Staging Environment Variables - Complete Diagnostic Checklist

> **Date**: 2025-11-17
> **Status**: 🚨 **URGENT - Still Failing After Initial Fix**
> **Issue**: Multiple environment variables still point to localhost
> **Impact**: Blocking LMS SSO integration testing

---

## 🚨 Current Situation Update

### What Info Hub Team Did ✅
- Updated `NEXT_PUBLIC_BASE_URL` to `https://next14-landing.zeabur.app`

### What's Still Wrong ❌
OAuth flow still redirects to localhost:

```
http://localhost:3001/login?returnUrl=https://localhost:8080/api/oauth/authorize?...
         ↑                                   ↑
    LOGIN_URL variable                 OAUTH_AUTHORIZE_URL variable
   (still localhost:3001)              (still localhost:8080)
```

### Root Cause
Info Hub Staging environment has **multiple separate environment variables** controlling different URLs. Only updating `NEXT_PUBLIC_BASE_URL` is not enough.

---

## 📋 Complete Environment Variables Checklist

### Category 1: Base Application URLs

All of these should be `https://next14-landing.zeabur.app`:

```bash
# Core Base URLs
BASE_URL=https://next14-landing.zeabur.app
NEXT_PUBLIC_BASE_URL=https://next14-landing.zeabur.app  # ✅ Already updated
NEXT_PUBLIC_SITE_URL=https://next14-landing.zeabur.app
NEXT_PUBLIC_APP_URL=https://next14-landing.zeabur.app
PUBLIC_URL=https://next14-landing.zeabur.app
SITE_URL=https://next14-landing.zeabur.app
APP_URL=https://next14-landing.zeabur.app
DOMAIN=next14-landing.zeabur.app  # Without https://
HOST=next14-landing.zeabur.app    # Without https://
```

### Category 2: Frontend/Backend Split URLs

If Info Hub has separate frontend/backend:

```bash
FRONTEND_URL=https://next14-landing.zeabur.app
BACKEND_URL=https://next14-landing.zeabur.app
API_URL=https://next14-landing.zeabur.app/api
NEXT_PUBLIC_API_URL=https://next14-landing.zeabur.app/api
NEXT_PUBLIC_FRONTEND_URL=https://next14-landing.zeabur.app
NEXT_PUBLIC_BACKEND_URL=https://next14-landing.zeabur.app
```

### Category 3: Login Page URL ⚠️ **CRITICAL - Currently Wrong**

**Current**: `localhost:3001`
**Should be**: `https://next14-landing.zeabur.app/login`

```bash
LOGIN_URL=https://next14-landing.zeabur.app/login  # ❌ Currently localhost:3001
NEXT_PUBLIC_LOGIN_URL=https://next14-landing.zeabur.app/login
LOGIN_PAGE_URL=https://next14-landing.zeabur.app/login
LOGIN_PAGE=https://next14-landing.zeabur.app/login
AUTH_URL=https://next14-landing.zeabur.app/login
NEXT_PUBLIC_AUTH_URL=https://next14-landing.zeabur.app/login
```

### Category 4: OAuth Endpoints ⚠️ **CRITICAL - Currently Wrong**

**Current**: `localhost:8080`
**Should be**: `https://next14-landing.zeabur.app/api/oauth/*`

```bash
# OAuth Authorization
OAUTH_AUTHORIZE_URL=https://next14-landing.zeabur.app/api/oauth/authorize  # ❌ Currently localhost:8080
NEXT_PUBLIC_OAUTH_AUTHORIZE_URL=https://next14-landing.zeabur.app/api/oauth/authorize
OAUTH_AUTHORIZATION_URL=https://next14-landing.zeabur.app/api/oauth/authorize

# OAuth Token
OAUTH_TOKEN_URL=https://next14-landing.zeabur.app/api/oauth/token
NEXT_PUBLIC_OAUTH_TOKEN_URL=https://next14-landing.zeabur.app/api/oauth/token
TOKEN_URL=https://next14-landing.zeabur.app/api/oauth/token

# OAuth Issuer
OAUTH_ISSUER=https://next14-landing.zeabur.app
NEXT_PUBLIC_OAUTH_ISSUER=https://next14-landing.zeabur.app
ISSUER=https://next14-landing.zeabur.app

# OAuth Callback (if applicable)
OAUTH_CALLBACK_URL=https://next14-landing.zeabur.app/api/oauth/callback
NEXT_PUBLIC_OAUTH_CALLBACK_URL=https://next14-landing.zeabur.app/api/oauth/callback
```

### Category 5: Environment Type

```bash
NODE_ENV=production  # Should be 'production' even for staging
ENVIRONMENT=staging
DEPLOY_ENV=staging
VERCEL_ENV=production  # If using Vercel
NEXT_PUBLIC_ENV=staging
```

### Category 6: Port Configuration ⚠️ **Check for localhost references**

```bash
# These should NOT exist or should be empty in production/staging:
PORT=  # Should be handled by Zeabur/platform
LOCALHOST_PORT=  # Should NOT exist
DEV_PORT=  # Should NOT exist
```

---

## 🔍 Diagnostic Steps for Info Hub Team

### Step 1: Export All Environment Variables

**On Zeabur**:
1. Go to Zeabur Dashboard → Info Hub Staging Project
2. Click "Environment Variables" tab
3. Export or screenshot all variables

**If you have server access**:
```bash
# Method A: Check all URL-related variables
printenv | grep -E "(URL|BASE|LOGIN|OAUTH|HOST|DOMAIN)" | sort

# Method B: Check for localhost references
printenv | grep -i localhost

# Method C: Save to file for review
printenv > staging_env_vars.txt
```

### Step 2: Search for Localhost References

Run this command to find ALL localhost references:

```bash
# Find any environment variable containing "localhost"
printenv | grep -E "(localhost|127\.0\.0\.1|::1)" | sort

# Expected output: NONE
# If you see any output, those variables need to be updated
```

### Step 3: Verify Critical Variables

Create a temporary debug page to check runtime environment:

```typescript
// pages/api/debug-env.ts (REMOVE after debugging!)
export default function handler(req, res) {
  // Only allow in staging, not production
  if (process.env.ENVIRONMENT !== 'staging') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.status(200).json({
    BASE_URL: process.env.BASE_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    LOGIN_URL: process.env.LOGIN_URL,
    NEXT_PUBLIC_LOGIN_URL: process.env.NEXT_PUBLIC_LOGIN_URL,
    OAUTH_AUTHORIZE_URL: process.env.OAUTH_AUTHORIZE_URL,
    NEXT_PUBLIC_OAUTH_AUTHORIZE_URL: process.env.NEXT_PUBLIC_OAUTH_AUTHORIZE_URL,
    OAUTH_TOKEN_URL: process.env.OAUTH_TOKEN_URL,
    ENVIRONMENT: process.env.ENVIRONMENT,
    NODE_ENV: process.env.NODE_ENV,
  })
}
```

Then visit: `https://next14-landing.zeabur.app/api/debug-env`

**Expected output** (all should contain `next14-landing.zeabur.app`, NO localhost):
```json
{
  "BASE_URL": "https://next14-landing.zeabur.app",
  "NEXT_PUBLIC_BASE_URL": "https://next14-landing.zeabur.app",
  "LOGIN_URL": "https://next14-landing.zeabur.app/login",
  "OAUTH_AUTHORIZE_URL": "https://next14-landing.zeabur.app/api/oauth/authorize",
  "ENVIRONMENT": "staging",
  "NODE_ENV": "production"
}
```

---

## 🧪 Testing & Verification

### Test 1: Curl OAuth Redirect

```bash
curl -sI "https://next14-landing.zeabur.app/api/oauth/authorize?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208&redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub&response_type=code&code_challenge=test&code_challenge_method=S256&state=test&scope=openid+profile+email" | grep -i location
```

**✅ Expected output**:
```
Location: https://next14-landing.zeabur.app/login?returnUrl=https://next14-landing.zeabur.app/api/oauth/authorize?...
```

**❌ Current output** (WRONG):
```
Location: http://localhost:3001/login?returnUrl=https://localhost:8080/...
```

### Test 2: Browser Manual Test

1. Open: https://lms-staging.zeabur.app/auth/login
2. Click "Login with Google"
3. Check browser URL bar

**✅ Expected**: Should show `https://next14-landing.zeabur.app/login`
**❌ Current**: Shows `localhost:3001` connection error

### Test 3: Automated Verification Script

Save this as `test-oauth-redirect.sh`:

```bash
#!/bin/bash
# Test Info Hub OAuth Redirect Configuration

echo "=================================================="
echo "Info Hub OAuth Redirect Test"
echo "=================================================="

TEST_URL="https://next14-landing.zeabur.app/api/oauth/authorize?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208&redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub&response_type=code&code_challenge=test&code_challenge_method=S256&state=test&scope=openid+profile+email"

echo "Testing URL:"
echo "$TEST_URL"
echo ""

RESPONSE=$(curl -sI "$TEST_URL")
LOCATION=$(echo "$RESPONSE" | grep -i "^location:" | cut -d' ' -f2- | tr -d '\r\n')

echo "Redirect Location:"
echo "$LOCATION"
echo ""

# Check 1: No localhost
if echo "$LOCATION" | grep -q "localhost"; then
  echo "❌ FAIL: Still contains 'localhost'"
  echo "   Found: $(echo "$LOCATION" | grep -o 'localhost[^&]*')"
  FAIL=1
else
  echo "✅ PASS: No localhost found"
fi

# Check 2: Correct domain
if echo "$LOCATION" | grep -q "next14-landing.zeabur.app"; then
  echo "✅ PASS: Correctly using next14-landing.zeabur.app"
else
  echo "❌ FAIL: Not using next14-landing.zeabur.app domain"
  FAIL=1
fi

# Check 3: HTTPS protocol
if echo "$LOCATION" | grep -q "^https://"; then
  echo "✅ PASS: Using HTTPS protocol"
else
  echo "❌ FAIL: Not using HTTPS (found: $(echo "$LOCATION" | grep -o '^[a-z]*://'))"
  FAIL=1
fi

echo ""
echo "=================================================="
if [ -z "$FAIL" ]; then
  echo "✅ ALL TESTS PASSED - OAuth redirect is correctly configured"
  exit 0
else
  echo "❌ TESTS FAILED - Please update environment variables"
  exit 1
fi
```

Run with: `bash test-oauth-redirect.sh`

---

## 📝 Recommended Fix Process

### Step 1: Identify ALL Variables (15 minutes)

1. Log into Zeabur Dashboard
2. Navigate to Info Hub Staging project
3. Click "Environment Variables"
4. Screenshot or export ALL variables
5. Search for any variable containing "localhost", "127.0.0.1", "3001", "8080"

### Step 2: Update ALL Localhost References (15 minutes)

For each variable found in Step 1:

| Old Value | New Value |
|-----------|-----------|
| `http://localhost:3001` | `https://next14-landing.zeabur.app` |
| `http://localhost:8080` | `https://next14-landing.zeabur.app` |
| `localhost:3001` | `next14-landing.zeabur.app` |
| `localhost:8080` | `next14-landing.zeabur.app` |

**Common variables that often have localhost**:
- `LOGIN_URL`
- `OAUTH_AUTHORIZE_URL`
- `OAUTH_TOKEN_URL`
- `API_URL`
- `BACKEND_URL`

### Step 3: Redeploy (10 minutes)

After updating environment variables:

1. **Zeabur Auto-Deploy**: Usually automatic after env variable update
2. **Manual Trigger**: Click "Redeploy" if auto-deploy doesn't trigger
3. **Wait**: Monitor deployment logs (typically 5-10 minutes)

### Step 4: Verify (10 minutes)

Run all tests from "Testing & Verification" section above:
- ✅ Curl test
- ✅ Browser test
- ✅ Automated script

### Step 5: Notify LMS Team (2 minutes)

Once all tests pass, notify LMS team:
```
✅ Info Hub Staging environment variables updated
✅ All localhost references removed
✅ OAuth redirect verified working
✅ Ready for LMS integration testing
```

---

## 🎯 Success Criteria

- [ ] `printenv | grep localhost` returns NO results
- [ ] Curl test shows redirect to `https://next14-landing.zeabur.app/login`
- [ ] Browser test loads Info Hub login page (not localhost error)
- [ ] Automated script passes all 3 checks
- [ ] Debug endpoint (if created) shows all URLs with correct domain
- [ ] LMS team can complete full SSO flow

---

## 📊 Expected Timeline

| Task | Duration | Status |
|------|----------|--------|
| Review this checklist | 10 min | ⏳ Pending |
| Identify all localhost variables | 15 min | ⏳ Pending |
| Update environment variables | 15 min | ⏳ Pending |
| Redeploy Staging | 10 min | ⏳ Pending |
| Run verification tests | 10 min | ⏳ Pending |
| Notify LMS team | 2 min | ⏳ Pending |
| **Total** | **~60 minutes** | |

---

## 💡 Common Mistakes to Avoid

### Mistake 1: Only Updating NEXT_PUBLIC_* Variables
**Problem**: Next.js uses both `NEXT_PUBLIC_*` (client-side) and non-prefixed (server-side) variables.

**Solution**: Update BOTH versions:
```bash
BASE_URL=https://next14-landing.zeabur.app  # Server-side
NEXT_PUBLIC_BASE_URL=https://next14-landing.zeabur.app  # Client-side
```

### Mistake 2: Forgetting to Redeploy
**Problem**: Environment variables only take effect after redeployment.

**Solution**: Always redeploy after changing environment variables (Zeabur should auto-deploy).

### Mistake 3: Using HTTP Instead of HTTPS
**Problem**: Staging should use HTTPS for OAuth security.

**Solution**: All URLs should start with `https://` (not `http://`).

### Mistake 4: Trailing Slashes
**Problem**: Inconsistent trailing slashes can cause routing issues.

**Solution**:
- Base URLs: NO trailing slash (`https://next14-landing.zeabur.app`)
- Specific paths: NO trailing slash (`https://next14-landing.zeabur.app/login`)

---

## 📞 Contact & Support

If you have questions or need clarification:

**LMS Team**:
- Email: [your.email@kcislk.ntpc.edu.tw]
- Available: Monday-Friday, 9 AM - 6 PM

**Debugging Support**:
- Can provide remote assistance if needed
- Can help interpret test results
- Can verify configuration after updates

---

## 📚 Related Documentation

- [Initial Environment Configuration Request](./INFO_HUB_STAGING_CONFIG_REQUEST.md)
- [SSO Integration Overview](./SSO_INTEGRATION_OVERVIEW.md)
- [Session Management Status](./INFOHUB_SESSION_MANAGEMENT_REQUEST.md)

---

**Status**: ⏳ **Awaiting Info Hub team to complete checklist**
**Priority**: 🔴 **HIGH - Blocking SSO testing**
**Next Action**: Info Hub to update ALL localhost references and redeploy

---

_This checklist is comprehensive and should cover all possible environment variables. If the issue persists after following all steps, please contact LMS team for further debugging assistance._
