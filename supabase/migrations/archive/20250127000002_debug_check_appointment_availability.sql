-- Migration: 20250127000002_debug_check_appointment_availability.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add detailed logging to check_appointment_availability function
-- This will help diagnose why appointments are being rejected

CREATE OR REPLACE FUNCTION check_appointment_availability(
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER DEFAULT 30,
  p_appointment_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
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
  v_debug_info TEXT;
BEGIN
  -- Get schedule settings
  SELECT * INTO v_settings FROM public.schedule_settings LIMIT 1;
  
  IF v_settings IS NULL THEN
    RAISE NOTICE 'DEBUG: No settings configured';
    RETURN FALSE;
  END IF;

  -- Use TRIM to ensure day name matches working_hours JSONB keys
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));
  v_day_config := v_settings.working_hours->v_day_name;
  
  -- Check if day is enabled
  IF v_day_config IS NULL OR NOT (v_day_config->>'enabled')::BOOLEAN THEN
    RAISE NOTICE 'DEBUG: Day % is not enabled or config is NULL', v_day_name;
    RETURN FALSE;
  END IF;

  -- Check if date is blocked
  IF v_settings.blocked_dates IS NOT NULL AND p_date = ANY(v_settings.blocked_dates) THEN
    RAISE NOTICE 'DEBUG: Date % is blocked', p_date;
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
  
  IF p_time < v_start_time THEN
    RAISE NOTICE 'DEBUG: Time % is before start time %', p_time, v_start_time;
    RETURN FALSE;
  END IF;
  
  IF v_end_appointment_time > v_end_time THEN
    RAISE NOTICE 'DEBUG: End appointment time % is after end time %', v_end_appointment_time, v_end_time;
    RETURN FALSE;
  END IF;

  -- Check if overlaps with lunch break
  IF v_lunch_start IS NOT NULL AND v_lunch_end IS NOT NULL THEN
    IF (p_time < v_lunch_end AND v_end_appointment_time > v_lunch_start) THEN
      RAISE NOTICE 'DEBUG: Appointment overlaps with lunch break (% - %)', v_lunch_start, v_lunch_end;
      RETURN FALSE;
    END IF;
  END IF;

  -- Check for conflicts with existing appointments
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
    AND (p_staff_id IS NULL OR a.assigned_to = p_staff_id);

  IF v_conflicts > 0 THEN
    RAISE NOTICE 'DEBUG: Found % conflicts with existing appointments', v_conflicts;
    RETURN FALSE;
  END IF;

  -- Check minimum advance booking (only if it's today)
  IF v_settings.min_advance_booking_hours > 0 AND p_date = CURRENT_DATE THEN
    IF (p_date || ' ' || p_time)::TIMESTAMP < 
       (NOW() + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL) THEN
      RAISE NOTICE 'DEBUG: Appointment time % is less than % hours from now', 
        (p_date || ' ' || p_time)::TIMESTAMP, 
        v_settings.min_advance_booking_hours;
      RETURN FALSE;
    END IF;
  END IF;

  -- Check maximum advance booking
  IF v_settings.max_advance_booking_days > 0 THEN
    IF p_date > (CURRENT_DATE + (v_settings.max_advance_booking_days || ' days')::INTERVAL) THEN
      RAISE NOTICE 'DEBUG: Date % is more than % days in advance', 
        p_date, 
        v_settings.max_advance_booking_days;
      RETURN FALSE;
    END IF;
  END IF;

  RAISE NOTICE 'DEBUG: Appointment is available';
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_appointment_availability IS 'Verifica si un horario específico está disponible para una cita (versión con debug)';

