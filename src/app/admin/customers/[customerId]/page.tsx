'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, MapPin, Clock, Calendar, Truck, CheckCircle,
  UserCheck, XCircle, Loader2, Send, AlertTriangle, ExternalLink, Package, QrCode, Navigation, Eye,
  Pencil, Check, X as XIcon
} from 'lucide-react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
import { getVehicleRecommendation, SEGMENT_LABELS, SEGMENT_COLORS } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
const PREFIX_INFO: Record<string, { name: string; color: string; bgColor: string }> = {
  B: { name: 'Bench', color: 'text-amber-800', bgColor: 'bg-amber-100' },
  E: { name: 'End-Row', color: 'text-purple-800', bgColor: 'bg-purple-100' },
  S: { name: 'Seat', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  W: { name: 'Wall Mount', color: 'text-indigo-800', bgColor: 'bg-indigo-100' },
  I: { name: 'Iron', color: 'text-gray-800', bgColor: 'bg-gray-200' },
  C: { name: 'Chair Back', color: 'text-red-800', bgColor: 'bg-red-100' },
  X: { name: 'Other', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

interface CustomerDetail {
  customer: {
    id: string; token: string; name: string; email: string; phone: string | null;
    segment: string; city: string; state: string; drive_minutes: number | null;
    size: string; shipping_paid: number; is_vip: boolean; vip_note: string | null;
  };
  orders: Array<{ id: string; shopify_order_number: string }>;
  line_items: Array<{
    id: string; item_name: string; qty: number; item_type: string;
    fulfillment_preference: string; fulfillment_status: string;
  }>;
  booking: {
    id: string; status: string; time_slots: { day: string; time: string };
    checked_in_at: string | null; completed_at: string | null; reschedule_count: number;
  } | null;
  label: { label: string; prefix: string; stagingZone: string } | null;
}

interface NoteEntry {
  id: string; action: string; details: { note?: string; added_at?: string; [key: string]: unknown };
  created_at: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [realDrive, setRealDrive] = useState<{ minutes: number; miles: number } | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [timeSlots, setTimeSlots] = useState<Array<{ id: string; day: string; time: string; capacity: number; current_bookings: number }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingContact, setEditingContact] = useState<'email' | 'phone' | null>(null);
  const [editContactValue, setEditContactValue] = useState('');
  const [contactSaving, setContactSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [custRes, notesRes] = await Promise.all([
      fetch(`/api/admin/customers/${customerId}`),
      fetch(`/api/admin/customers/${customerId}/notes`),
    ]);
    if (custRes.ok) setData(await custRes.json());
    if (notesRes.ok) {
      const n = await notesRes.json();
      setNotes(n.notes || []);
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch real drive time from Mapbox
  useEffect(() => {
    if (!data) return;
    const { city, state } = data.customer;
    if (!city) return;
    fetch(`/api/admin/drivetime?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setRealDrive({ minutes: d.duration_minutes, miles: d.distance_miles });
          setCustomerCoords({ lng: d.lng, lat: d.lat });
        }
      })
      .catch(() => {});
  }, [data]);

  const handleAction = async (action: 'checkin' | 'complete' | 'noshow') => {
    setActionLoading(action);
    const endpoints: Record<string, string> = {
      checkin: `/api/admin/checkin/${customerId}`,
      complete: `/api/admin/complete/${customerId}`,
      noshow: `/api/admin/checkin/${customerId}`, // we'll handle noshow separately
    };
    await fetch(endpoints[action], { method: 'POST' });
    await fetchData();
    setActionLoading(null);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await fetch(`/api/admin/customers/${customerId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: newNote.trim() }),
    });
    setNewNote('');
    await fetchData();
  };

  const handleSaveContact = async () => {
    if (!editingContact) return;
    setContactSaving(true);
    const body: Record<string, string> = {};
    body[editingContact] = editContactValue.trim();
    await fetch(`/api/admin/customers/${customerId}/contact`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setEditingContact(null);
    setEditContactValue('');
    setContactSaving(false);
    await fetchData();
  };

  const openSlotPicker = async () => {
    setShowSlotPicker(true);
    setBookingResult(null);
    setSelectedSlot(null);
    const res = await fetch('/api/admin/dashboard');
    if (res.ok) {
      const d = await res.json();
      setTimeSlots(d.time_slot_fill || []);
    }
  };

  const handleAdminBook = async () => {
    if (!selectedSlot) return;
    setBookingLoading(true);
    setBookingResult(null);
    const res = await fetch(`/api/admin/customers/${customerId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_slot_id: selectedSlot }),
    });
    const result = await res.json();
    if (result.success) {
      setBookingResult({ success: true, message: `${result.action === 'rescheduled' ? 'Rescheduled' : 'Booked'} for ${result.day}, ${result.time}${result.emailSent ? ' — confirmation email sent' : ''}` });
      setShowSlotPicker(false);
      await fetchData();
    } else {
      setBookingResult({ success: false, message: result.error || 'Booking failed' });
    }
    setBookingLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-muted-foreground">Customer not found</div>;
  }

  const { customer, orders, line_items, booking, label } = data;
  const pickupItems = line_items.filter(i => i.fulfillment_preference === 'pickup' || i.item_type === 'pickup');
  const shipItems = line_items.filter(i => i.fulfillment_preference === 'ship' && i.item_type === 'ship');
  const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);
  const status = booking?.status || 'unscheduled';
  const prefixInfo = label ? PREFIX_INFO[label.prefix] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/customers')} className="p-2 hover:bg-secondary rounded-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold">{customer.name}</h1>
            {customer.is_vip && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-sm font-medium">VIP</span>}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEGMENT_COLORS[customer.segment as keyof typeof SEGMENT_COLORS]}`}>
              Seg {customer.segment}: {SEGMENT_LABELS[customer.segment as keyof typeof SEGMENT_LABELS]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{orders.map(o => o.shopify_order_number).join(', ')}</p>
        </div>
        {label && (
          <div className="shrink-0 w-16 h-16 rounded-sm bg-accent flex items-center justify-center">
            <span className="font-mono text-2xl font-black text-accent-foreground">{label.label}</span>
          </div>
        )}
      </div>

      {customer.is_vip && customer.vip_note && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {customer.vip_note}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Info + Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status + Actions */}
          <div className="bg-card rounded-sm border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-bold">Pickup Status</h2>
              <StatusBadge status={status} />
            </div>

            {booking?.time_slots ? (
              <div className="flex items-center gap-3 mb-4 text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium">{booking.time_slots.day}, {booking.time_slots.time}</span>
                {booking.checked_in_at && <span className="text-muted-foreground">| Checked in {new Date(booking.checked_in_at).toLocaleTimeString()}</span>}
                {booking.completed_at && <span className="text-muted-foreground">| Completed {new Date(booking.completed_at).toLocaleTimeString()}</span>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">No time slot selected yet.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {(status === 'confirmed' || status === 'unscheduled') && (
                <button
                  onClick={() => handleAction('checkin')}
                  disabled={actionLoading === 'checkin'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'checkin' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Check In
                </button>
              )}
              {status === 'checked_in' && (
                <button
                  onClick={() => handleAction('complete')}
                  disabled={actionLoading === 'complete'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-sm text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'complete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Mark Complete
                </button>
              )}
              {status === 'completed' && (
                <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-sm text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Pickup Complete
                </span>
              )}
              <button
                onClick={openSlotPicker}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-sm text-sm font-medium hover:bg-amber-700"
              >
                <Calendar className="w-4 h-4" />
                {booking ? 'Reschedule' : 'Book Slot'}
              </button>
              <a
                href={`/pickup/${customer.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary"
              >
                <ExternalLink className="w-4 h-4" /> Customer Page
              </a>
              <a
                href={`/admin/scan/${customer.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary"
              >
                <QrCode className="w-4 h-4" /> Scan View
              </a>
              <a
                href={`/admin/preview/${customer.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary"
              >
                <Eye className="w-4 h-4" /> Preview Receipt
              </a>
            </div>
          </div>

          {/* Booking result message */}
          {bookingResult && (
            <div className={`rounded-sm border p-3 text-sm flex items-center gap-2 ${bookingResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {bookingResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {bookingResult.message}
            </div>
          )}

          {/* Slot picker */}
          {showSlotPicker && (
            <div className="bg-card rounded-sm border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-bold">
                  {booking ? 'Reschedule Pickup' : 'Assign Pickup Slot'}
                </h2>
                <button onClick={() => setShowSlotPicker(false)} className="text-sm text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
              {booking && (
                <p className="text-sm text-muted-foreground mb-3">
                  Currently booked: {booking.time_slots.day}, {booking.time_slots.time}
                </p>
              )}
              <div className="space-y-4">
                {['Thursday', 'Friday', 'Saturday', 'May2'].map(day => {
                  const daySlots = timeSlots
                    .filter(s => s.day === day)
                    .sort((a, b) => a.time.localeCompare(b.time));
                  if (daySlots.length === 0) return null;
                  return (
                    <div key={day}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        {day === 'May2' ? 'May 2 (Overflow)' : day}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {daySlots.map(s => {
                          const full = s.current_bookings >= s.capacity;
                          const isSelected = selectedSlot === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setSelectedSlot(s.id)}
                              className={`px-3 py-2 rounded-sm text-xs font-medium border transition-colors ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : full
                                    ? 'bg-red-50 border-red-200 text-red-400 hover:bg-red-100 hover:border-red-300'
                                    : 'bg-background border-border hover:bg-secondary'
                              }`}
                            >
                              <span>{s.time}</span>
                              <span className={`block text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground/70' : full ? 'text-red-400' : 'text-muted-foreground'}`}>
                                {s.current_bookings}/{s.capacity}{full ? ' FULL' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleAdminBook}
                  disabled={!selectedSlot || bookingLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {booking ? 'Confirm Reschedule' : 'Confirm Booking'}
                </button>
                <p className="text-xs text-muted-foreground">
                  Admin override — bypasses capacity and reschedule limits.
                  {customer.email ? ' Confirmation email will be sent.' : ' No email on file.'}
                </p>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-card rounded-sm border border-border p-5">
            <h2 className="font-serif text-lg font-bold mb-3">
              Items ({line_items.reduce((s, i) => s + i.qty, 0)} total)
            </h2>

            {pickupItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pickup</p>
                <div className="space-y-2">
                  {pickupItems.map(item => {
                    const product = getProductInfo(item.item_name);
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-sm border border-border">
                        <div className="shrink-0 w-12 h-12 rounded-sm overflow-hidden bg-muted relative">
                          {product ? (
                            <img src={product.image} alt={product.shortName} className="absolute inset-0 w-full h-full object-cover" />
                          ) : <div className="w-full h-full bg-muted" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{product?.shortName || item.item_name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.qty} | {item.fulfillment_status}</p>
                        </div>
                        <ItemStatusIcon status={item.fulfillment_status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {shipItems.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Shipping</p>
                <div className="space-y-2">
                  {shipItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-sm border border-border bg-muted/30">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty} | {item.fulfillment_status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-card rounded-sm border border-border p-5">
            <h2 className="font-serif text-lg font-bold mb-3">Notes & Activity</h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note about this customer..."
                className="flex-1 border border-border rounded-sm px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes or activity yet</p>
              ) : notes.map(n => (
                <div key={n.id} className="flex gap-3 text-sm border-b border-border pb-2">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    {n.action === 'note_added' ? (
                      <p>{String((n.details as Record<string, string>).note || '')}</p>
                    ) : (
                      <p className="text-muted-foreground">{formatActivity(n)}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Contact + Details */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="bg-card rounded-sm border border-border p-4 space-y-3">
            <h3 className="font-serif font-bold">Contact</h3>
            <div className="space-y-2 text-sm">
              {/* Email — editable */}
              {editingContact === 'email' ? (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <input
                    type="email"
                    value={editContactValue}
                    onChange={e => setEditContactValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveContact()}
                    className="flex-1 border border-border rounded-sm px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <button onClick={handleSaveContact} disabled={contactSaving} className="p-1 text-green-600 hover:bg-green-50 rounded-sm">
                    {contactSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditingContact(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded-sm">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground flex-1">
                    <Mail className="w-4 h-4 shrink-0" /> {customer.email}
                  </a>
                  <button onClick={() => { setEditingContact('email'); setEditContactValue(customer.email); }} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {/* Phone — editable */}
              {editingContact === 'phone' ? (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <input
                    type="tel"
                    value={editContactValue}
                    onChange={e => setEditContactValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveContact()}
                    placeholder="(402) 555-1234"
                    className="flex-1 border border-border rounded-sm px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <button onClick={handleSaveContact} disabled={contactSaving} className="p-1 text-green-600 hover:bg-green-50 rounded-sm">
                    {contactSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditingContact(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded-sm">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  {customer.phone ? (
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground flex-1">
                      <Phone className="w-4 h-4 shrink-0" /> {customer.phone}
                    </a>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground flex-1">
                      <Phone className="w-4 h-4 shrink-0" /> <span className="italic">No phone</span>
                    </span>
                  )}
                  <button onClick={() => { setEditingContact('phone'); setEditContactValue(customer.phone || ''); }} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" /> {customer.city}{customer.state ? `, ${customer.state}` : ''}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Navigation className="w-4 h-4 shrink-0" />
                {realDrive ? (
                  <span>{Math.floor(realDrive.minutes / 60) > 0 ? `${Math.floor(realDrive.minutes / 60)}h ` : ''}{realDrive.minutes % 60}m drive ({realDrive.miles} mi)</span>
                ) : customer.drive_minutes ? (
                  <span className="italic">~{Math.floor(customer.drive_minutes / 60) > 0 ? `${Math.floor(customer.drive_minutes / 60)}h ` : ''}{customer.drive_minutes % 60}m (est)</span>
                ) : (
                  <span className="italic">Calculating...</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="w-4 h-4 shrink-0" /> {vehicleRec}
              </div>
            </div>
          </div>

          {/* Map */}
          {customerCoords && (
            <div className="bg-card rounded-sm border border-border overflow-hidden">
              <MapView
                markers={[{
                  lng: customerCoords.lng,
                  lat: customerCoords.lat,
                  label: customer.segment,
                  color: '#1a1a1a',
                  popup: `<strong>${customer.name}</strong><br>${customer.city}, ${customer.state}`,
                }]}
                showWarehouse
                showRoute
                routeFrom={customerCoords}
                className="w-full h-48"
              />
            </div>
          )}

          {/* Staging */}
          {label && (
            <div className="bg-card rounded-sm border border-border p-4">
              <h3 className="font-serif font-bold mb-2">Staging</h3>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${prefixInfo?.bgColor || 'bg-gray-100'}`}>
                  <span className={`font-mono font-bold text-sm ${prefixInfo?.color || 'text-gray-800'}`}>{label.prefix}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{prefixInfo?.name || label.prefix}</p>
                  <p className="text-xs text-muted-foreground">{label.stagingZone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order details */}
          <div className="bg-card rounded-sm border border-border p-4">
            <h3 className="font-serif font-bold mb-2">Orders ({orders.length})</h3>
            <div className="space-y-1">
              {orders.map(o => (
                <p key={o.id} className="text-sm font-mono text-muted-foreground">{o.shopify_order_number}</p>
              ))}
            </div>
            {customer.shipping_paid > 0 && (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                Shipping paid: ${customer.shipping_paid.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unscheduled: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    checked_in: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    no_show: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = {
    unscheduled: 'Unscheduled',
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    completed: 'Completed',
    no_show: 'No-Show',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function ItemStatusIcon({ status }: { status: string }) {
  if (status === 'picked_up') return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (status === 'staged') return <Package className="w-5 h-5 text-indigo-500" />;
  if (status === 'confirmed') return <Clock className="w-5 h-5 text-blue-500" />;
  if (status === 'no_show') return <XCircle className="w-5 h-5 text-red-500" />;
  return <div className="w-5 h-5 rounded-full border-2 border-border" />;
}

function formatActivity(entry: NoteEntry): string {
  const action = entry.action.replace(/_/g, ' ');
  const d = entry.details as Record<string, unknown>;
  if (d.day && d.time) return `${action} — ${d.day} ${d.time}`;
  return action;
}
