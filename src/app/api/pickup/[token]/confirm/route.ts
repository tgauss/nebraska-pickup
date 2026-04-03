import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { flushWrites, ensureHydrated } from '@/lib/local-data';
import { createAdminClient } from '@/lib/supabase';
import { sendConfirmationEmail } from '@/lib/email';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
import { getLabelByToken } from '@/lib/labels';

export const dynamic = 'force-dynamic';

interface ConfirmBody {
  time_slot_id: string;
  ship_item_preferences?: Array<{ line_item_id: string; preference: 'ship' | 'pickup' }>;
  convert_to_pickup?: boolean;
}

/**
 * Atomically check and reserve a slot in Supabase.
 * Returns the Supabase slot ID if successful, null if full or not found.
 * Uses the DB-level increment_booking_count function which checks capacity
 * in a single transaction — no race conditions across serverless instances.
 */
async function reserveSlotInSupabase(inMemorySlotId: string): Promise<{ sbSlotId: string } | null> {
  const sb = createAdminClient();
  if (!sb) return null; // Supabase not configured, fall back to in-memory

  // Map in-memory slot to Supabase slot by day+time
  const slot = db.getTimeSlotById(inMemorySlotId);
  if (!slot) return null;

  const { data: sbSlot } = await sb
    .from('time_slots')
    .select('id, current_bookings, capacity')
    .eq('day', slot.day)
    .eq('time', slot.time)
    .single();

  if (!sbSlot) return null;

  // Check capacity in Supabase (source of truth)
  if (sbSlot.current_bookings >= sbSlot.capacity) {
    return null;
  }

  // Atomic increment — this will throw if the slot filled between our check and now
  const { error } = await sb.rpc('increment_booking_count', { slot_id: sbSlot.id });
  if (error) {
    // Slot is full (the PL/pgSQL function raises an exception)
    return null;
  }

  return { sbSlotId: sbSlot.id };
}

/**
 * Check if customer already has a booking in Supabase (prevents double-booking
 * across serverless instances).
 */
async function getSupabaseBooking(customerToken: string): Promise<{
  exists: boolean;
  sbCustomerId?: string;
  sbBookingId?: string;
  rescheduleCount?: number;
  sbSlotId?: string;
} | null> {
  const sb = createAdminClient();
  if (!sb) return null;

  const { data: sbCust } = await sb
    .from('customers')
    .select('id')
    .eq('token', customerToken)
    .single();

  if (!sbCust) return null;

  const { data: sbBooking } = await sb
    .from('bookings')
    .select('id, reschedule_count, time_slot_id')
    .eq('customer_id', sbCust.id)
    .single();

  return {
    exists: !!sbBooking,
    sbCustomerId: sbCust.id,
    sbBookingId: sbBooking?.id,
    rescheduleCount: sbBooking?.reschedule_count,
    sbSlotId: sbBooking?.time_slot_id,
  };
}

/**
 * Delete existing booking and decrement slot in Supabase (for reschedule).
 */
async function deleteSupabaseBooking(sbCustomerId: string, sbSlotId: string): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;

  await sb.from('bookings').delete().eq('customer_id', sbCustomerId);
  await sb.rpc('decrement_booking_count', { slot_id: sbSlotId });
}

/**
 * Create booking directly in Supabase.
 */
async function createSupabaseBooking(
  sbCustomerId: string,
  sbSlotId: string,
  rescheduleCount: number
): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;

  await sb.from('bookings').insert({
    customer_id: sbCustomerId,
    time_slot_id: sbSlotId,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    reschedule_count: rescheduleCount,
  });
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

  // Seg C decline
  if (customer.segment === 'C' && body.convert_to_pickup === false) {
    db.updateLineItemsStatus(customer.id, { item_type: 'ship' as const }, 'ship_queued');
    db.addActivityLog(customer.id, 'seg_c_declined', { message: 'Customer declined pickup' });
    await flushWrites();
    return NextResponse.json({ success: true, action: 'declined_pickup' });
  }

  // Verify slot exists in memory
  const slot = db.getTimeSlotById(body.time_slot_id);
  if (!slot) {
    return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
  }

  // Check for existing booking — use Supabase as source of truth
  const sbBookingInfo = await getSupabaseBooking(token);
  const existingBooking = db.getBookingByCustomer(customer.id);

  // Determine if this is a reschedule
  const isReschedule = !!(sbBookingInfo?.exists || existingBooking);
  const currentRescheduleCount = sbBookingInfo?.rescheduleCount ?? existingBooking?.reschedule_count ?? 0;

  if (isReschedule && currentRescheduleCount >= 2) {
    return NextResponse.json({
      error: 'Maximum reschedules reached. Please email the team to change your slot.',
    }, { status: 400 });
  }

  // Handle reschedule: remove old booking
  if (isReschedule) {
    if (sbBookingInfo?.exists && sbBookingInfo.sbCustomerId && sbBookingInfo.sbSlotId) {
      await deleteSupabaseBooking(sbBookingInfo.sbCustomerId, sbBookingInfo.sbSlotId);
    }
    if (existingBooking) {
      db.decrementSlotBooking(existingBooking.time_slot_id);
      db.deleteBooking(existingBooking.id);
    }
  }

  // ATOMIC SLOT RESERVATION — Supabase is the source of truth
  const reservation = await reserveSlotInSupabase(body.time_slot_id);

  if (reservation === null) {
    // Check if it's because Supabase isn't configured (fall back to in-memory)
    const sb = createAdminClient();
    if (sb) {
      // Supabase said slot is full
      return NextResponse.json({ error: 'This time slot is full. Please choose another.' }, { status: 409 });
    }
    // Supabase not configured — use in-memory check
    if (slot.current_bookings >= slot.capacity) {
      return NextResponse.json({ error: 'This time slot is full. Please choose another.' }, { status: 409 });
    }
    if (!db.incrementSlotBooking(body.time_slot_id)) {
      return NextResponse.json({ error: 'Slot is full' }, { status: 409 });
    }
  } else {
    // Supabase reservation succeeded — sync in-memory
    db.incrementSlotBooking(body.time_slot_id);
  }

  // Create booking in memory
  const booking = db.createBooking(
    customer.id,
    body.time_slot_id,
    isReschedule ? currentRescheduleCount + 1 : 0
  );

  // Create booking in Supabase directly (don't rely on write-through for this critical path)
  if (reservation && sbBookingInfo?.sbCustomerId) {
    await createSupabaseBooking(
      sbBookingInfo.sbCustomerId,
      reservation.sbSlotId,
      isReschedule ? currentRescheduleCount + 1 : 0
    );
  }

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
    const items = db.getLineItemsByCustomer(customer.id);
    for (const item of items) {
      if (item.item_type === 'ship') {
        db.updateLineItemPreference(item.id, 'pickup', 'confirmed');
      }
    }
  }

  db.addActivityLog(customer.id, isReschedule ? 'rescheduled' : 'booking_confirmed', {
    time_slot_id: body.time_slot_id,
    day: slot.day,
    time: slot.time,
  });

  await flushWrites();

  // Send confirmation email with receipt
  if (customer.email) {
    const items = db.getLineItemsByCustomer(customer.id);
    const pickupItems = items
      .filter(i => i.fulfillment_preference === 'pickup')
      .map(i => {
        const p = getProductInfo(i.item_name);
        return { name: p?.shortName || i.item_name, qty: i.qty };
      });
    // Consolidate dupes
    const consolidated: Array<{ name: string; qty: number }> = [];
    for (const item of pickupItems) {
      const existing = consolidated.find(c => c.name === item.name);
      if (existing) existing.qty += item.qty;
      else consolidated.push({ ...item });
    }

    const label = getLabelByToken(token);
    const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

    sendConfirmationEmail({
      name: customer.name,
      email: customer.email,
      token: customer.token,
      pickupItems: consolidated,
      vehicleRec,
      day: slot.day,
      time: slot.time,
      label: label?.label || '',
      pickupPageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://huskerpickup.raregoods.com'}/pickup/${token}`,
      isReschedule,
    }).catch(err => console.error('Confirmation email error:', err));
  }

  return NextResponse.json({
    success: true,
    booking,
    action: isReschedule ? 'rescheduled' : 'confirmed',
  });
}
