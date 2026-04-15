// Customer segments
export type Segment = 'A' | 'B' | 'C' | 'D' | 'E';

// Pickup complexity sizing
export type PickupSize = 'S' | 'M' | 'L' | 'XL';

// Fulfillment status for individual line items
export type FulfillmentStatus =
  | 'pending'
  | 'confirmed'
  | 'staged'
  | 'picked_up'
  | 'ship_queued'
  | 'packed'
  | 'shipped'
  | 'no_show';

// Booking status
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'no_show';

// Fulfillment preference for shippable items
export type FulfillmentPreference = 'ship' | 'pickup';

// Database row types
export interface Customer {
  id: string;
  token: string;
  segment: Segment;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  state: string;
  drive_minutes: number;
  size: PickupSize;
  shipping_paid: number;
  needs_pickup_scheduling: boolean;
  offer_pickup_conversion: boolean;
  offer_ship_to_pickup: boolean;
  ship_as_normal: boolean;
  is_vip: boolean;
  vip_note: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  shopify_order_number: string;
  created_at: string;
}

export interface LineItem {
  id: string;
  order_id: string;
  customer_id: string;
  item_name: string;
  qty: number;
  item_type: 'pickup' | 'ship';
  fulfillment_preference: FulfillmentPreference;
  fulfillment_status: FulfillmentStatus;
}

export interface TimeSlot {
  id: string;
  day: string;
  time: string;
  capacity: number;
  current_bookings: number;
}

export interface Booking {
  id: string;
  customer_id: string;
  time_slot_id: string;
  status: BookingStatus;
  confirmed_at: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  reschedule_count: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  customer_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// Composite types for the customer-facing page
export interface CustomerPageData {
  customer: Customer;
  orders: Order[];
  pickup_items: LineItem[];
  ship_items: LineItem[];
  booking: Booking | null;
  time_slots: TimeSlot[];
}

// Admin dashboard stats
export interface DashboardStats {
  total_customers: number;
  segments: Record<Segment, { count: number; confirmed: number; pending: number }>;
  total_bookings: number;
  total_confirmed: number;
  total_checked_in: number;
  total_completed: number;
  total_no_show: number;
  seg_c_conversions: number;
  seg_c_total: number;
  shipping_savings: number;
  time_slot_fill: TimeSlot[];
}

// Vehicle recommendation
export function getVehicleRecommendation(size: PickupSize): string {
  switch (size) {
    case 'XL':
    case 'L':
      return 'Bring a truck, trailer, or large SUV';
    case 'M':
      return 'SUV or minivan recommended';
    case 'S':
      return 'Any vehicle will work';
  }
}

// Size to estimated minutes
export function getSizeMinutes(size: PickupSize): number {
  switch (size) {
    case 'XL': return 30;
    case 'L': return 20;
    case 'M': return 10;
    case 'S': return 5;
  }
}

// Segment labels
export const SEGMENT_LABELS: Record<Segment, string> = {
  A: 'Pickup Only',
  B: 'Pickup + Ship Items',
  C: 'Iron Local (Offer Pickup)',
  D: 'Iron Far (Ship)',
  E: 'Ship Only',
};

// Segment colors for UI
export const SEGMENT_COLORS: Record<Segment, string> = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-purple-100 text-purple-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-gray-100 text-gray-800',
  E: 'bg-gray-100 text-gray-600',
};

// Status colors
export const STATUS_COLORS: Record<FulfillmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  staged: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-green-100 text-green-800',
  ship_queued: 'bg-orange-100 text-orange-800',
  packed: 'bg-cyan-100 text-cyan-800',
  shipped: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-800',
};
