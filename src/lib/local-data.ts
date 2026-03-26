/**
 * Local data layer — reads logistics_master.json and provides an in-memory
 * database that works without Supabase. Mutations are stored in memory
 * (lost on server restart). Supabase can be connected later for persistence.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { randomUUID, createHash } from 'crypto';

// Generate a deterministic UUID from a seed string so IDs are stable across server reloads
function stableId(seed: string): string {
  const hash = createHash('md5').update(seed).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    '8' + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

// ============================================================
// Types
// ============================================================
interface MasterItem {
  item: string;
  qty: number;
  order: string;
  fulfillment: string;
}

interface MasterCustomer {
  token: string;
  segment: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  drive_minutes: number;
  size: string;
  orders: string[];
  pickup_items: MasterItem[];
  ship_items: MasterItem[];
  bench_count: number;
  seat_count: number;
  wall_mount_count: number;
  endrow_count: number;
  iron_qty: number;
  chairback_qty: number;
  ornament_qty: number;
  shipping_paid: number;
  needs_pickup_scheduling: boolean;
  offer_pickup_conversion: boolean;
  offer_ship_to_pickup: boolean;
  ship_as_normal: boolean;
}

interface MasterData {
  event: { name: string; location: string; schedule: Record<string, unknown>; total_capacity: number };
  segments: Record<string, { label: string; count: number; action: string }>;
  time_slots: Array<{ day: string; time: string; capacity: number }>;
  customers: MasterCustomer[];
}

export interface DBCustomer {
  id: string;
  token: string;
  segment: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  state: string;
  drive_minutes: number;
  size: string;
  shipping_paid: number;
  needs_pickup_scheduling: boolean;
  offer_pickup_conversion: boolean;
  offer_ship_to_pickup: boolean;
  ship_as_normal: boolean;
  is_vip: boolean;
  vip_note: string | null;
  created_at: string;
}

export interface DBOrder {
  id: string;
  customer_id: string;
  shopify_order_number: string;
  created_at: string;
}

export interface DBLineItem {
  id: string;
  order_id: string;
  customer_id: string;
  item_name: string;
  qty: number;
  item_type: 'pickup' | 'ship';
  fulfillment_preference: 'ship' | 'pickup';
  fulfillment_status: string;
}

export interface DBTimeSlot {
  id: string;
  day: string;
  time: string;
  capacity: number;
  current_bookings: number;
}

export interface DBBooking {
  id: string;
  customer_id: string;
  time_slot_id: string;
  status: string;
  confirmed_at: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  reschedule_count: number;
  created_at: string;
  // Joined
  time_slots?: DBTimeSlot;
  customers?: DBCustomer;
}

export interface DBActivityLog {
  id: string;
  customer_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// In-memory store
// ============================================================
let customers: DBCustomer[] = [];
let orders: DBOrder[] = [];
let lineItems: DBLineItem[] = [];
let timeSlots: DBTimeSlot[] = [];
let bookings: DBBooking[] = [];
let activityLog: DBActivityLog[] = [];
let initialized = false;
let loadedFilePath = '';
let loadedFileMtime = 0;

const JACOB_EMAIL = 'jacob.williams199743@gmail.com';

// Check if the source JSON has changed since last load and auto-reload if so
function checkForReload() {
  if (!loadedFilePath) return;
  try {
    const mtime = statSync(loadedFilePath).mtimeMs;
    if (mtime > loadedFileMtime) {
      initialized = false;
      loadData();
    }
  } catch { /* file gone — keep using cached data */ }
}

function loadData() {
  if (initialized) {
    checkForReload();
    if (initialized) return; // still valid after check
  }

  // Try multiple possible paths for the JSON file
  const possiblePaths = [
    resolve(process.cwd(), 'data/logistics_master.json'),
    resolve(process.cwd(), '../files/logistics_master.json'),
    resolve(process.cwd(), 'files/logistics_master.json'),
    resolve(process.cwd(), '../../files/logistics_master.json'),
  ];

  let raw = '';
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      raw = readFileSync(p, 'utf-8');
      loadedFilePath = p;
      loadedFileMtime = statSync(p).mtimeMs;
      break;
    }
  }

  if (!raw) {
    console.error('Could not find logistics_master.json');
    initialized = true;
    return;
  }

  const data: MasterData = JSON.parse(raw);

  // Load time slots
  timeSlots = data.time_slots.map((s, i) => ({
    id: stableId(`slot-${s.day}-${s.time}-${i}`),
    day: s.day,
    time: s.time,
    capacity: s.capacity,
    current_bookings: 0,
  }));

  // Load customers
  for (const c of data.customers) {
    const isVip = c.email.toLowerCase() === JACOB_EMAIL;
    const custId = stableId(`customer-${c.token}`);

    // Upgrade local shipping-only customers (D/E within 90 min) to offer pickup
    // This expands beyond just iron — chair backs, ornaments, everything
    const isLocalShipOnly = (c.segment === 'D' || c.segment === 'E') &&
      c.drive_minutes != null && c.drive_minutes <= 90;
    const effectiveSegment = isLocalShipOnly ? 'C' : c.segment;
    const effectiveOfferPickup = isLocalShipOnly ? true : c.offer_pickup_conversion;
    const effectiveShipAsNormal = isLocalShipOnly ? false : c.ship_as_normal;

    customers.push({
      id: custId,
      token: c.token,
      segment: effectiveSegment,
      name: c.name,
      email: c.email,
      phone: c.phone || null,
      city: c.city,
      state: c.state,
      drive_minutes: c.drive_minutes,
      size: c.size || 'S',
      shipping_paid: c.shipping_paid,
      needs_pickup_scheduling: c.needs_pickup_scheduling,
      offer_pickup_conversion: effectiveOfferPickup,
      offer_ship_to_pickup: c.offer_ship_to_pickup,
      ship_as_normal: effectiveShipAsNormal,
      is_vip: isVip,
      vip_note: isVip ? 'Bulk buyer: 8 benches, 15+ seats, 3 end-row pairs, ~25 iron. Dedicated Friday 10:00am truck-loading slot.' : null,
      created_at: new Date().toISOString(),
    });

    // Orders
    const uniqueOrders = [...new Set(c.orders)];
    for (const orderNum of uniqueOrders) {
      const orderId = stableId(`order-${c.token}-${orderNum}`);
      orders.push({
        id: orderId,
        customer_id: custId,
        shopify_order_number: orderNum,
        created_at: new Date().toISOString(),
      });

      // Pickup line items
      for (const item of c.pickup_items.filter(i => i.order === orderNum)) {
        lineItems.push({
          id: stableId(`item-${c.token}-${orderNum}-pickup-${item.item}`),
          order_id: orderId,
          customer_id: custId,
          item_name: item.item,
          qty: item.qty,
          item_type: 'pickup',
          fulfillment_preference: 'pickup',
          fulfillment_status: 'pending',
        });
      }

      // Ship line items
      for (const item of c.ship_items.filter(i => i.order === orderNum)) {
        lineItems.push({
          id: stableId(`item-${c.token}-${orderNum}-ship-${item.item}`),
          order_id: orderId,
          customer_id: custId,
          item_name: item.item,
          qty: item.qty,
          item_type: 'ship',
          fulfillment_preference: 'ship',
          fulfillment_status: (c.segment === 'D' || c.segment === 'E') ? 'ship_queued' : 'pending',
        });
      }
    }
  }

  initialized = true;
  console.log(`Local data loaded: ${customers.length} customers, ${orders.length} orders, ${lineItems.length} items, ${timeSlots.length} slots`);
}

// ============================================================
// Query functions
// ============================================================

export function getCustomerByToken(token: string): DBCustomer | undefined {
  loadData();
  return customers.find(c => c.token === token);
}

export function getCustomerById(id: string): DBCustomer | undefined {
  loadData();
  return customers.find(c => c.id === id);
}

export function getOrdersByCustomer(customerId: string): DBOrder[] {
  loadData();
  return orders.filter(o => o.customer_id === customerId);
}

export function getLineItemsByCustomer(customerId: string): DBLineItem[] {
  loadData();
  return lineItems.filter(i => i.customer_id === customerId);
}

export function getBookingByCustomer(customerId: string): DBBooking | undefined {
  loadData();
  const booking = bookings.find(b => b.customer_id === customerId);
  if (booking) {
    booking.time_slots = timeSlots.find(s => s.id === booking.time_slot_id);
  }
  return booking;
}

export function getAllTimeSlots(): DBTimeSlot[] {
  loadData();
  return [...timeSlots].sort((a, b) => {
    const dayOrder: Record<string, number> = { Thursday: 0, Friday: 1, Saturday: 2 };
    if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });
}

function timeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function getTimeSlotById(id: string): DBTimeSlot | undefined {
  loadData();
  return timeSlots.find(s => s.id === id);
}

export function getAllCustomers(): DBCustomer[] {
  loadData();
  return customers;
}

export function getAllBookings(): DBBooking[] {
  loadData();
  return bookings.map(b => ({
    ...b,
    time_slots: timeSlots.find(s => s.id === b.time_slot_id),
    customers: customers.find(c => c.id === b.customer_id),
  }));
}

export function getAllLineItems(): DBLineItem[] {
  loadData();
  return lineItems;
}

export function searchCustomers(query: string): DBCustomer[] {
  loadData();
  const q = query.toLowerCase();
  return customers.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    orders.some(o => o.customer_id === c.id && o.shopify_order_number.toLowerCase().includes(q))
  );
}

export function getActivityLogByCustomer(customerId: string): DBActivityLog[] {
  loadData();
  return activityLog
    .filter(l => l.customer_id === customerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ============================================================
// Mutation functions
// ============================================================

export function incrementSlotBooking(slotId: string): boolean {
  loadData();
  const slot = timeSlots.find(s => s.id === slotId);
  if (!slot || slot.current_bookings >= slot.capacity) return false;
  slot.current_bookings++;
  return true;
}

export function decrementSlotBooking(slotId: string): void {
  loadData();
  const slot = timeSlots.find(s => s.id === slotId);
  if (slot && slot.current_bookings > 0) slot.current_bookings--;
}

export function createBooking(customerId: string, slotId: string, rescheduleCount = 0): DBBooking {
  loadData();
  const booking: DBBooking = {
    id: randomUUID(),
    customer_id: customerId,
    time_slot_id: slotId,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    checked_in_at: null,
    completed_at: null,
    reschedule_count: rescheduleCount,
    created_at: new Date().toISOString(),
  };
  bookings.push(booking);
  booking.time_slots = timeSlots.find(s => s.id === slotId);
  return booking;
}

export function deleteBooking(bookingId: string): void {
  loadData();
  bookings = bookings.filter(b => b.id !== bookingId);
}

export function updateBookingStatus(customerId: string, status: string, extraFields?: Partial<DBBooking>): DBBooking | undefined {
  loadData();
  const booking = bookings.find(b => b.customer_id === customerId);
  if (!booking) return undefined;
  booking.status = status;
  if (extraFields) Object.assign(booking, extraFields);
  booking.time_slots = timeSlots.find(s => s.id === booking.time_slot_id);
  return booking;
}

export function updateLineItemPreference(itemId: string, preference: 'ship' | 'pickup', status?: string): void {
  loadData();
  const item = lineItems.find(i => i.id === itemId);
  if (item) {
    item.fulfillment_preference = preference;
    if (status) item.fulfillment_status = status;
  }
}

export function updateLineItemsStatus(customerId: string, filter: Partial<DBLineItem>, status: string): void {
  loadData();
  for (const item of lineItems) {
    if (item.customer_id !== customerId) continue;
    let match = true;
    for (const [key, val] of Object.entries(filter)) {
      if ((item as unknown as Record<string, unknown>)[key] !== val) { match = false; break; }
    }
    if (match) item.fulfillment_status = status;
  }
}

export function addActivityLog(customerId: string | null, action: string, details: Record<string, unknown> = {}): void {
  loadData();
  activityLog.push({
    id: randomUUID(),
    customer_id: customerId,
    action,
    details,
    created_at: new Date().toISOString(),
  });
}

// ============================================================
// Check if Supabase is configured
// ============================================================
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && url !== '' && !url.includes('your-project');
}
