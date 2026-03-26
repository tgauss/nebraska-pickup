import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { sendPickupEmail, generatePickupEmail } from '@/lib/email';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
import { recordEvent, getStatusByEmail, getEventSummary } from '@/lib/email-tracking';

export const dynamic = 'force-dynamic';

// GET /api/admin/email — get eligible recipients + stats + engagement
export async function GET() {
  await ensureHydrated();
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const bookedIds = new Set(allBookings.map(b => b.customer_id));

  // Build full recipient list with engagement data
  const allRecipients = customers
    .filter(c => {
      if (!c.email) return false;
      const items = db.getLineItemsByCustomer(c.id);
      const hasPickup = items.some(i => i.item_type === 'pickup');
      return hasPickup || c.offer_pickup_conversion;
    })
    .map(c => {
      const items = db.getLineItemsByCustomer(c.id);
      const pickupItems = items.filter(i => i.item_type === 'pickup');
      const pickupRequired = pickupItems.reduce((s, i) => s + i.qty, 0);
      const shipItems = items.filter(i => i.item_type === 'ship');
      const emailStatus = getStatusByEmail(c.email);

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        token: c.token,
        segment: c.segment,
        hasBooked: bookedIds.has(c.id),
        pickupItemCount: pickupRequired,
        pickupRequired: pickupRequired > 0,
        shipItemCount: shipItems.reduce((s, i) => s + i.qty, 0),
        pickupItemNames: [...new Set(pickupItems.map(i => {
          const p = getProductInfo(i.item_name);
          return p?.shortName || i.item_name;
        }))],
        emailSent: emailStatus.sent,
        emailOpened: emailStatus.opened,
        emailClicked: emailStatus.clicked,
        emailBounced: emailStatus.bounced,
        sentAt: emailStatus.sentAt,
        openedAt: emailStatus.openedAt,
        clickedAt: emailStatus.clickedAt,
      };
    });

  const pickupRequired = allRecipients.filter(r => r.pickupRequired);
  const pickupOptional = allRecipients.filter(r => !r.pickupRequired);

  const engagement = getEventSummary();

  return NextResponse.json({
    total: allRecipients.length,
    pickup_required_count: pickupRequired.length,
    pickup_optional_count: pickupOptional.length,
    booked_count: allRecipients.filter(r => r.hasBooked).length,
    not_booked_count: allRecipients.filter(r => !r.hasBooked).length,
    all_recipients: allRecipients,
    engagement,
  });
}

// POST /api/admin/email — send emails
export async function POST(request: Request) {
  await ensureHydrated();
  const body = await request.json();
  const { action, customerIds, testEmail } = body;

  // Preview: return HTML for a specific customer
  if (action === 'preview') {
    const customerId = customerIds?.[0];
    if (!customerId) {
      return NextResponse.json({ error: 'No customer ID' }, { status: 400 });
    }
    const customer = db.getCustomerById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const items = db.getLineItemsByCustomer(customer.id);
    const pickupItems = items
      .filter(i => i.item_type === 'pickup')
      .map(i => {
        const p = getProductInfo(i.item_name);
        return { name: p?.shortName || i.item_name, qty: i.qty };
      });
    const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

    const html = generatePickupEmail({
      name: customer.name,
      email: customer.email,
      token: customer.token,
      pickupItems,
      vehicleRec,
    });

    return NextResponse.json({ html, to: customer.email, name: customer.name });
  }

  // Test send: send to a test email address
  if (action === 'test') {
    if (!testEmail) {
      return NextResponse.json({ error: 'No test email' }, { status: 400 });
    }
    const customerId = customerIds?.[0];
    const customer = customerId ? db.getCustomerById(customerId) : db.getAllCustomers().find(c => c.email);
    if (!customer) {
      return NextResponse.json({ error: 'No customer to preview' }, { status: 404 });
    }
    const items = db.getLineItemsByCustomer(customer.id);
    const pickupItems = items
      .filter(i => i.item_type === 'pickup')
      .map(i => {
        const p = getProductInfo(i.item_name);
        return { name: p?.shortName || i.item_name, qty: i.qty };
      });
    const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

    const result = await sendPickupEmail({
      name: customer.name,
      email: testEmail,
      token: customer.token,
      pickupItems,
      vehicleRec,
    });

    return NextResponse.json(result);
  }

  // Send: batch send to selected customers
  if (action === 'send') {
    const ids: string[] = customerIds || [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No customers selected' }, { status: 400 });
    }

    const results: Array<{ name: string; email: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const id of ids) {
      const customer = db.getCustomerById(id);
      if (!customer || !customer.email) {
        results.push({ name: id, email: '', success: false, error: 'Customer not found or no email' });
        continue;
      }

      const items = db.getLineItemsByCustomer(customer.id);
      const pickupItems = items
        .filter(i => i.item_type === 'pickup')
        .map(i => {
          const p = getProductInfo(i.item_name);
          return { name: p?.shortName || i.item_name, qty: i.qty };
        });
      const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

      const result = await sendPickupEmail({
        name: customer.name,
        email: customer.email,
        token: customer.token,
        pickupItems,
        vehicleRec,
      });

      results.push({
        name: customer.name,
        email: customer.email,
        ...result,
      });

      // Track the send
      recordEvent({
        customerId: customer.id,
        email: customer.email.toLowerCase(),
        token: customer.token,
        event: 'sent',
        timestamp: new Date().toISOString(),
      });

      db.addActivityLog(customer.id, 'email_sent', {
        type: 'pickup_scheduling',
        success: result.success,
        messageId: result.messageId,
      });
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ sent, failed, results });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
