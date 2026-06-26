-- Migration: 20260210190000_debug_appointment_availability.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add detailed logging to check_appointment_availability function
-- This helps diagnose why appointments are being rejected

-- First, let's create a temporary logging function
CREATE OR REPLACE FUNCTION log_debug(message TEXT)
RETURNS VOID AS $$
BEGIN
  RAISE NOTICE '%', message;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function
DROP FUNCTION IF EXISTS check_appointment_availability(DATE, TIME, INTEGER, UUID, UUID, UUID);

-- Create improved function with detailed logging
CREATE OR REPLACE FUNCTION check_appointment_availability(
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER DEFAULT 30,
  p_appointment_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
  v_day_name TEXT;
  v_day_config JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_lunch_start TIME;
  v_lunch_end TIME;
  v_end_appointment_time TIME;
  v_conflicts INTEGER;
  v_appointment_timestamp TIMESTAMPTZ;
  v_min_advance_timestamp TIMESTAMPTZ;
BEGIN
  -- Log function call
  PERFORM log_debug('check_appointment_availability called with: date=' || p_date || ', time=' || p_time || ', duration=' || p_duration_minutes || ', branch_id=' || COALESCE(p_branch_id::TEXT, 'NULL'));

  -- Get schedule settings with fallback logic:
  -- 1. If branch_id provided, try to get branch-specific settings
  -- 2. If not found, fallback to global settings (branch_id IS NULL)
  -- 3. If still not found, use any available settings as last resort
  IF p_branch_id IS NOT NULL THEN
    -- First try to get branch-specific settings
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    WHERE branch_id = p_branch_id 
    LIMIT 1;
    
    -- If branch-specific settings not found, try global settings
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      WHERE branch_id IS NULL 
      LIMIT 1;
      PERFORM log_debug('Branch settings not found, using global settings');
    END IF;
    
    -- If still not found, use any available settings as last resort
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      LIMIT 1;
      PERFORM log_debug('Global settings not found, using any available settings');
    END IF;
  ELSE
    -- No branch specified, try global settings first
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    WHERE branch_id IS NULL 
    LIMIT 1;
    
    -- If no global settings, use any available settings
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      LIMIT 1;
    END IF;
  END IF;
  
  -- If no settings found at all, return FALSE
  IF v_settings IS NULL THEN
    PERFORM log_debug('No schedule settings found at all, returning FALSE');
    RETURN FALSE;
  END IF;

  PERFORM log_debug('Found settings, working_hours=' || COALESCE(v_settings.working_hours::TEXT, 'NULL'));

  -- Use TRIM to ensure day name matches working_hours JSONB keys
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));
  PERFORM log_debug('Day name: ' || v_day_name);
  
  v_day_config := v_settings.working_hours->v_day_name;
  PERFORM log_debug('Day config: ' || COALESCE(v_day_config::TEXT, 'NULL'));
  
  -- Check if day is enabled
  IF v_day_config IS NULL OR NOT (v_day_config->>'enabled')::BOOLEAN THEN
    PERFORM log_debug('Day not enabled or config is NULL, returning FALSE');
    RETURN FALSE;
  END IF;

  -- Check if date is blocked
  IF v_settings.blocked_dates IS NOT NULL AND p_date = ANY(v_settings.blocked_dates) THEN
    PERFORM log_debug('Date is blocked, returning FALSE');
    RETURN FALSE;
  END IF;

  -- Get working hours
  v_start_time := (v_day_config->>'start_time')::TIME;
  v_end_time := (v_day_config->>'end_time')::TIME;
  v_lunch_start := CASE WHEN v_day_config->>'lunch_start' IS NOT NULL 
    THEN (v_day_config->>'lunch_start')::TIME ELSE NULL END;
  v_lunch_end := CASE WHEN v_day_config->>'lunch_end' IS NOT NULL 
    THEN (v_day_config->>'lunch_end')::TIME ELSE NULL END;

  PERFORM log_debug('Working hours: ' || v_start_time || ' - ' || v_end_time);
  PERFORM log_debug('Lunch: ' || COALESCE(v_lunch_start::TEXT, 'NULL') || ' - ' || COALESCE(v_lunch_end::TEXT, 'NULL'));

  -- Check if time is within working hours
  v_end_appointment_time := p_time + (p_duration_minutes || ' minutes')::INTERVAL;
  
  PERFORM log_debug('Checking time: ' || p_time || ', end=' || v_end_appointment_time);
  
  IF p_time < v_start_time THEN
    PERFORM log_debug('Time before start, returning FALSE');
    RETURN FALSE;
  END IF;
  
  IF v_end_appointment_time > v_end_time THEN
    PERFORM log_debug('End time after working hours end, returning FALSE');
    RETURN FALSE;
  END IF;

  -- Check if overlaps with lunch break
  IF v_lunch_start IS NOT NULL AND v_lunch_end IS NOT NULL THEN
    IF (p_time < v_lunch_end AND v_end_appointment_time > v_lunch_start) THEN
      PERFORM log_debug('Overlaps with lunch, returning FALSE');
      RETURN FALSE;
    END IF;
  END IF;

  -- Check for conflicts with existing appointments (filter by branch_id)
  SELECT COUNT(*) INTO v_conflicts
  FROM public.appointments a
  WHERE a.appointment_date = p_date
    AND a.status IN ('scheduled', 'confirmed')
    AND (p_appointment_id IS NULL OR a.id != p_appointment_id)
    AND (
      -- Appointment starts during this slot
      (a.appointment_time < v_end_appointment_time
       AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > p_time)
    )
    AND (p_staff_id IS NULL OR a.assigned_to = p_staff_id)
    AND (p_branch_id IS NULL OR a.branch_id = p_branch_id); -- Filter by branch

  PERFORM log_debug('Conflicts found: ' || v_conflicts);

  IF v_conflicts > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check minimum advance booking (only if it's today)
  IF v_settings.min_advance_booking_hours > 0 AND p_date = CURRENT_DATE THEN
    v_appointment_timestamp := (p_date || ' ' || p_time)::TIMESTAMPTZ;
    v_min_advance_timestamp := NOW() + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL;
    
    PERFORM log_debug('Checking minimum advance: appointment=' || v_appointment_timestamp || ', min_required=' || v_min_advance_timestamp);
    
    IF v_appointment_timestamp < v_min_advance_timestamp THEN
      PERFORM log_debug('Before minimum advance time, returning FALSE');
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if date is in the past
  IF p_date < CURRENT_DATE THEN
    PERFORM log_debug('Date is in the past, returning FALSE');
    RETURN FALSE;
  END IF;

  PERFORM log_debug('Slot is available, returning TRUE');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_appointment_availability IS 'Verifica si un horario específico está disponible para una cita, con logging detallado para diagnóstico';
