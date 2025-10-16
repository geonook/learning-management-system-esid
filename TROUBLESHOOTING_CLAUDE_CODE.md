# Claude Code Environment Variable Cache Issue - Troubleshooting Guide

> **Issue Discovered**: 2025-10-16
> **Severity**: Critical - Blocks development after environment changes
> **Status**: Documented workarounds available
> **Affects**: Next.js projects using Claude Code with environment variables

This document provides detailed troubleshooting steps for the Claude Code environment variable caching issue encountered during Supabase Cloud migration.

## 📋 Table of Contents

- [Problem Overview](#problem-overview)
- [Technical Root Cause](#technical-root-cause)
- [Symptom Identification](#symptom-identification)
- [Diagnostic Commands](#diagnostic-commands)
- [Solution Options](#solution-options)
- [Prevention Strategies](#prevention-strategies)
- [Related Issues](#related-issues)

## 🚨 Problem Overview

### What Happens

When you update environment variables in `.env.local` (e.g., changing Supabase URL during migration), Claude Code continues to use the **old cached values** instead of reading the updated file. This causes:

1. **Browser CORS errors** - Requests go to old URLs
2. **Authentication failures** - Wrong API endpoints
3. **Build cache poisoning** - Old values compiled into JavaScript bundles
4. **Persistent errors** - Standard cache clearing doesn't fix the issue

### Why It Happens

Claude Code stores environment variables in session history files (`~/.claude/projects/.../*.jsonl`) and **re-injects them into every Bash command execution**. This creates a hierarchy where:

```
Claude Code Session Cache (highest priority)
    ↓ overrides
Shell Environment Variables
    ↓ overrides
.env.local File (ignored!)
```

Even after updating `.env.local`, the session cache continues injecting old values, which Next.js webpack then compiles into static JavaScript bundles.

## 🔍 Technical Root Cause

### Environment Variable Flow

**Normal Flow** (without Claude Code):
```
.env.local → process.env → Next.js webpack → Compiled JS
```

**With Claude Code** (problematic):
```
.env.local (updated) ❌ ignored
    ↓
Session Cache (~/.claude/*.jsonl) ✅ injected
    ↓
Shell Environment (old values)
    ↓
process.env (old values)
    ↓
Next.js webpack
    ↓
Compiled JS (hardcoded old values)
```

### File Locations

**Session Cache Files**:
```bash
~/.claude/projects/-Users-chenzehong-Desktop-LMS/*.jsonl
```

These JSON Lines files store:
- Environment variables from previous sessions
- Command history
- File read/write operations
- Tool execution context

**Next.js Build Cache**:
```bash
/Users/chenzehong/Desktop/LMS/.next/
/Users/chenzehong/Desktop/LMS/.swc/
/Users/chenzehong/Desktop/LMS/node_modules/.cache/
```

These directories contain:
- Compiled JavaScript bundles with hardcoded env vars
- Webpack module cache
- SWC compilation cache

## 🔎 Symptom Identification

### Quick Diagnosis Checklist

Run these checks to confirm you're experiencing this issue:

#### ✅ Symptom 1: .env.local is Correct
```bash
cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL
# Should show NEW URL: https://[project-ref].supabase.co
```

#### ❌ Symptom 2: Shell Environment is Wrong
```bash
env | grep NEXT_PUBLIC_SUPABASE_URL
# Shows OLD URL: https://old-domain.zeabur.app
```

#### ❌ Symptom 3: Browser Requests Wrong URL
Open browser Developer Tools → Network tab:
- Requests going to old domain (e.g., `esid-lms.zeabur.app`)
- CORS errors: "No 'Access-Control-Allow-Origin' header"

#### ❌ Symptom 4: Compiled JS Contains Old URL
```bash
grep -r "old-domain.zeabur.app" .next/static/chunks/ 2>/dev/null | head -5
# Returns matches with old URL hardcoded
```

#### ❌ Symptom 5: Cache Clearing Doesn't Help
```bash
rm -rf .next node_modules/.cache .swc
npm run dev
# Still shows old URL in browser network requests
```

### Affected Scenarios

This issue occurs when:
- ✅ Migrating between Supabase instances
- ✅ Changing API endpoints or base URLs
- ✅ Switching between development/staging/production environments
- ✅ Updating authentication providers
- ✅ Any environment variable change that affects client-side code

## 🛠️ Diagnostic Commands

### Step 1: Verify File Contents

```bash
# Check .env.local has correct values
cat /Users/chenzehong/Desktop/LMS/.env.local

# Expected output:
# NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### Step 2: Check Runtime Environment

```bash
# Check what environment variables are actually set
env | grep SUPABASE

# If output shows old URL, environment is polluted:
# NEXT_PUBLIC_SUPABASE_URL=https://esid-lms.zeabur.app ❌
```

### Step 3: Inspect Compiled Output

```bash
# Search for old URL in compiled JavaScript
find .next -type f -name "*.js" -exec grep -l "old-domain" {} \; 2>/dev/null

# Check specific client bundle
cat .next/server/app/page.js | grep -A 5 "createBrowserClient"
```

### Step 4: Test Browser Environment

Open browser console (F12) and run:

```javascript
// Check Supabase client URL
console.log(window?._supabaseClient?.supabaseUrl)

// Check process.env (if exposed)
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)

// Make test request
fetch('https://correct-url.supabase.co/rest/v1/')
  .then(r => console.log('✅ Correct URL works'))
  .catch(e => console.error('❌ Network error:', e))
```

### Step 5: Verify Claude Code Session Cache

```bash
# List Claude Code session files
ls -lah ~/.claude/projects/-Users-chenzehong-Desktop-LMS/

# Check latest session file content (careful - may be large!)
tail -100 ~/.claude/projects/-Users-chenzehong-Desktop-LMS/*.jsonl | grep SUPABASE_URL
```

## ✅ Solution Options

### Option 1: Clear Claude Code Session Cache (Recommended)

**When to use**: After updating any environment variables

**Steps**:
```bash
# 1. Exit Claude Code / Cursor / VSCode completely
# (Close all windows)

# 2. Remove session cache files
rm -f ~/.claude/projects/-Users-chenzehong-Desktop-LMS/*.jsonl

# 3. Clear Next.js build cache
cd /Users/chenzehong/Desktop/LMS
rm -rf .next node_modules/.cache .swc

# 4. Restart IDE
# Open Cursor/VSCode again

# 5. Start dev server outside Claude Code
npm run dev

# 6. Verify in new terminal
env | grep SUPABASE_URL
# Should now show correct URL from .env.local
```

**Pros**:
- ✅ Completely fixes root cause
- ✅ Clean slate for development
- ✅ No code changes needed

**Cons**:
- ❌ Loses Claude Code conversation history
- ❌ Must restart IDE
- ❌ Manual process

### Option 2: Use External Terminal (Quick Workaround)

**When to use**: Need to continue working immediately

**Steps**:
```bash
# 1. Open terminal OUTSIDE Claude Code
# (iTerm, Terminal.app, etc.)

# 2. Navigate to project
cd /Users/chenzehong/Desktop/LMS

# 3. Verify environment
cat .env.local | grep SUPABASE_URL
env | grep SUPABASE_URL
# Both should show correct URL

# 4. Kill any Claude Code dev servers
pkill -f "next dev"

# 5. Start dev server in external terminal
npm run dev

# Keep this terminal open while working
```

**Pros**:
- ✅ Quick fix
- ✅ No session cache issues
- ✅ Keeps Claude Code context

**Cons**:
- ❌ Must keep external terminal open
- ❌ Claude Code can't control dev server
- ❌ Temporary workaround only

### Option 3: Temporary Hardcode (Emergency Only)

**When to use**: Production emergency or time-critical debugging

**⚠️ WARNING**: This is NOT a permanent solution!

**Steps**:
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  // EMERGENCY HARDCODE - REMOVE AFTER FIXING ENVIRONMENT
  return createBrowserClient<Database>(
    'https://piwbooidofbaqklhijup.supabase.co', // ⚠️ Hardcoded!
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // ⚠️ Hardcoded!
  )
}

export const supabase = createClient()
```

```bash
# Clear cache and rebuild
rm -rf .next
npm run dev
```

**Pros**:
- ✅ Works immediately
- ✅ Bypasses environment issues

**Cons**:
- ❌ Not portable across environments
- ❌ Security risk if committed to git
- ❌ Must manually update for each environment change
- ❌ NEVER use in production

**Cleanup** (after fixing environment):
```typescript
// Revert to environment variables
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Option 4: Use Process Environment Override

**When to use**: Need to test different configurations quickly

**Steps**:
```bash
# 1. Create temporary env override script
cat > run-dev.sh << 'EOF'
#!/bin/bash
export NEXT_PUBLIC_SUPABASE_URL="https://piwbooidofbaqklhijup.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."

npm run dev
EOF

chmod +x run-dev.sh

# 2. Run script
./run-dev.sh

# Environment variables now override .env.local
```

**Pros**:
- ✅ Explicit environment control
- ✅ Easy to switch configurations
- ✅ Script can be version controlled

**Cons**:
- ❌ Extra script to maintain
- ❌ Claude Code still can't use Bash tool correctly
- ❌ Must remember to use script instead of `npm run dev`

## 🛡️ Prevention Strategies

### Strategy 1: Separate Environment Files

Instead of updating `.env.local`, create environment-specific files:

```bash
# Project structure
.env.local              # Local development (Zeabur)
.env.cloud              # Supabase Cloud
.env.staging            # Staging environment
.env.production         # Production (never committed!)
```

**Usage**:
```bash
# Switch environments with dotenv-cli
npm install -D dotenv-cli

# package.json
{
  "scripts": {
    "dev": "dotenv -e .env.local -- next dev",
    "dev:cloud": "dotenv -e .env.cloud -- next dev",
    "dev:staging": "dotenv -e .env.staging -- next dev"
  }
}

# Run with specific environment
npm run dev:cloud
```

### Strategy 2: Environment Validation Script

Create a script to verify environment before starting:

```bash
# scripts/verify-env.sh
#!/bin/bash

EXPECTED_URL="https://piwbooidofbaqklhijup.supabase.co"
ACTUAL_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)

if [ "$ACTUAL_URL" != "$EXPECTED_URL" ]; then
  echo "❌ ERROR: Environment URL mismatch!"
  echo "Expected: $EXPECTED_URL"
  echo "Actual: $ACTUAL_URL"
  exit 1
fi

if [ -d ".next" ]; then
  echo "⚠️  WARNING: Build cache exists. Checking for old URLs..."
  if grep -r "esid-lms.zeabur.app" .next/ 2>/dev/null; then
    echo "❌ ERROR: Build cache contains old URLs. Clearing..."
    rm -rf .next node_modules/.cache .swc
  fi
fi

echo "✅ Environment validation passed"
```

**Usage**:
```json
// package.json
{
  "scripts": {
    "predev": "bash scripts/verify-env.sh",
    "dev": "next dev"
  }
}
```

### Strategy 3: Docker Development Environment

Use Docker to isolate environment completely:

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Environment variables passed at runtime
ENV NODE_ENV=development

CMD ["npm", "run", "dev"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    env_file:
      - .env.cloud  # Explicit environment file
```

**Usage**:
```bash
# Start with specific environment
docker-compose up

# No Claude Code environment pollution possible!
```

## 🔗 Related Issues

### Next.js Environment Variable Compilation

Next.js compiles `NEXT_PUBLIC_*` variables at **build time**:

```javascript
// This is compiled to:
const url = process.env.NEXT_PUBLIC_SUPABASE_URL

// Becomes (in production build):
const url = "https://hardcoded-url.supabase.co"
```

**Implications**:
- Changing `.env.local` requires **full rebuild**
- Cache must be cleared to see changes
- Environment variables are **static** in client bundles

**Reference**: [Next.js Environment Variables Docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

### Claude Code Session Persistence

Claude Code maintains session state in JSON Lines files for:
- Conversation continuity
- Tool execution context
- Environment consistency

**Trade-offs**:
- ✅ Persistent context across IDE restarts
- ✅ Reproducible command execution
- ❌ Environment variable caching issues
- ❌ Stale state after external changes

### Webpack Module Caching

Webpack caches compiled modules in `.next/cache`:

```
.next/
├── cache/
│   ├── webpack/              # Module cache
│   │   ├── client-development/
│   │   └── server-development/
```

**Behavior**:
- Modules with unchanged source are **not recompiled**
- Environment variables are considered part of module signature
- If env vars change but source doesn't, cache may serve old version

**Solution**: Always clear cache after env changes:
```bash
rm -rf .next/cache
```

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Webpack Caching](https://webpack.js.org/configuration/cache/)
- [Supabase Client Configuration](https://supabase.com/docs/reference/javascript/initializing)
- [Claude Code GitHub Issues](https://github.com/anthropics/claude-code/issues)

## 📝 Summary Quick Reference

**Problem**: Claude Code caches old environment variables
**Root Cause**: Session history injects old values into Bash tools
**Quick Fix**: Use external terminal for `npm run dev`
**Permanent Fix**: Clear `~/.claude/projects/.../*.jsonl` and restart IDE
**Prevention**: Use environment-specific files + validation scripts

---

**🔧 Troubleshooting Guide | LMS-ESID | v1.0**
📅 Issue Discovered: 2025-10-16 | 🐛 Claude Code Environment Cache
