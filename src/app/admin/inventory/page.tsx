'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Package, Truck, MapPin } from 'lucide-react';

interface ItemSummary {
  name: string;
  shortName: string;
  totalQty: number;
  pickupQty: number;
  shipQty: number;
  orderCount: number;
  category: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/customers?limit=500');
    if (!res.ok) return;
    const data = await res.json();

    // Cancelled orders to exclude
    const cancelledEmails = new Set(['michael@obeng.net', 'jjg19742@gmail.com', 'joe@perksocial.com']);

    const totals = new Map<string, ItemSummary>();

    const shortNames: Record<string, string> = {
      'Two Authentic Devaney Seats, Rebuilt as a Collectible Bench - Ready-to-use bench with feet': 'Legacy Bench (with Feet)',
      'Two Authentic Devaney Seats, Rebuilt as a Collectible Bench - Seats only-no feet': 'Legacy Bench (Seats Only)',
      'Premium End-Row Seat Pairs': 'Premium End-Row Seat Pair',
      'Standard Arena Seats': 'Standard Arena Seat',
      'Standard Red "Wall Mount" Seat Pair': 'Red Wall Mount Pair',
      'Standard Black "Wall Mount" Seat Pair': 'Standard Black Wall Mount Pair',
      'Premium Black "Wall Mount" Seat Pair - With N': 'Premium Black Wall Mount (with N)',
      'Iron End-of-Row Side Pieces': 'Iron Side Piece',
      'Devaney Numbered Chair Backs': 'Numbered Chair Back',
    };

    const categories: Record<string, string> = {
      'Legacy Bench (with Feet)': 'bench',
      'Legacy Bench (Seats Only)': 'bench',
      'Premium End-Row Seat Pair': 'seat',
      'Standard Arena Seat': 'seat',
      'Red Wall Mount Pair': 'wallmount',
      'Standard Black Wall Mount Pair': 'wallmount',
      'Premium Black Wall Mount (with N)': 'wallmount',
      'Iron Side Piece': 'iron',
      'Numbered Chair Back': 'chairback',
    };

    for (const c of data.customers) {
      if (cancelledEmails.has(c.email?.toLowerCase())) continue;
      const seen = new Set<string>();
      for (const item of (c.line_items || [])) {
        const name = item.item_name;
        const short = shortNames[name] || name;
        if (!totals.has(short)) {
          totals.set(short, { name, shortName: short, totalQty: 0, pickupQty: 0, shipQty: 0, orderCount: 0, category: categories[short] || 'other' });
        }
        const t = totals.get(short)!;
        t.totalQty += item.qty;
        if (item.fulfillment_preference === 'pickup' || item.item_type === 'pickup') {
          t.pickupQty += item.qty;
        } else {
          t.shipQty += item.qty;
        }
        const key = `${c.id}-${short}`;
        if (!seen.has(key)) { t.orderCount++; seen.add(key); }
      }
    }

    const sorted = [...totals.values()].sort((a, b) => b.totalQty - a.totalQty);
    setItems(sorted);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const grandTotal = items.reduce((s, i) => s + i.totalQty, 0);
  const grandPickup = items.reduce((s, i) => s + i.pickupQty, 0);
  const grandShip = items.reduce((s, i) => s + i.shipQty, 0);

  const catColors: Record<string, { bg: string; border: string; text: string; bar: string }> = {
    bench: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', bar: 'bg-amber-500' },
    seat: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', bar: 'bg-blue-500' },
    wallmount: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', bar: 'bg-indigo-500' },
    iron: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', bar: 'bg-gray-500' },
    chairback: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', bar: 'bg-red-500' },
    other: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', bar: 'bg-gray-400' },
  };

  const maxQty = Math.max(...items.map(i => i.totalQty));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Items Sold
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Total inventory sold by product type</p>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items Sold</p>
          <p className="text-4xl font-bold mt-1">{grandTotal}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Pickup</p>
          <p className="text-4xl font-bold mt-1 text-blue-600">{grandPickup}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Shipping</p>
          <p className="text-4xl font-bold mt-1 text-green-600">{grandShip}</p>
        </div>
      </div>

      {/* Item breakdown */}
      <div className="space-y-3">
        {items.map(item => {
          const colors = catColors[item.category] || catColors.other;
          const pct = maxQty > 0 ? (item.totalQty / maxQty) * 100 : 0;
          const pickupPct = item.totalQty > 0 ? (item.pickupQty / item.totalQty) * 100 : 0;

          return (
            <div key={item.shortName} className={`${colors.bg} ${colors.border} border rounded-xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`font-bold text-lg ${colors.text}`}>{item.shortName}</h3>
                  <p className="text-xs text-gray-500">{item.orderCount} customer{item.orderCount !== 1 ? 's' : ''}</p>
                </div>
                <p className={`text-4xl font-black ${colors.text}`}>{item.totalQty}</p>
              </div>

              {/* Bar */}
              <div className="h-4 bg-white/60 rounded-full overflow-hidden mb-3">
                <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>

              {/* Pickup vs Ship split */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium">{item.pickupQty} pickup</span>
                  <span className="text-gray-400">({Math.round(pickupPct)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-medium">{item.shipQty} shipping</span>
                  <span className="text-gray-400">({Math.round(100 - pickupPct)}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
