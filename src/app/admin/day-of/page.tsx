'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, CheckCircle, Clock, Truck, UserCheck, AlertTriangle, Printer, Loader2 } from 'lucide-react';
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
  const [selectedDay, setSelectedDay] = useState('Thursday');
  const [stagingGroups, setStagingGroups] = useState<StagingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Walk-in search
  const [walkInSearch, setWalkInSearch] = useState('');
  const [walkInResults, setWalkInResults] = useState<Array<{
    id: string; name: string; email: string; token: string; segment: string;
    bookings: Array<{ status: string; time_slots: { day: string; time: string } | null }>;
  }>>([]);
  const [walkInSearching, setWalkInSearching] = useState(false);

  const fetchStaging = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/staging/${selectedDay}`);
    const data = await res.json();
    setStagingGroups(data.staging_groups || []);
    setLoading(false);
  }, [selectedDay]);

  useEffect(() => { fetchStaging(); }, [fetchStaging]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStaging, 30000);
    return () => clearInterval(interval);
  }, [fetchStaging]);

  const handleCheckIn = async (customerId: string) => {
    setActionLoading(customerId);
    try {
      const res = await fetch(`/api/admin/checkin/${customerId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Check-in failed');
      await fetchStaging();
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
      await fetchStaging();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Day-of Operations</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          <Printer className="w-4 h-4" />
          Print Staging
        </button>
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

      {/* Walk-in search */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          Walk-in / Lookup
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={walkInSearch}
              onChange={e => setWalkInSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchWalkIn()}
              placeholder="Search by name, email, or order #..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={searchWalkIn}
            disabled={walkInSearching}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
          >
            Search
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staging groups by time slot */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : stagingGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No bookings for {selectedDay}</div>
      ) : (
        <div className="space-y-4 print:space-y-6">
          {stagingGroups.map(group => (
            <div key={group.slot.id} className="bg-white rounded-xl border overflow-hidden">
              {/* Slot header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">{group.slot.time}</span>
                  <span className="text-xs text-gray-500">
                    {group.bookings.length} customer{group.bookings.length !== 1 ? 's' : ''} / {group.total_items} items
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {group.slot.current_bookings}/{group.slot.capacity} slots used
                </span>
              </div>

              {/* Customer rows */}
              {group.bookings.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">No bookings</div>
              ) : (
                <div className="divide-y">
                  {group.bookings.map(b => (
                    <CustomerRow
                      key={b.customer.id}
                      booking={b}
                      actionLoading={actionLoading}
                      onCheckIn={handleCheckIn}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              )}
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
}: {
  booking: StagingBooking;
  actionLoading: string | null;
  onCheckIn: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const isLoading = actionLoading === b.customer.id;
  const vehicleRec = getVehicleRecommendation(b.customer.size as PickupSize);

  return (
    <div className={`px-4 py-3 ${b.customer.is_vip ? 'bg-amber-50' : ''} ${b.booking.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Big label */}
        {b.label && (
          <div className="shrink-0 w-14 h-14 rounded-sm bg-accent flex items-center justify-center print:border print:border-black">
            <span className="font-mono text-lg font-black text-accent-foreground">{b.label.label}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">
              {b.customer.name}
              {b.customer.is_vip && (
                <span className="ml-1 text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">VIP</span>
              )}
            </p>
            <StatusDot status={b.booking.status} />
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

          {/* Items checklist */}
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

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: 'bg-blue-400',
    checked_in: 'bg-indigo-400',
    completed: 'bg-green-400',
    no_show: 'bg-red-400',
  };
  return (
    <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} title={status} />
  );
}
