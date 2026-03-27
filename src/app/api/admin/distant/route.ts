import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { getProductInfo } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureHydrated();
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const bookedIds = new Set(allBookings.map(b => b.customer_id));

  const distant = customers
    .filter(c => {
      if (!c.drive_minutes || c.drive_minutes < 120) return false;
      const items = db.getLineItemsByCustomer(c.id);
      return items.some(i => i.item_type === 'pickup');
    })
    .map(c => {
      const items = db.getLineItemsByCustomer(c.id);
      const orders = db.getOrdersByCustomer(c.id);
      const booking = allBookings.find(b => b.customer_id === c.id);
      const pickupItems = items.filter(i => i.item_type === 'pickup');
      const shipItems = items.filter(i => i.item_type === 'ship');

      // Consolidate items
      const consolidate = (list: typeof pickupItems) => {
        const map = new Map<string, { name: string; qty: number }>();
        for (const i of list) {
          const p = getProductInfo(i.item_name);
          const name = p?.shortName || i.item_name;
          const existing = map.get(name);
          if (existing) existing.qty += i.qty;
          else map.set(name, { name, qty: i.qty });
        }
        return [...map.values()];
      };

      const driveHours = Math.floor(c.drive_minutes / 60);
      const driveMin = c.drive_minutes % 60;

      return {
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        state: c.state,
        driveTime: `${driveHours}h ${driveMin}m`,
        driveMinutes: c.drive_minutes,
        segment: c.segment,
        orders: orders.map(o => o.shopify_order_number),
        pickupItems: consolidate(pickupItems),
        shipItems: consolidate(shipItems),
        hasBooked: bookedIds.has(c.id),
        bookingDay: booking?.time_slots?.day || null,
        bookingTime: booking?.time_slots?.time || null,
        bookingStatus: booking?.status || null,
        token: c.token,
      };
    })
    .sort((a, b) => b.driveMinutes - a.driveMinutes);

  return NextResponse.json({
    total: distant.length,
    booked: distant.filter(c => c.hasBooked).length,
    not_booked: distant.filter(c => !c.hasBooked).length,
    customers: distant,
  });
}
