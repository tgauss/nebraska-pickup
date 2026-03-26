import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { getCustomerLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

// GET /api/admin/customers/[customerId] — full customer detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const orders = db.getOrdersByCustomer(customerId);
  const items = db.getLineItemsByCustomer(customerId);
  const booking = db.getBookingByCustomer(customerId);
  const label = getCustomerLabel(customerId);

  return NextResponse.json({
    customer,
    orders,
    line_items: items,
    booking,
    label,
  });
}
