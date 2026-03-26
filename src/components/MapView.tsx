'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidGdhdXNzIiwiYSI6ImUxelFyZWsifQ.ewANL0BvfdZa9RRcOIQSVA';
const WAREHOUSE = { lng: -96.6197, lat: 40.6753 };

mapboxgl.accessToken = MAPBOX_TOKEN;

export interface MapMarker {
  lng: number;
  lat: number;
  label?: string;
  color?: string;
  popup?: string;
}

interface MapViewProps {
  markers?: MapMarker[];
  showWarehouse?: boolean;
  showRoute?: boolean;
  routeFrom?: { lng: number; lat: number };
  center?: { lng: number; lat: number };
  zoom?: number;
  className?: string;
  onDriveTime?: (minutes: number, miles: number) => void;
}

export default function MapView({
  markers = [],
  showWarehouse = true,
  showRoute = false,
  routeFrom,
  center,
  zoom = 10,
  className = 'w-full h-64 rounded-sm',
  onDriveTime,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const defaultCenter = center || (markers.length > 0 ? { lng: markers[0].lng, lat: markers[0].lat } : WAREHOUSE);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => setLoaded(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add markers and route when map loads
  useEffect(() => {
    if (!loaded || !map.current) return;

    // Warehouse marker
    if (showWarehouse) {
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:32px;height:32px;background:#d00000;border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">W</div>`;
      new mapboxgl.Marker({ element: el })
        .setLngLat([WAREHOUSE.lng, WAREHOUSE.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Pickup Location</strong><br>2410 Production Drive, Unit 4<br>Roca, NE 68430'))
        .addTo(map.current);
    }

    // Custom markers
    for (const m of markers) {
      const el = document.createElement('div');
      const color = m.color || '#1a1a1a';
      el.innerHTML = `<div style="width:24px;height:24px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${m.label || ''}</div>`;
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([m.lng, m.lat]);
      if (m.popup) {
        marker.setPopup(new mapboxgl.Popup().setHTML(m.popup));
      }
      marker.addTo(map.current);
    }

    // Fit bounds if multiple points
    const allPoints: [number, number][] = [];
    if (showWarehouse) allPoints.push([WAREHOUSE.lng, WAREHOUSE.lat]);
    for (const m of markers) allPoints.push([m.lng, m.lat]);

    if (allPoints.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      for (const p of allPoints) bounds.extend(p);
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    }

    // Draw route
    if (showRoute && routeFrom) {
      fetchRoute(routeFrom, map.current, onDriveTime);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return <div ref={mapContainer} className={className} />;
}

async function fetchRoute(
  from: { lng: number; lat: number },
  map: mapboxgl.Map,
  onDriveTime?: (minutes: number, miles: number) => void
) {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${WAREHOUSE.lng},${WAREHOUSE.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return;

    const route = data.routes[0];
    const minutes = Math.round(route.duration / 60);
    const miles = Math.round(route.distance / 1609.34 * 10) / 10;

    if (onDriveTime) onDriveTime(minutes, miles);

    // Add route line
    if (map.getSource('route')) {
      (map.getSource('route') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: route.geometry,
      });
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#d00000', 'line-width': 4, 'line-opacity': 0.7 },
      });
    }
  } catch { /* silently fail */ }
}
