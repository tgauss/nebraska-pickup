import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// GET /api/pickup/[token] — fetch customer data + available slots
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const customer = db.getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  if (customer.segment === 'D' || customer.segment === 'E') {
    return NextResponse.json({
      error: 'This customer does not have a pickup page',
      segment: customer.segment,
    }, { status: 403 });
  }

  const orders = db.getOrdersByCustomer(customer.id);
  const allItems = db.getLineItemsByCustomer(customer.id);
  const pickup_items = allItems.filter(i => i.item_type === 'pickup');
  const ship_items = allItems.filter(i => i.item_type === 'ship');
  const booking = db.getBookingByCustomer(customer.id) || null;
  const time_slots = db.getAllTimeSlots();

  return NextResponse.json({
    customer,
    orders,
    pickup_items,
    ship_items,
    booking,
    time_slots,
  });
}
