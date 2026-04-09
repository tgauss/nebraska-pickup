'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Mail, Phone, MapPin, ExternalLink, Copy, Check, ChevronDown, ChevronUp,
  Clock, Package, CheckCircle, Plus, X, Loader2, Users, TrendingUp, AlertTriangle,
  Calendar, ArrowUpDown
} from 'lucide-react';
import { SEGMENT_LABELS, SEGMENT_COLORS } from '@/lib/types';

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

type SortField = 'name' | 'drive_minutes' | 'orderValue';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<{ customerId: string; type: 'email' | 'phone'; value: string } | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [scheduledSearch, setScheduledSearch] = useState('');
  const [scheduledSearchInput, setScheduledSearchInput] = useState('');
  const [scheduledDayFilter, setScheduledDayFilter] = useState('');
  const [scheduledExpanded, setScheduledExpanded] = useState<string | null>(null);
  // Full customer detail for scheduled tab drill-down
  const [scheduledDetail, setScheduledDetail] = useState<PendingCustomer | null>(null);
  const [scheduledDetailLoading, setScheduledDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/pending');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounced search for pending tab
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Debounced search for scheduled tab
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

  // Fetch full details for a scheduled customer
  const loadScheduledDetail = async (customerId: string) => {
    if (scheduledExpanded === customerId) {
      setScheduledExpanded(null);
      setScheduledDetail(null);
      return;
    }
    setScheduledExpanded(customerId);
    setScheduledDetailLoading(true);
    const res = await fetch(`/api/pending/detail?id=${customerId}`);
    if (res.ok) {
      setScheduledDetail(await res.json());
    }
    setScheduledDetailLoading(false);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading pickup data...</p>
      </div>
    );
  }

  // Filter and sort pending customers
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
    return sortAsc ? cmp : -cmp;
  });

  // Filter scheduled customers
  let filteredScheduled = data.recentlyBooked;
  if (scheduledSearch) {
    const q = scheduledSearch.toLowerCase();
    filteredScheduled = filteredScheduled.filter(c => c.name.toLowerCase().includes(q));
  }
  if (scheduledDayFilter) {
    filteredScheduled = filteredScheduled.filter(c => c.bookingDay === scheduledDayFilter);
  }

  // Group scheduled by day
  const scheduledByDay: Record<string, BookedCustomer[]> = {};
  for (const c of filteredScheduled) {
    const day = c.bookingDay || 'Unassigned';
    if (!scheduledByDay[day]) scheduledByDay[day] = [];
    scheduledByDay[day].push(c);
  }
  // Sort within each day by time
  for (const day of Object.keys(scheduledByDay)) {
    scheduledByDay[day].sort((a, b) => (a.bookingTime || '').localeCompare(b.bookingTime || ''));
  }

  const dayOrder = ['Thursday', 'Friday', 'Saturday', 'May2'];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#d00000] to-[#8b0000] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">Pickup Coordination</h1>
              <p className="text-white/80 mt-1">Nebraska Devaney Seats &mdash; April 16&ndash;18, 2026</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-sm px-4 py-3">
              <div className="text-right">
                <p className="text-3xl font-bold">{data.bookingRate}%</p>
                <p className="text-xs text-white/70 uppercase tracking-wider">Booked</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <p className="text-3xl font-bold">{data.totalUnbooked}</p>
                <p className="text-xs text-white/70 uppercase tracking-wider">Pending</p>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <StatCard label="Total Requiring Pickup" value={data.totalPickupRequired} />
            <StatCard label="Booked & Confirmed" value={data.totalBooked} accent="green" />
            <StatCard label="Still Pending" value={data.totalUnbooked} accent="amber" />
            <div className="bg-white/10 backdrop-blur-sm rounded-sm p-3">
              <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Progress</p>
              <div className="mt-2 h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${data.bookingRate}%` }}
                />
              </div>
              <p className="text-xs text-white/60 mt-1">{data.totalBooked} of {data.totalPickupRequired} scheduled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex">
          <TabButton
            active={tab === 'pending'}
            onClick={() => { setTab('pending'); setExpandedId(null); }}
            label="Pending"
            count={data.totalUnbooked}
            accent="amber"
          />
          <TabButton
            active={tab === 'scheduled'}
            onClick={() => { setTab('scheduled'); setScheduledExpanded(null); setScheduledDetail(null); }}
            label="Scheduled"
            count={data.totalBooked}
            accent="green"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        {tab === 'pending' ? (
          <>
            {/* Pending tab: Search and filters */}
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
              <div className="flex border border-border rounded-sm overflow-hidden text-sm">
                <SortButton label="Name" field="name" current={sortBy} asc={sortAsc} onClick={handleSort} />
                <SortButton label="Distance" field="drive_minutes" current={sortBy} asc={sortAsc} onClick={handleSort} />
                <SortButton label="Value" field="orderValue" current={sortBy} asc={sortAsc} onClick={handleSort} />
              </div>
            </div>

            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              {filtered.length} pending customer{filtered.length !== 1 ? 's' : ''} need outreach
            </p>

            {/* Pending customer cards */}
            <div className="space-y-3">
              {filtered.map(c => (
                <PendingCard
                  key={c.id}
                  customer={c}
                  isExpanded={expandedId === c.id}
                  onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  copied={copied}
                  onCopy={copyToClipboard}
                  contactForm={contactForm}
                  onContactFormChange={setContactForm}
                  onAddContact={handleAddContact}
                  contactSaving={contactSaving}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <EmptyState
                message={search || segmentFilter ? 'No pending customers match your filters.' : 'Everyone has booked their pickup!'}
              />
            )}
          </>
        ) : (
          <>
            {/* Scheduled tab */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search scheduled customers..."
                  value={scheduledSearchInput}
                  onChange={e => setScheduledSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-sm text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={scheduledDayFilter}
                onChange={e => setScheduledDayFilter(e.target.value)}
                className="border border-border rounded-sm px-3 py-2.5 text-sm bg-background"
              >
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

            {/* Grouped by day */}
            {dayOrder.filter(d => scheduledByDay[d]).map(day => (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-serif font-bold text-lg">
                    {day === 'May2' ? 'May 2 (Overflow)' : day}
                  </h3>
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                    {scheduledByDay[day].length} customer{scheduledByDay[day].length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1">
                  {scheduledByDay[day].map(c => (
                    <div key={c.id} className="bg-card rounded-sm border border-border overflow-hidden">
                      <button
                        onClick={() => loadScheduledDetail(c.id)}
                        className="w-full text-left p-3 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold">{c.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>
                                {c.segment}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium">{c.bookingTime}</p>
                            <p className="text-xs text-muted-foreground">{c.bookingDay}</p>
                          </div>
                          <div className="shrink-0">
                            {scheduledExpanded === c.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </button>
                      {scheduledExpanded === c.id && (
                        <div className="border-t border-border p-4">
                          {scheduledDetailLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : scheduledDetail ? (
                            <ScheduledDetailView customer={scheduledDetail} copied={copied} onCopy={copyToClipboard} />
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Could not load details</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredScheduled.length === 0 && (
              <EmptyState message={scheduledSearch || scheduledDayFilter ? 'No scheduled customers match your filters.' : 'No customers have booked yet.'} />
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-8 border-t border-border mt-8">
          <p>Nebraska Rare Goods &mdash; Devaney Pickup Coordination</p>
          <p className="mt-1">Event: April 16&ndash;18, 2026 &middot; Roca, NE</p>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const textColor = accent === 'green' ? 'text-green-300' : accent === 'amber' ? 'text-amber-300' : 'text-white';
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-sm p-3">
      <p className="text-xs text-white/70 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${textColor}`}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, label, count, accent }: {
  active: boolean; onClick: () => void; label: string; count: number; accent: string;
}) {
  const badgeColor = accent === 'green' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      {label}
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${active ? badgeColor : 'bg-secondary text-muted-foreground'}`}>
        {count}
      </span>
    </button>
  );
}

function SortButton({ label, field, current, asc, onClick }: {
  label: string; field: SortField; current: SortField; asc: boolean; onClick: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
        active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary text-foreground'
      }`}
    >
      {label}
      {active && <ArrowUpDown className="w-3 h-3" />}
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

// ── Pending Card ───────────────────────────────────────────────

function PendingCard({ customer: c, isExpanded, onToggle, copied, onCopy, contactForm, onContactFormChange, onAddContact, contactSaving }: {
  customer: PendingCustomer;
  isExpanded: boolean;
  onToggle: () => void;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
  contactForm: { customerId: string; type: 'email' | 'phone'; value: string } | null;
  onContactFormChange: (form: { customerId: string; type: 'email' | 'phone'; value: string } | null) => void;
  onAddContact: () => void;
  contactSaving: boolean;
}) {
  const driveHrs = Math.floor(c.drive_minutes / 60);
  const driveMins = c.drive_minutes % 60;
  const driveStr = driveHrs > 0 ? `${driveHrs}h ${driveMins}m` : `${driveMins}m`;
  const totalPickupQty = c.pickupItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="bg-card rounded-sm border border-border overflow-hidden">
      {/* Collapsed row */}
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-secondary/30 transition-colors">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-bold text-lg">{c.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>
                Seg {c.segment}
              </span>
              {c.altContacts.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                  +{c.altContacts.length} alt
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.city}, {c.state}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {driveStr}</span>
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {totalPickupQty} item{totalPickupQty !== 1 ? 's' : ''}</span>
              {c.orderValue > 0 && <span className="font-medium text-foreground">${c.orderValue.toLocaleString()}</span>}
            </div>
          </div>
          <div className="shrink-0">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x divide-border">
            {/* Left: Contact & Items */}
            <div className="lg:col-span-2 p-4 space-y-5">
              {/* Contact */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Contact Information</h4>
                <div className="space-y-2">
                  {c.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                      <CopyBtn text={c.email} id={`${c.id}-email`} copied={copied} onCopy={onCopy} />
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>
                      <CopyBtn text={c.phone} id={`${c.id}-phone`} copied={copied} onCopy={onCopy} />
                    </div>
                  )}
                  {!c.email && !c.phone && (
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> No contact information on file
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" /> {c.city}, {c.state} &middot; {driveStr} drive
                  </div>
                </div>

                {/* Alt contacts */}
                {c.altContacts.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-blue-700">Alternate Contacts (added by UNL)</p>
                    {c.altContacts.map((ac, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-blue-50 rounded-sm px-3 py-1.5">
                        {ac.type === 'email' ? <Mail className="w-3.5 h-3.5 text-blue-600" /> : <Phone className="w-3.5 h-3.5 text-blue-600" />}
                        <span>{ac.value}</span>
                        <span className="text-xs text-muted-foreground ml-auto">via {ac.source}</span>
                        <CopyBtn text={ac.value} id={`${c.id}-alt-${i}`} copied={copied} onCopy={onCopy} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add contact form */}
                {contactForm?.customerId === c.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={contactForm.type}
                      onChange={e => onContactFormChange({ ...contactForm, type: e.target.value as 'email' | 'phone' })}
                      className="border border-border rounded-sm px-2 py-1.5 text-sm bg-background"
                    >
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
                    <button
                      onClick={onAddContact}
                      disabled={!contactForm.value.trim() || contactSaving}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {contactSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                    <button onClick={() => onContactFormChange(null)} className="p-1.5 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onContactFormChange({ customerId: c.id, type: 'email', value: '' })}
                    className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Alternate Contact
                  </button>
                )}
              </div>

              {/* Items */}
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
                      <div key={i} className="text-sm px-3 py-1.5 bg-secondary/50 rounded-sm">
                        {item.qty}x {item.name}
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-sm"><span className="text-muted-foreground">Orders: </span><span className="font-mono text-xs">{c.orders.join(', ')}</span></p>
              </div>

              {/* Pickup link */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pickup Scheduling Link</h4>
                <div className="flex items-center gap-3">
                  <a href={c.pickupLink} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium">
                    <ExternalLink className="w-3.5 h-3.5" /> View Pickup Page
                  </a>
                  <CopyBtn text={c.pickupLink} id={`${c.id}-link`} copied={copied} onCopy={onCopy} label="Copy Link" />
                </div>
              </div>
            </div>

            {/* Right: Outreach history */}
            <div className="p-4 bg-secondary/20">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Outreach History</h4>
              {c.outreach.length === 0 ? (
                <div className="text-center py-6">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No outreach recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {c.outreach.map((entry, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <div className="shrink-0 mt-1.5">
                        <OutreachDot action={entry.action} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{formatAction(entry.action)}</p>
                        {typeof entry.details.note === 'string' && entry.details.note && (
                          <p className="text-muted-foreground text-xs mt-0.5">{String(entry.details.note)}</p>
                        )}
                        {entry.action === 'alt_contact_added' && (
                          <p className="text-blue-600 text-xs mt-0.5">
                            {String(entry.details.type)}: {String(entry.details.value)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scheduled Detail (read-only) ───────────────────────────────

function ScheduledDetailView({ customer: c, copied, onCopy }: {
  customer: PendingCustomer; copied: string | null; onCopy: (text: string, id: string) => void;
}) {
  const driveHrs = Math.floor(c.drive_minutes / 60);
  const driveMins = c.drive_minutes % 60;
  const driveStr = driveHrs > 0 ? `${driveHrs}h ${driveMins}m` : `${driveMins}m`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Contact */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
          <div className="space-y-1.5 text-sm">
            {c.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{c.email}</span>
                <CopyBtn text={c.email} id={`sched-${c.id}-email`} copied={copied} onCopy={onCopy} />
              </div>
            )}
            {c.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{c.phone}</span>
                <CopyBtn text={c.phone} id={`sched-${c.id}-phone`} copied={copied} onCopy={onCopy} />
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> {c.city}, {c.state} &middot; {driveStr}
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items</h4>
          {c.pickupItems.map((item, i) => (
            <div key={i} className="text-sm px-3 py-1.5 bg-green-50 rounded-sm mb-1 flex justify-between">
              <span>{item.qty}x {item.name}</span>
              {item.price > 0 && <span className="text-muted-foreground">${(item.price * item.qty).toLocaleString()}</span>}
            </div>
          ))}
          {c.shipItems.map((item, i) => (
            <div key={i} className="text-sm px-3 py-1.5 bg-secondary/50 rounded-sm mb-1">
              {item.qty}x {item.name} <span className="text-xs text-muted-foreground">(shipping)</span>
            </div>
          ))}
          <p className="mt-1 text-xs text-muted-foreground font-mono">{c.orders.join(', ')}</p>
        </div>

        {/* Pickup link */}
        <div className="flex items-center gap-3">
          <a href={c.pickupLink} target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium">
            <ExternalLink className="w-3.5 h-3.5" /> View Pickup Page
          </a>
          <CopyBtn text={c.pickupLink} id={`sched-${c.id}-link`} copied={copied} onCopy={onCopy} label="Copy Link" />
        </div>
      </div>

      {/* Outreach history */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">History</h4>
        {c.outreach.length === 0 ? (
          <p className="text-sm text-muted-foreground">No outreach recorded</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {c.outreach.map((entry, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <OutreachDot action={entry.action} />
                <div>
                  <p className="text-xs font-medium">{formatAction(entry.action)}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small Helpers ──────────────────────────────────────────────

function CopyBtn({ text, id, copied, onCopy, label }: {
  text: string; id: string; copied: string | null; onCopy: (text: string, id: string) => void; label?: string;
}) {
  const isCopied = copied === id;
  return (
    <button
      onClick={e => { e.stopPropagation(); onCopy(text, id); }}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {isCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {label ? (isCopied ? 'Copied!' : label) : null}
    </button>
  );
}

function OutreachDot({ action }: { action: string }) {
  const colors: Record<string, string> = {
    sms_sent: 'bg-blue-500',
    phone_called: 'bg-purple-500',
    email_sent: 'bg-green-500',
    email_opened: 'bg-green-300',
    email_clicked: 'bg-green-600',
    alt_contact_added: 'bg-blue-400',
    note_added: 'bg-gray-400',
    outreach_note: 'bg-gray-400',
  };
  return <div className={`w-2.5 h-2.5 rounded-full mt-1 ${colors[action] || 'bg-gray-300'}`} />;
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    sms_sent: 'SMS Sent',
    phone_called: 'Phone Call',
    email_sent: 'Email Sent',
    email_opened: 'Email Opened',
    email_clicked: 'Email Link Clicked',
    outreach_note: 'Outreach Note',
    note_added: 'Note Added',
    alt_contact_added: 'Alternate Contact Added',
  };
  return labels[action] || action.replace(/_/g, ' ');
}
