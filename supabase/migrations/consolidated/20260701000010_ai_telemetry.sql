-- Migration: 20260703000010_ai_telemetry.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

BEGIN;

-- ========================================
-- Extensions
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ========================================
-- Tables (topological order)
-- ========================================

-- Table: saas_backups
CREATE TABLE IF NOT EXISTS public.saas_backups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename text NOT NULL,
    storage_path text NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    backup_type text DEFAULT 'full'::text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    source text DEFAULT 'manual'::text,
    CONSTRAINT saas_backups_backup_type_check CHECK ((backup_type = ANY (ARRAY['full'::text, 'manual'::text, 'cron'::text]))),
    CONSTRAINT saas_backups_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'cron'::text, 'github_actions'::text]))),
    CONSTRAINT saas_backups_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'failed'::text, 'in_progress'::text])))
);

-- Table: saas_audit_log
CREATE TABLE IF NOT EXISTS public.saas_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    target_name text,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: chat_sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    provider text NOT NULL,
    model text NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    config jsonb,
    message_count integer DEFAULT 0,
    last_message_preview text,
    metadata jsonb,
    organization_id uuid,
    CONSTRAINT chk_chat_sessions_user_or_whatsapp CHECK (((user_id IS NOT NULL) OR ((metadata IS NOT NULL) AND ((metadata ->> 'channel'::text) = 'whatsapp'::text))))
);

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tool_calls jsonb,
    tool_results jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['system'::text, 'user'::text, 'assistant'::text, 'tool'::text])))
);

-- Table: embeddings
CREATE TABLE IF NOT EXISTS public.embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    content text NOT NULL,
    embedding public.vector(768),
    embedding_small public.vector(384),
    embedding_provider text NOT NULL,
    user_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: memory_facts
CREATE TABLE IF NOT EXISTS public.memory_facts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    fact_type text NOT NULL,
    category text,
    content text NOT NULL,
    importance integer DEFAULT 5,
    embedding public.vector(768),
    embedding_small public.vector(384),
    embedding_provider text,
    source_session_id uuid,
    source_message_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    last_accessed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT memory_facts_importance_check CHECK (((importance >= 1) AND (importance <= 10)))
);

-- Table: opticas_access_tokens
CREATE TABLE IF NOT EXISTS public.opticas_access_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    label text
);

-- Table: ai_insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid NOT NULL,
    section text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_label text,
    action_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_dismissed boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    feedback_score integer,
    feedback_comment text,
    CONSTRAINT ai_insights_action_label_check CHECK (((action_label IS NULL) OR (char_length(action_label) <= 50))),
    CONSTRAINT ai_insights_feedback_score_check CHECK (((feedback_score IS NULL) OR ((feedback_score >= 1) AND (feedback_score <= 5)))),
    CONSTRAINT ai_insights_message_check CHECK ((char_length(message) <= 500)),
    CONSTRAINT ai_insights_priority_check CHECK (((priority >= 1) AND (priority <= 10))),
    CONSTRAINT ai_insights_section_check CHECK ((section = ANY (ARRAY['dashboard'::text, 'inventory'::text, 'clients'::text, 'pos'::text, 'analytics'::text]))),
    CONSTRAINT ai_insights_title_check CHECK ((char_length(title) <= 100)),
    CONSTRAINT ai_insights_type_check CHECK ((type = ANY (ARRAY['warning'::text, 'opportunity'::text, 'info'::text, 'neutral'::text])))
);

-- Table: ai_usage_log
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    endpoint text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: system_health_metrics
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric(12,4) NOT NULL,
    metric_unit text,
    category text DEFAULT 'general'::text NOT NULL,
    subcategory text,
    threshold_warning numeric(12,4),
    threshold_critical numeric(12,4),
    is_healthy boolean DEFAULT true,
    metadata jsonb,
    collected_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval)
);

-- Table: system_maintenance_log
CREATE TABLE IF NOT EXISTS public.system_maintenance_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_type text NOT NULL,
    task_name text NOT NULL,
    status text DEFAULT 'pending'::text,
    description text,
    parameters jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    result_data jsonb,
    error_message text,
    executed_by uuid,
    automated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_maintenance_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT system_maintenance_log_task_type_check CHECK ((task_type = ANY (ARRAY['backup'::text, 'cleanup'::text, 'migration'::text, 'optimization'::text, 'security_scan'::text, 'health_check'::text, 'update'::text, 'custom'::text])))
);

-- Table: telemetry_config
CREATE TABLE IF NOT EXISTS public.telemetry_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    enabled boolean DEFAULT true,
    sampling_rate numeric(3,2) DEFAULT 1.00,
    retention_days integer DEFAULT 90,
    anonymize_ip boolean DEFAULT true,
    exclude_sensitive_paths text[],
    track_page_views boolean DEFAULT true,
    track_feature_usage boolean DEFAULT true,
    track_performance boolean DEFAULT true,
    track_errors boolean DEFAULT true,
    CONSTRAINT telemetry_config_sampling_rate_check CHECK (((sampling_rate >= (0)::numeric) AND (sampling_rate <= (1)::numeric)))
);

-- Table: telemetry_aggregates
CREATE TABLE IF NOT EXISTS public.telemetry_aggregates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    date date NOT NULL,
    period text NOT NULL,
    total_events bigint DEFAULT 0,
    unique_users bigint DEFAULT 0,
    unique_sessions bigint DEFAULT 0,
    feature_usage jsonb,
    avg_response_time numeric,
    error_rate numeric,
    page_views jsonb,
    CONSTRAINT telemetry_aggregates_period_check CHECK ((period = ANY (ARRAY['hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text])))
);

-- Table: telemetry_events
CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    event_name text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    organization_id uuid,
    session_id text,
    payload jsonb,
    user_agent text,
    ip_address inet,
    device_type text,
    browser text,
    os text,
    screen_size text,
    page_url text,
    referrer text,
    duration integer,
    performance_data jsonb,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone
);

-- Table: user_tour_progress
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    status text DEFAULT 'not_started'::text,
    current_step integer DEFAULT 0,
    completed_steps integer[] DEFAULT '{}'::integer[],
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_accessed_at timestamp with time zone DEFAULT now(),
    skip_on_next_login boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_tour_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'disabled'::text])))
);

-- ========================================
-- Comments
-- ========================================

COMMENT ON TABLE public.saas_backups IS 'Metadata for full database backups (pg_dump). Actual files in saas-backups bucket.';

COMMENT ON TABLE public.saas_audit_log IS 'Audit log for SaaS Management actions performed by root/dev users';
COMMENT ON COLUMN public.saas_audit_log.user_id IS 'ID of user who performed the action';
COMMENT ON COLUMN public.saas_audit_log.user_email IS 'Email of user who performed the action (cached)';
COMMENT ON COLUMN public.saas_audit_log.action IS 'Type of action: create, update, delete, suspend, activate, cancel, change_tier';
COMMENT ON COLUMN public.saas_audit_log.target_type IS 'Type of resource: organization, subscription, tier, user';
COMMENT ON COLUMN public.saas_audit_log.target_id IS 'ID of the affected resource';
COMMENT ON COLUMN public.saas_audit_log.target_name IS 'Name of the affected resource (cached)';
COMMENT ON COLUMN public.saas_audit_log.old_value IS 'Previous state of the resource';
COMMENT ON COLUMN public.saas_audit_log.new_value IS 'New state of the resource';
COMMENT ON COLUMN public.saas_audit_log.ip_address IS 'IP address of the user';
COMMENT ON COLUMN public.saas_audit_log.user_agent IS 'User agent string';

COMMENT ON COLUMN public.chat_sessions.metadata IS 'Channel-specific metadata. For WhatsApp: { channel: "whatsapp", wa_id: string, organization_id: string }';
COMMENT ON COLUMN public.chat_sessions.organization_id IS 'Organization scope for backup/restore. Web: from admin_users. WhatsApp: from metadata.organization_id';

COMMENT ON TABLE public.embeddings IS 'Stores vector embeddings for semantic search across all content types';

COMMENT ON TABLE public.memory_facts IS 'Stores long-term memory facts and user preferences learned from conversations';

COMMENT ON TABLE public.opticas_access_tokens IS 'Dynamic tokens for /acceso-opticas. Root generates from SaaS config. Revocable, expiring.';

COMMENT ON TABLE public.ai_insights IS 'AI-generated contextual insights for different sections of the application';
COMMENT ON COLUMN public.ai_insights.section IS 'Section where the insight is displayed: dashboard, inventory, clients, pos, analytics';
COMMENT ON COLUMN public.ai_insights.type IS 'Type of insight: warning, opportunity, info, neutral';
COMMENT ON COLUMN public.ai_insights.metadata IS 'Additional data for pre-filling forms or actions';
COMMENT ON COLUMN public.ai_insights.priority IS 'Priority from 1 (low) to 10 (critical)';
COMMENT ON COLUMN public.ai_insights.feedback_score IS 'User feedback rating from 1 to 5 stars';
COMMENT ON COLUMN public.ai_insights.feedback_comment IS 'Optional free-text comment from user when giving feedback (max 500 chars)';

COMMENT ON TABLE public.ai_usage_log IS 'Logs LLM token usage per organization for cost monitoring and analytics';
COMMENT ON COLUMN public.ai_usage_log.organization_id IS 'Organization that incurred the usage';
COMMENT ON COLUMN public.ai_usage_log.provider IS 'LLM provider (openai, anthropic, google, deepseek, etc.)';
COMMENT ON COLUMN public.ai_usage_log.model IS 'Model identifier (e.g. gpt-4o, claude-3-5-sonnet)';
COMMENT ON COLUMN public.ai_usage_log.prompt_tokens IS 'Input tokens consumed';
COMMENT ON COLUMN public.ai_usage_log.completion_tokens IS 'Output tokens consumed';
COMMENT ON COLUMN public.ai_usage_log.endpoint IS 'Optional endpoint or context (e.g. chat, insights)';

COMMENT ON TABLE public.system_health_metrics IS 'System health and performance metrics over time';

COMMENT ON TABLE public.system_maintenance_log IS 'Log of system maintenance tasks and operations';

COMMENT ON TABLE public.telemetry_config IS 'Telemetry configuration per organization';

COMMENT ON TABLE public.telemetry_aggregates IS 'Aggregated telemetry data for analytics';

COMMENT ON TABLE public.telemetry_events IS 'Raw telemetry events from user interactions';

COMMENT ON TABLE public.user_tour_progress IS 'Tracks user onboarding tour progress for each organization';
COMMENT ON COLUMN public.user_tour_progress.status IS 'Tour status: not_started, in_progress, completed, disabled';
COMMENT ON COLUMN public.user_tour_progress.current_step IS 'Current step index (0-based)';
COMMENT ON COLUMN public.user_tour_progress.completed_steps IS 'Array of completed step indices';
COMMENT ON COLUMN public.user_tour_progress.skip_on_next_login IS 'If true, skip tour on next login';

-- ========================================
-- Row Level Security
-- ========================================

ALTER TABLE public.saas_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opticas_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Triggers
-- ========================================

CREATE TRIGGER update_chat_session_on_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_session_updated_at();
CREATE TRIGGER update_chat_session_stats_on_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_session_stats();

CREATE TRIGGER update_embeddings_timestamp BEFORE UPDATE ON public.embeddings FOR EACH ROW EXECUTE FUNCTION public.update_embeddings_updated_at();

CREATE TRIGGER update_memory_facts_timestamp BEFORE UPDATE ON public.memory_facts FOR EACH ROW EXECUTE FUNCTION public.update_embeddings_updated_at();

CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public.update_ai_insights_updated_at();

CREATE TRIGGER update_system_maintenance_log_updated_at BEFORE UPDATE ON public.system_maintenance_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telemetry_config_updated_at BEFORE UPDATE ON public.telemetry_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telemetry_aggregates_updated_at BEFORE UPDATE ON public.telemetry_aggregates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_tour_progress_updated_at BEFORE UPDATE ON public.user_tour_progress FOR EACH ROW EXECUTE FUNCTION public.update_user_tour_progress_updated_at();

-- ========================================
-- Constraints (PK, UNIQUE)
-- ========================================

ALTER TABLE public.saas_backups
    ADD CONSTRAINT saas_backups_pkey PRIMARY KEY (id);

ALTER TABLE public.saas_audit_log
    ADD CONSTRAINT saas_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);

ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.embeddings
    ADD CONSTRAINT embeddings_pkey PRIMARY KEY (id);

ALTER TABLE public.memory_facts
    ADD CONSTRAINT memory_facts_pkey PRIMARY KEY (id);

ALTER TABLE public.opticas_access_tokens
    ADD CONSTRAINT opticas_access_tokens_pkey PRIMARY KEY (id);

ALTER TABLE public.opticas_access_tokens
    ADD CONSTRAINT opticas_access_tokens_token_key UNIQUE (token);

ALTER TABLE public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_usage_log
    ADD CONSTRAINT ai_usage_log_pkey PRIMARY KEY (id);

ALTER TABLE public.system_health_metrics
    ADD CONSTRAINT system_health_metrics_pkey PRIMARY KEY (id);

ALTER TABLE public.system_maintenance_log
    ADD CONSTRAINT system_maintenance_log_pkey PRIMARY KEY (id);

ALTER TABLE public.telemetry_config
    ADD CONSTRAINT telemetry_config_pkey PRIMARY KEY (id);

ALTER TABLE public.telemetry_config
    ADD CONSTRAINT telemetry_config_organization_id_key UNIQUE (organization_id);

ALTER TABLE public.telemetry_aggregates
    ADD CONSTRAINT telemetry_aggregates_pkey PRIMARY KEY (id);

ALTER TABLE public.telemetry_aggregates
    ADD CONSTRAINT telemetry_aggregates_organization_id_date_period_key UNIQUE (organization_id, date, period);

ALTER TABLE public.telemetry_events
    ADD CONSTRAINT telemetry_events_pkey PRIMARY KEY (id);

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_pkey PRIMARY KEY (id);

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_user_id_organization_id_key UNIQUE (user_id, organization_id);

-- ========================================
-- Foreign Keys
-- ========================================

ALTER TABLE public.saas_backups
    ADD CONSTRAINT saas_backups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.saas_audit_log
    ADD CONSTRAINT saas_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.chat_sessions
    ADD CONSTRAINT chat_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.embeddings
    ADD CONSTRAINT embeddings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.memory_facts
    ADD CONSTRAINT memory_facts_source_session_id_fkey FOREIGN KEY (source_session_id) REFERENCES public.chat_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.memory_facts
    ADD CONSTRAINT memory_facts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.opticas_access_tokens
    ADD CONSTRAINT opticas_access_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.ai_insights
    ADD CONSTRAINT ai_insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.ai_usage_log
    ADD CONSTRAINT ai_usage_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.system_maintenance_log
    ADD CONSTRAINT system_maintenance_log_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.telemetry_config
    ADD CONSTRAINT telemetry_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.telemetry_aggregates
    ADD CONSTRAINT telemetry_aggregates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.telemetry_events
    ADD CONSTRAINT telemetry_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.telemetry_events
    ADD CONSTRAINT telemetry_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- Policies
-- ========================================

-- saas_backups
CREATE POLICY "Service role full access saas_backups" ON public.saas_backups USING ((auth.role() = 'service_role'::text));

-- saas_audit_log
CREATE POLICY saas_audit_log_root_read ON public.saas_audit_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY saas_audit_log_service_role_full_access ON public.saas_audit_log TO service_role USING (true) WITH CHECK (true);

-- chat_sessions
CREATE POLICY "Admin users can view all chat sessions" ON public.chat_sessions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Users can create own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT USING ((auth.uid() = user_id));

-- chat_messages
CREATE POLICY "Admin users can view all chat messages" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Users can create messages in own sessions" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));
CREATE POLICY "Users can view messages from own sessions" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));

-- embeddings
CREATE POLICY "Service role can manage embeddings" ON public.embeddings USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can view own embeddings" ON public.embeddings FOR SELECT USING (((user_id = auth.uid()) OR (user_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))));

-- memory_facts
CREATE POLICY "Admin users can view all memory facts" ON public.memory_facts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Service role can manage memory facts" ON public.memory_facts USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can manage own memory facts" ON public.memory_facts USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can view own memory facts" ON public.memory_facts FOR SELECT USING ((user_id = auth.uid()));

-- opticas_access_tokens
CREATE POLICY opticas_tokens_no_public ON public.opticas_access_tokens USING (false) WITH CHECK (false);

-- ai_insights
CREATE POLICY "Admins can manage insights for their org" ON public.ai_insights USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))))) WITH CHECK (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));
CREATE POLICY "Users can view insights for their org" ON public.ai_insights FOR SELECT USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));

-- ai_usage_log
CREATE POLICY "Admins can insert ai_usage_log for their org" ON public.ai_usage_log FOR INSERT WITH CHECK ((((organization_id = public.get_user_organization_id()) AND (public.get_user_organization_id() IS NOT NULL)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text])))))));
CREATE POLICY "Admins can read their org ai_usage_log" ON public.ai_usage_log FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text])))))));

-- system_health_metrics
CREATE POLICY "Admin users can delete health metrics" ON public.system_health_metrics FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admin users can insert health metrics" ON public.system_health_metrics FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admin users can update health metrics" ON public.system_health_metrics FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admin users can view health metrics" ON public.system_health_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

-- system_maintenance_log
CREATE POLICY "Admin users can create maintenance logs" ON public.system_maintenance_log FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admin users can view maintenance logs" ON public.system_maintenance_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

-- telemetry_config
CREATE POLICY "Organization admins can manage telemetry config" ON public.telemetry_config USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));
CREATE POLICY "Users can read organization telemetry config" ON public.telemetry_config FOR SELECT USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));

-- telemetry_aggregates
CREATE POLICY "Organization admins can manage telemetry aggregates" ON public.telemetry_aggregates USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));
CREATE POLICY "Users can read organization telemetry aggregates" ON public.telemetry_aggregates FOR SELECT USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));

-- telemetry_events
CREATE POLICY "Organization admins can manage telemetry events" ON public.telemetry_events USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));
CREATE POLICY "Users can insert their telemetry events" ON public.telemetry_events FOR INSERT WITH CHECK (((auth.uid() = user_id) OR (organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid())))));
CREATE POLICY "Users can read organization telemetry events" ON public.telemetry_events FOR SELECT USING (((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))) OR (user_id = auth.uid())));

-- user_tour_progress
CREATE POLICY "Users can insert their own tour progress" ON public.user_tour_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own tour progress" ON public.user_tour_progress FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own tour progress" ON public.user_tour_progress FOR SELECT USING ((auth.uid() = user_id));

-- ========================================
-- Functions
-- ========================================

CREATE OR REPLACE FUNCTION public.archive_old_telemetry_data(archive_before_date date DEFAULT (CURRENT_DATE - '1 year'::interval)) RETURNS TABLE(archived_count bigint, archive_date date)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    archived_rows BIGINT;
BEGIN
    SELECT COUNT(*) INTO archived_rows
    FROM public.telemetry_events 
    WHERE created_at < archive_before_date;

    RETURN QUERY SELECT archived_rows, archive_before_date;

    RAISE NOTICE 'Would archive % events older than %', archived_rows, archive_before_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry_data() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    org_record RECORD;
    retention_days INTEGER;
BEGIN
    FOR org_record IN 
        SELECT tc.organization_id, COALESCE(tc.retention_days, 90) as days
        FROM public.telemetry_config tc
    LOOP
        retention_days := org_record.days;

        DELETE FROM public.telemetry_events 
        WHERE organization_id = org_record.organization_id 
        AND created_at < NOW() - INTERVAL '1 day' * retention_days;

        DELETE FROM public.telemetry_aggregates 
        WHERE organization_id = org_record.organization_id 
        AND date < CURRENT_DATE - INTERVAL '1 year';

        RAISE NOTICE 'Cleaned up telemetry data for organization %: removed events older than % days', 
            org_record.organization_id, retention_days;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.collect_system_health_metrics() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.system_health_metrics 
  WHERE collected_at < NOW() - INTERVAL '30 days';

  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'database_size_mb',
    pg_database_size(current_database()) / 1024.0 / 1024.0,
    'megabytes',
    'database';

  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'active_connections',
    count(*),
    'count',
    'database'
  FROM pg_stat_activity 
  WHERE state = 'active';

  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_products',
    count(*),
    'count',
    'business'
  FROM public.products 
  WHERE status = 'active';

  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_orders_today',
    count(*),
    'count',
    'business'
  FROM public.orders 
  WHERE created_at >= CURRENT_DATE;

  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_customers',
    count(*),
    'count',
    'business'
  FROM public.profiles;

  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'low_stock_products',
    count(*),
    'count',
    'inventory'
  FROM public.products 
  WHERE inventory_quantity <= 5 AND track_inventory = true;

END;
$$;

CREATE OR REPLACE FUNCTION public.generate_saas_ticket_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  date_prefix TEXT;
  random_suffix TEXT;
  ticket_num TEXT;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5));
  ticket_num := 'SAAS-' || date_prefix || '-' || random_suffix;

  WHILE EXISTS (SELECT 1 FROM public.saas_support_tickets WHERE ticket_number = ticket_num) LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 5));
    ticket_num := 'SAAS-' || date_prefix || '-' || random_suffix;
  END LOOP;

  RETURN ticket_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_telemetry_stats(org_id uuid DEFAULT NULL::uuid) RETURNS TABLE(organization_id uuid, total_events bigint, unique_users bigint, date_range text, storage_size_mb numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(te.organization_id, org_id) as organization_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT te.user_id) as unique_users,
        CONCAT(
            TO_CHAR(MIN(te.created_at), 'YYYY-MM-DD'), 
            ' to ', 
            TO_CHAR(MAX(te.created_at), 'YYYY-MM-DD')
        ) as date_range,
        ROUND(pg_total_relation_size('telemetry_events'::regclass) / 1024.0 / 1024.0, 2) as storage_size_mb
    FROM public.telemetry_events te
    WHERE (org_id IS NULL OR te.organization_id = org_id)
    GROUP BY COALESCE(te.organization_id, org_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_telemetry_cleanup() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    PERFORM cleanup_old_telemetry_data();
    RAISE NOTICE 'Telemetry cleanup completed at %', NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_saas_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_saas_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chat_session_stats() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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
$$;

-- ========================================
-- Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_saas_backups_created_at ON public.saas_backups USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_backups_created_by ON public.saas_backups USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_action ON public.saas_audit_log USING btree (action);
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_created_at ON public.saas_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_target ON public.saas_audit_log USING btree (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_user_id ON public.saas_audit_log USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created ON public.chat_sessions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_organization_id ON public.chat_sessions USING btree (organization_id) WHERE (organization_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_whatsapp ON public.chat_sessions USING btree (((metadata ->> 'channel'::text)), ((metadata ->> 'wa_id'::text)), ((metadata ->> 'organization_id'::text))) WHERE ((metadata ->> 'channel'::text) = 'whatsapp'::text);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_created ON public.embeddings USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_provider ON public.embeddings USING btree (embedding_provider);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON public.embeddings USING btree (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON public.embeddings USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_memory_facts_expires ON public.memory_facts USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_memory_facts_importance ON public.memory_facts USING btree (importance DESC);
CREATE INDEX IF NOT EXISTS idx_memory_facts_type ON public.memory_facts USING btree (fact_type);
CREATE INDEX IF NOT EXISTS idx_memory_facts_user ON public.memory_facts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_created_by ON public.opticas_access_tokens USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_expires ON public.opticas_access_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_token ON public.opticas_access_tokens USING btree (token);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON public.ai_insights USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_dismissed ON public.ai_insights USING btree (is_dismissed) WHERE (is_dismissed = false);
CREATE INDEX IF NOT EXISTS idx_ai_insights_org_section ON public.ai_insights USING btree (organization_id, section);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON public.ai_insights USING btree (priority DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON public.ai_insights USING btree (type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_created ON public.ai_usage_log USING btree (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_id ON public.ai_usage_log USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_category ON public.system_health_metrics USING btree (category);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_collected_at ON public.system_health_metrics USING btree (collected_at);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_expires_at ON public.system_health_metrics USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_name ON public.system_health_metrics USING btree (metric_name);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_log_created_at ON public.system_maintenance_log USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_log_status ON public.system_maintenance_log USING btree (status);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_log_type ON public.system_maintenance_log USING btree (task_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_aggregates_org_date ON public.telemetry_aggregates USING btree (organization_id, date);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_org_timestamp ON public.telemetry_events USING btree (organization_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type_timestamp ON public.telemetry_events USING btree (event_type, "timestamp");
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_timestamp ON public.telemetry_events USING btree (user_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_org ON public.user_tour_progress USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_status ON public.user_tour_progress USING btree (status);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user ON public.user_tour_progress USING btree (user_id);

COMMIT;
