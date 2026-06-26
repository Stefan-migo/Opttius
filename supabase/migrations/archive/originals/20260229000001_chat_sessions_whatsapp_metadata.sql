-- Migration: 20260229000001_chat_sessions_whatsapp_metadata.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add metadata to chat_sessions and allow user_id NULL for WhatsApp channel
-- WhatsApp sessions use metadata { channel: "whatsapp", wa_id } instead of user_id

ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Allow user_id NULL for WhatsApp channel sessions (service role inserts)
ALTER TABLE public.chat_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Constraint: either user_id is set (web chat) or metadata indicates WhatsApp channel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_chat_sessions_user_or_whatsapp'
  ) THEN
    ALTER TABLE public.chat_sessions ADD CONSTRAINT chk_chat_sessions_user_or_whatsapp
      CHECK (
        user_id IS NOT NULL
        OR (metadata IS NOT NULL AND metadata->>'channel' = 'whatsapp')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.chat_sessions.metadata IS 'Channel-specific metadata. For WhatsApp: { channel: "whatsapp", wa_id: string, organization_id: string }';

-- Index for WhatsApp session lookup
CREATE INDEX IF NOT EXISTS idx_chat_sessions_whatsapp
  ON public.chat_sessions ((metadata->>'channel'), (metadata->>'wa_id'), (metadata->>'organization_id'))
  WHERE metadata->>'channel' = 'whatsapp';
