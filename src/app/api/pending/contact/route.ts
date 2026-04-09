import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await ensureHydrated();
  const { customerId, type, value, source } = await request.json();

  if (!customerId || !type || !value) {
    return NextResponse.json({ error: 'Missing required fields: customerId, type, value' }, { status: 400 });
  }

  if (!['email', 'phone'].includes(type)) {
    return NextResponse.json({ error: 'Type must be "email" or "phone"' }, { status: 400 });
  }

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // addActivityLog handles both in-memory and Supabase write-through
  db.addActivityLog(customerId, 'alt_contact_added', {
    type,
    value: value.trim(),
    source: source || 'UNL Staff',
    timestamp: new Date().toISOString(),
  });

  await flushWrites();
  return NextResponse.json({ success: true });
}
