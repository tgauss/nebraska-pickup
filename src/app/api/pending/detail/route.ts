import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { getProductInfo } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  await ensureHydrated();

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const customer = db.getCustomerById(id);
  if (!customer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const items = db.getLineItemsByCustomer(customer.id);
  const orders = db.getOrdersByCustomer(customer.id);
  const logs = db.getActivityLogByCustomer(customer.id);

  const pickupItems = items.filter(i => i.item_type === 'pickup' || i.fulfillment_preference === 'pickup');
  const shipItems = items.filter(i => i.fulfillment_preference === 'ship' && i.item_type === 'ship');

  let orderValue = 0;
  for (const item of items) {
    const product = getProductInfo(item.item_name);
    if (product) orderValue += product.price * item.qty;
  }

  const altContacts = logs
    .filter(l => l.action === 'alt_contact_added')
    .map(l => ({
      type: l.details.type as string,
      value: l.details.value as string,
      source: (l.details.source as string) || '',
      added_at: l.created_at,
    }));

  const outreach = logs
    .filter(l => ['sms_sent', 'phone_called', 'outreach_note', 'note_added', 'email_sent', 'email_opened', 'email_clicked', 'alt_contact_added'].includes(l.action))
    .map(l => ({
      action: l.action,
      details: l.details,
      created_at: l.created_at,
    }));

  return NextResponse.json({
    id: customer.id,
    token: customer.token,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    state: customer.state,
    segment: customer.segment,
    drive_minutes: customer.drive_minutes,
    size: customer.size,
    shipping_paid: customer.shipping_paid,
    offer_pickup_conversion: customer.offer_pickup_conversion,
    orderValue,
    orders: orders.map(o => o.shopify_order_number),
    pickupItems: pickupItems.map(i => {
      const product = getProductInfo(i.item_name);
      return { name: product?.shortName || i.item_name, qty: i.qty, price: product?.price || 0 };
    }),
    shipItems: shipItems.map(i => {
      const product = getProductInfo(i.item_name);
      return { name: product?.shortName || i.item_name, qty: i.qty };
    }),
    pickupLink: `https://huskerpickup.raregoods.com/pickup/${customer.token}`,
    altContacts,
    outreach,
  });
}
