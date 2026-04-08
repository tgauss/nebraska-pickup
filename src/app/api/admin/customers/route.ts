import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { getCustomerLabel } from '@/lib/labels';
import { createAdminClient } from '@/lib/supabase';

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

  // Load bookings from Supabase as fallback source of truth
  const sb = createAdminClient();
  let sbBookingsByToken: Map<string, { status: string; day: string; time: string; confirmed_at: string; reschedule_count: number }> | null = null;
  if (sb) {
    const { data: sbBookings } = await sb.from('bookings')
      .select('status, confirmed_at, reschedule_count, customers(token), time_slots(day, time)')
      .order('confirmed_at', { ascending: false });
    if (sbBookings) {
      sbBookingsByToken = new Map();
      for (const b of sbBookings) {
        const token = (b.customers as unknown as { token: string })?.token;
        const slot = b.time_slots as unknown as { day: string; time: string } | null;
        if (token && slot) {
          sbBookingsByToken.set(token, {
            status: b.status,
            day: slot.day,
            time: slot.time,
            confirmed_at: b.confirmed_at,
            reschedule_count: b.reschedule_count,
          });
        }
      }
    }
  }

  // Enrich with bookings and line items
  const enriched = customers.map(c => {
    let booking = db.getBookingByCustomer(c.id);

    // If no in-memory booking, check Supabase (handles hydration race / cold start)
    if (!booking && sbBookingsByToken) {
      const sbBooking = sbBookingsByToken.get(c.token);
      if (sbBooking) {
        const slot = db.getAllTimeSlots().find(s => s.day === sbBooking.day && s.time === sbBooking.time);
        if (slot) {
          booking = {
            id: `sb-${c.id}`,
            customer_id: c.id,
            time_slot_id: slot.id,
            status: sbBooking.status as 'confirmed' | 'checked_in' | 'completed' | 'no_show' | 'pending',
            confirmed_at: sbBooking.confirmed_at,
            checked_in_at: null,
            completed_at: null,
            reschedule_count: sbBooking.reschedule_count,
            created_at: sbBooking.confirmed_at,
            time_slots: slot,
          };
        }
      }
    }

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
      if (status === 'pickup_required') return c.line_items.some(i => i.item_type === 'pickup');
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
