'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Search, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';

interface Booking {
  name: string;
  email: string;
  token: string;
  segment: string;
  city: string;
  state: string;
  day: string;
  time: string;
  status: string;
  confirmedAt: string;
  rescheduled: boolean;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'day' | 'name'>('newest');

  useEffect(() => {
    fetch('/api/admin/bookings').then(r => r.json()).then(d => { setBookings(d.bookings || []); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  // Filters
  let filtered = bookings;
  if (dayFilter !== 'all') filtered = filtered.filter(b => b.day === dayFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) || b.city?.toLowerCase().includes(q));
  }

  // Sort
  if (sortBy === 'newest') filtered.sort((a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime());
  else if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'day') {
    const dayOrder: Record<string, number> = { Thursday: 0, Friday: 1, Saturday: 2, 'May 2': 3 };
    const timeToMin = (t: string) => { const m = t.match(/^(\d+):(\d+)(am|pm)$/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3]==='pm' && h!==12) h+=12; if (m[3]==='am' && h===12) h=0; return h*60+parseInt(m[2]); };
    filtered.sort((a, b) => (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99) || timeToMin(a.time) - timeToMin(b.time));
  }

  // Day counts
  const dayCounts: Record<string, number> = {};
  bookings.forEach(b => { dayCounts[b.day] = (dayCounts[b.day] || 0) + 1; });

  const timeAgo = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Booking Log ({bookings.length})
        </h1>
        <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {['all', 'Thursday', 'Friday', 'Saturday', 'May 2'].map(day => (
          <button
            key={day}
            onClick={() => setDayFilter(day)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dayFilter === day ? 'bg-gray-900 text-white' : 'bg-white border hover:bg-gray-50'
            }`}
          >
            {day === 'all' ? 'All' : day}
            <span className="ml-1.5 opacity-60">({day === 'all' ? bookings.length : dayCounts[day] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, or city..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="newest">Newest First</option>
          <option value="day">By Day/Time</option>
          <option value="name">By Name</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Pickup Slot</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Location</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Booked</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((b, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">{b.day}</span>
                      <Clock className="w-3.5 h-3.5 text-gray-400 ml-1" />
                      <span>{b.time}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600">{b.city}, {b.state}</p>
                    <p className="text-[10px] text-gray-400">Seg {b.segment}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-500">{timeAgo(b.confirmedAt)}</p>
                    <p className="text-[10px] text-gray-400">{new Date(b.confirmedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    {b.rescheduled && <span className="text-[10px] text-amber-600 font-medium">Rescheduled</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      b.status === 'completed' ? 'bg-green-100 text-green-700' :
                      b.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {b.status === 'completed' ? 'Complete' : b.status === 'checked_in' ? 'Checked In' : 'Confirmed'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/pickup/${b.token}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary">
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
