import { NextResponse } from 'next/server';
import { geocodeAddress, getDriveTime } from '@/lib/mapbox';

export const dynamic = 'force-dynamic';

// GET /api/admin/drivetime?city=Omaha&state=NE — get real drive time via Mapbox
export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get('city');
  const state = url.searchParams.get('state');

  if (!city || !state) {
    return NextResponse.json({ error: 'city and state required' }, { status: 400 });
  }

  const coords = await geocodeAddress(city, state);
  if (!coords) {
    return NextResponse.json({ error: 'Could not geocode address' }, { status: 404 });
  }

  const driveTime = await getDriveTime(coords.lng, coords.lat);
  if (!driveTime) {
    return NextResponse.json({ error: 'Could not calculate drive time' }, { status: 500 });
  }

  return NextResponse.json({
    ...coords,
    ...driveTime,
  });
}
