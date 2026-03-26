import { NextResponse } from 'next/server';
import * as prep from '@/lib/prep-data';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/prep/[id] — update a checklist item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const item = prep.updateChecklistItem(id, body);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

// DELETE /api/admin/prep/[id] — delete a checklist item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = prep.deleteChecklistItem(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
