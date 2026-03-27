'use client';

import { useEffect, useState } from 'react';
import { MapPin, Clock, Package, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

interface DistantCustomer {
  name: string;
  email: string;
  phone: string | null;
  city: string;
  state: string;
  driveTime: string;
  driveMinutes: number;
  segment: string;
  orders: string[];
  pickupItems: Array<{ name: string; qty: number }>;
  shipItems: Array<{ name: string; qty: number }>;
  hasBooked: boolean;
  bookingDay: string | null;
  bookingTime: string | null;
  bookingStatus: string | null;
  token: string;
}

interface Data {
  total: number;
  booked: number;
  not_booked: number;
  customers: DistantCustomer[];
}

export default function DistantPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/distant').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          Distant Pickup Customers (2+ hours)
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Total</p>
          <p className="text-2xl font-bold">{data.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Booked</p>
          <p className="text-2xl font-bold text-green-600">{data.booked}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Not Booked</p>
          <p className="text-2xl font-bold text-amber-600">{data.not_booked}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Location</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Drive</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Orders</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Pickup Items</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Ship Items</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.customers.map((c, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${c.driveMinutes >= 600 ? 'bg-red-50/50' : c.driveMinutes >= 300 ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.city}, {c.state}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className={`font-medium ${c.driveMinutes >= 600 ? 'text-red-600' : c.driveMinutes >= 300 ? 'text-amber-600' : ''}`}>
                        {c.driveTime}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {c.orders.map((o, j) => (
                        <p key={j} className="text-xs font-mono text-gray-500">{o}</p>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.pickupItems.map((item, j) => (
                      <div key={j} className="flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-xs">{item.qty}x {item.name}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {c.shipItems.length > 0 ? c.shipItems.map((item, j) => (
                      <p key={j} className="text-xs text-gray-500">{item.qty}x {item.name}</p>
                    )) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.hasBooked ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Booked
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{c.bookingDay} {c.bookingTime}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Not Booked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/pickup/${c.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
