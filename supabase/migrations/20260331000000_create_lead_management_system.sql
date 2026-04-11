-- Lead Management System Migration
-- Creates tables for lead tracking, activities, and scoring
-- Date: 2026-03-31

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEAD ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES demo_requests(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_activity_type CHECK (
        activity_type IN (
            'lead_created',
            'email_sent',
            'email_opened',
            'email_clicked',
            'email_bounced',
            'demo_accessed',
            'demo_login',
            'meeting_scheduled',
            'meeting_completed',
            'meeting_cancelled',
            'call_logged',
            'note_added',
            'stage_changed',
            'score_updated',
            'assigned',
            'outbound_call',
            'pricing_sent',
            'proposal_viewed',
            'manual_email_sent'
        )
    )
);

-- Indexes for lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- ============================================
-- LEAD SCORING RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_type TEXT NOT NULL UNIQUE,
    points INT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default scoring rules
INSERT INTO lead_scoring_rules (activity_type, points, description, is_active) VALUES
    -- Positive scoring
    ('lead_created', 10, 'Nueva solicitud de demo', true),
    ('demo_accessed', 15, 'Lead accedió a la demo', true),
    ('demo_login', 15, 'Primer login en demo', true),
    ('meeting_scheduled', 15, 'Reunión agendada', true),
    ('meeting_completed', 20, 'Reunión completada', true),
    ('pricing_sent', 10, 'Propuesta de precios enviada', true),
    ('proposal_viewed', 10, 'Lead vio la propuesta', true),
    ('email_opened', 1, 'Email abierto', true),
    ('email_clicked', 3, 'Link en email clickeado', true),
    ('stage_changed_positive', 5, 'Avance en el funnel', true),
    
    -- Negative scoring
    ('demo_expired', -10, 'Demo expirada sin acción', true),
    ('no_activity_7_days', -5, 'Sin actividad por 7 días', true),
    ('no_activity_14_days', -10, 'Sin actividad por 14 días', true),
    ('email_bounced', -5, 'Email rechazado', true),
    ('stage_changed_negative', -5, 'Retroceso en el funnel', true)
ON CONFLICT (activity_type) DO NOTHING;

-- ============================================
-- LEAD SCORING LOGS TABLE (AUDIT)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_scoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES demo_requests(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    points_before INT NOT NULL,
    points_after INT NOT NULL,
    change_reason TEXT,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_scoring_logs
CREATE INDEX IF NOT EXISTS idx_lead_scoring_logs_lead_id ON lead_scoring_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_logs_created_at ON lead_scoring_logs(calculated_at DESC);

-- ============================================
-- ADD COLUMNS TO DEMO_REQUESTS FOR SCORING
-- ============================================
-- Add lead_score column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'lead_score'
    ) THEN
        ALTER TABLE demo_requests ADD COLUMN lead_score INT DEFAULT 0;
    END IF;
END $$;

-- Add priority_level column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'priority_level'
    ) THEN
        ALTER TABLE demo_requests ADD COLUMN priority_level TEXT DEFAULT 'cold' CHECK (priority_level IN ('hot', 'warm', 'cold', 'at_risk'));
    END IF;
END $$;

-- Add score_last_calculated_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'score_last_calculated_at'
    ) THEN
        ALTER TABLE demo_requests ADD COLUMN score_last_calculated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add assigned_to column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE demo_requests ADD COLUMN assigned_to UUID REFERENCES admin_users(id);
    END IF;
END $$;

-- Add next_followup_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'next_followup_at'
    ) THEN
        ALTER TABLE demo_requests ADD COLUMN next_followup_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add first_contact_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'first_contact_at'
    ) THEN
        ALTER TABLE demo_requests ADD COLUMN first_contact_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add utm columns if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_requests' AND column_name = 'utm_source'
    ) THEN
        ALTER TABLE demo_requests ADD COLUMN utm_source TEXT;
        ALTER TABLE demo_requests ADD COLUMN utm_medium TEXT;
        ALTER TABLE demo_requests ADD COLUMN utm_campaign TEXT;
    END IF;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_logs ENABLE ROW LEVEL SECURITY;

-- Policy for lead_activities - root/dev have full access
CREATE POLICY "lead_activities_root_full_access" ON lead_activities
    FOR ALL
    TO authenticated
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
    );

-- Policy for lead_scoring_rules - root/dev have full access
CREATE POLICY "lead_scoring_rules_root_full_access" ON lead_scoring_rules
    FOR ALL
    TO authenticated
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
    );

-- Policy for lead_scoring_logs - root/dev have full access
CREATE POLICY "lead_scoring_logs_root_full_access" ON lead_scoring_logs
    FOR ALL
    TO authenticated
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INT AS $$
DECLARE
    v_score INT := 0;
    v_activity_type TEXT;
    v_rule_points INT;
BEGIN
    -- Get all activities for this lead
    FOR v_activity_type IN 
        SELECT activity_type FROM lead_activities WHERE lead_id = p_lead_id
    LOOP
        -- Get the rule points (use 0 if no rule exists)
        SELECT COALESCE(points, 0) INTO v_rule_points 
        FROM lead_scoring_rules 
        WHERE activity_type = v_activity_type AND is_active = true;
        
        v_score := v_score + v_rule_points;
    END LOOP;
    
    -- Ensure score doesn't go below 0
    v_score := GREATEST(v_score, 0);
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update lead score and priority
CREATE OR REPLACE FUNCTION update_lead_score_and_priority(p_lead_id UUID)
RETURNS VOID AS $$
DECLARE
    v_new_score INT;
    v_old_score INT;
    v_priority TEXT;
BEGIN
    -- Get old score
    SELECT lead_score INTO v_old_score FROM demo_requests WHERE id = p_lead_id;
    
    -- Calculate new score
    v_new_score := calculate_lead_score(p_lead_id);
    
    -- Determine priority based on score
    IF v_new_score > 50 THEN
        v_priority := 'hot';
    ELSIF v_new_score >= 25 THEN
        v_priority := 'warm';
    ELSIF v_new_score > 0 THEN
        v_priority := 'cold';
    ELSE
        v_priority := 'at_risk';
    END IF;
    
    -- Update the demo_request
    UPDATE demo_requests 
    SET 
        lead_score = v_new_score,
        priority_level = v_priority,
        score_last_calculated_at = NOW()
    WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record activity and update score
CREATE OR REPLACE FUNCTION record_lead_activity(
    p_lead_id UUID,
    p_activity_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
    v_old_score INT;
BEGIN
    -- Get old score
    SELECT lead_score INTO v_old_score FROM demo_requests WHERE id = p_lead_id;
    
    -- Insert activity
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata, created_by)
    VALUES (p_lead_id, p_activity_type, p_description, p_metadata, p_created_by)
    RETURNING id INTO v_activity_id;
    
    -- Update score
    PERFORM update_lead_score_and_priority(p_lead_id);
    
    -- Log the score change
    INSERT INTO lead_scoring_logs (lead_id, activity_type, points_before, points_after, change_reason)
    SELECT 
        p_lead_id, 
        p_activity_type, 
        v_old_score, 
        lead_score, 
        p_description
    FROM demo_requests 
    WHERE id = p_lead_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER TO AUTO-RECORD ACTIVITIES
-- ============================================

-- Function to handle demo_requests changes
CREATE OR REPLACE FUNCTION handle_demo_request_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_activity_type TEXT;
    v_description TEXT;
BEGIN
    -- Detect stage changes
    IF NEW.funnel_stage IS DISTINCT FROM OLD.funnel_stage THEN
        -- Determine if positive or negative change
        IF NEW.funnel_stage IN ('converted', 'won') OR 
           (NEW.funnel_stage = 'negotiation' AND OLD.funnel_stage IN ('meeting_scheduled', 'post_meeting')) OR
           (NEW.funnel_stage = 'post_meeting' AND OLD.funnel_stage = 'meeting_scheduled') OR
           (NEW.funnel_stage = 'meeting_scheduled' AND OLD.funnel_stage IN ('approved', 'demo_expiring', 'demo_active')) THEN
            v_activity_type := 'stage_changed_positive';
        ELSIF NEW.funnel_stage IN ('lost', 'rejected', 'demo_expired') THEN
            v_activity_type := 'stage_changed_negative';
        ELSE
            v_activity_type := 'stage_changed';
        END IF;
        
        v_description := 'Cambió de etapa: ' || COALESCE(OLD.funnel_stage, 'null') || ' → ' || COALESCE(NEW.funnel_stage, 'null');
        
        PERFORM record_lead_activity(
            NEW.id,
            v_activity_type,
            v_description,
            JSONB_BUILD_OBJECT('old_stage', OLD.funnel_stage, 'new_stage', NEW.funnel_stage)
        );
    END IF;
    
    -- Record first contact
    IF NEW.first_contact_at IS DISTINCT FROM OLD.first_contact_at AND NEW.first_contact_at IS NOT NULL THEN
        PERFORM record_lead_activity(
            NEW.id,
            'first_contact',
            'Primer contacto registrado'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_demo_request_activity ON demo_requests;
CREATE TRIGGER trigger_demo_request_activity
    AFTER UPDATE ON demo_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_demo_request_activity();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE lead_activities IS 'Historial de actividades para leads y demo requests';
COMMENT ON TABLE lead_scoring_rules IS 'Reglas de puntuación para scoring de leads';
COMMENT ON TABLE lead_scoring_logs IS 'Registro de cambios en el score de leads';
COMMENT ON COLUMN demo_requests.lead_score IS 'Puntuación automática del lead basada en actividades';
COMMENT ON COLUMN demo_requests.priority_level IS 'Nivel de prioridad: hot, warm, cold, at_risk';
COMMENT ON COLUMN demo_requests.score_last_calculated_at IS 'Última vez que se calculó el score';
COMMENT ON COLUMN demo_requests.assigned_to IS 'Usuario asignado a este lead';
COMMENT ON COLUMN demo_requests.next_followup_at IS 'Fecha del próximo follow-up requerido';
