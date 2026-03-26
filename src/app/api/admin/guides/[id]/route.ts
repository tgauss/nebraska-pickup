import { NextResponse } from 'next/server';
import * as prep from '@/lib/prep-data';

export const dynamic = 'force-dynamic';

// GET /api/admin/guides/[id] — get a single guide
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guide = prep.getGuideById(id);
  if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(guide);
}

// PATCH /api/admin/guides/[id] — update a guide
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const guide = prep.updateGuide(id, body);
  if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(guide);
}

// DELETE /api/admin/guides/[id] — delete a guide
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = prep.deleteGuide(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
