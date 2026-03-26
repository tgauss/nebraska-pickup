'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, Truck } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidGdhdXNzIiwiYSI6ImUxelFyZWsifQ.ewANL0BvfdZa9RRcOIQSVA';
const WAREHOUSE = { lng: -96.6197, lat: 40.6753 };

mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapCustomer {
  id: string; name: string; email: string; segment: string;
  city: string; state: string; drive_minutes: number | null;
  size: string; is_vip: boolean; lng: number; lat: number;
  has_booking: boolean; booking_status: string | null; token: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  A: '#2563eb', B: '#7c3aed', C: '#d97706', D: '#6b7280', E: '#9ca3af',
};

export default function AdminMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [customers, setCustomers] = useState<MapCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState('');
  const [maxDrive, setMaxDrive] = useState('');
  const [stats, setStats] = useState({ total: 0, local: 0, regional: 0, far: 0 });

  // Fetch customers
  useEffect(() => {
    const params = new URLSearchParams();
    if (segment) params.set('segment', segment);
    if (maxDrive) params.set('maxDrive', maxDrive);

    setLoading(true);
    fetch(`/api/admin/map?${params}`)
      .then(r => r.json())
      .then(data => {
        setCustomers(data.customers || []);
        setLoading(false);

        const custs = data.customers || [];
        setStats({
          total: custs.length,
          local: custs.filter((c: MapCustomer) => c.drive_minutes && c.drive_minutes <= 60).length,
          regional: custs.filter((c: MapCustomer) => c.drive_minutes && c.drive_minutes > 60 && c.drive_minutes <= 180).length,
          far: custs.filter((c: MapCustomer) => !c.drive_minutes || c.drive_minutes > 180).length,
        });
      });
  }, [segment, maxDrive]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [WAREHOUSE.lng, WAREHOUSE.lat],
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Warehouse marker
    map.current.on('load', () => {
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:40px;height:40px;background:#d00000;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">W</div>`;
      new mapboxgl.Marker({ element: el })
        .setLngLat([WAREHOUSE.lng, WAREHOUSE.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Pickup Warehouse</strong><br>2410 Production Drive, Unit 6<br>Roca, NE 68430'))
        .addTo(map.current!);
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Update markers when customers change
  useEffect(() => {
    if (!map.current) return;

    // Remove existing customer markers (keep warehouse)
    document.querySelectorAll('.customer-marker').forEach(el => el.remove());

    for (const c of customers) {
      const color = SEGMENT_COLORS[c.segment] || '#6b7280';
      const el = document.createElement('div');
      el.className = 'customer-marker';
      el.innerHTML = `<div style="width:${c.is_vip ? 20 : 14}px;height:${c.is_vip ? 20 : 14}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;"></div>`;

      const dm = c.drive_minutes;
      const driveStr = dm
        ? (dm >= 60 ? `${Math.floor(dm / 60)}h ${dm % 60}m` : `${dm} min`) + ' drive'
        : 'Drive time unknown';

      const popup = new mapboxgl.Popup({ offset: 10 }).setHTML(`
        <div style="font-family:sans-serif;max-width:220px;">
          <strong>${c.name}</strong>${c.is_vip ? ' <span style="color:#d97706;font-size:11px;">VIP</span>' : ''}<br>
          <span style="color:#666;font-size:12px;">${c.city}, ${c.state} — ${driveStr}</span><br>
          <span style="font-size:11px;color:#888;">Seg ${c.segment} | ${c.has_booking ? `Booked (${c.booking_status})` : 'Not scheduled'}</span><br>
          <a href="/admin/customers/${c.id}" style="color:#d00000;font-size:12px;text-decoration:underline;">View Details</a>
        </div>
      `);

      new mapboxgl.Marker({ element: el })
        .setLngLat([c.lng, c.lat])
        .setPopup(popup)
        .addTo(map.current!);
    }
  }, [customers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Map</h1>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={segment}
          onChange={e => setSegment(e.target.value)}
          className="border rounded-sm px-3 py-2 text-sm bg-card"
        >
          <option value="">All Segments</option>
          <option value="A">Seg A: Pickup Only</option>
          <option value="B">Seg B: Pickup + Ship</option>
          <option value="C">Seg C: Iron Local</option>
          <option value="D">Seg D: Iron Far</option>
          <option value="E">Seg E: Ship Only</option>
        </select>
        <select
          value={maxDrive}
          onChange={e => setMaxDrive(e.target.value)}
          className="border rounded-sm px-3 py-2 text-sm bg-card"
        >
          <option value="">All Distances</option>
          <option value="30">Within 30 min</option>
          <option value="60">Within 1 hour</option>
          <option value="90">Within 90 min</option>
          <option value="120">Within 2 hours</option>
          <option value="180">Within 3 hours</option>
        </select>

        {/* Stats pills */}
        <div className="flex gap-2 ml-auto text-xs">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-sm">{stats.local} local (&lt;1hr)</span>
          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-sm">{stats.regional} regional (1-3hr)</span>
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">{stats.far} far (3hr+)</span>
          <span className="bg-secondary px-2 py-1 rounded-sm">{stats.total} shown</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(SEGMENT_COLORS).map(([seg, color]) => (
          <div key={seg} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span>Seg {seg}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center text-white text-[10px] font-bold">W</div>
          <span>Warehouse</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="w-full h-[600px] rounded-sm border border-border" />

      {/* Local delivery zone info */}
      <div className="bg-card rounded-sm border border-border p-4 flex items-start gap-3">
        <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-serif font-bold">Local Delivery Zone</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Use the &quot;Within 90 min&quot; filter to see customers close enough for local delivery.
            These customers could receive hand-delivery instead of shipping, saving costs and time.
          </p>
        </div>
      </div>
    </div>
  );
}
