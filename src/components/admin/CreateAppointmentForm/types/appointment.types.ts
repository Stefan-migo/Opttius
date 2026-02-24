export interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  rut?: string;
}

export interface GuestCustomerData {
  first_name: string;
  last_name: string;
  rut: string;
  email: string;
  phone: string;
}

export interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  assigned_to: string | null;
  notes: string;
  reason: string;
  follow_up_required: boolean;
  follow_up_date: string;
  prescription_id: string | null;
  order_id: string | null;
}

export interface TimeSlot {
  time_slot: string;
  available: boolean;
}

export interface ScheduleSettings {
  id: string;
  organization_id: string;
  branch_id: string;
  working_days: string[];
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  default_appointment_duration: number;
  min_advance_booking_hours: number;
  max_advance_booking_days: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface CreateAppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  initialCustomerId?: string;
  lockDateTime?: boolean;
  /** Override branch for customer search. Use when parent has a specific branch selected (e.g. super admin dropdown). Ensures only customers from this branch are shown. */
  effectiveBranchId?: string | null;
}