import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { geocodeAddress } from '@/lib/mapbox';

export const dynamic = 'force-dynamic';

// GET /api/admin/map — get all customers with geocoded locations for map view
// Uses a simple in-memory cache to avoid re-geocoding
const geocodeCache = new Map<string, { lng: number; lat: number } | null>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const segment = url.searchParams.get('segment');
  const maxDrive = url.searchParams.get('maxDrive'); // filter by max drive time

  let customers = db.getAllCustomers();

  if (segment) {
    customers = customers.filter(c => c.segment === segment);
  }

  if (maxDrive) {
    const max = parseInt(maxDrive);
    customers = customers.filter(c => c.drive_minutes && c.drive_minutes <= max);
  }

  // Geocode each unique city/state (batch with cache)
  const results = [];
  for (const c of customers) {
    const key = `${c.city},${c.state}`;
    let coords = geocodeCache.get(key);

    if (coords === undefined) {
      coords = await geocodeAddress(c.city, c.state);
      geocodeCache.set(key, coords);
    }

    if (coords) {
      const booking = db.getBookingByCustomer(c.id);
      results.push({
        id: c.id,
        name: c.name,
        email: c.email,
        segment: c.segment,
        city: c.city,
        state: c.state,
        drive_minutes: c.drive_minutes,
        size: c.size,
        is_vip: c.is_vip,
        lng: coords.lng,
        lat: coords.lat,
        has_booking: !!booking,
        booking_status: booking?.status || null,
        token: c.token,
      });
    }
  }

  return NextResponse.json({ customers: results, total: results.length });
}
