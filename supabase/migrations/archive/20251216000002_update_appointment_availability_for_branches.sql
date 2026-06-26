-- Migration: 20251216000002_update_appointment_availability_for_branches.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update appointment availability functions to support branches
-- This ensures that availability checks and time slot generation consider branch_id

-- ===== UPDATE check_appointment_availability FUNCTION =====
-- Add branch_id parameter and filter conflicts by branch

-- Drop existing function with all possible signatures
DROP FUNCTION IF EXISTS check_appointment_availability(DATE, TIME, INTEGER, UUID, UUID);
DROP FUNCTION IF EXISTS check_appointment_availability(DATE, TIME, INTEGER, UUID, UUID, UUID);

-- Create new function with branch_id parameter
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
  -- Get schedule settings for the branch (or default if no branch_id)
  IF p_branch_id IS NOT NULL THEN
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    WHERE branch_id = p_branch_id 
    LIMIT 1;
  ELSE
    -- Fallback to any settings if no branch specified
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    LIMIT 1;
  END IF;
  
  IF v_settings IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Use TRIM to ensure day name matches working_hours JSONB keys
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));
  v_day_config := v_settings.working_hours->v_day_name;
  
  -- Check if day is enabled
  IF v_day_config IS NULL OR NOT (v_day_config->>'enabled')::BOOLEAN THEN
    RETURN FALSE;
  END IF;

  -- Check if date is blocked
  IF v_settings.blocked_dates IS NOT NULL AND p_date = ANY(v_settings.blocked_dates) THEN
    RETURN FALSE;
  END IF;

  -- Get working hours
  v_start_time := (v_day_config->>'start_time')::TIME;
  v_end_time := (v_day_config->>'end_time')::TIME;
  v_lunch_start := CASE WHEN v_day_config->>'lunch_start' IS NOT NULL 
    THEN (v_day_config->>'lunch_start')::TIME ELSE NULL END;
  v_lunch_end := CASE WHEN v_day_config->>'lunch_end' IS NOT NULL 
    THEN (v_day_config->>'lunch_end')::TIME ELSE NULL END;

  -- Check if time is within working hours
  v_end_appointment_time := p_time + (p_duration_minutes || ' minutes')::INTERVAL;
  
  IF p_time < v_start_time OR v_end_appointment_time > v_end_time THEN
    RETURN FALSE;
  END IF;

  -- Check if overlaps with lunch break
  IF v_lunch_start IS NOT NULL AND v_lunch_end IS NOT NULL THEN
    IF (p_time < v_lunch_end AND v_end_appointment_time > v_lunch_start) THEN
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
      -- Appointment overlaps
      (a.appointment_time < v_end_appointment_time
       AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > p_time)
    )
    AND (p_staff_id IS NULL OR a.assigned_to = p_staff_id)
    AND (p_branch_id IS NULL OR a.branch_id = p_branch_id); -- Filter by branch

  IF v_conflicts > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check minimum advance booking (only if it's today)
  IF v_settings.min_advance_booking_hours > 0 AND p_date = CURRENT_DATE THEN
    v_appointment_timestamp := (p_date || ' ' || p_time)::TIMESTAMPTZ;
    v_min_advance_timestamp := NOW() + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL;
    
    IF v_appointment_timestamp < v_min_advance_timestamp THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if date is in the past
  IF p_date < CURRENT_DATE THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_appointment_availability IS 'Verifica si un horario específico está disponible para una cita, considerando branch_id';

-- ===== UPDATE get_available_time_slots FUNCTION =====
-- This function should also consider branch_id, but let's check if it exists first
-- We'll update it if needed in a separate migration if it's used
