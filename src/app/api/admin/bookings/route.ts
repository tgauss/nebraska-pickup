import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = createAdminClient();
  if (!sb) return NextResponse.json({ bookings: [] });

  const { data: bookings } = await sb.from('bookings')
    .select('id, status, confirmed_at, checked_in_at, completed_at, reschedule_count, customers(name, email, token, segment, city, state), time_slots(day, time)')
    .order('confirmed_at', { ascending: false });

  return NextResponse.json({
    total: bookings?.length || 0,
    bookings: (bookings || []).map(b => ({
      name: b.customers?.name,
      email: b.customers?.email,
      token: b.customers?.token,
      segment: b.customers?.segment,
      city: b.customers?.city,
      state: b.customers?.state,
      day: b.time_slots?.day === 'May2' ? 'May 2' : b.time_slots?.day,
      time: b.time_slots?.time,
      status: b.status,
      confirmedAt: b.confirmed_at,
      rescheduled: b.reschedule_count > 0,
    })),
  });
}
