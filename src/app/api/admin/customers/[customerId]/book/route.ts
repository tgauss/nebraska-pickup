import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import { createAdminClient } from '@/lib/supabase';
import { sendConfirmationEmail } from '@/lib/email';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
import { getLabelByToken } from '@/lib/labels';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/customers/[customerId]/book
 * Admin-only endpoint to manually book or reschedule a customer.
 * Bypasses reschedule limits and capacity checks (admin override).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  await ensureHydrated();

  const { time_slot_id } = await request.json();
  if (!time_slot_id) {
    return NextResponse.json({ error: 'Missing time_slot_id' }, { status: 400 });
  }

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const slot = db.getTimeSlotById(time_slot_id);
  if (!slot) {
    return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
  }

  const sb = createAdminClient();

  // Check for existing booking
  const existingBooking = db.getBookingByCustomer(customerId);
  let sbCustomerId: string | null = null;
  let sbOldSlotId: string | null = null;

  if (sb) {
    const { data: sbCust } = await sb.from('customers')
      .select('id').eq('token', customer.token).single();
    if (sbCust) {
      sbCustomerId = sbCust.id;
      const { data: sbBooking } = await sb.from('bookings')
        .select('id, time_slot_id').eq('customer_id', sbCust.id).single();
      if (sbBooking) {
        sbOldSlotId = sbBooking.time_slot_id;
        // Delete old booking
        await sb.from('bookings').delete().eq('customer_id', sbCust.id);
        await sb.rpc('decrement_booking_count', { slot_id: sbBooking.time_slot_id });
      }
    }
  }

  // Remove old in-memory booking
  if (existingBooking) {
    db.decrementSlotBooking(existingBooking.time_slot_id);
    db.deleteBooking(existingBooking.id);
  }

  const isReschedule = !!(existingBooking || sbOldSlotId);

  // Reserve new slot in Supabase (admin override — increase capacity if needed)
  let sbNewSlotId: string | null = null;
  if (sb) {
    const { data: sbSlot } = await sb.from('time_slots')
      .select('id, current_bookings, capacity')
      .eq('day', slot.day).eq('time', slot.time).single();

    if (sbSlot) {
      sbNewSlotId = sbSlot.id;
      // Admin override: increment even if at capacity
      if (sbSlot.current_bookings >= sbSlot.capacity) {
        // Force increment by updating directly
        await sb.from('time_slots').update({
          current_bookings: sbSlot.current_bookings + 1,
        }).eq('id', sbSlot.id);
      } else {
        await sb.rpc('increment_booking_count', { slot_id: sbSlot.id });
      }
    }
  }

  // Create in-memory booking
  db.incrementSlotBooking(time_slot_id);
  const booking = db.createBooking(customerId, time_slot_id, 0);

  // Create Supabase booking
  if (sb && sbCustomerId && sbNewSlotId) {
    await sb.from('bookings').insert({
      customer_id: sbCustomerId,
      time_slot_id: sbNewSlotId,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      reschedule_count: 0,
    });
  }

  // Update line items to confirmed
  db.updateLineItemsStatus(customerId, { item_type: 'pickup' as const }, 'confirmed');

  db.addActivityLog(customerId, isReschedule ? 'admin_rescheduled' : 'admin_booked', {
    time_slot_id,
    day: slot.day,
    time: slot.time,
    admin_override: true,
  });

  await flushWrites();

  // Send confirmation/reschedule email
  if (customer.email) {
    const items = db.getLineItemsByCustomer(customerId);
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

    const label = getLabelByToken(customer.token);
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
      pickupPageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://huskerpickup.raregoods.com'}/pickup/${customer.token}`,
      isReschedule,
    }).catch(err => console.error('Admin booking email error:', err));
  }

  return NextResponse.json({
    success: true,
    action: isReschedule ? 'rescheduled' : 'booked',
    booking,
    day: slot.day,
    time: slot.time,
    emailSent: !!customer.email,
  });
}
