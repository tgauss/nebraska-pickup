import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { generateICS, getSlotDate, getSlotEndDate, ROCA_ADDRESS, ROCA_MAPS_URL, ROCA_GEO } from '@/lib/ics';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/pickup/[token]/calendar — download ICS file
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await ensureHydrated();

  const customer = db.getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const booking = db.getBookingByCustomer(customer.id);
  if (!booking || !booking.time_slots) {
    return NextResponse.json({ error: 'No booking found' }, { status: 404 });
  }

  const slot = booking.time_slots;
  const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);
  const orders = db.getOrdersByCustomer(customer.id);
  const orderNums = orders.map(o => o.shopify_order_number).join(', ');

  const items = db.getLineItemsByCustomer(customer.id).filter(i => i.fulfillment_preference === 'pickup');
  const itemList = items.map(i => `  - ${i.qty}x ${i.item_name}`).join('\n');

  const description = [
    `DEVANEY PICKUP - ${slot.day}, ${slot.time}`,
    '',
    `Order: ${orderNums}`,
    `Customer: ${customer.name}`,
    '',
    'ITEMS TO PICK UP:',
    itemList,
    '',
    `VEHICLE: ${vehicleRec}`,
    '',
    `LOCATION:`,
    ROCA_ADDRESS,
    '',
    `DIRECTIONS: ${ROCA_MAPS_URL}`,
    '',
    `Your personalized page: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2005'}/pickup/${token}`,
    '',
    'Questions? Reply to your confirmation email.',
  ].join('\n');

  const ics = generateICS({
    title: `Devaney Pickup — ${orderNums}`,
    description,
    location: ROCA_ADDRESS,
    startDate: getSlotDate(slot.day, slot.time),
    endDate: getSlotEndDate(slot.day, slot.time),
    url: ROCA_MAPS_URL,
    geo: ROCA_GEO,
    uid: booking.id,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="devaney-pickup-${token}.ics"`,
    },
  });
}
