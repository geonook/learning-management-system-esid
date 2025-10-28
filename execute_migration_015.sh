#!/bin/bash

# ========================================
# Migration 015 執行腳本（透過 Supabase SQL API）
# ========================================

echo "========================================="
echo "Migration 015: Optimize RLS Performance"
echo "========================================="
echo ""

# Supabase 專案資訊
SUPABASE_URL="https://piwbooidofbaqklhijup.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd2Jvb2lkb2ZiYXFrbGhpanVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDgxMTIsImV4cCI6MjA3NjA4NDExMn0.Pu1MDlfbJkzXLbfBVMp9Gnz5oF0zWhVEgUq-l6BYVvQ"

echo "⚠️  重要提醒："
echo "   此腳本無法直接執行複雜的 SQL migration"
echo "   請改用以下方法之一："
echo ""
echo "方法一：Supabase SQL Editor（推薦）"
echo "   1. 開啟 https://supabase.com/dashboard/project/piwbooidofbaqklhijup"
echo "   2. 左側選單 → SQL Editor → New query"
echo "   3. 複製 db/migrations/015_optimize_rls_performance.sql 的完整內容"
echo "   4. 貼到 SQL Editor 並執行"
echo ""
echo "方法二：複製 migration 內容到剪貼簿"
echo "   執行：pbcopy < db/migrations/015_optimize_rls_performance.sql"
echo "   然後貼到 Supabase SQL Editor"
echo ""
echo "方法三：手動複製檔案內容"
echo "   開啟檔案：db/migrations/015_optimize_rls_performance.sql"
echo "   全選複製 (Cmd+A, Cmd+C)"
echo "   貼到 Supabase SQL Editor"
echo ""

read -p "是否要複製 migration 內容到剪貼簿？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    if command -v pbcopy &> /dev/null; then
        pbcopy < db/migrations/015_optimize_rls_performance.sql
        echo "✅ Migration 內容已複製到剪貼簿！"
        echo "   請前往 Supabase SQL Editor 貼上並執行"
        echo ""
        echo "   SQL Editor URL:"
        echo "   https://supabase.com/dashboard/project/piwbooidofbaqklhijup/sql/new"
    else
        echo "❌ 無法使用 pbcopy（僅支援 macOS）"
        echo "   請手動開啟檔案：db/migrations/015_optimize_rls_performance.sql"
    fi
else
    echo "   請手動執行 migration"
fi

echo ""
echo "========================================="
echo "執行後請運行驗證腳本："
echo "   db/migrations/VERIFY_MIGRATION_015.sql"
echo "========================================="
