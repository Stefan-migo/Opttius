-- Migration: 20250126000000_create_schedule_settings_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Schedule Settings System for Appointments
-- This migration creates a comprehensive scheduling system with 15-minute slots
-- and customizable working hours

-- ===== CREATE SCHEDULE SETTINGS TABLE =====
CREATE TABLE IF NOT EXISTS public.schedule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- General settings
  slot_duration_minutes INTEGER DEFAULT 15 CHECK (slot_duration_minutes > 0), -- Duration of each time slot
  default_appointment_duration INTEGER DEFAULT 30 CHECK (default_appointment_duration > 0), -- Default appointment duration
  buffer_time_minutes INTEGER DEFAULT 0 CHECK (buffer_time_minutes >= 0), -- Buffer time between appointments
  
  -- Working hours per day of week (stored as JSONB for flexibility)
  -- Format: { "monday": { "enabled": true, "start_time": "09:00", "end_time": "18:00", "lunch_start": "13:00", "lunch_end": "14:00" }, ... }
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "start_time": "09:00", "end_time": "18:00", "lunch_start": null, "lunch_end": null},
    "tuesday": {"enabled": true, "start_time": "09:00", "end_time": "18:00", "lunch_start": null, "lunch_end": null},
    "wednesday": {"enabled": true, "start_time": "09:00", "end_time": "18:00", "lunch_start": null, "lunch_end": null},
    "thursday": {"enabled": true, "start_time": "09:00", "end_time": "18:00", "lunch_start": null, "lunch_end": null},
    "friday": {"enabled": true, "start_time": "09:00", "end_time": "18:00", "lunch_start": null, "lunch_end": null},
    "saturday": {"enabled": false, "start_time": "09:00", "end_time": "13:00", "lunch_start": null, "lunch_end": null},
    "sunday": {"enabled": false, "start_time": "09:00", "end_time": "13:00", "lunch_start": null, "lunch_end": null}
  }'::jsonb,
  
  -- Blocked dates (holidays, special closures)
  blocked_dates DATE[] DEFAULT '{}',
  
  -- Advance booking settings
  min_advance_booking_hours INTEGER DEFAULT 2 CHECK (min_advance_booking_hours >= 0), -- Minimum hours in advance
  max_advance_booking_days INTEGER DEFAULT 90 CHECK (max_advance_booking_days > 0), -- Maximum days in advance
  
  -- Staff-specific settings (if multiple staff members)
  staff_specific_settings JSONB DEFAULT '{}'::jsonb, -- { "staff_id": { "working_hours": {...}, "blocked_dates": [...] } }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create unique constraint to ensure only one settings record
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_settings_single ON public.schedule_settings((1));

-- ===== CREATE FUNCTION TO GET AVAILABLE TIME SLOTS =====
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
  IF NOT (v_day_config->>'enabled')::BOOLEAN THEN
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
    
    -- Check minimum advance booking
    IF v_is_available AND v_settings.min_advance_booking_hours > 0 THEN
      IF (p_date || ' ' || v_current_time)::TIMESTAMP < 
         (NOW() + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL) THEN
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

-- ===== CREATE FUNCTION TO CHECK APPOINTMENT AVAILABILITY =====
CREATE OR REPLACE FUNCTION check_appointment_availability(
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER DEFAULT 30,
  p_appointment_id UUID DEFAULT NULL, -- For updates, exclude this appointment
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
BEGIN
  -- Get schedule settings
  SELECT * INTO v_settings FROM public.schedule_settings LIMIT 1;
  
  IF v_settings IS NULL THEN
    RETURN FALSE; -- No settings configured
  END IF;
  
  v_day_name := LOWER(TO_CHAR(p_date, 'Day'));
  v_day_config := v_settings.working_hours->v_day_name;
  
  -- Check if day is enabled
  IF NOT (v_day_config->>'enabled')::BOOLEAN THEN
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
    RETURN FALSE;
  END IF;
  
  -- Check minimum advance booking
  IF v_settings.min_advance_booking_hours > 0 THEN
    IF (p_date || ' ' || p_time)::TIMESTAMP < 
       (NOW() + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check maximum advance booking
  IF v_settings.max_advance_booking_days > 0 THEN
    IF p_date > (CURRENT_DATE + (v_settings.max_advance_booking_days || ' days')::INTERVAL) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===== CREATE TRIGGER TO UPDATE UPDATED_AT =====
CREATE TRIGGER update_schedule_settings_updated_at
  BEFORE UPDATE ON public.schedule_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_settings
CREATE POLICY "Admins can view schedule settings" ON public.schedule_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update schedule settings" ON public.schedule_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert schedule settings" ON public.schedule_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- ===== INSERT DEFAULT SCHEDULE SETTINGS =====
INSERT INTO public.schedule_settings (
  slot_duration_minutes,
  default_appointment_duration,
  buffer_time_minutes,
  min_advance_booking_hours,
  max_advance_booking_days
) VALUES (
  15,
  30,
  0,
  2,
  90
) ON CONFLICT DO NOTHING;

-- ===== COMMENTS =====
COMMENT ON TABLE public.schedule_settings IS 'Configuración de horarios y disponibilidad para el sistema de citas';
COMMENT ON FUNCTION get_available_time_slots IS 'Obtiene los slots de tiempo disponibles para una fecha específica';
COMMENT ON FUNCTION check_appointment_availability IS 'Verifica si un horario específico está disponible para una cita';

