-- Migration: Add organization_id to chat_sessions for backup/restore scoping
-- Enables organization-level backup of AI chat history (web + WhatsApp)

-- Add column (nullable for existing rows, backfill below)
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_organization_id
  ON public.chat_sessions(organization_id)
  WHERE organization_id IS NOT NULL;

-- Backfill: Web chat sessions (user_id -> admin_users.organization_id)
UPDATE public.chat_sessions cs
SET organization_id = au.organization_id
FROM public.admin_users au
WHERE cs.user_id = au.id
  AND cs.organization_id IS NULL
  AND au.organization_id IS NOT NULL;

-- Backfill: WhatsApp sessions (metadata->>'organization_id')
-- Use safe cast: only update when value is valid UUID format
UPDATE public.chat_sessions
SET organization_id = (metadata->>'organization_id')::uuid
WHERE metadata->>'organization_id' IS NOT NULL
  AND organization_id IS NULL
  AND metadata->>'organization_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

COMMENT ON COLUMN public.chat_sessions.organization_id IS 'Organization scope for backup/restore. Web: from admin_users. WhatsApp: from metadata.organization_id';
