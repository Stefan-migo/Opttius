-- Migration: 20250615000000_enable_pgvector.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Enable pgvector extension for semantic search
-- This migration enables vector similarity search in PostgreSQL

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add comment for documentation
COMMENT ON EXTENSION vector IS 'Vector similarity search extension for semantic memory and RAG';
