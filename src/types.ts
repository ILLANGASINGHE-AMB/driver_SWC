export interface Driver {
  id: number;
  auth_user_id: string | null;
  name: string;
  nickname: string | null;
  phone: string | null;
  phone2: string | null;
  nic: string | null;
  email: string | null;
  address: string | null;
  status: 'available' | 'busy' | 'off-duty' | string;
  created_date: string;
}

export interface Vehicle {
  id: number;
  vehicle_no: string;
  category: string;
  model: string;
  status: string;
}

export interface Customer {
  id: number;
  hotel_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  custom_prices?: Record<string, { dry_clean?: number; wash_press?: number; wash_dry?: number }> | null;
  [key: string]: unknown;
}

export interface VisitedCustomer {
  customer_id: number;
  hotel_name: string;
  visit_order: number;
}

export interface Trip {
  id: string;
  trip_id: string;
  driver_id: number | null;
  driver_name: string;
  vehicle_id: string | null;
  vehicle_no: string | null;
  start_date: string;
  start_time: string;
  starting_km: number;
  selected_customers: VisitedCustomer[];
  notes: string;
  end_date: string | null;
  end_time: string | null;
  final_km: number | null;
  distance_km: number | null;
  status: 'In Progress' | 'Completed';
  created_at: string;
}

export interface Item {
  id: number;
  item_id: string;
  item_name: string;
  description?: string;
  dry_clean_price: number;
  wash_press_price: number;
  wash_dry_price: number;
}

export type ServiceType = 'Dry Clean' | 'Wash & Press' | 'Wash & Dry';

export interface OrderItemInput {
  catalog_item_id: number;
  item_name: string;
  quantity: number;
  service_type: ServiceType;
  price: number;
  subtotal: number;
}

export interface OrderInput {
  customer_id: number;
  driver_id: number | null;
  pickup_date: string;
  delivery_date: string | null;
  status: 'Paid' | 'Unpaid';
  advance_payment: number;
  extra_payment: number;
  delivery_charge: number;
  discount_rate: number;
  discount_amount: number;
  total_amount: number;
  batch_id: string;
}

export interface Order {
  id: number;
  batch_id: string;
  customer_id: number;
  driver_id: number | null;
  pickup_date: string;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  advance_payment: number;
  extra_payment: number;
  delivery_charge: number;
  discount_rate: number;
  discount_amount: number;
  created_at: string;
  [key: string]: unknown;
}

export interface OrderItem {
  id: number;
  order_id: number;
  catalog_item_id: number | null;
  item_name: string;
  quantity: number;
  service_type: ServiceType | string;
  price: number;
  subtotal: number;
  [key: string]: unknown;
}

export interface Invoice {
  id: number;
  order_id: number;
  invoice_number: string;
  invoice_type: 'Standard' | 'Credit' | string;
  issue_date: string;
  delivery_date: string | null;
  credit_due_date?: string | null;
  total_amount: number;
  advance_payment: number;
  extra_payment: number;
  delivery_charge: number;
  discount_rate: number;
  discount_amount: number;
  deduction_amount?: number;
  subtotal_before_discount?: number;
  paid_status: string;
  [key: string]: unknown;
}

export interface Payment {
  id: number;
  invoice_id: number;
  date: string;
  amount: number;
  method: string;
  notes?: string | null;
  [key: string]: unknown;
}
