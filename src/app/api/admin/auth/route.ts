import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// POST /api/admin/auth — simple password authentication for admin
export async function POST(request: Request) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD || 'devaney2026';

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Set a session cookie
  const cookieStore = await cookies();
  cookieStore.set('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return NextResponse.json({ success: true });
}

// GET /api/admin/auth — check if authenticated
export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (session?.value === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
