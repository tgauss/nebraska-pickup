import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// GET /api/lookup?email=xxx — look up customer by email, return their token(s)
export async function GET(request: Request) {
  await ensureHydrated();
  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const allCustomers = db.getAllCustomers();
  // Find customer by email (customers with multiple orders are already consolidated)
  const customer = allCustomers.find(c => c.email.toLowerCase() === email);

  if (!customer) {
    return NextResponse.json({ found: false });
  }

  const orders = db.getOrdersByCustomer(customer.id);
  const booking = db.getBookingByCustomer(customer.id);

  return NextResponse.json({
    found: true,
    token: customer.token,
    name: customer.name,
    segment: customer.segment,
    order_numbers: orders.map(o => o.shopify_order_number),
    has_booking: !!booking,
    needs_pickup: customer.segment === 'A' || customer.segment === 'B' || customer.segment === 'C',
  });
}
