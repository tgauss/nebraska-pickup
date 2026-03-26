import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { sendPickupEmail, generatePickupEmail, getEmailStats } from '@/lib/email';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';

export const dynamic = 'force-dynamic';

// GET /api/admin/email — get eligible recipients + stats
export async function GET() {
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const bookedIds = new Set(allBookings.map(b => b.customer_id));

  // Only customers with pickup items (Seg A, B, or C with pickup items)
  const eligible = customers
    .filter(c => {
      if (!c.email) return false;
      // Must have pickup items or be offered pickup conversion
      const items = db.getLineItemsByCustomer(c.id);
      const hasPickup = items.some(i => i.item_type === 'pickup');
      return hasPickup || c.offer_pickup_conversion;
    })
    .map(c => {
      const items = db.getLineItemsByCustomer(c.id);
      const pickupItems = items.filter(i => i.item_type === 'pickup');
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        token: c.token,
        segment: c.segment,
        hasBooked: bookedIds.has(c.id),
        pickupItemCount: pickupItems.reduce((s, i) => s + i.qty, 0),
        pickupItemNames: [...new Set(pickupItems.map(i => {
          const p = getProductInfo(i.item_name);
          return p?.shortName || i.item_name;
        }))],
      };
    });

  const notBooked = eligible.filter(c => !c.hasBooked);
  const booked = eligible.filter(c => c.hasBooked);

  // Try to get Postmark stats
  let stats = null;
  try {
    stats = await getEmailStats();
  } catch { /* postmark not configured */ }

  return NextResponse.json({
    eligible: eligible.length,
    not_booked: notBooked.length,
    booked: booked.length,
    recipients: notBooked, // Default: only send to those who haven't booked
    all_recipients: eligible,
    stats,
  });
}

// POST /api/admin/email — send emails
export async function POST(request: Request) {
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
      email: testEmail, // Override to test address
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

      // Log the send
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
