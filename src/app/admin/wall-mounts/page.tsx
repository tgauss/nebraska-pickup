'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Mail, Phone, Calendar, ExternalLink, AlertTriangle, Copy, Check, Package
} from 'lucide-react';
import { SEGMENT_COLORS } from '@/lib/types';

interface WallMountCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  segment: string;
  token: string;
  bookingDay: string | null;
  bookingTime: string | null;
  hasBooked: boolean;
  orders: string[];
  items: Array<{ name: string; qty: number; type: string }>;
  totalQty: number;
}

export default function WallMountsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<WallMountCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/customers?limit=500');
    if (!res.ok) return;
    const data = await res.json();

    const blackWallMountKeywords = ['standard black', 'premium black'];
    const results: WallMountCustomer[] = [];

    for (const c of data.customers) {
      const wallMountItems = (c.line_items || []).filter((i: { item_name: string }) => {
        const lower = i.item_name.toLowerCase();
        return blackWallMountKeywords.some(k => lower.includes(k)) && lower.includes('wall mount');
      });

      if (wallMountItems.length > 0) {
        const booking = c.bookings?.[0];
        const slot = booking?.time_slots;
        results.push({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          segment: c.segment,
          token: c.token,
          bookingDay: slot?.day || null,
          bookingTime: slot?.time || null,
          hasBooked: !!booking,
          orders: c.order_numbers || [],
          items: wallMountItems.map((i: { item_name: string; qty: number; item_type: string }) => ({
            name: i.item_name.includes('Premium') ? 'Premium Black Wall Mount (with N)' :
                  i.item_name.includes('Standard Black') ? 'Standard Black Wall Mount' : i.item_name,
            qty: i.qty,
            type: i.item_type,
          })),
          totalQty: wallMountItems.reduce((s: number, i: { qty: number }) => s + i.qty, 0),
        });
      }
    }

    results.sort((a, b) => {
      if (a.hasBooked !== b.hasBooked) return a.hasBooked ? -1 : 1;
      const dayOrder: Record<string, number> = { Thursday: 0, Friday: 1, Saturday: 2 };
      if (a.bookingDay && b.bookingDay && dayOrder[a.bookingDay] !== dayOrder[b.bookingDay]) {
        return (dayOrder[a.bookingDay] ?? 99) - (dayOrder[b.bookingDay] ?? 99);
      }
      return (a.bookingTime || '').localeCompare(b.bookingTime || '');
    });

    setCustomers(results);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalPairs = customers.reduce((s, c) => s + c.totalQty, 0);
  const premiumCount = customers.reduce((s, c) => s + c.items.filter(i => i.name.includes('Premium')).reduce((s2, i) => s2 + i.qty, 0), 0);
  const standardCount = totalPairs - premiumCount;
  const booked = customers.filter(c => c.hasBooked).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Black Wall Mount Inventory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">All customers who ordered black wall mount seat pairs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Total Customers</p>
          <p className="text-2xl font-bold">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Total Pairs</p>
          <p className="text-2xl font-bold">{totalPairs}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Premium Black (with N)</p>
          <p className="text-2xl font-bold text-indigo-600">{premiumCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Standard Black</p>
          <p className="text-2xl font-bold">{standardCount}</p>
        </div>
      </div>

      {/* Customer table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Qty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pickup Time</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Orders</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>{c.segment}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>
                      <button onClick={() => copyText(c.email, `${c.id}-e`)} className="text-gray-300 hover:text-gray-500">
                        {copied === `${c.id}-e` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <a href={`tel:${c.phone}`} className="text-xs text-gray-600">{c.phone}</a>
                        <button onClick={() => copyText(c.phone!, `${c.id}-p`)} className="text-gray-300 hover:text-gray-500">
                          {copied === `${c.id}-p` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                    {!c.phone && <span className="text-xs text-amber-500">No phone</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span className={`text-xs font-medium ${item.name.includes('Premium') ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-lg">{c.totalQty}</span>
                  <span className="text-xs text-gray-400 ml-1">pair{c.totalQty !== 1 ? 's' : ''}</span>
                </td>
                <td className="px-4 py-3">
                  {c.hasBooked ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">{c.bookingTime}</p>
                        <p className="text-xs text-gray-500">{c.bookingDay}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Not booked
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-gray-400">{c.orders.join(', ')}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => router.push(`/admin/customers/${c.id}`)}
                    className="text-primary hover:underline text-xs flex items-center gap-1">
                    View <ExternalLink className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-bold text-amber-800 mb-2">Inventory Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-amber-700"><strong>Premium Black (with N):</strong> {premiumCount} pairs needed across {customers.filter(c => c.items.some(i => i.name.includes('Premium'))).length} customers</p>
            <p className="text-amber-700"><strong>Standard Black:</strong> {standardCount} pairs needed across {customers.filter(c => c.items.some(i => i.name.includes('Standard'))).length} customers</p>
          </div>
          <div>
            <p className="text-amber-700"><strong>Booked:</strong> {booked} of {customers.length} have pickup times</p>
            <p className="text-amber-700"><strong>Unbooked:</strong> {customers.length - booked} still pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}
