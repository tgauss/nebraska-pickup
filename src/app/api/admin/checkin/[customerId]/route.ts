import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// POST /api/admin/checkin/[customerId] — check in a customer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;

  const booking = db.getBookingByCustomer(customerId);
  if (!booking) {
    return NextResponse.json({
      error: 'No booking found. Use walk-in check-in instead.',
      walk_in: true,
    }, { status: 404 });
  }

  const updated = db.updateBookingStatus(customerId, 'checked_in', {
    checked_in_at: new Date().toISOString(),
  });

  db.updateLineItemsStatus(customerId, { fulfillment_preference: 'pickup' as const }, 'staged');
  db.addActivityLog(customerId, 'checked_in', { booking_id: booking.id });

  return NextResponse.json({ success: true, booking: updated });
}
