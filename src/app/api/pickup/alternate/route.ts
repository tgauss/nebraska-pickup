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

// POST /api/pickup/alternate — handle alternate day operations
export async function POST(request: Request) {
  await ensureHydrated();
  const body = await request.json();
  const { action } = body;

  // IDENTIFY: look up customer by email
  if (action === 'identify') {
    const { email } = body;
    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });

    const customers = db.getAllCustomers();
    const customer = customers.find(c => c.email.toLowerCase() === email.trim().toLowerCase());
    if (!customer) return NextResponse.json({ found: false });

    const items = db.getLineItemsByCustomer(customer.id);
    const pickupItems = items.filter(i => i.item_type === 'pickup');
    const booking = db.getBookingByCustomer(customer.id);

    // Consolidate items
    const consolidated: Array<{ name: string; qty: number }> = [];
    for (const i of pickupItems) {
      const p = getProductInfo(i.item_name);
      const name = p?.shortName || i.item_name;
      const existing = consolidated.find(c => c.name === name);
      if (existing) existing.qty += i.qty;
      else consolidated.push({ name, qty: i.qty });
    }

    return NextResponse.json({
      found: true,
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      token: customer.token,
      items: consolidated,
      vehicleRec: getVehicleRecommendation(customer.size as PickupSize),
      hasExistingBooking: !!booking,
      existingDay: booking?.time_slots?.day || null,
      existingTime: booking?.time_slots?.time || null,
    });
  }

  // GET_SLOTS: return May 2nd slots only
  if (action === 'get_slots') {
    const sb = createAdminClient();
    if (!sb) return NextResponse.json({ slots: [] });

    const { data: slots } = await sb.from('time_slots')
      .select('id, day, time, capacity, current_bookings')
      .eq('day', 'May2')
      .order('time');

    // Sort chronologically
    const sorted = (slots || []).sort((a, b) => {
      const toMin = (t: string) => {
        const m = t.match(/^(\d+):(\d+)(am|pm)$/i);
        if (!m) return 0;
        let h = parseInt(m[1]);
        if (m[3] === 'pm' && h !== 12) h += 12;
        if (m[3] === 'am' && h === 12) h = 0;
        return h * 60 + parseInt(m[2]);
      };
      return toMin(a.time) - toMin(b.time);
    });

    return NextResponse.json({
      slots: sorted.filter(s => s.current_bookings < s.capacity).map(s => ({
        id: s.id,
        time: s.time,
        available: s.capacity - s.current_bookings,
      })),
    });
  }

  // BOOK: book a May 2nd slot (cancel existing April booking if any)
  if (action === 'book') {
    const { customerId, slotId } = body;
    if (!customerId || !slotId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const customer = db.getCustomerById(customerId);
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const sb = createAdminClient();
    if (!sb) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    // Get Supabase customer ID
    const { data: sbCust } = await sb.from('customers').select('id').eq('token', customer.token).single();
    if (!sbCust) return NextResponse.json({ error: 'Customer not in database' }, { status: 404 });

    // Cancel existing April booking if any
    const { data: existingBooking } = await sb.from('bookings')
      .select('id, time_slot_id')
      .eq('customer_id', sbCust.id)
      .single();

    if (existingBooking) {
      await sb.from('bookings').delete().eq('id', existingBooking.id);
      await sb.rpc('decrement_booking_count', { slot_id: existingBooking.time_slot_id });

      // Also remove from in-memory
      const inMemBooking = db.getBookingByCustomer(customerId);
      if (inMemBooking) {
        db.decrementSlotBooking(inMemBooking.time_slot_id);
        db.deleteBooking(inMemBooking.id);
      }
    }

    // Book the May 2nd slot atomically
    const { error: incError } = await sb.rpc('increment_booking_count', { slot_id: slotId });
    if (incError) return NextResponse.json({ error: 'Slot is full' }, { status: 409 });

    // Get the slot details
    const { data: slotData } = await sb.from('time_slots')
      .select('day, time')
      .eq('id', slotId)
      .single();

    await sb.from('bookings').insert({
      customer_id: sbCust.id,
      time_slot_id: slotId,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      reschedule_count: 0,
    });

    // Log it
    db.addActivityLog(customerId, 'alternate_day_booked', {
      day: 'May2',
      time: slotData?.time,
      cancelledAprilBooking: !!existingBooking,
    });
    await flushWrites();

    // Send confirmation email
    if (customer.email) {
      const items = db.getLineItemsByCustomer(customer.id);
      const pickupItems = items.filter(i => i.fulfillment_preference === 'pickup');
      const consolidated: Array<{ name: string; qty: number }> = [];
      for (const i of pickupItems) {
        const p = getProductInfo(i.item_name);
        const name = p?.shortName || i.item_name;
        const existing = consolidated.find(c => c.name === name);
        if (existing) existing.qty += i.qty;
        else consolidated.push({ name, qty: i.qty });
      }
      const label = getLabelByToken(customer.token);

      sendConfirmationEmail({
        name: customer.name,
        email: customer.email,
        token: customer.token,
        pickupItems: consolidated,
        vehicleRec: getVehicleRecommendation(customer.size as PickupSize),
        day: 'May2',
        time: slotData?.time || '',
        label: label?.label || '',
        pickupPageUrl: `${(process.env.NEXT_PUBLIC_APP_URL || 'https://huskerpickup.raregoods.com').trim()}/pickup/${customer.token}`,
        isReschedule: !!existingBooking,
      }).catch(err => console.error('Alternate confirmation email error:', err));
    }

    return NextResponse.json({
      success: true,
      day: 'Saturday, May 2',
      time: slotData?.time,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
