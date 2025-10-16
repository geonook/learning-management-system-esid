# Supabase Cloud Setup Guide

> **Documentation Version**: 1.0
> **Migration Date**: 2025-10-16
> **Target Environment**: Supabase Official Cloud
> **Project**: learning-management-system-esid

This guide provides step-by-step instructions for setting up and migrating to Supabase Cloud for the LMS-ESID project.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Create Supabase Cloud Project](#create-supabase-cloud-project)
- [Database Schema Deployment](#database-schema-deployment)
- [Environment Configuration](#environment-configuration)
- [Data Migration](#data-migration)
- [Verification & Testing](#verification--testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Prerequisites

Before starting the migration, ensure you have:

- [ ] **Supabase Cloud Account** - Sign up at [supabase.com](https://supabase.com)
- [ ] **Git Repository** - Latest code with all database schemas in `/db/` directory
- [ ] **Node.js & npm** - Version 18+ installed locally
- [ ] **Supabase CLI** - Install via `npm install -g supabase`
- [ ] **Database Backup** - If migrating from existing system, create full backup first

## 🚀 Create Supabase Cloud Project

### Step 1: Create New Project

1. **Login to Supabase Dashboard**
   - Visit [app.supabase.com](https://app.supabase.com)
   - Sign in with your account

2. **Create New Project**
   - Click "New Project" button
   - Fill in project details:
     - **Name**: `lms-esid` (or your preferred name)
     - **Database Password**: Generate strong password (save securely!)
     - **Region**: Select closest region to your users
       - Asia: Singapore (Southeast Asia) or Tokyo (Northeast Asia)
       - Americas: US East or US West
       - Europe: Frankfurt or London
     - **Pricing Plan**: Select appropriate tier (Free tier available for development)

3. **Wait for Project Initialization**
   - This typically takes 2-3 minutes
   - Note your project details once ready:
     - **Project URL**: `https://[PROJECT_REF].supabase.co`
     - **API Keys**: `anon` (public) and `service_role` (secret)

### Step 2: Obtain API Credentials

Navigate to **Project Settings** → **API**:

```env
# Copy these values for .env.local configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **SECURITY REMINDER**:
- ✅ `anon` key - Safe for client-side (respects RLS)
- ❌ `service_role` key - Server-only! Bypasses RLS policies

## 🗄️ Database Schema Deployment

### Option A: Using Supabase Dashboard SQL Editor

1. **Navigate to SQL Editor**
   - Go to **SQL Editor** in left sidebar
   - Click "+ New query"

2. **Deploy Schema Files in Order**

   Execute these files sequentially in the SQL Editor:

   **Step 1: Core Tables** (`/db/schemas/`)
   ```sql
   -- Copy and execute contents of:
   -- 1. users.sql
   -- 2. classes.sql
   -- 3. courses.sql
   -- 4. exams.sql
   -- 5. scores.sql
   -- 6. assessment_titles.sql
   -- 7. notifications.sql
   ```

   **Step 2: Analytics Views** (`/db/views/`)
   ```sql
   -- Copy and execute contents of:
   -- 1. student_grade_aggregates.sql
   -- 2. class_statistics.sql
   -- 3. teacher_performance.sql
   ```

   **Step 3: RLS Policies** (`/db/policies/`)
   ```sql
   -- Copy and execute contents of:
   -- 1. users_policies.sql
   -- 2. classes_policies.sql
   -- 3. courses_policies.sql
   -- 4. exams_policies.sql
   -- 5. scores_policies.sql
   -- 6. assessment_titles_policies.sql
   -- 7. notifications_policies.sql
   ```

   **Step 4: Seed Data** (`/db/seeds/`) - Optional for testing
   ```sql
   -- Copy and execute contents of:
   -- 1. test_users.sql
   -- 2. test_classes.sql
   -- 3. test_courses.sql
   -- 4. test_exams.sql
   -- 5. test_scores.sql
   ```

3. **Verify Deployment**
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Verify RLS is enabled
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';

   -- Check views exist
   SELECT table_name FROM information_schema.views
   WHERE table_schema = 'public';
   ```

### Option B: Using Supabase CLI (Advanced)

```bash
# Login to Supabase CLI
supabase login

# Link to your cloud project
supabase link --project-ref [YOUR_PROJECT_REF]

# Push local migrations to cloud
supabase db push

# Verify migration success
supabase db remote ls
```

## ⚙️ Environment Configuration

### Step 1: Update Local Environment Variables

Create/update `/Users/chenzehong/Desktop/LMS/.env.local`:

```env
# Supabase Official Cloud Configuration
# Project: lms-esid
# Region: [Your selected region]
# Migration Date: 2025-10-16

# Public Configuration (safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]

# Server-side Configuration (KEEP SECRET!)
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Development Settings
NODE_ENV=development
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

### Step 2: Verify Configuration File

```bash
# From project root
cd /Users/chenzehong/Desktop/LMS

# Check .env.local exists and contains correct values
cat .env.local | grep SUPABASE_URL

# Expected output:
# NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
```

### Step 3: Clear Build Cache (CRITICAL!)

⚠️ **IMPORTANT**: Next.js compiles environment variables into static bundles at build time.

```bash
# Remove all cache directories
rm -rf .next node_modules/.cache .swc

# Verify deletion
ls -la | grep -E '\.next|\.swc'
# Should return nothing
```

### Step 4: Restart Development Server

```bash
# Kill any existing dev servers
pkill -f "next dev"

# Start fresh dev server
npm run dev
```

### Step 5: Verify Environment in Browser

Open Developer Console and run:

```javascript
// Check Supabase client configuration
console.log(window._supabaseClient?.supabaseUrl)

// Expected output:
// "https://[YOUR_PROJECT_REF].supabase.co"

// NOT the old URL!
```

## 📦 Data Migration

### If Migrating from Existing Database

1. **Export Data from Old System**
   ```bash
   # Using pg_dump for PostgreSQL databases
   pg_dump -h [OLD_HOST] -U [USERNAME] -d [DATABASE] \
     --data-only --inserts --table=users --table=classes \
     --table=courses --table=exams --table=scores \
     -f backup_data.sql
   ```

2. **Clean and Prepare Data**
   - Review `backup_data.sql` for any environment-specific references
   - Update UUIDs if necessary
   - Ensure data conforms to new schema

3. **Import to Supabase Cloud**
   ```bash
   # Using Supabase SQL Editor
   # Copy contents of backup_data.sql and execute

   # OR using psql directly
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
     -f backup_data.sql
   ```

4. **Verify Data Integrity**
   ```sql
   -- Check record counts
   SELECT
     (SELECT COUNT(*) FROM users) as users_count,
     (SELECT COUNT(*) FROM classes) as classes_count,
     (SELECT COUNT(*) FROM courses) as courses_count,
     (SELECT COUNT(*) FROM exams) as exams_count,
     (SELECT COUNT(*) FROM scores) as scores_count;
   ```

### If Starting Fresh

Use the seed data scripts provided in `/db/seeds/`:

```sql
-- Execute test data scripts in SQL Editor
-- See "Database Schema Deployment" section above
```

## ✅ Verification & Testing

### Database Verification

```sql
-- 1. Check table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Verify RLS policies exist
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public';

-- 3. Test analytics views
SELECT * FROM student_grade_aggregates LIMIT 5;
SELECT * FROM class_statistics LIMIT 5;
SELECT * FROM teacher_performance LIMIT 5;

-- 4. Check indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Authentication Testing

1. **Create Test Admin User**
   ```sql
   -- Via Supabase Dashboard: Authentication > Users > Add User
   -- OR via SQL Editor:
   INSERT INTO auth.users (
     instance_id,
     id,
     aud,
     role,
     email,
     encrypted_password,
     email_confirmed_at,
     recovery_sent_at,
     last_sign_in_at,
     raw_app_meta_data,
     raw_user_meta_data,
     created_at,
     updated_at,
     confirmation_token,
     email_change,
     email_change_token_new,
     recovery_token
   ) VALUES (
     '00000000-0000-0000-0000-000000000000',
     uuid_generate_v4(),
     'authenticated',
     'authenticated',
     'admin@school.edu',
     crypt('admin123456', gen_salt('bf')),
     NOW(),
     NOW(),
     NOW(),
     '{"provider":"email","providers":["email"]}',
     '{}',
     NOW(),
     NOW(),
     '',
     '',
     '',
     ''
   );

   -- Add to users table
   INSERT INTO public.users (id, email, role, full_name, created_at)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'admin@school.edu'),
     'admin@school.edu',
     'admin',
     'System Administrator',
     NOW()
   );
   ```

2. **Test Login Flow**
   ```bash
   # Start dev server
   npm run dev

   # Navigate to http://localhost:3000/auth/login
   # Try logging in with admin@school.edu / admin123456
   ```

3. **Verify RLS Permissions**
   ```javascript
   // In browser console after login
   const { data, error } = await supabase
     .from('users')
     .select('*')

   console.log('Users:', data)
   // Should return all users for admin role
   ```

### API Endpoint Testing

```bash
# Test Supabase connection
curl -s "https://[PROJECT_REF].supabase.co/rest/v1/" \
  -H "apikey: [YOUR_ANON_KEY]" \
  | jq .

# Test authentication endpoint
curl -s "https://[PROJECT_REF].supabase.co/auth/v1/health" \
  -H "apikey: [YOUR_ANON_KEY]" \
  | jq .

# Expected response:
# {
#   "version": "2.x.x",
#   "health": "ok"
# }
```

### Application Testing Checklist

- [ ] **Login**: Admin, Head Teacher, Teacher accounts all work
- [ ] **Dashboard**: Data displays correctly with no CORS errors
- [ ] **Grade Entry**: Can create/edit exams and enter scores
- [ ] **CSV Import**: Bulk score import works correctly
- [ ] **Analytics**: Views load with correct statistics
- [ ] **Permissions**: RLS correctly filters data by role
- [ ] **Assessment Titles**: Head Teachers can customize display names
- [ ] **Notifications**: Real-time notification center updates

## 🔧 Troubleshooting

### Issue: CORS Errors with Old URL

**Symptoms**:
```
Access to fetch at 'https://old-domain.zeabur.app/...'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Root Cause**: Next.js webpack cached old environment variables in `.next` build output.

**Solution**: See [CLAUDE.md - Known Issues Section](CLAUDE.md#⚠️-已知問題與解決方案-2025-10-16)

### Issue: Authentication Fails

**Symptoms**: Login returns "Invalid credentials" or network error.

**Diagnosis**:
```sql
-- Check if user exists in auth.users
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'admin@school.edu';

-- Check if user exists in public.users
SELECT id, email, role
FROM public.users
WHERE email = 'admin@school.edu';
```

**Solutions**:
1. Ensure email is confirmed: `email_confirmed_at IS NOT NULL`
2. Verify user exists in both `auth.users` and `public.users`
3. Check password was set correctly during user creation

### Issue: RLS Denies Access

**Symptoms**: Queries return empty results or "permission denied" errors.

**Diagnosis**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- Check policies exist
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';
```

**Solutions**:
1. Verify RLS policies were deployed correctly
2. Check user's role in `public.users` table
3. Test with `service_role` key to bypass RLS temporarily (debugging only!)

### Issue: Slow Query Performance

**Symptoms**: Analytics views or dashboard load slowly (>2 seconds).

**Diagnosis**:
```sql
-- Check if indexes exist
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM student_grade_aggregates
WHERE student_id = 'some-uuid';
```

**Solutions**:
1. Ensure all indexes from `/db/schemas/` were created
2. Run `ANALYZE` on tables to update statistics
3. Consider adding composite indexes for common query patterns

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

## 🔐 Security Checklist

Before going to production:

- [ ] **Environment Variables**: `service_role` key never exposed to client
- [ ] **RLS Enabled**: All tables have RLS enabled
- [ ] **RLS Policies**: Comprehensive policies for all roles
- [ ] **API Keys**: Rotate keys if accidentally exposed
- [ ] **Database Backups**: Automated backups enabled (Project Settings > Database)
- [ ] **SSL/TLS**: All connections use HTTPS
- [ ] **Rate Limiting**: Configure via Supabase dashboard
- [ ] **Audit Logging**: Enable audit logs for sensitive operations

---

**🎯 Supabase Cloud Setup Guide | LMS-ESID | v1.0**
📅 Migration Date: 2025-10-16 | ☁️ Official Cloud Platform
