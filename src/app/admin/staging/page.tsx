'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, CheckCircle, Loader2, Check, Package, Calendar, Tag
} from 'lucide-react';

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

interface StagingZone {
  prefix: string;
  name: string;
  zone: string;
  color: string;
  bgColor: string;
  customers: StagingCustomer[];
  totalItems: number;
  stagedItems: number;
}

interface StagingData {
  zones: StagingZone[];
  stats: { totalItems: number; stagedItems: number; totalCustomers: number; totalZones: number };
}

const ZONE_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  B: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-800' },
  E: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'text-purple-800' },
  S: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-800' },
  W: { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'text-indigo-800' },
  I: { bg: 'bg-gray-50', border: 'border-gray-300', accent: 'text-gray-800' },
  C: { bg: 'bg-red-50', border: 'border-red-200', accent: 'text-red-800' },
  X: { bg: 'bg-gray-50', border: 'border-gray-200', accent: 'text-gray-600' },
};

export default function StagingPage() {
  const [data, setData] = useState<StagingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [showStaged, setShowStaged] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/staging-prep');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (action: string, params: Record<string, string>) => {
    const key = `${action}-${params.lineItemId || params.customerId}`;
    setActionLoading(key);
    await fetch('/api/admin/staging-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
    await fetchData();
    setActionLoading(null);
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const { stats } = data;
  const progressPct = stats.totalItems > 0 ? Math.round((stats.stagedItems / stats.totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="w-6 h-6 text-primary" />
          Pickup Staging
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pull and stage items by zone for pickup day. Check off as you go.</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium text-gray-600">Staging Progress</p>
            <p className="text-3xl font-bold">{stats.stagedItems} <span className="text-lg text-gray-400">/ {stats.totalItems} items</span></p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{progressPct}%</p>
            <p className="text-xs text-gray-400">{stats.totalCustomers} customers</p>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Zone quick stats */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterZone('')}
          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${!filterZone ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
          All Zones
        </button>
        {data.zones.map(z => {
          const style = ZONE_STYLES[z.prefix] || ZONE_STYLES.X;
          const active = filterZone === z.prefix;
          return (
            <button key={z.prefix} onClick={() => setFilterZone(active ? '' : z.prefix)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                active ? `${style.bg} ${style.border} ${style.accent} border-2` : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}>
              <span className="font-mono font-bold">{z.prefix}</span>
              <span>{z.name}</span>
              <span className="text-xs opacity-60">{z.stagedItems}/{z.totalItems}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or label..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showStaged} onChange={e => setShowStaged(e.target.checked)} className="rounded" />
          Show staged
        </label>
      </div>

      {/* Zones */}
      {data.zones
        .filter(z => !filterZone || z.prefix === filterZone)
        .map(zone => {
          const style = ZONE_STYLES[zone.prefix] || ZONE_STYLES.X;
          let customers = zone.customers;

          if (search) {
            const q = search.toLowerCase();
            customers = customers.filter(c =>
              c.customerName.toLowerCase().includes(q) || (c.label || '').toLowerCase().includes(q)
            );
          }
          if (!showStaged) {
            customers = customers.filter(c => !c.allStaged);
          }
          if (customers.length === 0) return null;

          return (
            <div key={zone.prefix} className="space-y-2">
              {/* Zone header */}
              <div className={`flex items-center justify-between ${style.bg} ${style.border} border rounded-lg px-4 py-3`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-2xl font-black ${style.accent}`}>{zone.prefix}</span>
                  <div>
                    <p className={`font-bold ${style.accent}`}>{zone.name}</p>
                    <p className="text-xs text-gray-500">{zone.zone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${style.accent}`}>{zone.stagedItems}/{zone.totalItems}</p>
                  <p className="text-xs text-gray-500">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Customers in zone */}
              <div className="space-y-1">
                {customers.map(customer => (
                  <div key={customer.customerId}
                    className={`bg-white rounded-lg border px-4 py-3 ${customer.allStaged ? 'border-green-200 bg-green-50/30' : ''}`}>
                    <div className="flex items-center gap-3">
                      {/* Label badge */}
                      {customer.label && (
                        <div className={`shrink-0 w-12 h-12 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center`}>
                          <span className={`font-mono text-lg font-black ${style.accent}`}>{customer.label}</span>
                        </div>
                      )}

                      {/* Customer info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{customer.customerName}</span>
                          {customer.allStaged && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {customer.bookingDay && customer.bookingTime && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {customer.bookingDay} {customer.bookingTime}
                            </span>
                          )}
                          <span>{customer.items.reduce((s, i) => s + i.qty, 0)} item{customer.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Quick stage all */}
                      {!customer.allStaged && (
                        <button onClick={() => doAction('stage_all', { customerId: customer.customerId })}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                          {actionLoading === `stage_all-${customer.customerId}` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Stage All'}
                        </button>
                      )}
                    </div>

                    {/* Item checklist */}
                    <div className="mt-2 ml-15 space-y-1">
                      {customer.items.map(item => {
                        const isStaged = item.status === 'staged' || item.status === 'picked_up';
                        const isItemLoading = actionLoading === `stage_item-${item.lineItemId}` || actionLoading === `unstage_item-${item.lineItemId}`;
                        return (
                          <div key={item.lineItemId} className="flex items-center gap-2.5 py-0.5">
                            <button
                              onClick={() => doAction(isStaged ? 'unstage_item' : 'stage_item', { lineItemId: item.lineItemId, customerId: customer.customerId })}
                              disabled={item.status === 'picked_up' || !!actionLoading}
                              className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isStaged ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-green-400'
                              } ${item.status === 'picked_up' ? 'opacity-50' : ''}`}
                            >
                              {isItemLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isStaged ? <Check className="w-3 h-3" /> : null}
                            </button>
                            <span className={`text-sm ${isStaged ? 'text-gray-400 line-through' : ''}`}>
                              {item.qty}x {item.name}
                            </span>
                            {item.weight && <span className="text-xs text-gray-400">{item.weight}</span>}
                            {item.handling && !isStaged && <span className="text-xs text-amber-600">{item.handling}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {data.zones.every(z => {
        let customers = z.customers;
        if (filterZone && z.prefix !== filterZone) return true;
        if (search) customers = customers.filter(c => c.customerName.toLowerCase().includes(search.toLowerCase()) || (c.label || '').toLowerCase().includes(search.toLowerCase()));
        if (!showStaged) customers = customers.filter(c => !c.allStaged);
        return customers.length === 0;
      }) && (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold">{!showStaged ? 'All staged!' : 'No items match'}</p>
        </div>
      )}
    </div>
  );
}
