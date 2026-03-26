'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { SEGMENT_LABELS, SEGMENT_COLORS } from '@/lib/types';

interface CustomerRow {
  id: string;
  token: string;
  segment: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  state: string;
  drive_minutes: number | null;
  size: string;
  shipping_paid: number;
  is_vip: boolean;
  vip_note: string | null;
  bookings: Array<{
    id: string;
    status: string;
    time_slots: { day: string; time: string } | null;
    reschedule_count: number;
  }>;
  line_items: Array<{
    id: string;
    item_name: string;
    qty: number;
    item_type: string;
    fulfillment_preference: string;
    fulfillment_status: string;
  }>;
  label?: { label: string; prefix: string; stagingZone: string } | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [status, setStatus] = useState('');
  const [day, setDay] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (search) params.set('search', search);
    if (segment) params.set('segment', segment);
    if (status) params.set('status', status);
    if (day) params.set('day', day);

    const res = await fetch(`/api/admin/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, segment, status, day]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customer Management</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, order #..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={segment}
          onChange={e => { setSegment(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Segments</option>
          {(['A', 'B', 'C', 'D', 'E'] as const).map(s => (
            <option key={s} value={s}>Seg {s}: {SEGMENT_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="completed">Completed</option>
          <option value="no_show">No-Show</option>
          <option value="unscheduled">Unscheduled</option>
          <option value="shipping">Shipping Only</option>
        </select>
        <select
          value={day}
          onChange={e => { setDay(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Days</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Label</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Drive</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Segment</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pickup</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Shipping</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">No customers found</td></tr>
            ) : customers.map(c => {
              const booking = c.bookings?.[0];
              const slot = booking?.time_slots;
              const pickupItems = c.line_items?.filter(i => i.fulfillment_preference === 'pickup') || [];
              const shipItems = c.line_items?.filter(i => i.fulfillment_preference === 'ship') || [];

              return (
                <tr key={c.id} className={`hover:bg-gray-50 ${c.is_vip ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3">
                    {c.label ? (
                      <span className="inline-block bg-accent text-accent-foreground font-mono font-bold text-sm px-2 py-1 rounded-sm min-w-[48px] text-center">
                        {c.label.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {c.name}
                          {c.is_vip && <span className="ml-1 text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">VIP</span>}
                        </p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DriveTimeBadge minutes={c.drive_minutes} city={c.city} state={c.state} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>
                      {c.segment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {slot ? (
                      <div>
                        <p className="text-sm font-medium">{slot.day}</p>
                        <p className="text-xs text-gray-500">{slot.time}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {c.segment === 'D' || c.segment === 'E' ? 'Shipping' : 'Not scheduled'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs">
                      {pickupItems.length > 0 && <span className="text-blue-600">{pickupItems.reduce((s, i) => s + i.qty, 0)} pickup</span>}
                      {pickupItems.length > 0 && shipItems.length > 0 && ' / '}
                      {shipItems.length > 0 && <span className="text-gray-500">{shipItems.reduce((s, i) => s + i.qty, 0)} ship</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking?.status} segment={c.segment} />
                  </td>
                  <td className="px-4 py-3">
                    {c.shipping_paid > 0 ? (
                      <span className="text-sm">${c.shipping_paid.toFixed(2)}</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/pickup/${c.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{total} total customers</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingStatusBadge({ status, segment }: { status?: string; segment: string }) {
  if (segment === 'D' || segment === 'E') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Shipping</span>;
  }

  if (!status) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
  }

  const colors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800',
    checked_in: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    no_show: 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    completed: 'Completed',
    no_show: 'No-Show',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function DriveTimeBadge({ minutes, city, state }: { minutes: number | null; city: string; state: string }) {
  if (!minutes && !city) return <span className="text-xs text-gray-300">—</span>;

  const hrs = minutes ? Math.floor(minutes / 60) : 0;
  const mins = minutes ? minutes % 60 : 0;
  const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  // Color by drive time
  let color = 'text-green-700 bg-green-50';
  if (!minutes) color = 'text-gray-500 bg-gray-50';
  else if (minutes > 180) color = 'text-red-700 bg-red-50';
  else if (minutes > 90) color = 'text-amber-700 bg-amber-50';

  return (
    <div>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
        {minutes ? timeStr : '?'}
      </span>
      <p className="text-[10px] text-gray-400 mt-0.5">{city}{state ? `, ${state}` : ''}</p>
    </div>
  );
}
