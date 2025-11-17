# Claude Code Prompt: Info Hub Staging Environment Variables Diagnostic

> **For**: Info Hub Development Team using Claude Code
> **Purpose**: Automated environment variable diagnostic and fix for OAuth redirect issues
> **Issue**: OAuth redirects to localhost instead of production domain
> **Priority**: 🔴 HIGH - Blocking LMS SSO integration testing

---

## 📋 Task Overview

**Current Problem**:
```
OAuth Authorization redirects to:
http://localhost:3001/login?returnUrl=https://localhost:8080/api/oauth/authorize?...
         ↑                                   ↑
    Wrong URL 1                          Wrong URL 2
```

**Expected Behavior**:
```
OAuth Authorization should redirect to:
https://next14-landing.zeabur.app/login?returnUrl=https://next14-landing.zeabur.app/api/oauth/authorize?...
```

**Root Cause**: Multiple environment variables still contain localhost references even though `NEXT_PUBLIC_BASE_URL` was updated.

---

## 🎯 Your Mission (Claude Code)

Execute the following diagnostic and fix workflow for Info Hub Staging environment:

### Phase 1: Diagnostic (15 minutes)
1. Export all environment variables
2. Identify ALL localhost references
3. Create comprehensive fix list

### Phase 2: Fix Implementation (15 minutes)
4. Update all identified variables
5. Redeploy staging environment

### Phase 3: Verification (10 minutes)
6. Run automated tests
7. Confirm OAuth redirect works correctly

**Total Time**: ~40 minutes

---

## 🔍 Phase 1: Diagnostic Commands

### Step 1.1: Export All Environment Variables

**If you have server access** (preferred):

```bash
# Export all URL-related environment variables
printenv | grep -E "(URL|BASE|LOGIN|OAUTH|HOST|DOMAIN)" | sort > staging_env_vars.txt

# Display results
cat staging_env_vars.txt
```

**If using Zeabur Dashboard**:
1. Navigate to: Zeabur Dashboard → Info Hub Staging Project
2. Click "Environment Variables" tab
3. Export or screenshot ALL variables

### Step 1.2: Find ALL Localhost References

```bash
# Find any environment variable containing localhost
printenv | grep -E "(localhost|127\.0\.0\.1|::1)" | sort

# Find dev port numbers (3001, 8080)
printenv | grep -E ":(3001|8080)" | sort
```

**Expected Output**: You should see multiple variables with localhost references.

**If output is empty**: Environment variables are correct (unlikely given the error).

### Step 1.3: Critical Variables to Check

Run these specific checks:

```bash
# Check Login URL
echo "LOGIN_URL: $LOGIN_URL"
echo "NEXT_PUBLIC_LOGIN_URL: $NEXT_PUBLIC_LOGIN_URL"

# Check OAuth Authorize URL
echo "OAUTH_AUTHORIZE_URL: $OAUTH_AUTHORIZE_URL"
echo "NEXT_PUBLIC_OAUTH_AUTHORIZE_URL: $NEXT_PUBLIC_OAUTH_AUTHORIZE_URL"

# Check Base URLs
echo "BASE_URL: $BASE_URL"
echo "NEXT_PUBLIC_BASE_URL: $NEXT_PUBLIC_BASE_URL"

# Check OAuth Token URL
echo "OAUTH_TOKEN_URL: $OAUTH_TOKEN_URL"
echo "NEXT_PUBLIC_OAUTH_TOKEN_URL: $NEXT_PUBLIC_OAUTH_TOKEN_URL"
```

**Create a diagnostic report**:

```bash
# Save diagnostic report
cat > staging_diagnostic_report.txt <<'EOF'
Info Hub Staging Environment Diagnostic Report
Generated: $(date)

=== Critical Variables ===
LOGIN_URL: $LOGIN_URL
OAUTH_AUTHORIZE_URL: $OAUTH_AUTHORIZE_URL
BASE_URL: $BASE_URL
NEXT_PUBLIC_BASE_URL: $NEXT_PUBLIC_BASE_URL

=== All Localhost References ===
$(printenv | grep -i localhost)

=== All Dev Port References ===
$(printenv | grep -E ":(3001|8080)")

=== All URL Variables ===
$(printenv | grep URL | sort)
EOF

cat staging_diagnostic_report.txt
```

---

## 🔧 Phase 2: Fix Implementation

### Step 2.1: Required Environment Variable Updates

Update **ALL** of the following variables on **Zeabur Dashboard** (or your deployment platform):

#### Category 1: Base Application URLs ✅
```bash
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

#### Category 2: Frontend/Backend URLs
```bash
FRONTEND_URL=https://next14-landing.zeabur.app
BACKEND_URL=https://next14-landing.zeabur.app
API_URL=https://next14-landing.zeabur.app/api
NEXT_PUBLIC_API_URL=https://next14-landing.zeabur.app/api
NEXT_PUBLIC_FRONTEND_URL=https://next14-landing.zeabur.app
NEXT_PUBLIC_BACKEND_URL=https://next14-landing.zeabur.app
```

#### Category 3: Login Page URL ⚠️ **CRITICAL**
```bash
LOGIN_URL=https://next14-landing.zeabur.app/login  # ❌ Currently localhost:3001
NEXT_PUBLIC_LOGIN_URL=https://next14-landing.zeabur.app/login
LOGIN_PAGE_URL=https://next14-landing.zeabur.app/login
LOGIN_PAGE=https://next14-landing.zeabur.app/login
AUTH_URL=https://next14-landing.zeabur.app/login
NEXT_PUBLIC_AUTH_URL=https://next14-landing.zeabur.app/login
```

#### Category 4: OAuth Endpoints ⚠️ **CRITICAL**
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

# OAuth Callback
OAUTH_CALLBACK_URL=https://next14-landing.zeabur.app/api/oauth/callback
NEXT_PUBLIC_OAUTH_CALLBACK_URL=https://next14-landing.zeabur.app/api/oauth/callback
```

#### Category 5: Environment Type
```bash
NODE_ENV=production  # Should be 'production' even for staging
ENVIRONMENT=staging
DEPLOY_ENV=staging
NEXT_PUBLIC_ENV=staging
```

#### Category 6: Remove/Empty These (if they exist)
```bash
PORT=  # Should be handled by Zeabur
LOCALHOST_PORT=  # Should NOT exist
DEV_PORT=  # Should NOT exist
```

### Step 2.2: Update on Zeabur Dashboard

**Instructions**:
1. Log into Zeabur Dashboard
2. Navigate to Info Hub Staging project
3. Click "Environment Variables" tab
4. For each variable above:
   - If it exists with localhost value → Update to correct value
   - If it doesn't exist → Add it with correct value
5. Click "Save" or "Update"

### Step 2.3: Trigger Redeployment

**Zeabur Auto-Deploy**:
- Zeabur should automatically redeploy after environment variable changes
- Monitor deployment logs (typically 5-10 minutes)

**Manual Trigger** (if auto-deploy doesn't start):
- Click "Redeploy" button in Zeabur Dashboard

**Verify Deployment**:
```bash
# Wait for deployment to complete, then check service status
curl -I https://next14-landing.zeabur.app

# Expected: HTTP/1.1 200 OK or 302 Found
```

---

## ✅ Phase 3: Verification

### Step 3.1: Run Automated Test Script

LMS team provided a comprehensive test script. Run this command:

```bash
# Test OAuth redirect behavior
curl -sI "https://next14-landing.zeabur.app/api/oauth/authorize?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208&redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub&response_type=code&code_challenge=test&code_challenge_method=S256&state=test&scope=openid+profile+email" | grep -i "^location:"
```

**✅ Expected Output**:
```
Location: https://next14-landing.zeabur.app/login?returnUrl=https://next14-landing.zeabur.app/api/oauth/authorize?...
```

**❌ Current Output (WRONG)**:
```
Location: http://localhost:3001/login?returnUrl=https://localhost:8080/...
```

### Step 3.2: Comprehensive Test Checklist

Run these 6 tests:

```bash
#!/bin/bash
# Test Info Hub OAuth Redirect Configuration

TEST_URL="https://next14-landing.zeabur.app/api/oauth/authorize?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208&redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub&response_type=code&code_challenge=test&code_challenge_method=S256&state=test&scope=openid+profile+email"

echo "Testing OAuth Redirect..."
RESPONSE=$(curl -sI "$TEST_URL")
LOCATION=$(echo "$RESPONSE" | grep -i "^location:" | cut -d' ' -f2- | tr -d '\r\n')
STATUS=$(echo "$RESPONSE" | head -n1 | cut -d' ' -f2)

echo "HTTP Status: $STATUS"
echo "Redirect Location: $LOCATION"
echo ""

FAIL=0

# Test 1: HTTP Status should be 302 or 307
if [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "301" ]; then
  echo "✅ Test 1: HTTP redirect status code ($STATUS)"
else
  echo "❌ Test 1: Expected redirect status (302/307), got $STATUS"
  FAIL=1
fi

# Test 2: No localhost references
if echo "$LOCATION" | grep -qE "(localhost|127\.0\.0\.1)"; then
  echo "❌ Test 2: Still contains localhost/127.0.0.1"
  FAIL=1
else
  echo "✅ Test 2: No localhost found"
fi

# Test 3: Correct domain
if echo "$LOCATION" | grep -q "next14-landing.zeabur.app"; then
  echo "✅ Test 3: Correctly using next14-landing.zeabur.app"
else
  echo "❌ Test 3: Not using next14-landing.zeabur.app domain"
  FAIL=1
fi

# Test 4: HTTPS protocol
if echo "$LOCATION" | grep -q "^https://"; then
  echo "✅ Test 4: Using HTTPS protocol"
else
  echo "❌ Test 4: Not using HTTPS"
  FAIL=1
fi

# Test 5: returnUrl parameter
if echo "$LOCATION" | grep -q "returnUrl.*next14-landing.zeabur.app"; then
  echo "✅ Test 5: returnUrl parameter uses correct domain"
else
  echo "❌ Test 5: returnUrl parameter incorrect"
  FAIL=1
fi

# Test 6: No dev port numbers
if echo "$LOCATION" | grep -qE ':(3001|8080)'; then
  echo "❌ Test 6: Still contains dev port numbers (3001 or 8080)"
  FAIL=1
else
  echo "✅ Test 6: No dev port numbers found"
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "✅ ALL TESTS PASSED - OAuth redirect is correctly configured"
  exit 0
else
  echo "❌ TESTS FAILED - Please review environment variables"
  exit 1
fi
```

### Step 3.3: Browser Manual Test

1. Open: https://lms-staging.zeabur.app/auth/login
2. Click "Login with Google" button
3. Check browser URL bar

**✅ Expected**: Should show `https://next14-landing.zeabur.app/login`
**❌ Current**: Shows `localhost:3001` connection error

### Step 3.4: Debug Endpoint (Optional)

Create a temporary debug endpoint to verify runtime environment variables:

```typescript
// pages/api/debug-env.ts (REMOVE after debugging!)
export default function handler(req, res) {
  // Only allow in staging
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

## 🎯 Success Criteria

When ALL environment variables are correctly configured, you should see:

- [ ] `printenv | grep localhost` returns **NO** results
- [ ] Curl test shows redirect to `https://next14-landing.zeabur.app/login`
- [ ] Browser test loads Info Hub login page (not localhost error)
- [ ] Automated test script passes **all 6 tests**
- [ ] Debug endpoint (if created) shows all URLs with correct domain
- [ ] LMS team can complete full SSO flow

---

## 📊 Reporting Results

Once verification is complete, notify LMS team with this template:

```
✅ Info Hub Staging Environment Variables - Fix Complete

**Diagnostic Results**:
- Total variables updated: [NUMBER]
- Localhost references removed: [NUMBER]
- Environment: Staging (next14-landing.zeabur.app)

**Test Results**:
✅ Test 1: HTTP redirect status (302)
✅ Test 2: No localhost references
✅ Test 3: Correct domain
✅ Test 4: HTTPS protocol
✅ Test 5: returnUrl parameter correct
✅ Test 6: No dev port numbers

**Deployment**:
- Redeployed at: [TIMESTAMP]
- Deployment time: [DURATION]
- Service status: ✅ Healthy

**Next Steps**:
- Ready for LMS SSO integration testing
- LMS team can proceed with end-to-end OAuth flow
```

---

## ⚠️ Common Mistakes to Avoid

1. **Only updating NEXT_PUBLIC_* variables**
   - ❌ Wrong: Update only `NEXT_PUBLIC_BASE_URL`
   - ✅ Correct: Update BOTH `BASE_URL` and `NEXT_PUBLIC_BASE_URL`

2. **Forgetting to redeploy**
   - Environment variables only take effect after redeployment

3. **Using HTTP instead of HTTPS**
   - All URLs must start with `https://` (not `http://`)

4. **Trailing slashes**
   - Base URLs: NO trailing slash (`https://next14-landing.zeabur.app`)
   - Specific paths: NO trailing slash (`https://next14-landing.zeabur.app/login`)

5. **Partial fixes**
   - Must update ALL variables, not just 1-2

---

## 📞 Support

If you encounter issues or need clarification:

**LMS Team Contact**:
- Available: Monday-Friday, 9 AM - 6 PM
- Response time: < 2 hours during business hours

**Related Documentation**:
- [Complete Environment Diagnostic Checklist](./INFO_HUB_ENV_DIAGNOSTIC_CHECKLIST.md)
- [Staging Configuration Request](./INFO_HUB_STAGING_CONFIG_REQUEST.md)
- [SSO Integration Overview](./SSO_INTEGRATION_OVERVIEW.md)

---

## 🚀 Quick Command Reference

```bash
# Diagnostic
printenv | grep -E "(URL|LOGIN|OAUTH)" | sort
printenv | grep -i localhost
printenv | grep -E ":(3001|8080)"

# Verification
curl -sI "https://next14-landing.zeabur.app/api/oauth/authorize?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208&redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub&response_type=code&code_challenge=test&code_challenge_method=S256&state=test" | grep -i location

# Service Health Check
curl -I https://next14-landing.zeabur.app
```

---

**Estimated Time**: 40 minutes total
**Priority**: 🔴 HIGH - Blocking LMS SSO integration
**Status**: ⏳ Awaiting Info Hub team execution

---

_This prompt is designed for Claude Code to execute autonomously. Info Hub team should copy this entire prompt and provide it to Claude Code for automatic diagnosis and fix._
