'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Mail, Phone, MapPin, ExternalLink, Copy, Check,
  Clock, Package, CheckCircle, Plus, X, Loader2, AlertTriangle,
  Calendar, ArrowUpDown, ArrowUp, ArrowDown, Navigation
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { SEGMENT_LABELS, SEGMENT_COLORS } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ── Types ──────────────────────────────────────────────────────

interface PendingCustomer {
  id: string;
  token: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  state: string;
  segment: string;
  drive_minutes: number;
  size: string;
  shipping_paid: number;
  offer_pickup_conversion: boolean;
  orderValue: number;
  orders: string[];
  pickupItems: Array<{ name: string; qty: number; price: number }>;
  shipItems: Array<{ name: string; qty: number }>;
  pickupLink: string;
  altContacts: Array<{ type: string; value: string; source: string; added_at: string }>;
  outreach: Array<{ action: string; details: Record<string, unknown>; created_at: string }>;
}

interface BookedCustomer {
  id: string;
  name: string;
  segment: string;
  bookingDay: string | null;
  bookingTime: string | null;
  bookedAt: string;
}

interface PendingData {
  totalPickupRequired: number;
  totalBooked: number;
  totalUnbooked: number;
  bookingRate: number;
  unbooked: PendingCustomer[];
  recentlyBooked: BookedCustomer[];
}

type SortField = 'name' | 'drive_minutes' | 'orderValue' | 'segment';
type Tab = 'pending' | 'scheduled';

// ── Main Page ──────────────────────────────────────────────────

export default function PendingPage() {
  const [data, setData] = useState<PendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('drive_minutes');
  const [sortAsc, setSortAsc] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<{ customerId: string; type: 'email' | 'phone'; value: string } | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [scheduledSearch, setScheduledSearch] = useState('');
  const [scheduledSearchInput, setScheduledSearchInput] = useState('');
  const [scheduledDayFilter, setScheduledDayFilter] = useState('');
  // Modal state — unified for both tabs
  const [modalCustomer, setModalCustomer] = useState<PendingCustomer | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalBooked, setModalBooked] = useState<{ day: string; time: string } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/pending');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalCustomer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [modalCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => setScheduledSearch(scheduledSearchInput), 300);
    return () => clearTimeout(timer);
  }, [scheduledSearchInput]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddContact = async () => {
    if (!contactForm || !contactForm.value.trim()) return;
    setContactSaving(true);
    await fetch('/api/pending/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: contactForm.customerId,
        type: contactForm.type,
        value: contactForm.value.trim(),
        source: 'UNL Staff',
      }),
    });
    setContactForm(null);
    setContactSaving(false);
    await fetchData();
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(field === 'name');
    }
  };

  // Open modal — for pending customers we already have data, for scheduled we fetch
  const openPendingModal = (customer: PendingCustomer) => {
    setModalCustomer(customer);
    setModalBooked(null);
  };

  const openScheduledModal = async (customerId: string, booking: { day: string; time: string } | null) => {
    setModalLoading(true);
    setModalBooked(booking);
    setModalCustomer(null);
    const res = await fetch(`/api/pending/detail?id=${customerId}`);
    if (res.ok) setModalCustomer(await res.json());
    setModalLoading(false);
  };

  const closeModal = () => {
    setModalCustomer(null);
    setModalLoading(false);
    setModalBooked(null);
    setContactForm(null);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" className="h-12 w-auto animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading pickup data...</p>
      </div>
    );
  }

  // Filter and sort pending
  let filtered = data.unbooked;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.orders.some(o => o.toLowerCase().includes(q))
    );
  }
  if (segmentFilter) {
    filtered = filtered.filter(c => c.segment === segmentFilter);
  }
  filtered = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'drive_minutes') cmp = (a.drive_minutes || 999) - (b.drive_minutes || 999);
    else if (sortBy === 'orderValue') cmp = b.orderValue - a.orderValue;
    else if (sortBy === 'segment') cmp = a.segment.localeCompare(b.segment);
    return sortAsc ? cmp : -cmp;
  });

  // Filter + group scheduled
  let filteredScheduled = data.recentlyBooked;
  if (scheduledSearch) {
    const q = scheduledSearch.toLowerCase();
    filteredScheduled = filteredScheduled.filter(c => c.name.toLowerCase().includes(q));
  }
  if (scheduledDayFilter) {
    filteredScheduled = filteredScheduled.filter(c => c.bookingDay === scheduledDayFilter);
  }
  const scheduledByDay: Record<string, BookedCustomer[]> = {};
  for (const c of filteredScheduled) {
    const day = c.bookingDay || 'Unassigned';
    if (!scheduledByDay[day]) scheduledByDay[day] = [];
    scheduledByDay[day].push(c);
  }
  for (const day of Object.keys(scheduledByDay)) {
    scheduledByDay[day].sort((a, b) => (a.bookingTime || '').localeCompare(b.bookingTime || ''));
  }
  const dayOrder = ['Thursday', 'Friday', 'Saturday', 'May2'];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-br from-[#d00000] via-[#b80000] to-[#8b0000] text-white relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0zM20 20h20v20H20z\' fill=\'%23fff\' fill-opacity=\'1\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px' }} />

        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="shrink-0 bg-white/10 backdrop-blur-sm rounded-sm p-2.5">
                <img
                  src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
                  alt="Nebraska N"
                  className="h-12 sm:h-14 w-auto"
                />
              </div>
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-sm">
                  Pickup Coordination
                </h1>
                <p className="text-white/70 text-sm mt-0.5">
                  Devaney Arena Seats &mdash; April 16&ndash;18, 2026 &middot; Roca, NE
                </p>
              </div>
            </div>

            {/* Live stats pill */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-sm px-5 py-3 border border-white/10">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{data.bookingRate}<span className="text-lg">%</span></p>
                <p className="text-[10px] text-white/60 uppercase tracking-widest font-medium">Booked</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{data.totalBooked}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-widest font-medium">Confirmed</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-amber-300">{data.totalUnbooked}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-widest font-medium">Pending</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
              <span>{data.totalBooked} of {data.totalPickupRequired} customers scheduled</span>
              <span>{data.bookingRate}% complete</span>
            </div>
            <div className="h-2.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-white/90 to-white rounded-full transition-all duration-1000"
                style={{ width: `${data.bookingRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex">
          <TabButton active={tab === 'pending'} onClick={() => { setTab('pending'); closeModal(); }} label="Pending" count={data.totalUnbooked} accent="amber" />
          <TabButton active={tab === 'scheduled'} onClick={() => { setTab('scheduled'); closeModal(); }} label="Scheduled" count={data.totalBooked} accent="green" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        {tab === 'pending' ? (
          <>
            {/* ── Pending Tab: Filters ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or order #..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-sm text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={segmentFilter}
                onChange={e => setSegmentFilter(e.target.value)}
                className="border border-border rounded-sm px-3 py-2.5 text-sm bg-background"
              >
                <option value="">All Segments</option>
                <option value="A">Seg A: Pickup Only</option>
                <option value="B">Seg B: Pickup + Ship</option>
                <option value="C">Seg C: Iron Local</option>
              </select>
            </div>

            <p className="text-sm text-muted-foreground">
              {filtered.length} pending customer{filtered.length !== 1 ? 's' : ''} need outreach
            </p>

            {/* ── Pending Table ── */}
            <div className="bg-card rounded-sm border border-border overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <SortableHeader label="Customer" field="name" current={sortBy} asc={sortAsc} onClick={handleSort} className="min-w-[180px]" />
                    <SortableHeader label="Location" field="drive_minutes" current={sortBy} asc={sortAsc} onClick={handleSort} />
                    <SortableHeader label="Segment" field="segment" current={sortBy} asc={sortAsc} onClick={handleSort} />
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                    <SortableHeader label="Order Value" field="orderValue" current={sortBy} asc={sortAsc} onClick={handleSort} />
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Orders</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Outreach</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">
                      {search || segmentFilter ? 'No customers match your filters.' : 'Everyone has booked!'}
                    </td></tr>
                  ) : filtered.map(c => {
                    const driveHrs = Math.floor(c.drive_minutes / 60);
                    const driveMins = c.drive_minutes % 60;
                    const driveStr = driveHrs > 0 ? `${driveHrs}h ${driveMins}m` : `${driveMins}m`;
                    const driveColor = !c.drive_minutes ? 'text-muted-foreground' : c.drive_minutes > 180 ? 'text-red-700 bg-red-50' : c.drive_minutes > 90 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50';
                    const totalPickupQty = c.pickupItems.reduce((s, i) => s + i.qty, 0);
                    const totalShipQty = c.shipItems.reduce((s, i) => s + i.qty, 0);

                    return (
                      <tr key={c.id} className="group cursor-pointer transition-colors hover:bg-secondary/30" onClick={() => openPendingModal(c)}>
                        <td className="px-4 py-3 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-foreground group-hover:text-primary transition-colors">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email || 'No email'}</p>
                              {c.altContacts.length > 0 && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mt-0.5 inline-block">+{c.altContacts.length} alt</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 cursor-pointer">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${driveColor}`}>
                            {c.drive_minutes ? driveStr : '?'}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{c.city}, {c.state}</p>
                        </td>
                        <td className="px-4 py-3 cursor-pointer">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>
                            {c.segment}
                          </span>
                        </td>
                        <td className="px-4 py-3 cursor-pointer">
                          <p className="text-xs">
                            {totalPickupQty > 0 && <span className="text-blue-600 font-medium">{totalPickupQty} pickup</span>}
                            {totalPickupQty > 0 && totalShipQty > 0 && <span className="text-muted-foreground"> / </span>}
                            {totalShipQty > 0 && <span className="text-muted-foreground">{totalShipQty} ship</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 cursor-pointer">
                          {c.orderValue > 0 ? (
                            <span className="text-sm font-medium">${c.orderValue.toLocaleString()}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-3 cursor-pointer">
                          <p className="text-xs font-mono text-muted-foreground">{c.orders.slice(0, 2).join(', ')}</p>
                          {c.orders.length > 2 && <p className="text-[10px] text-muted-foreground">+{c.orders.length - 2} more</p>}
                        </td>
                        <td className="px-4 py-3 cursor-pointer">
                          <div className="flex items-center gap-1.5">
                            {c.phone && <Phone className="w-3.5 h-3.5 text-green-600" />}
                            {c.email && <Mail className="w-3.5 h-3.5 text-blue-600" />}
                            {!c.phone && !c.email && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 cursor-pointer">
                          {(() => {
                            const texted = c.outreach.some(o => o.action === 'sms_sent');
                            const called = c.outreach.some(o => o.action === 'phone_called');
                            const emailed = c.outreach.some(o => o.action === 'email_sent' || o.action === 'admin_email_sent');
                            if (!texted && !called && !emailed) {
                              return <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> None</span>;
                            }
                            return (
                              <div className="flex flex-wrap gap-1">
                                {texted && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">SMS</span>}
                                {called && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Called</span>}
                                {emailed && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Email</span>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <a
                              href={c.pickupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                            <CopyBtn text={c.pickupLink} id={`${c.id}-tbl-link`} copied={copied} onCopy={copyToClipboard} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </>
        ) : (
          <>
            {/* ── Scheduled Tab ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Search scheduled customers..." value={scheduledSearchInput} onChange={e => setScheduledSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-sm text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <select value={scheduledDayFilter} onChange={e => setScheduledDayFilter(e.target.value)}
                className="border border-border rounded-sm px-3 py-2.5 text-sm bg-background">
                <option value="">All Days</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>

            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              {filteredScheduled.length} customer{filteredScheduled.length !== 1 ? 's' : ''} scheduled
            </p>

            {dayOrder.filter(d => scheduledByDay[d]).map(day => (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-2 mt-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-serif font-bold text-lg">{day === 'May2' ? 'May 2 (Overflow)' : day}</h3>
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">{scheduledByDay[day].length}</span>
                </div>
                <div className="bg-card rounded-sm border border-border overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {scheduledByDay[day].map(c => (
                        <tr key={c.id} className="group cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => openScheduledModal(c.id, c.bookingDay && c.bookingTime ? { day: c.bookingDay, time: c.bookingTime } : null)}>
                          <td className="px-4 py-3 w-8">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium group-hover:text-primary transition-colors">{c.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>{c.segment}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-medium">{c.bookingTime}</p>
                            <p className="text-xs text-muted-foreground">{c.bookingDay}</p>
                          </td>
                          <td className="px-4 py-3 w-8">
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ))}

            {filteredScheduled.length === 0 && (
              <EmptyState message={scheduledSearch || scheduledDayFilter ? 'No scheduled customers match your filters.' : 'No customers have booked yet.'} />
            )}
          </>
        )}

        {/* ── Detail Modal ── */}
        {(modalCustomer || modalLoading) && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-4" onClick={closeModal}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-card rounded-sm border border-border shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {modalLoading && !modalCustomer ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : modalCustomer ? (
                <CustomerModal
                  customer={modalCustomer}
                  booked={modalBooked}
                  onClose={closeModal}
                  copied={copied}
                  onCopy={copyToClipboard}
                  contactForm={contactForm}
                  onContactFormChange={setContactForm}
                  onAddContact={handleAddContact}
                  contactSaving={contactSaving}
                  showAddContact={!modalBooked}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-10 border-t border-border mt-8">
          <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" className="h-8 w-auto mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nebraska Rare Goods</p>
          <p className="mt-0.5">Devaney Pickup Coordination &middot; April 16&ndash;18, 2026 &middot; Roca, NE</p>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────

function SortableHeader({ label, field, current, asc, onClick, className }: {
  label: string; field: SortField; current: SortField; asc: boolean; onClick: (f: SortField) => void; className?: string;
}) {
  const active = current === field;
  return (
    <th className={`text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none ${className || ''}`} onClick={() => onClick(field)}>
      <div className="flex items-center gap-1">
        {label}
        {active ? (asc ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </div>
    </th>
  );
}

function TabButton({ active, onClick, label, count, accent }: {
  active: boolean; onClick: () => void; label: string; count: number; accent: string;
}) {
  const badgeColor = accent === 'green' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
  return (
    <button onClick={onClick} className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
      {label}
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${active ? badgeColor : 'bg-secondary text-muted-foreground'}`}>{count}</span>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
      <p className="text-lg font-serif font-bold">All caught up!</p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

function ItemsSection({ customer: c }: { customer: PendingCustomer }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Order Items ({c.pickupItems.reduce((s, i) => s + i.qty, 0) + c.shipItems.reduce((s, i) => s + i.qty, 0)} total)
      </h4>
      {c.pickupItems.length > 0 && (
        <div className="space-y-1 mb-2">
          <p className="text-xs text-blue-600 font-medium">Pickup</p>
          {c.pickupItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm px-3 py-1.5 bg-blue-50 rounded-sm">
              <span>{item.qty}x {item.name}</span>
              {item.price > 0 && <span className="text-muted-foreground">${(item.price * item.qty).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}
      {c.shipItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Shipping</p>
          {c.shipItems.map((item, i) => (
            <div key={i} className="text-sm px-3 py-1.5 bg-secondary/50 rounded-sm">{item.qty}x {item.name}</div>
          ))}
        </div>
      )}
      <p className="mt-2 text-sm"><span className="text-muted-foreground">Orders: </span><span className="font-mono text-xs">{c.orders.join(', ')}</span></p>
    </div>
  );
}

function PickupLinkSection({ customer: c, copied, onCopy }: { customer: PendingCustomer; copied: string | null; onCopy: (t: string, id: string) => void }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pickup Scheduling Link</h4>
      <div className="flex items-center gap-3">
        <a href={c.pickupLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium">
          <ExternalLink className="w-3.5 h-3.5" /> View Pickup Page
        </a>
        <CopyBtn text={c.pickupLink} id={`${c.id}-link`} copied={copied} onCopy={onCopy} label="Copy Link" />
      </div>
    </div>
  );
}

// ── Customer Modal (unified for pending + scheduled) ───────────

function CustomerModal({ customer: c, booked, onClose, copied, onCopy, contactForm, onContactFormChange, onAddContact, contactSaving, showAddContact }: {
  customer: PendingCustomer;
  booked: { day: string; time: string } | null;
  onClose: () => void;
  copied: string | null;
  onCopy: (t: string, id: string) => void;
  contactForm: { customerId: string; type: 'email' | 'phone'; value: string } | null;
  onContactFormChange: (f: { customerId: string; type: 'email' | 'phone'; value: string } | null) => void;
  onAddContact: () => void;
  contactSaving: boolean;
  showAddContact: boolean;
}) {
  const [realDrive, setRealDrive] = useState<{ minutes: number; miles: number } | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ lng: number; lat: number } | null>(null);

  // Fetch real drive time
  useEffect(() => {
    if (!c.city) return;
    fetch(`/api/admin/drivetime?city=${encodeURIComponent(c.city)}&state=${encodeURIComponent(c.state)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setRealDrive({ minutes: Math.round(d.duration_minutes), miles: Math.round(d.distance_miles) });
          setCustomerCoords({ lng: d.lng, lat: d.lat });
        }
      })
      .catch(() => {});
  }, [c.city, c.state]);

  const driveHrs = Math.floor(c.drive_minutes / 60);
  const driveMins = c.drive_minutes % 60;
  const estDriveStr = driveHrs > 0 ? `${driveHrs}h ${driveMins}m` : `${driveMins}m`;
  const realDriveStr = realDrive ? (
    Math.floor(realDrive.minutes / 60) > 0
      ? `${Math.floor(realDrive.minutes / 60)}h ${realDrive.minutes % 60}m`
      : `${realDrive.minutes}m`
  ) : null;

  return (
    <>
      {/* Modal header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b border-border ${booked ? 'bg-green-50' : 'bg-primary/5'}`}>
        <div>
          <h2 className="font-serif font-bold text-xl flex items-center gap-2 flex-wrap">
            {booked && <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
            {c.name}
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>
              Seg {c.segment}: {SEGMENT_LABELS[c.segment as keyof typeof SEGMENT_LABELS]}
            </span>
          </h2>
          {booked && (
            <p className="text-sm text-green-700 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Booked: {booked.day}, {booked.time}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-sm shrink-0">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Map */}
      {customerCoords && (
        <div className="border-b border-border">
          <MapView
            markers={[{
              lng: customerCoords.lng,
              lat: customerCoords.lat,
              label: c.segment,
              color: '#1a1a1a',
              popup: `<strong>${c.name}</strong><br>${c.city}, ${c.state}`,
            }]}
            showWarehouse
            showRoute
            routeFrom={customerCoords}
            className="w-full h-48"
          />
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* Contact + Drive info */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Contact & Location</h4>
          <div className="space-y-2">
            {c.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                <CopyBtn text={c.email} id={`m-${c.id}-email`} copied={copied} onCopy={onCopy} />
              </div>
            )}
            {c.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>
                <CopyBtn text={c.phone} id={`m-${c.id}-phone`} copied={copied} onCopy={onCopy} />
              </div>
            )}
            {!c.email && !c.phone && (
              <p className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> No contact on file</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" /> {c.city}, {c.state}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="w-4 h-4 shrink-0" />
              {realDriveStr ? (
                <span>{realDriveStr} drive ({realDrive!.miles} mi)</span>
              ) : (
                <span className="italic">~{estDriveStr} (est)</span>
              )}
            </div>
          </div>

          {/* Alt contacts */}
          {c.altContacts.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-blue-700">Alternate Contacts (UNL)</p>
              {c.altContacts.map((ac, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-blue-50 rounded-sm px-3 py-1.5">
                  {ac.type === 'email' ? <Mail className="w-3.5 h-3.5 text-blue-600" /> : <Phone className="w-3.5 h-3.5 text-blue-600" />}
                  <span>{ac.value}</span>
                  <span className="text-xs text-muted-foreground ml-auto">via {ac.source}</span>
                  <CopyBtn text={ac.value} id={`m-${c.id}-alt-${i}`} copied={copied} onCopy={onCopy} />
                </div>
              ))}
            </div>
          )}

          {/* Add contact (only for pending, not scheduled) */}
          {showAddContact && (
            contactForm?.customerId === c.id ? (
              <div className="mt-3 flex items-center gap-2">
                <select value={contactForm.type} onChange={e => onContactFormChange({ ...contactForm, type: e.target.value as 'email' | 'phone' })}
                  className="border border-border rounded-sm px-2 py-1.5 text-sm bg-background">
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                <input
                  type={contactForm.type === 'email' ? 'email' : 'tel'}
                  placeholder={contactForm.type === 'email' ? 'alternate@email.com' : '(402) 555-1234'}
                  value={contactForm.value}
                  onChange={e => onContactFormChange({ ...contactForm, value: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && onAddContact()}
                  className="flex-1 border border-border rounded-sm px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <button onClick={onAddContact} disabled={!contactForm.value.trim() || contactSaving}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {contactSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button onClick={() => onContactFormChange(null)} className="p-1.5 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => onContactFormChange({ customerId: c.id, type: 'email', value: '' })}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> Add Alternate Contact Info
              </button>
            )
          )}
        </div>

        {/* Items */}
        <ItemsSection customer={c} />

        {/* Pickup link */}
        <PickupLinkSection customer={c} copied={copied} onCopy={onCopy} />

        {/* Outreach history */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Outreach History</h4>
          {c.outreach.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> No outreach recorded yet</p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {c.outreach.map((entry, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <div className="shrink-0 mt-1.5"><OutreachDot action={entry.action} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{formatAction(entry.action)}</p>
                    {typeof entry.details.note === 'string' && entry.details.note && (
                      <p className="text-muted-foreground text-xs mt-0.5">{String(entry.details.note)}</p>
                    )}
                    {entry.action === 'alt_contact_added' && (
                      <p className="text-blue-600 text-xs mt-0.5">{String(entry.details.type)}: {String(entry.details.value)}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Small Helpers ──────────────────────────────────────────────

function CopyBtn({ text, id, copied, onCopy, label }: {
  text: string; id: string; copied: string | null; onCopy: (t: string, id: string) => void; label?: string;
}) {
  const isCopied = copied === id;
  return (
    <button onClick={e => { e.stopPropagation(); onCopy(text, id); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {isCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {label ? (isCopied ? 'Copied!' : label) : null}
    </button>
  );
}

function OutreachDot({ action }: { action: string }) {
  const colors: Record<string, string> = { sms_sent: 'bg-blue-500', phone_called: 'bg-purple-500', email_sent: 'bg-green-500', admin_email_sent: 'bg-green-500', email_opened: 'bg-green-300', email_clicked: 'bg-green-600', email_bounced: 'bg-red-500', alt_contact_added: 'bg-blue-400', note_added: 'bg-gray-400', outreach_note: 'bg-gray-400' };
  return <div className={`w-2.5 h-2.5 rounded-full mt-1 ${colors[action] || 'bg-gray-300'}`} />;
}

function formatAction(action: string): string {
  const labels: Record<string, string> = { sms_sent: 'SMS Sent', phone_called: 'Phone Call', email_sent: 'Email Sent', admin_email_sent: 'Email Sent (Admin)', email_opened: 'Email Opened', email_clicked: 'Email Link Clicked', email_bounced: 'Email Bounced', outreach_note: 'Outreach Note', note_added: 'Note Added', alt_contact_added: 'Alternate Contact Added' };
  return labels[action] || action.replace(/_/g, ' ');
}
