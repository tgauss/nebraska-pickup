import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { getAllLabels, getStagingZones } from '@/lib/labels';
import { getProductInfo } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureHydrated();

  const labels = getAllLabels();
  const zones = getStagingZones();

  const labelData = labels.map(l => {
    const customer = db.getCustomerById(l.customerId);
    if (!customer) return null;

    const items = db.getLineItemsByCustomer(customer.id);
    const pickupItems = items
      .filter(i => i.item_type === 'pickup' || i.fulfillment_preference === 'pickup')
      .map(i => {
        const product = getProductInfo(i.item_name);
        return {
          name: product?.shortName || i.item_name,
          qty: i.qty,
          weight: product?.weight || '',
          handling: product?.handling || '',
        };
      });

    const orders = db.getOrdersByCustomer(customer.id);
    const booking = db.getBookingByCustomer(customer.id);

    return {
      label: l.label,
      prefix: l.prefix,
      number: l.number,
      stagingZone: l.stagingZone,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      segment: customer.segment,
      size: customer.size,
      orders: orders.map(o => o.shopify_order_number),
      pickupItems,
      totalQty: pickupItems.reduce((s, i) => s + i.qty, 0),
      bookingDay: booking?.time_slots?.day || null,
      bookingTime: booking?.time_slots?.time || null,
      hasBooked: !!booking,
    };
  }).filter(Boolean);

  return NextResponse.json({ labels: labelData, zones });
}
