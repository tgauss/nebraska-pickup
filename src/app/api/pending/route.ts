import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';
import { getProductInfo } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureHydrated();
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const bookedMap = new Map(allBookings.map(b => [b.customer_id, b]));

  // Customers with actual pickup-type items (required pickup, not just offered conversion)
  const pickupRequired = customers.filter(c => {
    const items = db.getLineItemsByCustomer(c.id);
    return items.some(i => i.item_type === 'pickup');
  });

  const totalPickupRequired = pickupRequired.length;
  const booked = pickupRequired.filter(c => bookedMap.has(c.id));
  const totalBooked = booked.length;
  const unbookedCustomers = pickupRequired.filter(c => !bookedMap.has(c.id));

  // Build unbooked customer list with full details
  const unbookedList = unbookedCustomers.map(c => {
    const items = db.getLineItemsByCustomer(c.id);
    const orders = db.getOrdersByCustomer(c.id);
    const logs = db.getActivityLogByCustomer(c.id);

    const pickupItems = items.filter(i => i.item_type === 'pickup' || i.fulfillment_preference === 'pickup');
    const shipItems = items.filter(i => i.fulfillment_preference === 'ship' && i.item_type === 'ship');

    // Calculate estimated order value from product prices
    let orderValue = 0;
    for (const item of items) {
      const product = getProductInfo(item.item_name);
      if (product) orderValue += product.price * item.qty;
    }

    // Get alternate contacts from activity log
    const altContacts = logs
      .filter(l => l.action === 'alt_contact_added')
      .map(l => ({
        type: l.details.type as string,
        value: l.details.value as string,
        source: (l.details.source as string) || '',
        added_at: l.created_at,
      }));

    // Get outreach history
    const outreach = logs
      .filter(l => ['sms_sent', 'phone_called', 'outreach_note', 'note_added', 'email_sent', 'email_opened', 'email_clicked', 'alt_contact_added'].includes(l.action))
      .map(l => ({
        action: l.action,
        details: l.details,
        created_at: l.created_at,
      }));

    return {
      id: c.id,
      token: c.token,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      state: c.state,
      segment: c.segment,
      drive_minutes: c.drive_minutes,
      size: c.size,
      shipping_paid: c.shipping_paid,
      offer_pickup_conversion: c.offer_pickup_conversion,
      orderValue,
      orders: orders.map(o => o.shopify_order_number),
      pickupItems: pickupItems.map(i => {
        const product = getProductInfo(i.item_name);
        return {
          name: product?.shortName || i.item_name,
          qty: i.qty,
          price: product?.price || 0,
        };
      }),
      shipItems: shipItems.map(i => {
        const product = getProductInfo(i.item_name);
        return {
          name: product?.shortName || i.item_name,
          qty: i.qty,
        };
      }),
      pickupLink: `https://huskerpickup.raregoods.com/pickup/${c.token}`,
      altContacts,
      outreach,
    };
  });

  // Also include recently booked customers so we can show them with a checkmark
  const recentlyBooked = booked.map(c => {
    const booking = bookedMap.get(c.id)!;
    const slot = booking.time_slots;
    return {
      id: c.id,
      name: c.name,
      segment: c.segment,
      bookingDay: slot?.day || null,
      bookingTime: slot?.time || null,
      bookedAt: booking.created_at,
    };
  });

  return NextResponse.json({
    totalPickupRequired,
    totalBooked,
    totalUnbooked: unbookedCustomers.length,
    bookingRate: totalPickupRequired > 0 ? Math.round((totalBooked / totalPickupRequired) * 100) : 0,
    unbooked: unbookedList,
    recentlyBooked,
  });
}
