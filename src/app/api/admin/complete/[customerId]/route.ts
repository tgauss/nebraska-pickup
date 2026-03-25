import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// POST /api/admin/complete/[customerId] — mark pickup as complete
export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;

  const booking = db.updateBookingStatus(customerId, 'completed', {
    completed_at: new Date().toISOString(),
  });

  if (!booking) {
    return NextResponse.json({ error: 'No booking found' }, { status: 404 });
  }

  db.updateLineItemsStatus(customerId, { fulfillment_preference: 'pickup' as const }, 'picked_up');
  db.updateLineItemsStatus(customerId, { fulfillment_preference: 'ship' as const, fulfillment_status: 'pending' }, 'ship_queued');
  db.addActivityLog(customerId, 'pickup_completed', { booking_id: booking.id });

  return NextResponse.json({ success: true, booking });
}
