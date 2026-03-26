import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { flushWrites, ensureHydrated } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// POST /api/admin/walkin — handle walk-in customer (no prior booking)
export async function POST(request: Request) {
  await ensureHydrated();
  const { customer_id, time_slot_id } = await request.json();

  if (!customer_id || !time_slot_id) {
    return NextResponse.json({ error: 'customer_id and time_slot_id required' }, { status: 400 });
  }

  const existingBooking = db.getBookingByCustomer(customer_id);

  if (existingBooking) {
    const updated = db.updateBookingStatus(customer_id, 'checked_in', {
      checked_in_at: new Date().toISOString(),
    });
    await flushWrites();
    return NextResponse.json({ success: true, booking: updated, action: 'checked_in_existing' });
  }

  if (!db.incrementSlotBooking(time_slot_id)) {
    return NextResponse.json({ error: 'Slot is full' }, { status: 409 });
  }

  const booking = db.createBooking(customer_id, time_slot_id);
  db.updateBookingStatus(customer_id, 'checked_in', {
    checked_in_at: new Date().toISOString(),
  });
  db.updateLineItemsStatus(customer_id, { fulfillment_preference: 'pickup' as const }, 'staged');
  db.addActivityLog(customer_id, 'walk_in_checkin', { time_slot_id, booking_id: booking.id });

  await flushWrites();
  return NextResponse.json({ success: true, booking, action: 'walk_in' });
}
