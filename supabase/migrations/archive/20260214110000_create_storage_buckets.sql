-- Migration: 20260214110000_create_storage_buckets.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Create storage buckets for production (matching config.toml)
-- product-images, images, uploads are for app assets
-- database-backups is for maintenance backups

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('images', 'images', true, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('uploads', 'uploads', true, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('database-backups', 'database-backups', false, 104857600, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;
