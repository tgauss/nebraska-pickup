/**
 * Recalculate drive times for all customers using Mapbox Directions API
 *
 * Usage: npx tsx scripts/recalculate-drive-times.ts
 *
 * This script:
 * 1. Reads logistics_master.json
 * 2. Geocodes each unique city/state via Mapbox
 * 3. Calculates real driving time to Roca warehouse
 * 4. Writes updated data back to logistics_master.json
 * 5. Shows which customers changed segment (D/E → C for locals)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const MAPBOX_TOKEN = 'pk.eyJ1IjoidGdhdXNzIiwiYSI6ImUxelFyZWsifQ.ewANL0BvfdZa9RRcOIQSVA';
const WAREHOUSE = { lng: -96.6197, lat: 40.6753 };

async function geocode(city: string, state: string): Promise<{ lng: number; lat: number } | null> {
  const query = encodeURIComponent(`${city}, ${state}, USA`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.features?.length) return null;
  const [lng, lat] = data.features[0].center;
  return { lng, lat };
}

async function getDriveMinutes(fromLng: number, fromLat: number): Promise<number | null> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${WAREHOUSE.lng},${WAREHOUSE.lat}?access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.routes?.length) return null;
  return Math.round(data.routes[0].duration / 60);
}

async function main() {
  const dataPath = resolve(__dirname, '../../files/logistics_master.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  console.log(`Processing ${data.customers.length} customers...\n`);

  // Cache geocoding by city+state
  const geocodeCache = new Map<string, { lng: number; lat: number } | null>();
  const driveCache = new Map<string, number | null>();

  let updated = 0;
  let newLocalOffers = 0;

  for (let i = 0; i < data.customers.length; i++) {
    const c = data.customers[i];
    const key = `${c.city},${c.state}`;

    if (!geocodeCache.has(key)) {
      const coords = await geocode(c.city, c.state);
      geocodeCache.set(key, coords);

      if (coords) {
        const minutes = await getDriveMinutes(coords.lng, coords.lat);
        driveCache.set(key, minutes);
      } else {
        driveCache.set(key, null);
      }

      // Rate limit — 1 geocode per 100ms
      await new Promise(r => setTimeout(r, 100));
    }

    const newDriveMinutes = driveCache.get(key);
    const oldMinutes = c.drive_minutes;

    if (newDriveMinutes != null) {
      c.drive_minutes = newDriveMinutes;
      if (oldMinutes !== newDriveMinutes) updated++;
    }

    // Check if this customer should get a pickup offer
    if ((c.segment === 'D' || c.segment === 'E') && newDriveMinutes != null && newDriveMinutes <= 90) {
      console.log(`  NEW LOCAL: ${c.name} (${c.city}, ${c.state}) — ${newDriveMinutes}min — was Seg ${c.segment}, has: ${c.ship_items.map((i: {item: string}) => i.item).join(', ')}`);
      newLocalOffers++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Processed ${i + 1}/${data.customers.length}...`);
    }
  }

  // Write back
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`\nDone!`);
  console.log(`  Drive times updated: ${updated}`);
  console.log(`  New local pickup offers (D/E within 90min): ${newLocalOffers}`);
  console.log(`  Unique locations geocoded: ${geocodeCache.size}`);
}

main().catch(console.error);
