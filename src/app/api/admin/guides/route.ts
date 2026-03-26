import { NextResponse } from 'next/server';
import * as prep from '@/lib/prep-data';

export const dynamic = 'force-dynamic';

// GET /api/admin/guides — list all guides
export async function GET() {
  return NextResponse.json({ guides: prep.getAllGuides() });
}

// POST /api/admin/guides — create a new guide
export async function POST(request: Request) {
  const body = await request.json();
  const guide = prep.addGuide({
    title: body.title || 'Untitled Guide',
    category: body.category || 'sop',
    content: body.content || '',
  });
  return NextResponse.json(guide, { status: 201 });
}
