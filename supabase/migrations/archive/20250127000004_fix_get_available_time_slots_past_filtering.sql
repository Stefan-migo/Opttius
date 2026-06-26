-- Migration: 20250127000004_fix_get_available_time_slots_past_filtering.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Fix get_available_time_slots to properly filter past slots
-- The function should only filter past slots if min_advance_booking_hours > 0
-- If min_advance_booking_hours = 0, allow immediate bookings (don't filter past slots)

CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 30,
  p_staff_id UUID DEFAULT NULL
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
  -- Get schedule settings
  SELECT * INTO v_settings FROM public.schedule_settings LIMIT 1;
  
  IF v_settings IS NULL THEN
    -- Return empty if no settings configured
    RETURN;
  END IF;

  v_slot_duration := COALESCE(v_settings.slot_duration_minutes, 15);
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));
  v_day_config := v_settings.working_hours->v_day_name;
  
  -- Check if day is enabled
  IF v_day_config IS NULL OR NOT (v_day_config->>'enabled')::BOOLEAN THEN
    RETURN;
  END IF;
  
  -- Get working hours for the day
  v_start_time := (v_day_config->>'start_time')::TIME;
  v_end_time := (v_day_config->>'end_time')::TIME;
  v_lunch_start := CASE WHEN v_day_config->>'lunch_start' IS NOT NULL 
    THEN (v_day_config->>'lunch_start')::TIME ELSE NULL END;
  v_lunch_end := CASE WHEN v_day_config->>'lunch_end' IS NOT NULL 
    THEN (v_day_config->>'lunch_end')::TIME ELSE NULL END;
  
  -- Check if date is blocked
  IF v_settings.blocked_dates IS NOT NULL AND p_date = ANY(v_settings.blocked_dates) THEN
    RETURN;
  END IF;
  
  -- Get current timestamp for comparison
  v_now := NOW();
  
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
    
    -- Check if slot conflicts with existing appointments
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

COMMENT ON FUNCTION get_available_time_slots IS 'Obtiene los slots de tiempo disponibles para una fecha específica (versión corregida - solo filtra pasados si min_advance_booking_hours > 0)';

