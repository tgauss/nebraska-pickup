import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import { sendCalendarInvite } from '@/lib/email';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
import { getCustomerLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

// GET — list all booked customers eligible for calendar invites
export async function GET() {
  await ensureHydrated();
  const allBookings = db.getAllBookings();

  const customers = allBookings
    .filter(b => b.time_slots && b.status === 'confirmed')
    .map(b => {
      const customer = db.getCustomerById(b.customer_id);
      if (!customer || !customer.email) return null;
      const logs = db.getActivityLogByCustomer(customer.id);
      const alreadySent = logs.some(l => l.action === 'calendar_invite_sent');

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        segment: customer.segment,
        day: b.time_slots!.day,
        time: b.time_slots!.time,
        alreadySent,
        bookingId: b.id,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const dayOrder: Record<string, number> = { Thursday: 0, Friday: 1, Saturday: 2, May2: 3 };
      const da = dayOrder[a!.day] ?? 99;
      const db2 = dayOrder[b!.day] ?? 99;
      if (da !== db2) return da - db2;
      return (a!.time || '').localeCompare(b!.time || '');
    });

  const total = customers.length;
  const sent = customers.filter(c => c!.alreadySent).length;

  return NextResponse.json({ total, sent, unsent: total - sent, customers });
}

// POST — send calendar invites
export async function POST(request: Request) {
  await ensureHydrated();
  const { customerIds, testEmail } = await request.json();

  if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
    return NextResponse.json({ error: 'No customer IDs provided' }, { status: 400 });
  }

  const results: Array<{ name: string; email: string; success: boolean; messageId?: string; error?: string }> = [];

  for (const id of customerIds) {
    const customer = db.getCustomerById(id);
    if (!customer) {
      results.push({ name: id, email: '', success: false, error: 'Customer not found' });
      continue;
    }

    const booking = db.getBookingByCustomer(customer.id);
    if (!booking || !booking.time_slots) {
      results.push({ name: customer.name, email: customer.email, success: false, error: 'No booking found' });
      continue;
    }

    const items = db.getLineItemsByCustomer(customer.id);
    const pickupItems = items
      .filter(i => i.item_type === 'pickup' || i.fulfillment_preference === 'pickup')
      .map(i => {
        const product = getProductInfo(i.item_name);
        return { name: product?.shortName || i.item_name, qty: i.qty };
      });

    const label = getCustomerLabel(customer.id);
    const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

    const result = await sendCalendarInvite({
      name: customer.name,
      email: testEmail || customer.email,
      token: customer.token,
      day: booking.time_slots.day,
      time: booking.time_slots.time,
      pickupItems,
      vehicleRec,
      label: label?.label,
      bookingId: booking.id,
    });

    results.push({ name: customer.name, email: testEmail || customer.email, ...result });

    // Log it (only if sending to real customer, not test)
    if (!testEmail && result.success) {
      db.addActivityLog(customer.id, 'calendar_invite_sent', {
        messageId: result.messageId,
        day: booking.time_slots.day,
        time: booking.time_slots.time,
        timestamp: new Date().toISOString(),
      });
    }
  }

  await flushWrites();
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return NextResponse.json({ sent, failed, results });
}
