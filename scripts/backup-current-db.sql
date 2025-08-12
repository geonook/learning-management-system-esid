-- Database Backup Script (Before Clean Reset)
-- Date: 2025-08-12
-- Purpose: Backup current database state before deploying clean schema

-- Export current table structures and data counts
SELECT '=== CURRENT DATABASE STATE BACKUP ===' as backup_info;

-- Schema information
SELECT 
    'Table Structure' as info_type,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Data counts for all tables
SELECT '=== DATA COUNTS BEFORE RESET ===' as count_info;

DO $$
DECLARE
    table_record RECORD;
    table_count INTEGER;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO table_count;
        RAISE NOTICE 'Table %: % records', table_record.table_name, table_count;
    END LOOP;
END $$;

-- Migration history
SELECT '=== MIGRATION HISTORY ===' as migration_info;
SELECT version, description, applied_at 
FROM schema_versions 
ORDER BY applied_at;

-- Constraint information
SELECT '=== CURRENT CONSTRAINTS ===' as constraint_info;
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- Index information  
SELECT '=== CURRENT INDEXES ===' as index_info;
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT '=== BACKUP COMPLETE - READY FOR CLEAN RESET ===' as status;