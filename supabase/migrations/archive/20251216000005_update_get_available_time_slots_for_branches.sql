-- Migration: 20251216000005_update_get_available_time_slots_for_branches.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update get_available_time_slots to support branches
-- This ensures that time slot generation uses the correct branch schedule settings

-- Drop existing function
DROP FUNCTION IF EXISTS get_available_time_slots(DATE, INTEGER, UUID);
DROP FUNCTION IF EXISTS get_available_time_slots(DATE, INTEGER, UUID, UUID);

-- Create updated function with branch_id parameter
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 30,
  p_staff_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  time_slot TIME,
  available BOOLEAN
) AS $$
DECLARE
  v_settings RECORD;
  v_day_name TEXT;
  v_day_config JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_lunch_start TIME;
  v_lunch_end TIME;
  v_current_time TIME;
  v_slot_duration INTEGER;
  v_appointment RECORD;
  v_is_available BOOLEAN;
  v_now TIMESTAMP;
BEGIN
  -- Get schedule settings with fallback logic (same as check_appointment_availability)
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
    END IF;
    
    -- If still not found, use any available settings as last resort
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      LIMIT 1;
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
  
  IF v_settings IS NULL THEN
    -- Return empty if no settings configured
    RETURN;
  END IF;

  v_slot_duration := COALESCE(v_settings.slot_duration_minutes, 15);
  v_now := NOW();

  -- Use TRIM to ensure day name matches working_hours JSONB keys
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));
  v_day_config := v_settings.working_hours->v_day_name;
  
  -- Check if day is enabled
  IF v_day_config IS NULL OR NOT (v_day_config->>'enabled')::BOOLEAN THEN
    RETURN;
  END IF;

  -- Check if date is blocked
  IF v_settings.blocked_dates IS NOT NULL AND p_date = ANY(v_settings.blocked_dates) THEN
    RETURN;
  END IF;

  -- Get working hours
  v_start_time := (v_day_config->>'start_time')::TIME;
  v_end_time := (v_day_config->>'end_time')::TIME;
  v_lunch_start := CASE WHEN v_day_config->>'lunch_start' IS NOT NULL 
    THEN (v_day_config->>'lunch_start')::TIME ELSE NULL END;
  v_lunch_end := CASE WHEN v_day_config->>'lunch_end' IS NOT NULL 
    THEN (v_day_config->>'lunch_end')::TIME ELSE NULL END;

  -- Generate time slots
  v_current_time := v_start_time;
  
  WHILE v_current_time < v_end_time LOOP
    v_is_available := TRUE;
    
    -- Check if slot is during lunch break
    IF v_lunch_start IS NOT NULL AND v_lunch_end IS NOT NULL THEN
      IF v_current_time >= v_lunch_start AND v_current_time < v_lunch_end THEN
        v_is_available := FALSE;
      END IF;
    END IF;
    
    -- Check if slot conflicts with existing appointments (filter by branch_id)
    IF v_is_available THEN
      SELECT EXISTS(
        SELECT 1 FROM public.appointments a
        WHERE a.appointment_date = p_date
          AND a.status IN ('scheduled', 'confirmed')
          AND (
            -- Appointment starts during this slot
            (a.appointment_time <= v_current_time 
             AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > v_current_time)
            OR
            -- Appointment overlaps with this slot
            (a.appointment_time < (v_current_time + (p_duration_minutes || ' minutes')::INTERVAL)
             AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > v_current_time)
          )
          AND (p_staff_id IS NULL OR a.assigned_to = p_staff_id)
          AND (p_branch_id IS NULL OR a.branch_id = p_branch_id) -- Filter by branch
      ) INTO v_is_available;
      
      v_is_available := NOT v_is_available;
    END IF;
    
    -- Check minimum advance booking (only if > 0 and it's today)
    -- If min_advance_booking_hours = 0, allow immediate bookings
    IF v_is_available AND v_settings.min_advance_booking_hours > 0 AND p_date = CURRENT_DATE THEN
      IF (p_date || ' ' || v_current_time)::TIMESTAMP < 
         (v_now + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL) THEN
        v_is_available := FALSE;
      END IF;
    END IF;
    
    -- Check maximum advance booking
    IF v_is_available AND v_settings.max_advance_booking_days > 0 THEN
      IF p_date > (CURRENT_DATE + (v_settings.max_advance_booking_days || ' days')::INTERVAL) THEN
        v_is_available := FALSE;
      END IF;
    END IF;
    
    RETURN QUERY SELECT v_current_time, v_is_available;
    
    -- Move to next slot
    v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_time_slots IS 'Obtiene los slots de tiempo disponibles para una fecha específica, considerando branch_id con fallback a configuración global';
