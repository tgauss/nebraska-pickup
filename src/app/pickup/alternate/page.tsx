'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MapPin, Calendar, CheckCircle, Clock, Car, Download } from 'lucide-react';

interface SlotInfo {
  id: string;
  time: string;
  available: number;
}

interface CustomerInfo {
  customerId: string;
  name: string;
  email: string;
  token: string;
  items: Array<{ name: string; qty: number }>;
  vehicleRec: string;
  hasExistingBooking: boolean;
  existingDay: string | null;
  existingTime: string | null;
}

type Step = 'identify' | 'select' | 'confirmed';

export default function AlternatePickupPage() {
  const [step, setStep] = useState<Step>('identify');
  const [email, setEmail] = useState('');
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const handleIdentify = async () => {
    if (!email.trim()) return;
    setIdentifying(true);
    setError(null);
    try {
      const res = await fetch('/api/pickup/alternate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'identify', email: email.trim() }),
      });
      const data = await res.json();
      if (data.found) {
        setCustomer(data);
        setSlotsLoading(true);
        setStep('select');
        // Load slots
        const slotsRes = await fetch('/api/pickup/alternate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_slots' }),
        });
        const slotsData = await slotsRes.json();
        setSlots(slotsData.slots || []);
        setSlotsLoading(false);
      } else {
        setError("We couldn't find an order with that email. Please check and try again, or contact support@raregoods.com.");
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIdentifying(false);
    }
  };

  const handleBook = async () => {
    if (!customer || !selectedSlot) return;
    setBooking(true);
    try {
      const res = await fetch('/api/pickup/alternate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'book', customerId: customer.customerId, slotId: selectedSlot.id }),
      });
      const data = await res.json();
      if (data.success) {
        setConfirmedTime(data.time);
        setStep('confirmed');
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setError(data.error || 'Failed to book. Please try another slot.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <div ref={topRef} />

      {/* Header */}
      <header className="bg-accent text-accent-foreground">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width={28} height={28} className="opacity-80" />
            <span className="text-xs uppercase tracking-[0.15em] font-medium text-accent-foreground/70">Nebraska Rare Goods</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-8">

        {/* STEP: IDENTIFY */}
        {step === 'identify' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2">
              Alternate Pickup Day
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-1">
              Saturday, May 2, 2026
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs">
              This is an invite-only pickup date for customers who could not make the April 16–18 weekend.
            </p>

            <div className="bg-card border border-border rounded-sm p-4 mb-6 w-full text-left">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-medium">Saturday, May 2, 2026</p>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm">10:00 AM – 4:00 PM</p>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm">2410 Production Dr, Unit 4, Roca, NE</p>
              </div>
            </div>

            <div className="w-full">
              <label className="text-sm font-medium mb-2 block">Enter your email to get started:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                  placeholder="Your email address"
                  className="flex-1 border-2 border-border rounded-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={handleIdentify}
                  disabled={identifying || !email.trim()}
                  className="px-6 py-3 bg-primary text-white rounded-sm font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {identifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
                </button>
              </div>
              {error && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm p-3">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* STEP: SELECT SLOT */}
        {step === 'select' && customer && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-2xl font-bold">
                Hey {customer.name.split(' ')[0]}, pick your time!
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Saturday, May 2, 2026 — select a 30-minute window.
              </p>
            </div>

            {customer.hasExistingBooking && (
              <div className="bg-amber-50 border border-amber-200 rounded-sm p-3">
                <p className="text-sm text-amber-800">
                  You currently have a booking for {customer.existingDay} at {customer.existingTime}. Booking a May 2nd slot will cancel your current booking.
                </p>
              </div>
            )}

            {/* Items summary */}
            <div className="bg-card border border-border rounded-sm p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your Items</p>
              {customer.items.map((item, i) => (
                <p key={i} className="text-sm font-medium">{item.qty}x {item.name}</p>
              ))}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Car className="w-3.5 h-3.5" />
                {customer.vehicleRec}
              </div>
            </div>

            {/* Slot picker */}
            {slotsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No slots available. Please contact support@raregoods.com.</p>
              </div>
            ) : (
              <div>
                <h3 className="font-serif font-bold text-base mb-3">Saturday, May 2</h3>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(slot => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 rounded-sm text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-white ring-2 ring-primary/30'
                            : 'bg-card border border-border hover:border-primary/50 text-foreground'
                        }`}
                      >
                        {slot.time}
                        <span className={`block text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {slot.available} open
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">2410 Production Drive, Unit 4, Roca, NE 68430</p>
                <a href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430" target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">
                  Get Directions →
                </a>
              </div>
            </div>

            {/* Confirm button */}
            {selectedSlot && (
              <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 safe-area-bottom z-20">
                <div className="max-w-lg mx-auto">
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-sm font-sans font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {booking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirm May 2 at {selectedSlot.time}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            <div className="h-24" />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm p-3">{error}</p>
            )}
          </div>
        )}

        {/* STEP: CONFIRMED */}
        {step === 'confirmed' && customer && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-3" />
              <h1 className="font-serif text-3xl font-bold">You&apos;re All Set!</h1>
              <p className="text-muted-foreground mt-1">Your pickup is confirmed for the alternate date.</p>
            </div>

            {/* Receipt card */}
            <div className="bg-card rounded-sm border-2 border-border overflow-hidden">
              <div className="py-2 px-4 text-center text-xs font-sans font-semibold uppercase tracking-wider bg-green-50 text-green-700 border-b border-green-200">
                Pickup Confirmed — May 2
              </div>
              <div className="px-5 pt-5 pb-6 flex flex-col items-center text-center">
                <div className="bg-white rounded-sm p-2 border border-border mb-4">
                  <img
                    src={`/api/pickup/${customer.token}/qr`}
                    alt="Check-in QR Code"
                    width={160}
                    height={160}
                  />
                </div>
                <h2 className="font-serif text-xl font-bold">{customer.name}</h2>
                <div className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-serif font-bold">Saturday, May 2 &middot; {confirmedTime}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-center">
              <p className="text-sm font-medium text-amber-800">
                Save or screenshot this page to show at pickup.
              </p>
              <p className="text-xs text-amber-600 mt-1">A confirmation email has been sent to {customer.email}.</p>
            </div>

            {/* Details */}
            <div className="bg-card rounded-sm border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Saturday, May 2 at {confirmedTime}</p>
                  <p className="text-xs text-muted-foreground">30-minute window</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">2410 Production Drive, Unit 4</p>
                  <p className="text-xs text-muted-foreground">Roca, NE 68430</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Car className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm">{customer.vehicleRec}</p>
              </div>
            </div>

            <a
              href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-primary text-primary-foreground px-6 py-3 rounded-sm font-sans font-semibold text-sm"
            >
              Get Directions
            </a>

            {/* Items */}
            <div>
              <h3 className="font-serif text-base font-bold mb-2">Your Items</h3>
              {customer.items.map((item, i) => (
                <p key={i} className="text-sm">{item.qty}x {item.name}</p>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-accent text-accent-foreground/40 py-4 text-center mt-auto">
        <p className="text-[10px]">2410 Production Drive, Unit 4, Roca, NE 68430</p>
      </footer>
    </div>
  );
}
