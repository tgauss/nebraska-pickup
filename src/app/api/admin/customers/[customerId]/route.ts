import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { getCustomerLabel } from '@/lib/labels';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/customers/[customerId] — full customer detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  await ensureHydrated();

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const orders = db.getOrdersByCustomer(customerId);
  const items = db.getLineItemsByCustomer(customerId);
  let booking = db.getBookingByCustomer(customerId);
  const label = getCustomerLabel(customerId);
  // If no in-memory booking, check Supabase directly (handles hydration race / cold start)
  if (!booking) {
    const sb = createAdminClient();
    if (sb) {
      // Look up this customer's Supabase ID by token, then find their booking
      const { data: sbCust } = await sb.from('customers')
        .select('id')
        .eq('token', customer.token)
        .single();
      if (sbCust) {
        const { data: sbBooking } = await sb.from('bookings')
          .select('status, confirmed_at, checked_in_at, completed_at, reschedule_count, time_slots(day, time)')
          .eq('customer_id', sbCust.id)
          .single();
        if (sbBooking) {
          const slotInfo = sbBooking.time_slots as unknown as { day: string; time: string } | null;
          const slot = slotInfo ? db.getAllTimeSlots().find(s => s.day === slotInfo.day && s.time === slotInfo.time) : null;
          if (slot) {
            booking = {
              id: `sb-${customerId}`,
              customer_id: customerId,
              time_slot_id: slot.id,
              status: sbBooking.status,
              confirmed_at: sbBooking.confirmed_at,
              checked_in_at: sbBooking.checked_in_at,
              completed_at: sbBooking.completed_at,
              reschedule_count: sbBooking.reschedule_count,
              created_at: sbBooking.confirmed_at,
              time_slots: slot,
            };
          }
        }
      }
    }
  }

  return NextResponse.json({
    customer,
    orders,
    line_items: items,
    booking,
    label,
  });
}
