import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import { sendPickupEmail } from '@/lib/email';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow up to 60s for batch sends

/**
 * GET /api/cron/send-reminders
 *
 * Scheduled via Vercel Cron: 9am CT on April 7, 9, 11
 * Sends urgent reminder to pickup-required customers who haven't booked.
 * Skips customers who are excluded, cancelled, or already booked.
 */
export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (not a random visitor)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow if no CRON_SECRET is set (for testing)
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  await ensureHydrated();

  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const bookedIds = new Set(allBookings.map(b => b.customer_id));

  // Find pickup-required customers who haven't booked
  const needsReminder = customers.filter(c => {
    if (!c.email) return false;
    if (bookedIds.has(c.id)) return false;

    // Check for exclusions
    const logs = db.getActivityLogByCustomer(c.id);
    if (logs.some(l => l.action === 'exclude_from_main_outreach')) return false;
    if (logs.some(l => l.action === 'order_cancelled_refund')) return false;

    // Must have pickup items
    const items = db.getLineItemsByCustomer(c.id);
    return items.some(i => i.item_type === 'pickup');
  });

  console.log(`[cron] Found ${needsReminder.length} not-booked pickup customers to remind`);

  let sent = 0;
  let failed = 0;

  for (const customer of needsReminder) {
    const items = db.getLineItemsByCustomer(customer.id);
    const pickupItems = items
      .filter(i => i.item_type === 'pickup')
      .map(i => {
        const p = getProductInfo(i.item_name);
        return { name: p?.shortName || i.item_name, qty: i.qty };
      });

    // Consolidate dupes
    const consolidated: typeof pickupItems = [];
    for (const item of pickupItems) {
      const existing = consolidated.find(c => c.name === item.name);
      if (existing) existing.qty += item.qty;
      else consolidated.push({ ...item });
    }

    const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

    const result = await sendPickupEmail({
      name: customer.name,
      email: customer.email,
      token: customer.token,
      pickupItems: consolidated,
      vehicleRec,
    }, 'urgent_reminder');

    if (result.success) {
      sent++;
      db.addActivityLog(customer.id, 'email_sent', {
        type: 'cron_urgent_reminder',
        success: true,
        messageId: result.messageId,
      });
    } else {
      failed++;
      console.error(`[cron] Failed to send to ${customer.email}:`, result.error);
    }
  }

  await flushWrites();

  console.log(`[cron] Done: ${sent} sent, ${failed} failed`);

  return NextResponse.json({
    success: true,
    date: new Date().toISOString(),
    found: needsReminder.length,
    sent,
    failed,
  });
}
