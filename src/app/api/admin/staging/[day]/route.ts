import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// GET /api/admin/staging/[day] — staging list for a specific day
export async function GET(
  request: Request,
  { params }: { params: Promise<{ day: string }> }
) {
  const { day } = await params;
  const dayName = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

  const allSlots = db.getAllTimeSlots();
  const daySlots = allSlots.filter(s => s.day === dayName);

  if (daySlots.length === 0) {
    return NextResponse.json({ error: 'No slots found for this day' }, { status: 404 });
  }

  const allBookings = db.getAllBookings();

  const stagingGroups = daySlots.map(slot => {
    const slotBookings = allBookings
      .filter(b => b.time_slot_id === slot.id)
      .map(b => {
        const customer = db.getCustomerById(b.customer_id);
        const items = db.getLineItemsByCustomer(b.customer_id).filter(i => i.fulfillment_preference === 'pickup');
        return {
          booking: b,
          customer,
          items,
        };
      })
      .filter(b => b.customer);

    return {
      slot,
      bookings: slotBookings,
      total_items: slotBookings.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.qty, 0), 0),
    };
  });

  return NextResponse.json({ slots: daySlots, staging_groups: stagingGroups });
}
