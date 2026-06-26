-- Migration: 20260703000012_final_fixes.sql
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
-- Tables (topological order)
-- ========================================

-- Table: nurture_campaigns
CREATE TABLE IF NOT EXISTS public.nurture_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT nurture_campaigns_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['demo_approved'::text, 'trial_day'::text, 'trial_expired'::text, 'post_lost'::text, 'post_converted'::text, 'payment_failed'::text])))
);

-- Table: nurture_campaign_emails
CREATE TABLE IF NOT EXISTS public.nurture_campaign_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    send_order integer NOT NULL,
    delay_hours integer DEFAULT 0 NOT NULL,
    subject text NOT NULL,
    template_name text NOT NULL,
    template_variables jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: nurture_queue
CREATE TABLE IF NOT EXISTS public.nurture_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    campaign_email_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    recipient_email text NOT NULL,
    recipient_name text,
    scheduled_at timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    sent_success boolean,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: nurture_log
CREATE TABLE IF NOT EXISTS public.nurture_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue_id uuid,
    campaign_id uuid NOT NULL,
    campaign_email_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    error_message text,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- ========================================
-- Foreign Keys
-- ========================================

ALTER TABLE public.nurture_campaign_emails
    ADD CONSTRAINT nurture_campaign_emails_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.nurture_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.nurture_queue
    ADD CONSTRAINT nurture_queue_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.nurture_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.nurture_queue
    ADD CONSTRAINT nurture_queue_campaign_email_id_fkey FOREIGN KEY (campaign_email_id) REFERENCES public.nurture_campaign_emails(id) ON DELETE CASCADE;

ALTER TABLE public.nurture_queue
    ADD CONSTRAINT nurture_queue_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_requests(id) ON DELETE CASCADE;

ALTER TABLE public.nurture_log
    ADD CONSTRAINT nurture_log_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.nurture_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.nurture_log
    ADD CONSTRAINT nurture_log_campaign_email_id_fkey FOREIGN KEY (campaign_email_id) REFERENCES public.nurture_campaign_emails(id) ON DELETE CASCADE;

ALTER TABLE public.nurture_log
    ADD CONSTRAINT nurture_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_requests(id) ON DELETE CASCADE;

ALTER TABLE public.nurture_log
    ADD CONSTRAINT nurture_log_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.nurture_queue(id) ON DELETE SET NULL;

-- ========================================
-- Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_nurture_campaigns_trigger ON public.nurture_campaigns USING btree (trigger_type);
CREATE INDEX IF NOT EXISTS idx_nurture_campaigns_active ON public.nurture_campaigns USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_nurture_campaign_emails_campaign ON public.nurture_campaign_emails USING btree (campaign_id);
CREATE INDEX IF NOT EXISTS idx_nurture_queue_pending ON public.nurture_queue USING btree (scheduled_at) WHERE (sent_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_nurture_queue_lead ON public.nurture_queue USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_nurture_log_sent ON public.nurture_log USING btree (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_nurture_log_lead ON public.nurture_log USING btree (lead_id);

-- ========================================
-- Constraints (PK, UNIQUE)
-- ========================================

ALTER TABLE public.nurture_campaigns
    ADD CONSTRAINT nurture_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE public.nurture_campaigns
    ADD CONSTRAINT nurture_campaigns_slug_key UNIQUE (slug);

ALTER TABLE public.nurture_campaign_emails
    ADD CONSTRAINT nurture_campaign_emails_pkey PRIMARY KEY (id);

ALTER TABLE public.nurture_campaign_emails
    ADD CONSTRAINT unique_order_per_campaign UNIQUE (campaign_id, send_order);

ALTER TABLE public.nurture_queue
    ADD CONSTRAINT nurture_queue_pkey PRIMARY KEY (id);

ALTER TABLE public.nurture_log
    ADD CONSTRAINT nurture_log_pkey PRIMARY KEY (id);

COMMIT;
