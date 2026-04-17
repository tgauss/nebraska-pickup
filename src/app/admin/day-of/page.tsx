'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, Clock, Truck, UserCheck, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';

interface StagingItem {
  id: string;
  item_name: string;
  qty: number;
  fulfillment_status: string;
}

interface StagingBooking {
  booking: {
    id: string;
    status: string;
    customer_id: string;
    checked_in_at: string | null;
    completed_at: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    size: string;
    is_vip: boolean;
    vip_note: string | null;
    token: string;
  };
  items: StagingItem[];
  label?: { label: string; prefix: string; stagingZone: string } | null;
}

interface StagingGroup {
  slot: { id: string; day: string; time: string; capacity: number; current_bookings: number };
  bookings: StagingBooking[];
  total_items: number;
}

export default function DayOfPage() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState('Friday');
  const [stagingGroups, setStagingGroups] = useState<StagingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Walk-in search
  const [walkInSearch, setWalkInSearch] = useState('');
  const [walkInResults, setWalkInResults] = useState<Array<{
    id: string; name: string; email: string; token: string; segment: string;
    bookings: Array<{ status: string; time_slots: { day: string; time: string } | null }>;
  }>>([]);
  const [walkInSearching, setWalkInSearching] = useState(false);

  const fetchStaging = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetch(`/api/admin/staging/${selectedDay}`);
    const data = await res.json();
    setStagingGroups(data.staging_groups || []);
    if (!silent) setLoading(false);
  }, [selectedDay]);

  useEffect(() => { fetchStaging(); }, [fetchStaging]);

  // Silent refresh every 60 seconds — doesn't reset scroll or loading state
  useEffect(() => {
    const interval = setInterval(() => fetchStaging(true), 60000);
    return () => clearInterval(interval);
  }, [fetchStaging]);

  const handleCheckIn = async (customerId: string) => {
    setActionLoading(customerId);
    try {
      const res = await fetch(`/api/admin/checkin/${customerId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Check-in failed');
      // Optimistic update
      setStagingGroups(prev => prev.map(g => ({
        ...g,
        bookings: g.bookings.map(b =>
          b.customer.id === customerId
            ? { ...b, booking: { ...b.booking, status: 'checked_in', checked_in_at: new Date().toISOString() } }
            : b
        ),
      })));
    } catch {
      alert('Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (customerId: string) => {
    setActionLoading(customerId);
    try {
      const res = await fetch(`/api/admin/complete/${customerId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      // Optimistic update
      setStagingGroups(prev => prev.map(g => ({
        ...g,
        bookings: g.bookings.map(b =>
          b.customer.id === customerId
            ? {
                ...b,
                booking: { ...b.booking, status: 'completed', completed_at: new Date().toISOString() },
                items: b.items.map(i => ({ ...i, fulfillment_status: 'picked_up' })),
              }
            : b
        ),
      })));
    } catch {
      alert('Failed to mark complete');
    } finally {
      setActionLoading(null);
    }
  };

  const searchWalkIn = async () => {
    if (!walkInSearch.trim()) return;
    setWalkInSearching(true);
    const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(walkInSearch)}&limit=10`);
    const data = await res.json();
    setWalkInResults(data.customers || []);
    setWalkInSearching(false);
  };

  const handleWalkIn = async (customerId: string, slotId: string) => {
    setActionLoading(customerId);
    try {
      const res = await fetch('/api/admin/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, time_slot_id: slotId }),
      });
      if (!res.ok) throw new Error('Walk-in failed');
      setWalkInSearch('');
      setWalkInResults([]);
      await fetchStaging();
    } catch {
      alert('Walk-in check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Find current/next slot for walk-ins
  const currentSlot = stagingGroups[0]?.slot;

  // Filter bookings by search (instant, client-side)
  const filteredGroups = stagingGroups.map(g => {
    if (!search) return g;
    const q = search.toLowerCase();
    const filtered = g.bookings.filter(b =>
      b.customer.name.toLowerCase().includes(q) ||
      b.customer.email.toLowerCase().includes(q) ||
      (b.customer.phone || '').includes(q) ||
      (b.label?.label || '').toLowerCase().includes(q) ||
      b.customer.token.toLowerCase().includes(q)
    );
    return { ...g, bookings: filtered };
  }).filter(g => !search || g.bookings.length > 0);

  // Stats
  const allBookings = stagingGroups.flatMap(g => g.bookings);
  const completed = allBookings.filter(b => b.booking.status === 'completed').length;
  const checkedIn = allBookings.filter(b => b.booking.status === 'checked_in').length;
  const pending = allBookings.filter(b => b.booking.status === 'confirmed').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Day-of Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completed} done, {checkedIn} checked in, {pending} pending
          </p>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-2">
        {['Thursday', 'Friday', 'Saturday', 'May2'].map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDay === day
                ? 'bg-primary text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            {day === 'May2' ? 'May 2' : day}
          </button>
        ))}
      </div>

      {/* Instant search — filters the current day's bookings */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, label (B14), phone, email, or token..."
          className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
            Clear
          </button>
        )}
      </div>

      {/* Walk-in lookup */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          Walk-in / Not on Today&rsquo;s List
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={walkInSearch}
              onChange={e => setWalkInSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchWalkIn()}
              placeholder="Look up any customer by name, email, or order #..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={searchWalkIn}
            disabled={walkInSearching}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
          >
            {walkInSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
        {walkInResults.length > 0 && (
          <div className="mt-3 border rounded-lg divide-y">
            {walkInResults.map(c => {
              const booking = c.bookings?.[0];
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.email} - Seg {c.segment}</p>
                    {booking && (
                      <p className="text-xs text-gray-400">
                        Booked: {booking.time_slots?.day} {booking.time_slots?.time} ({booking.status})
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {booking?.status === 'confirmed' && (
                      <button
                        onClick={() => handleCheckIn(c.id)}
                        disabled={actionLoading === c.id}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                      >
                        Check In
                      </button>
                    )}
                    {(!booking || booking.status === 'pending') && currentSlot && (
                      <button
                        onClick={() => handleWalkIn(c.id, currentSlot.id)}
                        disabled={actionLoading === c.id}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs hover:bg-amber-700"
                      >
                        Walk-in
                      </button>
                    )}
                    {booking?.status === 'checked_in' && (
                      <button
                        onClick={() => handleComplete(c.id)}
                        disabled={actionLoading === c.id}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        Complete
                      </button>
                    )}
                    <button onClick={() => router.push(`/admin/customers/${c.id}`)}
                      className="px-2 py-1.5 border rounded-lg text-xs hover:bg-gray-50">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staging groups by time slot */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {search ? `No results for "${search}"` : `No bookings for ${selectedDay}`}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => (
            <div key={group.slot.id} className="bg-white rounded-xl border overflow-hidden">
              {/* Slot header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">{group.slot.time}</span>
                  <span className="text-xs text-gray-500">
                    {group.bookings.length} customer{group.bookings.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {group.bookings.filter(b => b.booking.status === 'completed').length > 0 && (
                    <span className="text-green-600 font-medium">
                      {group.bookings.filter(b => b.booking.status === 'completed').length} done
                    </span>
                  )}
                  {group.bookings.filter(b => b.booking.status === 'checked_in').length > 0 && (
                    <span className="text-indigo-600 font-medium">
                      {group.bookings.filter(b => b.booking.status === 'checked_in').length} here
                    </span>
                  )}
                </div>
              </div>

              {/* Customer rows */}
              <div className="divide-y">
                {group.bookings.map(b => (
                  <CustomerRow
                    key={b.customer.id}
                    booking={b}
                    actionLoading={actionLoading}
                    onCheckIn={handleCheckIn}
                    onComplete={handleComplete}
                    onViewDetail={(id) => router.push(`/admin/customers/${id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerRow({
  booking: b,
  actionLoading,
  onCheckIn,
  onComplete,
  onViewDetail,
}: {
  booking: StagingBooking;
  actionLoading: string | null;
  onCheckIn: (id: string) => void;
  onComplete: (id: string) => void;
  onViewDetail: (id: string) => void;
}) {
  const isLoading = actionLoading === b.customer.id;
  const vehicleRec = getVehicleRecommendation(b.customer.size as PickupSize);

  return (
    <div className={`px-4 py-3 ${b.customer.is_vip ? 'bg-amber-50' : ''} ${b.booking.status === 'completed' ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Big label */}
        {b.label && (
          <div className="shrink-0 w-14 h-14 rounded-sm bg-accent flex items-center justify-center">
            <span className="font-mono text-lg font-black text-accent-foreground">{b.label.label}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => onViewDetail(b.customer.id)} className="font-medium text-sm hover:text-primary hover:underline">
              {b.customer.name}
            </button>
            {b.customer.is_vip && (
              <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">VIP</span>
            )}
            <StatusBadge status={b.booking.status} />
          </div>
          {b.customer.is_vip && b.customer.vip_note && (
            <p className="text-xs text-amber-700 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {b.customer.vip_note}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {vehicleRec}
            </span>
            {b.customer.phone && <span>{b.customer.phone}</span>}
          </div>

          {/* Items */}
          <div className="space-y-1">
            {b.items.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {item.fulfillment_status === 'picked_up' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <span className={item.fulfillment_status === 'picked_up' ? 'line-through text-gray-400' : ''}>
                  {item.qty}x {item.item_name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex flex-col gap-2">
          {b.booking.status === 'confirmed' && (
            <button
              onClick={() => onCheckIn(b.customer.id)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 min-w-[100px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Check In'}
            </button>
          )}
          {b.booking.status === 'checked_in' && (
            <button
              onClick={() => onComplete(b.customer.id)}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 min-w-[100px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Complete'}
            </button>
          )}
          {b.booking.status === 'completed' && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    checked_in: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
    no_show: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    confirmed: 'Pending',
    checked_in: 'Checked In',
    completed: 'Done',
    no_show: 'No-Show',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}
