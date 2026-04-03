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
    bookings: (bookings || []).map(b => {
      const cust = b.customers as unknown as { name: string; email: string; token: string; segment: string; city: string; state: string } | null;
      const slot = b.time_slots as unknown as { day: string; time: string } | null;
      return {
        name: cust?.name || '',
        email: cust?.email || '',
        token: cust?.token || '',
        segment: cust?.segment || '',
        city: cust?.city || '',
        state: cust?.state || '',
        day: slot?.day === 'May2' ? 'May 2' : slot?.day || '',
        time: slot?.time || '',
        status: b.status,
        confirmedAt: b.confirmed_at,
        rescheduled: b.reschedule_count > 0,
      };
    }),
  });
}
