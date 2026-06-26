-- Migration: 20260216134536_remote_sync_placeholder.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Placeholder: migration applied on remote before local sync.
-- No-op to align migration history. Do not modify.
SELECT 1;
