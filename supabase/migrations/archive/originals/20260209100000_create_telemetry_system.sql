-- Migration: 20260209100000_create_telemetry_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Telemetry System Migration
-- Creates tables and policies for usage analytics and monitoring
-- ============================================================================

-- Create telemetry_events table for storing all telemetry data
CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Event metadata
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- User context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id TEXT,
    
    -- Event data
    payload JSONB,
    
    -- Device/Browser information
    user_agent TEXT,
    ip_address INET,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_size TEXT,
    
    -- Page/Navigation context
    page_url TEXT,
    referrer TEXT,
    duration INTEGER, -- milliseconds
    
    -- Performance metrics
    performance_data JSONB,
    
    -- Processing metadata
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ
);

-- Create telemetry_aggregates table for pre-computed analytics
CREATE TABLE IF NOT EXISTS public.telemetry_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Aggregation context
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('hourly', 'daily', 'weekly', 'monthly')),
    
    -- Metrics
    total_events BIGINT DEFAULT 0,
    unique_users BIGINT DEFAULT 0,
    unique_sessions BIGINT DEFAULT 0,
    
    -- Feature usage
    feature_usage JSONB,
    
    -- Performance metrics
    avg_response_time NUMERIC,
    error_rate NUMERIC,
    
    -- Page metrics
    page_views JSONB,
    
    -- Unique constraint to prevent duplicates
    UNIQUE(organization_id, date, period)
);

-- Create telemetry_config table for organization-level settings
CREATE TABLE IF NOT EXISTS public.telemetry_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    
    -- Collection settings
    enabled BOOLEAN DEFAULT TRUE,
    sampling_rate NUMERIC(3,2) DEFAULT 1.00 CHECK (sampling_rate BETWEEN 0 AND 1),
    
    -- Data retention
    retention_days INTEGER DEFAULT 90,
    
    -- Privacy settings
    anonymize_ip BOOLEAN DEFAULT TRUE,
    exclude_sensitive_paths TEXT[],
    
    -- Feature toggles
    track_page_views BOOLEAN DEFAULT TRUE,
    track_feature_usage BOOLEAN DEFAULT TRUE,
    track_performance BOOLEAN DEFAULT TRUE,
    track_errors BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telemetry_events_org_timestamp 
    ON public.telemetry_events(organization_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_timestamp 
    ON public.telemetry_events(user_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_type_timestamp 
    ON public.telemetry_events(event_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_telemetry_aggregates_org_date 
    ON public.telemetry_aggregates(organization_id, date);

-- Enable RLS
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_config ENABLE ROW LEVEL SECURITY;

-- Telemetry Events Policies
-- Users can insert their own events
CREATE POLICY "Users can insert their telemetry events" 
    ON public.telemetry_events 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
        OR organization_id IN (
            SELECT id 
            FROM public.organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Users can read events from their organization
CREATE POLICY "Users can read organization telemetry events" 
    ON public.telemetry_events 
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT id 
            FROM public.organizations 
            WHERE owner_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- Admins can update/delete their organization's events
CREATE POLICY "Organization admins can manage telemetry events" 
    ON public.telemetry_events 
    FOR ALL 
    USING (
        organization_id IN (
            SELECT id 
            FROM public.organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Telemetry Aggregates Policies
-- Users can read aggregates from their organization
CREATE POLICY "Users can read organization telemetry aggregates" 
    ON public.telemetry_aggregates 
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT id 
            FROM public.organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Admins can manage their organization's aggregates
CREATE POLICY "Organization admins can manage telemetry aggregates" 
    ON public.telemetry_aggregates 
    FOR ALL 
    USING (
        organization_id IN (
            SELECT id 
            FROM public.organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Telemetry Config Policies
-- Users can read their organization's config
CREATE POLICY "Users can read organization telemetry config" 
    ON public.telemetry_config 
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT id 
            FROM public.organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Admins can manage their organization's config
CREATE POLICY "Organization admins can manage telemetry config" 
    ON public.telemetry_config 
    FOR ALL 
    USING (
        organization_id IN (
            SELECT id 
            FROM public.organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_telemetry_config_updated_at 
    BEFORE UPDATE ON public.telemetry_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telemetry_aggregates_updated_at 
    BEFORE UPDATE ON public.telemetry_aggregates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default telemetry config for existing organizations
INSERT INTO public.telemetry_config (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Create function to clean up old telemetry data
CREATE OR REPLACE FUNCTION cleanup_old_telemetry_data()
RETURNS void AS $$
DECLARE
    org_record RECORD;
    retention_days INTEGER;
BEGIN
    -- Get retention settings for each organization
    FOR org_record IN 
        SELECT tc.organization_id, COALESCE(tc.retention_days, 90) as days
        FROM public.telemetry_config tc
    LOOP
        retention_days := org_record.days;
        
        -- Delete old events for this organization
        DELETE FROM public.telemetry_events 
        WHERE organization_id = org_record.organization_id 
        AND created_at < NOW() - INTERVAL '1 day' * retention_days;
        
        -- Delete old aggregates (keep longer for historical analysis)
        DELETE FROM public.telemetry_aggregates 
        WHERE organization_id = org_record.organization_id 
        AND date < CURRENT_DATE - INTERVAL '1 year';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.telemetry_events TO anon, authenticated;
GRANT ALL ON public.telemetry_aggregates TO anon, authenticated;
GRANT ALL ON public.telemetry_config TO anon, authenticated;