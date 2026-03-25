import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// GET /api/admin/dashboard — aggregate stats
export async function GET() {
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const time_slots = db.getAllTimeSlots();
  const allItems = db.getAllLineItems();

  // Segment breakdown
  const segments: Record<string, { count: number; confirmed: number; pending: number }> = {};
  for (const seg of ['A', 'B', 'C', 'D', 'E']) {
    const segCustomers = customers.filter(c => c.segment === seg);
    const segBookingCustomerIds = new Set(
      allBookings.filter(b => segCustomers.some(c => c.id === b.customer_id)).map(b => b.customer_id)
    );
    segments[seg] = {
      count: segCustomers.length,
      confirmed: segBookingCustomerIds.size,
      pending: segCustomers.length - segBookingCustomerIds.size,
    };
  }

  // Seg C conversion
  const segCCustomers = customers.filter(c => c.segment === 'C');
  const segCConversions = allBookings.filter(b =>
    segCCustomers.some(c => c.id === b.customer_id)
  ).length;

  // Seg B bundle tracking
  const segBCustomerIds = new Set(customers.filter(c => c.segment === 'B').map(c => c.id));
  const segBConvertedItems = allItems.filter(
    i => segBCustomerIds.has(i.customer_id) && i.item_type === 'ship' && i.fulfillment_preference === 'pickup'
  );

  const shippingSavings = (segCConversions * 50) + (segBConvertedItems.length * 30);

  const statusCounts = {
    confirmed: allBookings.filter(b => b.status === 'confirmed').length,
    checked_in: allBookings.filter(b => b.status === 'checked_in').length,
    completed: allBookings.filter(b => b.status === 'completed').length,
    no_show: allBookings.filter(b => b.status === 'no_show').length,
  };

  return NextResponse.json({
    total_customers: customers.length,
    segments,
    total_bookings: allBookings.length,
    ...statusCounts,
    seg_c_conversions: segCConversions,
    seg_c_total: segCCustomers.length,
    shipping_savings: shippingSavings,
    time_slot_fill: time_slots,
  });
}
