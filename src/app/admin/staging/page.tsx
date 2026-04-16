'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, CheckCircle, Loader2, Check, Package, Calendar, Clock, Tag, ExternalLink
} from 'lucide-react';
import { SEGMENT_COLORS } from '@/lib/types';

interface StagingItem {
  lineItemId: string;
  name: string;
  qty: number;
  status: string;
  weight: string;
  handling: string;
}

interface StagingCustomer {
  customerId: string;
  customerName: string;
  label: string | null;
  prefix: string | null;
  stagingZone: string | null;
  bookingDay: string | null;
  bookingTime: string | null;
  items: StagingItem[];
  allStaged: boolean;
}

interface DayData {
  customers: StagingCustomer[];
  totalItems: number;
  stagedItems: number;
}

interface StagingData {
  byDay: Record<string, DayData>;
  unbooked: StagingCustomer[];
  stats: { totalItems: number; stagedItems: number; totalCustomers: number };
}

const ZONE_STYLES: Record<string, { bg: string; text: string }> = {
  B: { bg: 'bg-amber-100', text: 'text-amber-800' },
  E: { bg: 'bg-purple-100', text: 'text-purple-800' },
  S: { bg: 'bg-blue-100', text: 'text-blue-800' },
  W: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  I: { bg: 'bg-gray-200', text: 'text-gray-800' },
  C: { bg: 'bg-red-100', text: 'text-red-800' },
  X: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

type DayTab = 'Thursday' | 'Friday' | 'Saturday' | 'May2' | 'unbooked';

export default function StagingPage() {
  const router = useRouter();
  const [data, setData] = useState<StagingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dayTab, setDayTab] = useState<DayTab>('Thursday');
  const [showStaged, setShowStaged] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/staging-prep');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (action: string, params: Record<string, string>) => {
    // Optimistic update
    if (data && (action === 'stage_item' || action === 'unstage_item')) {
      setData(prev => {
        if (!prev) return prev;
        const newStatus = action === 'stage_item' ? 'staged' : 'confirmed';
        const updateCustomers = (custs: StagingCustomer[]) => custs.map(c => ({
          ...c,
          items: c.items.map(i => i.lineItemId === params.lineItemId ? { ...i, status: newStatus } : i),
        })).map(c => ({ ...c, allStaged: c.items.every(i => i.status === 'staged' || i.status === 'picked_up') }));

        const newByDay: Record<string, DayData> = {};
        for (const [day, dd] of Object.entries(prev.byDay)) {
          const updated = updateCustomers(dd.customers);
          let total = 0, staged = 0;
          for (const c of updated) for (const i of c.items) { total += i.qty; if (i.status === 'staged' || i.status === 'picked_up') staged += i.qty; }
          newByDay[day] = { customers: updated, totalItems: total, stagedItems: staged };
        }
        const totalItems = Object.values(newByDay).reduce((s, d) => s + d.totalItems, 0);
        const stagedItems = Object.values(newByDay).reduce((s, d) => s + d.stagedItems, 0);
        return { ...prev, byDay: newByDay, unbooked: updateCustomers(prev.unbooked), stats: { ...prev.stats, totalItems, stagedItems } };
      });
    }
    if (data && action === 'stage_all') {
      setData(prev => {
        if (!prev) return prev;
        const updateCustomers = (custs: StagingCustomer[]) => custs.map(c => {
          if (c.customerId !== params.customerId) return c;
          return { ...c, items: c.items.map(i => (i.status !== 'picked_up') ? { ...i, status: 'staged' } : i), allStaged: true };
        });
        const newByDay: Record<string, DayData> = {};
        for (const [day, dd] of Object.entries(prev.byDay)) {
          const updated = updateCustomers(dd.customers);
          let total = 0, staged = 0;
          for (const c of updated) for (const i of c.items) { total += i.qty; if (i.status === 'staged' || i.status === 'picked_up') staged += i.qty; }
          newByDay[day] = { customers: updated, totalItems: total, stagedItems: staged };
        }
        const totalItems = Object.values(newByDay).reduce((s, d) => s + d.totalItems, 0);
        const stagedItems = Object.values(newByDay).reduce((s, d) => s + d.stagedItems, 0);
        return { ...prev, byDay: newByDay, unbooked: updateCustomers(prev.unbooked), stats: { ...prev.stats, totalItems, stagedItems } };
      });
    }

    fetch('/api/admin/staging-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const { stats } = data;
  const progressPct = stats.totalItems > 0 ? Math.round((stats.stagedItems / stats.totalItems) * 100) : 0;

  // Get current day's data
  const days: DayTab[] = ['Thursday', 'Friday', 'Saturday'];
  if (data.byDay['May2']) days.push('May2');
  if (data.unbooked.length > 0) days.push('unbooked');

  let currentCustomers: StagingCustomer[] = [];
  let dayTotal = 0, dayStaged = 0;

  if (dayTab === 'unbooked') {
    currentCustomers = data.unbooked;
    for (const c of currentCustomers) for (const i of c.items) { dayTotal += i.qty; if (i.status === 'staged' || i.status === 'picked_up') dayStaged += i.qty; }
  } else if (data.byDay[dayTab]) {
    currentCustomers = data.byDay[dayTab].customers;
    dayTotal = data.byDay[dayTab].totalItems;
    dayStaged = data.byDay[dayTab].stagedItems;
  }

  // Apply filters
  if (search) {
    const q = search.toLowerCase();
    currentCustomers = currentCustomers.filter(c =>
      c.customerName.toLowerCase().includes(q) || (c.label || '').toLowerCase().includes(q)
    );
  }
  if (!showStaged) {
    currentCustomers = currentCustomers.filter(c => !c.allStaged);
  }

  const dayPct = dayTotal > 0 ? Math.round((dayStaged / dayTotal) * 100) : 0;

  // Compute item type totals for current day (before search filter)
  const allDayCustomers = dayTab === 'unbooked' ? data.unbooked : (data.byDay[dayTab]?.customers || []);
  const itemTotals = new Map<string, { qty: number; staged: number }>();
  for (const c of allDayCustomers) {
    for (const item of c.items) {
      if (!itemTotals.has(item.name)) itemTotals.set(item.name, { qty: 0, staged: 0 });
      const t = itemTotals.get(item.name)!;
      t.qty += item.qty;
      if (item.status === 'staged' || item.status === 'picked_up') t.staged += item.qty;
    }
  }
  const sortedItemTotals = [...itemTotals.entries()].sort((a, b) => b[1].qty - a[1].qty);

  // Group by timeslot for display
  const bySlot = new Map<string, StagingCustomer[]>();
  for (const c of currentCustomers) {
    const slot = c.bookingTime || 'Unbooked';
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)!.push(c);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="w-6 h-6 text-primary" />
          Pickup Staging
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Stage items by pickup time. Check off as you pull and prep.</p>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">Overall: <strong>{stats.stagedItems}</strong> of <strong>{stats.totalItems}</strong> items staged</p>
          <p className="text-lg font-bold text-primary">{progressPct}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 border-b">
        {days.map(day => {
          const dd = day === 'unbooked' ? null : data.byDay[day];
          const pct = dd ? (dd.totalItems > 0 ? Math.round((dd.stagedItems / dd.totalItems) * 100) : 0) : 0;
          const label = day === 'May2' ? 'May 2' : day === 'unbooked' ? 'Unbooked' : day;
          const count = day === 'unbooked' ? data.unbooked.length : (dd?.customers.length || 0);
          const isActive = dayTab === day;

          return (
            <button key={day} onClick={() => setDayTab(day)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
              {dd && pct === 100 && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
              {dd && pct > 0 && pct < 100 && <span className="text-[10px] text-gray-400">{pct}%</span>}
            </button>
          );
        })}
      </div>

      {/* Day progress */}
      {dayTab !== 'unbooked' && dayTotal > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">{dayTab === 'May2' ? 'May 2' : dayTab}:</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${dayPct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${dayPct}%` }} />
          </div>
          <span className="font-medium">{dayStaged}/{dayTotal} items ({dayPct}%)</span>
        </div>
      )}

      {/* Item totals for this day */}
      {sortedItemTotals.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            {dayTab === 'unbooked' ? 'Unbooked' : dayTab === 'May2' ? 'May 2' : dayTab} — Items Summary
          </p>
          <div className="flex flex-wrap gap-3">
            {sortedItemTotals.map(([name, { qty, staged }]) => (
              <div key={name} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium">{qty}x</span>
                <span className="text-sm text-gray-600">{name}</span>
                {staged > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${staged === qty ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {staged}/{qty} staged
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or label..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={showStaged} onChange={e => setShowStaged(e.target.checked)} className="rounded" />
          Show staged
        </label>
      </div>

      {/* Customers by timeslot */}
      {[...bySlot.entries()].map(([slot, customers]) => (
        <div key={slot} className="space-y-2">
          <div className="flex items-center gap-2 sticky top-14 bg-secondary/30 py-2 z-10">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-lg">{slot}</h3>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
              {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </span>
            {customers.every(c => c.allStaged) && <CheckCircle className="w-4 h-4 text-green-500" />}
          </div>

          <div className="space-y-1.5">
            {customers.map(customer => {
              const zoneStyle = ZONE_STYLES[customer.prefix || 'X'] || ZONE_STYLES.X;
              return (
                <div key={customer.customerId}
                  className={`bg-white rounded-lg border px-4 py-3 ${customer.allStaged ? 'border-green-200 bg-green-50/30' : ''}`}>
                  <div className="flex items-center gap-3">
                    {/* Label */}
                    {customer.label && (
                      <div className={`shrink-0 w-11 h-11 rounded-lg ${zoneStyle.bg} flex items-center justify-center`}>
                        <span className={`font-mono text-base font-black ${zoneStyle.text}`}>{customer.label}</span>
                      </div>
                    )}

                    {/* Customer info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/admin/customers/${customer.customerId}`)}
                          className="font-bold text-sm hover:text-primary hover:underline transition-colors">
                          {customer.customerName}
                        </button>
                        {customer.allStaged && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {customer.stagingZone && (
                          <span className="text-[10px] text-gray-400">{customer.stagingZone}</span>
                        )}
                      </div>
                      {/* Items inline */}
                      <div className="flex items-center gap-3 mt-1">
                        {customer.items.map(item => {
                          const isStaged = item.status === 'staged' || item.status === 'picked_up';
                          return (
                            <button key={item.lineItemId}
                              onClick={() => doAction(isStaged ? 'unstage_item' : 'stage_item', { lineItemId: item.lineItemId, customerId: customer.customerId })}
                              disabled={item.status === 'picked_up'}
                              className="flex items-center gap-1.5 group">
                              <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                                isStaged ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 group-hover:border-green-400'
                              }`}>
                                {isStaged && <Check className="w-3 h-3" />}
                              </div>
                              <span className={`text-xs ${isStaged ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                {item.qty}x {item.name}
                              </span>
                              {item.weight && !isStaged && <span className="text-[10px] text-gray-400">{item.weight}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!customer.allStaged && (
                        <button onClick={() => doAction('stage_all', { customerId: customer.customerId })}
                          className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90">
                          Stage All
                        </button>
                      )}
                      <button onClick={() => router.push(`/admin/customers/${customer.customerId}`)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {currentCustomers.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold">{!showStaged ? 'All staged for this day!' : 'No customers match'}</p>
        </div>
      )}
    </div>
  );
}
