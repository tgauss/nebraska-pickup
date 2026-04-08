import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/outreach — get phone outreach list
export async function GET() {
  await ensureHydrated();
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const bookedIds = new Set(allBookings.map(b => b.customer_id));

  // Customers needing phone outreach: pickup required, has phone, not yet booked
  const needsPhone = customers
    .filter(c => {
      if (!c.phone) return false;
      if (bookedIds.has(c.id)) return false;
      const items = db.getLineItemsByCustomer(c.id);
      return items.some(i => i.item_type === 'pickup');
    })
    .map(c => {
      const items = db.getLineItemsByCustomer(c.id);
      const pickupItems = items.filter(i => i.item_type === 'pickup');
      const logs = db.getActivityLogByCustomer(c.id);
      const texted = logs.some(l => l.action === 'sms_sent');
      const called = logs.some(l => l.action === 'phone_called');
      const note = logs.find(l => l.action === 'outreach_note');

      return {
        id: c.id,
        name: c.name,
        email: c.email || null,
        phone: c.phone,
        token: c.token,
        city: c.city,
        state: c.state,
        segment: c.segment,
        hasBooked: false,
        bookingDay: null,
        bookingTime: null,
        pickupItems: pickupItems.map(i => `${i.qty}x ${i.item_name.split(' - ')[0].substring(0, 35)}`),
        pickupLink: `https://huskerpickup.raregoods.com/pickup/${c.token}`,
        smsText: `Hi ${c.name.split(' ')[0]}! This is Nebraska Rare Goods. Your Devaney seats order is ready for pickup April 16-18 near Lincoln, NE. Please use this link to schedule your pickup time: https://huskerpickup.raregoods.com/pickup/${c.token} — Questions? Reply here or visit huskerpickup.raregoods.com/support`,
        texted,
        called,
        outreachNote: note?.details?.note || '',
        phoneOnly: !c.email,
      };
    })
    .sort((a, b) => {
      // Not contacted first, then contacted, then alphabetical
      const aContacted = a.texted || a.called;
      const bContacted = b.texted || b.called;
      if (aContacted !== bContacted) return aContacted ? 1 : -1;
      // Phone-only customers first (no email fallback)
      if (a.phoneOnly !== b.phoneOnly) return a.phoneOnly ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({
    total: needsPhone.length,
    contacted: needsPhone.filter(c => c.texted || c.called).length,
    phoneOnly: needsPhone.filter(c => c.phoneOnly).length,
    hasEmail: needsPhone.filter(c => !c.phoneOnly).length,
    customers: needsPhone,
  });
}

// POST /api/admin/outreach — mark actions
export async function POST(request: Request) {
  await ensureHydrated();
  const { customerId, action, note } = await request.json();

  if (!customerId || !action) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  db.addActivityLog(customerId, action, { note: note || '', timestamp: new Date().toISOString() });

  // Also persist directly to Supabase
  const sb = createAdminClient();
  if (sb) {
    const customer = db.getCustomerById(customerId);
    if (customer) {
      const { data: sbCust } = await sb.from('customers').select('id').eq('token', customer.token).single();
      if (sbCust) {
        await sb.from('activity_log').insert({
          customer_id: sbCust.id,
          action,
          details: { note: note || '', timestamp: new Date().toISOString() },
        });
      }
    }
  }

  await flushWrites();
  return NextResponse.json({ success: true });
}
