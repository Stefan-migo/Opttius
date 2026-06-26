-- Migration: 20250124000001_make_email_optional.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Make email optional for customers
-- Some customers (especially from rural areas) may not have email addresses

-- First, remove the NOT NULL constraint from email
ALTER TABLE public.profiles
ALTER COLUMN email DROP NOT NULL;

-- Note: We keep the UNIQUE constraint so if an email is provided, it must be unique
-- But now NULL emails are allowed

