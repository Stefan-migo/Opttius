export interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface ShippingInfo {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
}

export interface OrderFormData {
  email: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  total_amount: number;
  notes: string;
  shipping: ShippingInfo;
  items: OrderItem[];
}
