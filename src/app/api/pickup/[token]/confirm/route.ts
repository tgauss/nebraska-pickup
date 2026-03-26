import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { flushWrites, ensureHydrated } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

interface ConfirmBody {
  time_slot_id: string;
  ship_item_preferences?: Array<{ line_item_id: string; preference: 'ship' | 'pickup' }>;
  convert_to_pickup?: boolean;
}

// POST /api/pickup/[token]/confirm — confirm slot selection + fulfillment preferences
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await ensureHydrated();
  const body: ConfirmBody = await request.json();

  const customer = db.getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const existingBooking = db.getBookingByCustomer(customer.id);

  // Handle reschedule
  if (existingBooking) {
    if (existingBooking.reschedule_count >= 1) {
      return NextResponse.json({
        error: 'Maximum reschedules reached. Please email the team to change your slot.',
      }, { status: 400 });
    }
    db.decrementSlotBooking(existingBooking.time_slot_id);
    db.deleteBooking(existingBooking.id);
  }

  // Seg C decline
  if (customer.segment === 'C' && body.convert_to_pickup === false) {
    db.updateLineItemsStatus(customer.id, { item_type: 'ship' as const }, 'ship_queued');
    db.addActivityLog(customer.id, 'seg_c_declined', { message: 'Customer declined pickup' });
    await flushWrites();
    return NextResponse.json({ success: true, action: 'declined_pickup' });
  }

  // Verify slot
  const slot = db.getTimeSlotById(body.time_slot_id);
  if (!slot) {
    return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
  }

  if (slot.current_bookings >= slot.capacity) {
    return NextResponse.json({ error: 'This time slot is full. Please choose another.' }, { status: 409 });
  }

  // Increment
  if (!db.incrementSlotBooking(body.time_slot_id)) {
    return NextResponse.json({ error: 'Slot is full' }, { status: 409 });
  }

  // Create booking
  const booking = db.createBooking(
    customer.id,
    body.time_slot_id,
    existingBooking ? existingBooking.reschedule_count + 1 : 0
  );

  // Update ship item preferences (Seg B)
  if (body.ship_item_preferences) {
    for (const pref of body.ship_item_preferences) {
      db.updateLineItemPreference(
        pref.line_item_id,
        pref.preference,
        pref.preference === 'pickup' ? 'confirmed' : 'ship_queued'
      );
    }
  }

  // Update pickup items to confirmed
  db.updateLineItemsStatus(customer.id, { item_type: 'pickup' as const }, 'confirmed');

  // Seg C converts
  if (customer.segment === 'C' && body.convert_to_pickup === true) {
    db.updateLineItemsStatus(customer.id, { item_type: 'ship' as const }, 'confirmed');
    // Also update preference
    const items = db.getLineItemsByCustomer(customer.id);
    for (const item of items) {
      if (item.item_type === 'ship') {
        db.updateLineItemPreference(item.id, 'pickup', 'confirmed');
      }
    }
  }

  db.addActivityLog(customer.id, existingBooking ? 'rescheduled' : 'booking_confirmed', {
    time_slot_id: body.time_slot_id,
    day: slot.day,
    time: slot.time,
  });

  await flushWrites();

  return NextResponse.json({
    success: true,
    booking,
    action: existingBooking ? 'rescheduled' : 'confirmed',
  });
}
