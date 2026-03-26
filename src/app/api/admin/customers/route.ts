import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { getCustomerLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

// GET /api/admin/customers — paginated, filterable customer list
export async function GET(request: Request) {
  await ensureHydrated();
  const url = new URL(request.url);

  const segment = url.searchParams.get('segment');
  const status = url.searchParams.get('status');
  const day = url.searchParams.get('day');
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let customers = search ? db.searchCustomers(search) : db.getAllCustomers();

  if (segment) {
    customers = customers.filter(c => c.segment === segment);
  }

  // Enrich with bookings and line items
  const enriched = customers.map(c => {
    const booking = db.getBookingByCustomer(c.id);
    const items = db.getLineItemsByCustomer(c.id);
    const orders = db.getOrdersByCustomer(c.id);
    const label = getCustomerLabel(c.id);
    return {
      ...c,
      bookings: booking ? [booking] : [],
      line_items: items,
      order_count: orders.length,
      order_numbers: orders.map(o => o.shopify_order_number),
      label,
    };
  });

  // Filter by day
  let filtered = enriched;
  if (day) {
    filtered = filtered.filter(c => {
      const booking = c.bookings[0];
      return booking?.time_slots?.day === day;
    });
  }

  // Filter by status
  if (status) {
    filtered = filtered.filter(c => {
      const booking = c.bookings[0];
      if (status === 'unscheduled') return !booking && c.segment !== 'D' && c.segment !== 'E';
      if (status === 'shipping') return c.segment === 'D' || c.segment === 'E';
      return booking?.status === status;
    });
  }

  // Sort by name
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const total = filtered.length;
  const from = (page - 1) * limit;
  const paginated = filtered.slice(from, from + limit);

  return NextResponse.json({
    customers: paginated,
    total,
    page,
    limit,
  });
}
