import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// PUT /api/admin/customers/[customerId]/contact — update email/phone
export async function PUT(request: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
  await ensureHydrated();
  const { customerId } = await params;
  const { email, phone } = await request.json();

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const oldEmail = customer.email;
  const oldPhone = customer.phone;

  db.updateCustomerContact(customerId, { email, phone });

  // Log the change
  const changes: string[] = [];
  if (email !== undefined && email !== oldEmail) changes.push(`email: ${oldEmail} → ${email}`);
  if (phone !== undefined && phone !== oldPhone) changes.push(`phone: ${oldPhone || 'none'} → ${phone || 'none'}`);

  if (changes.length > 0) {
    db.addActivityLog(customerId, 'contact_updated', {
      changes,
      old_email: oldEmail,
      old_phone: oldPhone,
      new_email: email ?? oldEmail,
      new_phone: phone ?? oldPhone,
      timestamp: new Date().toISOString(),
    });
  }

  await flushWrites();
  return NextResponse.json({ success: true, changes });
}
