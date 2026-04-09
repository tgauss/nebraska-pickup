import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { createAdminClient } from '@/lib/supabase';
import { getLabelByToken } from '@/lib/labels';

export const dynamic = 'force-dynamic';

// GET /api/pickup/[token] — fetch customer data + available slots
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await ensureHydrated();

  const customer = db.getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  if (customer.segment === 'D' || customer.segment === 'E') {
    return NextResponse.json({
      error: 'This customer does not have a pickup page',
      segment: customer.segment,
    }, { status: 403 });
  }

  const orders = db.getOrdersByCustomer(customer.id);
  const allItems = db.getLineItemsByCustomer(customer.id);
  const pickup_items = allItems.filter(i => i.item_type === 'pickup');
  const ship_items = allItems.filter(i => i.item_type === 'ship');
  const booking = db.getBookingByCustomer(customer.id) || null;
  let time_slots = db.getAllTimeSlots();

  // Sync slot counts from Supabase (source of truth) to prevent stale availability
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

  const label = getLabelByToken(token);

  return NextResponse.json({
    customer,
    orders,
    pickup_items,
    ship_items,
    booking,
    time_slots,
    label,
  });
}
