import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureHydrated();

  const allBookings = db.getAllBookings();
  const rescheduled = allBookings
    .filter(b => b.reschedule_count > 0)
    .map(b => {
      const customer = b.customers || db.getCustomerById(b.customer_id);
      if (!customer) return null;
      const orders = db.getOrdersByCustomer(b.customer_id);
      const logs = db.getActivityLogByCustomer(b.customer_id);

      // Find reschedule history from activity log
      const rescheduleEvents = logs
        .filter(l => l.action === 'admin_rescheduled' || l.action === 'booking_rescheduled' || l.action === 'booking_created' || l.action === 'admin_booked')
        .map(l => ({
          action: l.action,
          day: (l.details as Record<string, unknown>).day as string || null,
          time: (l.details as Record<string, unknown>).time as string || null,
          details: l.details,
          created_at: l.created_at,
        }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return {
        customerId: b.customer_id,
        customerName: (customer as { name: string }).name,
        customerEmail: (customer as { email: string }).email,
        customerPhone: (customer as { phone: string | null }).phone,
        segment: (customer as { segment: string }).segment,
        token: (customer as { token: string }).token,
        rescheduleCount: b.reschedule_count,
        currentDay: b.time_slots?.day || null,
        currentTime: b.time_slots?.time || null,
        bookingStatus: b.status,
        orders: orders.map(o => o.shopify_order_number),
        history: rescheduleEvents,
        lastRescheduled: rescheduleEvents.length > 0 ? rescheduleEvents[rescheduleEvents.length - 1].created_at : b.created_at,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b!.lastRescheduled).getTime() - new Date(a!.lastRescheduled).getTime());

  return NextResponse.json({
    total: rescheduled.length,
    customers: rescheduled,
  });
}
