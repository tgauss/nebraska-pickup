import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { flushWrites, ensureHydrated } from '@/lib/local-data';
import { markOrderFulfilled, addNoteToOrder } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

// POST /api/admin/complete/[customerId] — mark pickup as complete
export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  await ensureHydrated();

  const booking = db.updateBookingStatus(customerId, 'completed', {
    completed_at: new Date().toISOString(),
  });

  if (!booking) {
    return NextResponse.json({ error: 'No booking found' }, { status: 404 });
  }

  db.updateLineItemsStatus(customerId, { fulfillment_preference: 'pickup' as const }, 'picked_up');
  db.updateLineItemsStatus(customerId, { fulfillment_preference: 'ship' as const, fulfillment_status: 'pending' }, 'ship_queued');
  db.addActivityLog(customerId, 'pickup_completed', { booking_id: booking.id });

  // Auto-fulfill in Shopify
  const customer = db.getCustomerById(customerId);
  if (customer) {
    const orders = db.getOrdersByCustomer(customerId);
    for (const order of orders) {
      const result = await markOrderFulfilled(order.shopify_order_number);
      if (result.success) {
        await addNoteToOrder(order.shopify_order_number, `Picked up in person. Booking: ${booking.time_slots?.day} ${booking.time_slots?.time}`);
      }
    }
  }

  await flushWrites();
  return NextResponse.json({ success: true, booking });
}
