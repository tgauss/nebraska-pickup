import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// POST /api/admin/customers/[customerId]/notes — add a note
export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  await ensureHydrated();
  const { note } = await request.json();

  if (!note || !note.trim()) {
    return NextResponse.json({ error: 'Note is required' }, { status: 400 });
  }

  db.addActivityLog(customerId, 'note_added', {
    note: note.trim(),
    added_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

// GET /api/admin/customers/[customerId]/notes — get notes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  await ensureHydrated();
  const logs = db.getActivityLogByCustomer(customerId);

  return NextResponse.json({ notes: logs });
}
