import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/dashboard — aggregate stats
export async function GET() {
  await ensureHydrated();
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  let time_slots = db.getAllTimeSlots();

  // Sync slot counts from Supabase (source of truth)
  const sb = createAdminClient();
  if (sb) {
    const { data: sbSlots } = await sb.from('time_slots').select('day, time, current_bookings');
    if (sbSlots) {
      const sbMap = new Map(sbSlots.map(s => [`${s.day}-${s.time}`, s.current_bookings]));
      time_slots = time_slots.map(s => {
        const sbCount = sbMap.get(`${s.day}-${s.time}`);
        return sbCount !== undefined ? { ...s, current_bookings: sbCount } : s;
      });
    }
  }
  const allItems = db.getAllLineItems();

  // Segment breakdown
  const segments: Record<string, { count: number; confirmed: number; pending: number }> = {};
  for (const seg of ['A', 'B', 'C', 'D', 'E']) {
    const segCustomers = customers.filter(c => c.segment === seg);
    const segBookingCustomerIds = new Set(
      allBookings.filter(b => segCustomers.some(c => c.id === b.customer_id)).map(b => b.customer_id)
    );
    segments[seg] = {
      count: segCustomers.length,
      confirmed: segBookingCustomerIds.size,
      pending: segCustomers.length - segBookingCustomerIds.size,
    };
  }

  // Seg C conversion
  const segCCustomers = customers.filter(c => c.segment === 'C');
  const segCConversions = allBookings.filter(b =>
    segCCustomers.some(c => c.id === b.customer_id)
  ).length;

  // Seg B bundle tracking
  const segBCustomerIds = new Set(customers.filter(c => c.segment === 'B').map(c => c.id));
  const segBConvertedItems = allItems.filter(
    i => segBCustomerIds.has(i.customer_id) && i.item_type === 'ship' && i.fulfillment_preference === 'pickup'
  );

  const shippingSavings = (segCConversions * 50) + (segBConvertedItems.length * 30);

  const statusCounts = {
    confirmed: allBookings.filter(b => b.status === 'confirmed').length,
    checked_in: allBookings.filter(b => b.status === 'checked_in').length,
    completed: allBookings.filter(b => b.status === 'completed').length,
    no_show: allBookings.filter(b => b.status === 'no_show').length,
  };

  // Fulfillment decisions: who converted ship→pickup vs kept shipping
  const bookedCustomerIds = new Set(allBookings.map(b => b.customer_id));
  const shipItems = allItems.filter(i => i.item_type === 'ship');

  const convertedToPickup = shipItems
    .filter(i => i.fulfillment_preference === 'pickup')
    .map(i => {
      const cust = customers.find(c => c.id === i.customer_id);
      return { name: cust?.name || '', email: cust?.email || '', item: i.item_name, qty: i.qty };
    });

  const keptAsShip = shipItems
    .filter(i => i.fulfillment_preference === 'ship' && bookedCustomerIds.has(i.customer_id))
    .map(i => {
      const cust = customers.find(c => c.id === i.customer_id);
      return { name: cust?.name || '', email: cust?.email || '', item: i.item_name, qty: i.qty };
    });

  // Group by customer
  const groupByCustomer = (items: Array<{ name: string; email: string; item: string; qty: number }>) => {
    const map = new Map<string, { name: string; email: string; items: Array<{ item: string; qty: number }> }>();
    for (const i of items) {
      if (!map.has(i.email)) map.set(i.email, { name: i.name, email: i.email, items: [] });
      const existing = map.get(i.email)!.items.find(x => x.item === i.item);
      if (existing) existing.qty += i.qty;
      else map.get(i.email)!.items.push({ item: i.item, qty: i.qty });
    }
    return [...map.values()];
  };

  return NextResponse.json({
    total_customers: customers.length,
    segments,
    total_bookings: allBookings.length,
    ...statusCounts,
    seg_c_conversions: segCConversions,
    seg_c_total: segCCustomers.length,
    shipping_savings: shippingSavings,
    time_slot_fill: time_slots,
    fulfillment_decisions: {
      converted_to_pickup: groupByCustomer(convertedToPickup),
      kept_as_ship: groupByCustomer(keptAsShip),
    },
  });
}
