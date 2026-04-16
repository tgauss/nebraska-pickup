import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import { createAdminClient } from '@/lib/supabase';
import { getProductInfo } from '@/lib/products';
import { getCustomerLabel, PREFIX_INFO } from '@/lib/labels';

export const dynamic = 'force-dynamic';

interface StagingItem {
  lineItemId: string;
  name: string;
  qty: number;
  status: string;
  weight: string;
  handling: string;
}

interface StagingCustomer {
  customerId: string;
  customerName: string;
  label: string | null;
  prefix: string | null;
  stagingZone: string | null;
  bookingDay: string | null;
  bookingTime: string | null;
  items: StagingItem[];
  allStaged: boolean;
}

interface StagingZone {
  prefix: string;
  name: string;
  zone: string;
  color: string;
  bgColor: string;
  customers: StagingCustomer[];
  totalItems: number;
  stagedItems: number;
}

// GET — list all pickup items grouped by staging zone
export async function GET() {
  await ensureHydrated();

  const customers = db.getAllCustomers();
  const allItems = db.getAllLineItems();

  // Fetch bookings directly from Supabase (reliable, not dependent on hydration)
  const bookingMap = new Map<string, { day: string; time: string }>();
  const sb = createAdminClient();
  if (sb) {
    const { data: sbBookings } = await sb.from('bookings')
      .select('status, customers(token), time_slots(day, time)')
      .eq('status', 'confirmed');
    if (sbBookings) {
      for (const b of sbBookings) {
        const token = (b.customers as unknown as { token: string } | { token: string }[] | null);
        const t = Array.isArray(token) ? token[0]?.token : token?.token;
        const slot = (b.time_slots as unknown as { day: string; time: string } | { day: string; time: string }[] | null);
        const s = Array.isArray(slot) ? slot[0] : slot;
        if (t && s) {
          const cust = customers.find(c => c.token === t);
          if (cust) bookingMap.set(cust.id, { day: s.day, time: s.time });
        }
      }
    }
  }

  // Find all pickup items (item_type=pickup OR fulfillment_preference=pickup)
  const pickupItems = allItems.filter(i => i.item_type === 'pickup' || i.fulfillment_preference === 'pickup');

  // Group by customer
  const customerMap = new Map<string, StagingCustomer>();

  for (const item of pickupItems) {
    const customer = customers.find(c => c.id === item.customer_id);
    if (!customer) continue;

    if (!customerMap.has(customer.id)) {
      const label = getCustomerLabel(customer.id);
      const booking = bookingMap.get(customer.id);

      customerMap.set(customer.id, {
        customerId: customer.id,
        customerName: customer.name,
        label: label?.label || null,
        prefix: label?.prefix || null,
        stagingZone: label?.stagingZone || null,
        bookingDay: booking?.day || null,
        bookingTime: booking?.time || null,
        items: [],
        allStaged: true,
      });
    }

    const product = getProductInfo(item.item_name);
    const sc = customerMap.get(customer.id)!;
    sc.items.push({
      lineItemId: item.id,
      name: product?.shortName || item.item_name,
      qty: item.qty,
      status: item.fulfillment_status,
      weight: product?.weight || '',
      handling: product?.handling || '',
    });

    if (item.fulfillment_status !== 'staged' && item.fulfillment_status !== 'picked_up') {
      sc.allStaged = false;
    }
  }

  // Group by staging zone prefix
  const zoneMap = new Map<string, StagingZone>();
  const prefixOrder = ['B', 'E', 'S', 'W', 'I', 'C', 'X'];

  for (const prefix of prefixOrder) {
    const info = PREFIX_INFO[prefix];
    if (info) {
      zoneMap.set(prefix, {
        prefix,
        name: info.name,
        zone: prefix === 'B' ? 'Dock — Heavy (2 people)' : prefix === 'E' ? 'Dock — Bulky pairs' : prefix === 'S' ? 'Floor — Stackable seats' : prefix === 'W' ? 'Floor — Wall mounts' : prefix === 'I' ? 'Shelf — Iron pieces' : prefix === 'C' ? 'Shelf — Chair backs' : 'Floor — General',
        color: info.color,
        bgColor: info.bgColor,
        customers: [],
        totalItems: 0,
        stagedItems: 0,
      });
    }
  }

  for (const sc of customerMap.values()) {
    const prefix = sc.prefix || 'X';
    if (!zoneMap.has(prefix)) {
      zoneMap.set(prefix, {
        prefix, name: 'Other', zone: 'Floor — General',
        color: 'text-gray-600', bgColor: 'bg-gray-100',
        customers: [], totalItems: 0, stagedItems: 0,
      });
    }
    const zone = zoneMap.get(prefix)!;
    zone.customers.push(sc);
    for (const item of sc.items) {
      zone.totalItems += item.qty;
      if (item.status === 'staged' || item.status === 'picked_up') zone.stagedItems += item.qty;
    }
  }

  // Sort customers within each zone by label
  for (const zone of zoneMap.values()) {
    zone.customers.sort((a, b) => (a.label || 'ZZZ').localeCompare(b.label || 'ZZZ'));
  }

  const zones = Array.from(zoneMap.values()).filter(z => z.customers.length > 0);
  const totalItems = zones.reduce((s, z) => s + z.totalItems, 0);
  const stagedItems = zones.reduce((s, z) => s + z.stagedItems, 0);
  const totalCustomers = zones.reduce((s, z) => s + z.customers.length, 0);

  // Also build a by-timeslot view
  const allCustomers = Array.from(customerMap.values());
  const dayOrder: Record<string, number> = { Thursday: 0, Friday: 1, Saturday: 2, May2: 3 };

  // Group by day
  const byDay: Record<string, { customers: StagingCustomer[]; totalItems: number; stagedItems: number }> = {};
  for (const day of ['Thursday', 'Friday', 'Saturday', 'May2']) {
    const dayCusts = allCustomers.filter(c => c.bookingDay === day);
    // Sort by time
    dayCusts.sort((a, b) => {
      const toMin = (t: string | null) => {
        if (!t) return 9999;
        const m = t.match(/^(\d+):(\d+)(am|pm)$/i);
        if (!m) return 9999;
        let h = parseInt(m[1]);
        if (m[3].toLowerCase() === 'pm' && h !== 12) h += 12;
        if (m[3].toLowerCase() === 'am' && h === 12) h = 0;
        return h * 60 + parseInt(m[2]);
      };
      return toMin(a.bookingTime) - toMin(b.bookingTime);
    });
    let total = 0, staged = 0;
    for (const c of dayCusts) {
      for (const item of c.items) {
        total += item.qty;
        if (item.status === 'staged' || item.status === 'picked_up') staged += item.qty;
      }
    }
    if (dayCusts.length > 0) {
      byDay[day] = { customers: dayCusts, totalItems: total, stagedItems: staged };
    }
  }

  // Unbooked customers
  const unbooked = allCustomers.filter(c => !c.bookingDay);

  return NextResponse.json({
    zones,
    byDay,
    unbooked,
    stats: { totalItems, stagedItems, totalCustomers, totalZones: zones.length },
  });
}

// POST — stage items
export async function POST(request: Request) {
  await ensureHydrated();
  const { action, customerId, lineItemId } = await request.json();

  if (action === 'stage_item') {
    db.updateLineItemPreference(lineItemId, db.getLineItemsByCustomer(customerId).find(i => i.id === lineItemId)?.fulfillment_preference || 'pickup', 'staged');
    await flushWrites();
    return NextResponse.json({ success: true });
  }

  if (action === 'unstage_item') {
    db.updateLineItemPreference(lineItemId, db.getLineItemsByCustomer(customerId).find(i => i.id === lineItemId)?.fulfillment_preference || 'pickup', 'confirmed');
    await flushWrites();
    return NextResponse.json({ success: true });
  }

  if (action === 'stage_all') {
    const items = db.getLineItemsByCustomer(customerId);
    for (const item of items) {
      if ((item.item_type === 'pickup' || item.fulfillment_preference === 'pickup') && item.fulfillment_status !== 'staged' && item.fulfillment_status !== 'picked_up') {
        db.updateLineItemPreference(item.id, item.fulfillment_preference, 'staged');
      }
    }
    await flushWrites();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
