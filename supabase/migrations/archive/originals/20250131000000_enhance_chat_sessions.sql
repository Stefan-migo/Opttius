-- Migration: 20250131000000_enhance_chat_sessions.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Enhance chat_sessions and chat_messages tables
-- Add configuration, metadata, and preview fields

-- Add new columns to chat_sessions
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS config JSONB,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- Add metadata column to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create function to update message_count and last_message_preview
CREATE OR REPLACE FUNCTION update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM public.chat_messages 
      WHERE session_id = NEW.session_id
    ),
    last_message_preview = CASE 
      WHEN NEW.role = 'user' OR NEW.role = 'assistant' THEN
        LEFT(NEW.content, 100)
      ELSE
        last_message_preview
    END
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stats on message insert
DROP TRIGGER IF EXISTS update_chat_session_stats_on_message ON public.chat_messages;
CREATE TRIGGER update_chat_session_stats_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_stats();

-- Update existing sessions with message counts
UPDATE public.chat_sessions cs
SET message_count = (
  SELECT COUNT(*) 
  FROM public.chat_messages cm 
  WHERE cm.session_id = cs.id
);

-- Update existing sessions with last message preview
UPDATE public.chat_sessions cs
SET last_message_preview = (
  SELECT LEFT(content, 100)
  FROM public.chat_messages cm
  WHERE cm.session_id = cs.id
    AND (cm.role = 'user' OR cm.role = 'assistant')
  ORDER BY cm.created_at DESC
  LIMIT 1
);
