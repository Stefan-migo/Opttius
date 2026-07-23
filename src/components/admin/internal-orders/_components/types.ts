export interface InternalOrder {
  id: string;
  order_number: string;
  origin_branch_id: string;
  destination_branch_id: string;
  status: "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  scheduled_pickup_date?: string;
  actual_pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  driver_id?: string;
  vehicle_id?: string;
  tracking_number?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  is_active: boolean;
}

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  phone: string;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  model: string;
  capacity_kg: number;
  is_active: boolean;
}
