# 🚀 Primary School LMS - Complete Deployment Guide

## 🎯 Production-Ready Deployment on Zeabur

This guide covers complete deployment of the Primary School Learning Management System with **Advanced Analytics** capabilities using Zeabur for both frontend and Supabase backend infrastructure.

> **Version**: 1.2.0 | **Analytics**: Phase 3A-1 ✅ | **Last Updated**: 2025-08-15

## 📋 Prerequisites

### 1. Required Accounts & Services
- ✅ **GitHub Account** - For repository hosting and CI/CD
- ✅ **Zeabur Account** - For application and database hosting
- ✅ **Domain (Optional)** - Custom domain for production

### 2. Required Information
- ✅ **Supabase Project URL** - From Zeabur Supabase service
- ✅ **Supabase Anon Key** - From Supabase dashboard  
- 🚨 **Supabase Service Role Key** - Critical for CSV imports and admin operations

## 🔧 Environment Configuration

### 1. Create Environment File
Copy `.env.example` to `.env.local` and configure:

```env
# Production Supabase Configuration (Zeabur)
NEXT_PUBLIC_SUPABASE_URL=https://your-zeabur-supabase-url.zeabur.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 🚨 CRITICAL: Service Role Key for bulk operations
# Get from: Supabase Dashboard > Settings > API > service_role
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_VERSION=1.2.0

# Analytics Configuration (Phase 3A-1)
NEXT_PUBLIC_ANALYTICS_ENABLED=true
ANALYTICS_CACHE_TTL=300000
ANALYTICS_BATCH_SIZE=100

# Security
NEXTAUTH_SECRET=your-production-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

### 2. Obtain Supabase Service Role Key
**⚠️ Critical Step for CSV Import Functionality:**

1. Access Zeabur Dashboard → Your Supabase Service
2. Navigate to **Supabase Dashboard** (click the external link)
3. Go to **Settings → API**
4. Copy the `service_role` key (NOT the anon public key)
5. Add to your environment variables as `SUPABASE_SERVICE_ROLE_KEY`

## 🚀 Deployment Steps

### Phase 1: Database Setup on Zeabur

#### 1.1 Deploy Supabase Service
```bash
# Navigate to your Zeabur dashboard
# 1. Create new project or use existing
# 2. Add Supabase service to your project
# 3. Note down the generated URL and access credentials
```

#### 1.2 Deploy Clean Database Schema
Since you're using Zeabur Supabase, deploy the schema via Supabase Dashboard:

```sql
-- Connect to your Zeabur Supabase instance via Dashboard
-- Execute the clean schema: db/schemas/primary_school_clean_schema.sql
-- This will create all tables, RLS policies, and indexes
```

**Alternative Method - Direct SQL Execution:**
```bash
# If you have psql access to your Zeabur Supabase
psql "postgresql://postgres:[PASSWORD]@[ZEABUR-SUPABASE-HOST]:5432/postgres" \
  -f db/schemas/primary_school_clean_schema.sql
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
NEXT_PUBLIC_SUPABASE_URL=https://your-zeabur-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-zeabur-app-url
```

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

---

**🎯 記住：這是一次性的大清理。完成後，系統將更穩定、可維護，不會再有「越改越多洞」的問題。**