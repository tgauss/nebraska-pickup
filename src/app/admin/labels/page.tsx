'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Printer, Search, Tag, Package, CheckCircle, Filter,
  Loader2, ChevronDown
} from 'lucide-react';

interface LabelItem {
  name: string;
  qty: number;
  weight: string;
  handling: string;
}

interface LabelData {
  label: string;
  prefix: string;
  number: number;
  stagingZone: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  segment: string;
  size: string;
  orders: string[];
  pickupItems: LabelItem[];
  totalQty: number;
  bookingDay: string | null;
  bookingTime: string | null;
  hasBooked: boolean;
}

interface ZoneInfo {
  prefix: string;
  zone: string;
  count: number;
}

const PREFIX_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  B: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-300' },
  E: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-300' },
  S: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-300' },
  W: { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-300' },
  I: { bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-400' },
  C: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-300' },
  X: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
};

const PREFIX_NAMES: Record<string, string> = {
  B: 'Bench', E: 'End-Row', S: 'Seat', W: 'Wall Mount', I: 'Iron', C: 'Chair Back', X: 'Other',
};

export default function LabelsPage() {
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [prefixFilter, setPrefixFilter] = useState('');
  const [bookedFilter, setBookedFilter] = useState<'' | 'booked' | 'unbooked'>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/labels');
    if (res.ok) {
      const d = await res.json();
      setLabels(d.labels);
      setZones(d.zones);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter
  let filtered = labels;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l =>
      l.customerName.toLowerCase().includes(q) ||
      l.label.toLowerCase().includes(q) ||
      l.orders.some(o => o.toLowerCase().includes(q))
    );
  }
  if (prefixFilter) filtered = filtered.filter(l => l.prefix === prefixFilter);
  if (bookedFilter === 'booked') filtered = filtered.filter(l => l.hasBooked);
  if (bookedFilter === 'unbooked') filtered = filtered.filter(l => !l.hasBooked);

  const toggleSelect = (label: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(l => l.label)));
    }
  };

  const selectByPrefix = (prefix: string) => {
    const prefixLabels = filtered.filter(l => l.prefix === prefix).map(l => l.label);
    setSelected(new Set([...selected, ...prefixLabels]));
  };

  const printSelected = () => {
    const toPrint = selected.size > 0
      ? filtered.filter(l => selected.has(l.label))
      : filtered;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Pickup Labels</title>
<style>
  @page {
    size: 4in 6in;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
  .label {
    width: 4in;
    height: 6in;
    padding: 0.3in;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .label:last-child { page-break-after: auto; }

  .label-code {
    font-size: 72pt;
    font-weight: 900;
    font-family: 'Courier New', monospace;
    text-align: center;
    line-height: 1;
    letter-spacing: 2px;
    padding: 0.15in 0 0.1in;
    border-bottom: 4px solid #000;
  }
  .customer-name {
    font-size: 22pt;
    font-weight: 700;
    text-align: center;
    padding: 0.12in 0;
    border-bottom: 2px solid #ccc;
  }
  .zone {
    font-size: 11pt;
    font-weight: 600;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 0.08in 0;
    background: #f0f0f0;
    border-bottom: 1px solid #ccc;
  }
  .items {
    flex: 1;
    padding: 0.1in 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .item {
    font-size: 11pt;
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
  }
  .item-qty {
    font-weight: 700;
    min-width: 30px;
  }
  .item-name { flex: 1; }
  .item-weight { color: #666; font-size: 9pt; }
  .meta {
    border-top: 2px solid #000;
    padding-top: 0.08in;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 9pt;
    color: #444;
  }
  .meta-orders { font-family: 'Courier New', monospace; font-size: 9pt; }
  .booking {
    font-size: 13pt;
    font-weight: 700;
    text-align: right;
  }
  .booking-day { font-size: 10pt; color: #666; }
</style>
</head>
<body>
${toPrint.map(l => `
  <div class="label">
    <div class="label-code">${l.label}</div>
    <div class="customer-name">${l.customerName}</div>
    <div class="zone">${l.stagingZone}</div>
    <div class="items">
      ${l.pickupItems.map(i => `
        <div class="item">
          <span class="item-qty">${i.qty}x</span>
          <span class="item-name">${i.name}</span>
          ${i.weight ? `<span class="item-weight">${i.weight}</span>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="meta">
      <div>
        <div class="meta-orders">${l.orders.join(', ')}</div>
        ${l.customerPhone ? `<div>${l.customerPhone}</div>` : ''}
      </div>
      <div>
        ${l.hasBooked ? `
          <div class="booking">${l.bookingTime || ''}</div>
          <div class="booking-day">${l.bookingDay || ''}</div>
        ` : '<div style="color:#c00;font-weight:700">NOT BOOKED</div>'}
      </div>
    </div>
  </div>
`).join('')}
</body>
</html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Pickup Labels
          </h1>
          <p className="text-sm text-muted-foreground mt-1">4x6 labels for staging — click to select, then print</p>
        </div>
        <button
          onClick={printSelected}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:bg-primary/90 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Print {selected.size > 0 ? `${selected.size} Selected` : `All ${filtered.length}`}
        </button>
      </div>

      {/* Zone summary */}
      <div className="flex flex-wrap gap-2">
        {zones.map(z => {
          const colors = PREFIX_COLORS[z.prefix] || PREFIX_COLORS.X;
          return (
            <button
              key={z.prefix}
              onClick={() => {
                setPrefixFilter(prefixFilter === z.prefix ? '' : z.prefix);
                setSelected(new Set());
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-sm font-medium transition-colors ${
                prefixFilter === z.prefix
                  ? `${colors.bg} ${colors.text} ${colors.border} border-2`
                  : `bg-card border-border hover:${colors.bg}`
              }`}
            >
              <span className="font-mono font-bold">{z.prefix}</span>
              <span>{PREFIX_NAMES[z.prefix] || z.prefix}</span>
              <span className="text-xs opacity-60">{z.count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, label, or order #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={bookedFilter}
          onChange={e => setBookedFilter(e.target.value as '' | 'booked' | 'unbooked')}
          className="border border-border rounded-sm px-3 py-2 text-sm bg-background"
        >
          <option value="">All Status</option>
          <option value="booked">Booked Only</option>
          <option value="unbooked">Unbooked Only</option>
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-2 border border-border rounded-sm text-sm hover:bg-secondary"
          >
            {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
          {prefixFilter && (
            <button
              onClick={() => selectByPrefix(prefixFilter)}
              className="px-3 py-2 border border-border rounded-sm text-sm hover:bg-secondary"
            >
              Select All {PREFIX_NAMES[prefixFilter]}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} label{filtered.length !== 1 ? 's' : ''}
        {selected.size > 0 && <span className="text-primary font-medium"> &middot; {selected.size} selected</span>}
      </p>

      {/* Label grid — preview cards */}
      <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.map(l => {
          const colors = PREFIX_COLORS[l.prefix] || PREFIX_COLORS.X;
          const isSelected = selected.has(l.label);

          return (
            <button
              key={l.label}
              onClick={() => toggleSelect(l.label)}
              className={`text-left rounded-sm border-2 overflow-hidden transition-all hover:shadow-md ${
                isSelected
                  ? `${colors.border} ring-2 ring-primary shadow-md`
                  : 'border-border hover:border-gray-400'
              }`}
            >
              {/* Label code — big and bold */}
              <div className={`${colors.bg} ${colors.text} px-3 py-3 text-center border-b ${colors.border}`}>
                <p className="font-mono text-3xl font-black tracking-wider">{l.label}</p>
              </div>

              {/* Customer + items */}
              <div className="p-2.5 space-y-1.5">
                <p className="font-bold text-sm truncate">{l.customerName}</p>
                <div className="space-y-0.5">
                  {l.pickupItems.slice(0, 3).map((item, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground truncate">
                      {item.qty}x {item.name}
                    </p>
                  ))}
                  {l.pickupItems.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{l.pickupItems.length - 3} more</p>
                  )}
                </div>

                {/* Booking status */}
                <div className="pt-1 border-t border-border">
                  {l.hasBooked ? (
                    <p className="text-[11px] text-green-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {l.bookingDay} {l.bookingTime}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 font-medium">Not booked</p>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground font-mono">{l.orders[0]}</p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-xs font-medium">
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No labels match your filters.</p>
        </div>
      )}
    </div>
  );
}
