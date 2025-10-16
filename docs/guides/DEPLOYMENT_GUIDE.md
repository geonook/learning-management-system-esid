# 🚀 Primary School LMS - Complete Deployment Guide

## 🎯 Production-Ready Deployment

This guide covers complete deployment of the Primary School Learning Management System with **Advanced Analytics** capabilities using **Zeabur (frontend)** and **Supabase Cloud (backend database)**.

> **Version**: 1.4.0 | **Analytics**: Phase 3A-1 ✅ Complete + Database Views | **Migration**: Supabase Cloud ✅ | **Last Updated**: 2025-10-16

## 📋 Prerequisites

### 1. Required Accounts & Services
- ✅ **GitHub Account** - For repository hosting and CI/CD
- ✅ **Zeabur Account** - For frontend application hosting
- ✅ **Supabase Cloud Account** - For managed database hosting (Official Cloud)
- ✅ **Domain (Optional)** - Custom domain for production

### 2. Required Information
- ✅ **Supabase Project URL** - From Supabase Cloud dashboard (`https://[ref].supabase.co`)
- ✅ **Supabase Anon Key** - From Supabase Cloud Project Settings → API
- 🚨 **Supabase Service Role Key** - Critical for CSV imports and admin operations (from same API page)

> **📚 Detailed Setup Guide**: See [SUPABASE_CLOUD_SETUP.md](../setup/SUPABASE_CLOUD_SETUP.md) for complete Supabase Cloud configuration instructions.

## 🔧 Environment Configuration

### 1. Create Environment File
Copy `.env.example` to `.env.local` and configure:

```env
# Production Supabase Configuration (Supabase Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 🚨 CRITICAL: Service Role Key for bulk operations
# Get from: Supabase Cloud Dashboard > Project Settings > API > service_role
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_VERSION=1.4.0

# Analytics Configuration (Phase 3A-1)
NEXT_PUBLIC_ANALYTICS_ENABLED=true
ANALYTICS_CACHE_TTL=300000
ANALYTICS_BATCH_SIZE=100

# Security
NEXTAUTH_SECRET=your-production-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

### 2. Obtain Supabase API Keys from Cloud
**⚠️ Critical Step for CSV Import Functionality:**

1. Login to [Supabase Cloud Dashboard](https://app.supabase.com)
2. Select your LMS project
3. Navigate to **Project Settings → API**
4. Copy the following keys:
   - **Project URL**: `https://[project-ref].supabase.co`
   - **anon public**: For client-side operations (respects RLS)
   - **service_role**: For server-side bulk operations (bypasses RLS)
5. Add these to your production environment variables

> **⚠️ Security Note**: Never expose `service_role` key to client-side code!

## 🚀 Deployment Steps

### Phase 1: Database Setup on Supabase Cloud

#### 1.1 Create Supabase Cloud Project
```
1. Visit https://app.supabase.com
2. Click "New Project"
3. Fill in project details:
   - Name: lms-esid
   - Database Password: (generate strong password - save it!)
   - Region: Select closest to users (Asia: Singapore or Tokyo)
4. Wait 2-3 minutes for project initialization
5. Note your Project URL and API keys from Settings → API
```

> **📚 Complete Setup Instructions**: Follow [SUPABASE_CLOUD_SETUP.md](../setup/SUPABASE_CLOUD_SETUP.md) for detailed cloud setup.

#### 1.2 Deploy Clean Database Schema
Use Supabase Cloud SQL Editor to deploy schema:

**Steps**:
1. Navigate to **SQL Editor** in Supabase Cloud dashboard
2. Click **+ New query**
3. Execute schema files in order:
   ```sql
   -- From /db/schemas/ directory:
   -- 1. users.sql
   -- 2. classes.sql
   -- 3. courses.sql
   -- 4. exams.sql
   -- 5. scores.sql
   -- 6. assessment_titles.sql
   -- 7. notifications.sql

   -- From /db/views/ directory:
   -- 1. student_grade_aggregates.sql
   -- 2. class_statistics.sql
   -- 3. teacher_performance.sql

   -- From /db/policies/ directory:
   -- Execute all RLS policy files
   ```

**Alternative Method - Using Supabase CLI:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to cloud project
supabase link --project-ref [YOUR_PROJECT_REF]

# Push local schema to cloud
supabase db push
```

### Phase 2: Frontend Deployment on Zeabur

#### 2.1 GitHub Repository Setup
```bash
# Ensure your code is pushed to GitHub
git add .
git commit -m "feat: production deployment preparation"
git push origin main
```

#### 2.2 Deploy Next.js Application
1. **Zeabur Dashboard** → **Add Service** → **GitHub Repository**
2. Select your LMS repository
3. **Service Type:** Web Service (Node.js/Next.js)
4. **Build Command:** `npm run build`
5. **Start Command:** `npm start`

#### 2.3 Configure Environment Variables in Zeabur
Add all production environment variables in Zeabur dashboard:

```env
# Supabase Cloud Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-cloud
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-cloud

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.4.0

# Security
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-zeabur-app-url

# Analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

> **⚠️ Important**: Use API keys from **Supabase Cloud** (Project Settings → API), not from old Zeabur Supabase instance.

### Phase 3: Verification & Testing

#### 3.1 Health Check Endpoints
```bash
# Test database connectivity
curl https://your-zeabur-app-url/api/test-db

# Test authentication
curl https://your-zeabur-app-url/api/test-connection

# Test CSV import system
curl https://your-zeabur-app-url/api/zeabur-diagnostic
```

#### 3.2 Import Sample Data
Navigate to `https://your-zeabur-app-url/admin/import` and upload CSV files in order:

1. **Users** (test-data-primary/1-users-primary.csv)
2. **Classes** (test-data-primary/2-classes-primary.csv) 
3. **Students** (test-data-primary/3-students-primary.csv)
4. **Scores** (test-data-primary/4-scores-primary.csv)

## 📊 預期結果

### 成功指標
- ✅ 資料庫表格結構乾淨，沒有 migration 殘留
- ✅ Service Role 權限正常，可以寫入資料
- ✅ CSV 匯入功能完全正常
- ✅ 所有 4 個階段匯入成功，資料確實寫入資料庫

### 故障排除

#### 問題：「403 Forbidden」錯誤
**原因：** Service Role Key 未配置或錯誤
**解決：** 確認 `.env.local` 中的 `SUPABASE_SERVICE_ROLE_KEY` 正確

#### 問題：「Migration 錯誤」
**原因：** 舊的 migration 殘留
**解決：** 完全重置資料庫，重新執行乾淨架構

#### 問題：「RLS policy 阻擋」
**原因：** Service role 政策未正確配置
**解決：** 檢查乾淨架構中的 RLS 政策是否正確部署

## 🏗️ 架構說明

### Phase 3A-1 Analytics 架構 ✅
- ✅ **Analytics 引擎**: 40+ TypeScript 介面，完整統計計算功能
- ✅ **快取系統**: TTL-based 快取機制，最佳化查詢效能
- ✅ **RLS 整合**: Analytics 查詢完全遵循權限控制
- ✅ **即時更新**: 與通知系統整合，自動資料刷新

### 清理的問題
- ❌ 移除了 6+ 個混亂的 migration 檔案
- ❌ 移除了重複的 enum 定義
- ❌ 移除了中學→小學的轉換殘留

### 新架構優勢
- ✅ 一次到位的小學 G1-G6 設計
- ✅ 清楚的業務邏輯和約束條件
- ✅ 完整的 RLS 安全政策
- ✅ 最佳化的索引策略
- ✅ 標準化的 CSV 匯入流程
- ✅ **智能分析引擎**: 學習軌跡追蹤、風險評估、預測分析

## 📝 後續維護

### 資料庫變更
- 所有變更都基於這個乾淨的 `primary_school_clean_schema.sql`
- 新增功能時，建立新的 migration 檔案，但基於乾淨基礎

### CSV 匯入
- 使用新的模板和驗證規則
- 所有匯入都透過 Service Role 執行
- 完整的錯誤處理和回復機制

## 🔄 Migration from Zeabur Supabase

If you're migrating from a previous Zeabur self-hosted Supabase instance:

### Data Migration Steps
1. **Export data from old Zeabur Supabase**:
   ```bash
   pg_dump -h [OLD_HOST] -U postgres -d postgres \
     --data-only --inserts -f backup_data.sql
   ```

2. **Import to Supabase Cloud**:
   - Use SQL Editor in Supabase Cloud dashboard
   - Copy and execute `backup_data.sql`
   - Verify data integrity with record counts

3. **Update environment variables** in all deployments (local, Zeabur, CI/CD)

4. **Test thoroughly** before decommissioning old instance

> **⚠️ Known Issue**: Claude Code environment cache may require session reset. See [TROUBLESHOOTING_CLAUDE_CODE.md](../troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md)

### Archived Documentation
- [ARCHIVED_ZEABUR_CONFIG.md](../archived/ARCHIVED_ZEABUR_CONFIG.md) - Previous Zeabur self-hosted setup (for reference)

---

**🎯 Production Deployment | LMS-ESID | v1.4.0**
📅 Updated: 2025-10-16 | ☁️ Supabase Cloud | 🚀 Zeabur Frontend | 📊 Phase 3A-1 Analytics