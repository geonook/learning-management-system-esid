#!/bin/bash
# Test Info Hub OAuth Redirect Configuration
# Usage: bash scripts/test-infohub-oauth-redirect.sh

echo "=================================================="
echo "Info Hub Staging OAuth Redirect Test"
echo "=================================================="
echo ""

# OAuth Authorization URL with LMS callback
TEST_URL="https://next14-landing.zeabur.app/api/oauth/authorize?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208&redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub&response_type=code&code_challenge=test&code_challenge_method=S256&state=test&scope=openid+profile+email"

echo "Testing URL:"
echo "$TEST_URL"
echo ""

# Fetch HTTP headers
RESPONSE=$(curl -sI "$TEST_URL")

# Extract Location header
LOCATION=$(echo "$RESPONSE" | grep -i "^location:" | cut -d' ' -f2- | tr -d '\r\n')

# Extract HTTP status code
STATUS=$(echo "$RESPONSE" | head -n1 | cut -d' ' -f2)

echo "HTTP Status: $STATUS"
echo ""
echo "Redirect Location:"
echo "$LOCATION"
echo ""

# Initialize fail flag
FAIL=0

# Check 1: HTTP Status should be 302 or 307 (redirect)
echo "Running Tests:"
echo "--------------"
if [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "301" ]; then
  echo "✅ Test 1: HTTP redirect status code ($STATUS)"
else
  echo "❌ Test 1: Expected redirect status (302/307), got $STATUS"
  FAIL=1
fi

# Check 2: No localhost references
if echo "$LOCATION" | grep -qE "(localhost|127\.0\.0\.1)"; then
  echo "❌ Test 2: Still contains localhost/127.0.0.1"
  echo "   Found: $(echo "$LOCATION" | grep -oE '(localhost|127\.0\.0\.1)[^&\s]*')"
  FAIL=1
else
  echo "✅ Test 2: No localhost found"
fi

# Check 3: Correct domain
if echo "$LOCATION" | grep -q "next14-landing.zeabur.app"; then
  echo "✅ Test 3: Correctly using next14-landing.zeabur.app"
else
  echo "❌ Test 3: Not using next14-landing.zeabur.app domain"
  echo "   Found: $(echo "$LOCATION" | grep -oE 'https?://[^/]+')"
  FAIL=1
fi

# Check 4: HTTPS protocol
if echo "$LOCATION" | grep -q "^https://"; then
  echo "✅ Test 4: Using HTTPS protocol"
else
  echo "❌ Test 4: Not using HTTPS"
  echo "   Found: $(echo "$LOCATION" | grep -oE '^[a-z]+://')"
  FAIL=1
fi

# Check 5: returnUrl parameter should also use correct domain
if echo "$LOCATION" | grep -q "returnUrl.*next14-landing.zeabur.app"; then
  echo "✅ Test 5: returnUrl parameter uses correct domain"
else
  echo "❌ Test 5: returnUrl parameter incorrect"
  RETURN_URL=$(echo "$LOCATION" | grep -oE 'returnUrl=[^&]+' | head -1)
  echo "   Found: $RETURN_URL"
  FAIL=1
fi

# Check 6: No port numbers (3001, 8080) in domain
if echo "$LOCATION" | grep -qE ':(3001|8080)'; then
  echo "❌ Test 6: Still contains dev port numbers (3001 or 8080)"
  echo "   Found: $(echo "$LOCATION" | grep -oE ':[0-9]+' | head -1)"
  FAIL=1
else
  echo "✅ Test 6: No dev port numbers found"
fi

echo ""
echo "=================================================="
if [ $FAIL -eq 0 ]; then
  echo "✅ ALL TESTS PASSED"
  echo "=================================================="
  echo ""
  echo "Info Hub OAuth redirect is correctly configured!"
  echo "LMS team can now proceed with SSO integration testing."
  echo ""
  exit 0
else
  echo "❌ TESTS FAILED"
  echo "=================================================="
  echo ""
  echo "Info Hub Staging environment still has configuration issues."
  echo "Please review the diagnostic checklist:"
  echo "  docs/sso/INFO_HUB_ENV_DIAGNOSTIC_CHECKLIST.md"
  echo ""
  echo "Common issues:"
  echo "  - LOGIN_URL environment variable still set to localhost:3001"
  echo "  - OAUTH_AUTHORIZE_URL environment variable still set to localhost:8080"
  echo "  - Environment variables not updated on Zeabur"
  echo "  - Service not redeployed after updating environment variables"
  echo ""
  exit 1
fi
