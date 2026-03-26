'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Truck, Clock, AlertCircle, Loader2, Package, ChevronDown, ArrowRight, Calendar, Check } from 'lucide-react';
import TimeSlotPicker from '@/components/pickup/TimeSlotPicker';
import ItemCard from '@/components/pickup/ItemCard';
import ConfirmationView from '@/components/pickup/ConfirmationView';
import { getVehicleRecommendation } from '@/lib/types';
import { getSupabase } from '@/lib/supabase';
import { getProductInfo } from '@/lib/products';
import type { Customer, LineItem, TimeSlot, Booking, Order } from '@/lib/types';

interface CustomerPageData {
  customer: Customer;
  orders: Order[];
  pickup_items: LineItem[];
  ship_items: LineItem[];
  booking: (Booking & { time_slots: TimeSlot }) | null;
  time_slots: TimeSlot[];
  label?: { label: string; prefix: string; stagingZone: string } | null;
}

type Step = 'welcome' | 'items' | 'timeslot' | 'confirmed';

export default function PickupPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<CustomerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('welcome');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [shipPreferences, setShipPreferences] = useState<Record<string, 'ship' | 'pickup'>>({});
  const [confirming, setConfirming] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pickup/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load');
      }
      const pageData: CustomerPageData = await res.json();
      setData(pageData);

      const prefs: Record<string, 'ship' | 'pickup'> = {};
      for (const item of pageData.ship_items) {
        prefs[item.id] = item.fulfillment_preference;
      }
      setShipPreferences(prefs);

      // If already booked, jump to confirmed
      if (pageData.booking && pageData.booking.time_slots) {
        setStep('confirmed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime slot updates
  useEffect(() => {
    try {
      const sb = getSupabase();
      if (!sb) return;
      const channel = sb
        .channel('time_slots_changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'time_slots' }, (payload) => {
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              time_slots: prev.time_slots.map(s =>
                s.id === payload.new.id ? { ...s, ...payload.new } : s
              ),
            };
          });
        })
        .subscribe();
      return () => { sb.removeChannel(channel); };
    } catch { /* Supabase not configured */ }
  }, []);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleConfirm = async () => {
    if (!data || !selectedSlot) return;
    setConfirming(true);
    try {
      const body: Record<string, unknown> = { time_slot_id: selectedSlot.id };
      if (data.customer.segment === 'B') {
        body.ship_item_preferences = data.ship_items.map(item => ({
          line_item_id: item.id,
          preference: shipPreferences[item.id] || 'ship',
        }));
      }
      if (data.customer.segment === 'C') {
        body.convert_to_pickup = true;
        body.ship_item_preferences = data.ship_items.map(item => ({
          line_item_id: item.id,
          preference: shipPreferences[item.id] || 'ship',
        }));
      }
      const res = await fetch(`/api/pickup/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to confirm');
      }
      setIsRescheduling(false);
      await fetchData();
      setStep('confirmed');
      scrollToTop();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm booking');
    } finally {
      setConfirming(false);
    }
  };

  const handleDeclinePickup = async () => {
    if (!data) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/pickup/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convert_to_pickup: false, time_slot_id: '' }),
      });
      if (!res.ok) throw new Error('Failed');
      setError('Your order will be shipped to you. Thanks!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setConfirming(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error / ship confirmed
  if (error || !data) {
    return (
      <div className="min-h-[100svh] flex flex-col bg-background">
        <PickupHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            {error === 'Your order will be shipped to you. Thanks!' ? (
              <>
                <Package className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Shipping Confirmed</h2>
                <p className="text-muted-foreground text-sm">Your items will be shipped to you. You&apos;ll receive tracking info via email.</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Page Not Found</h2>
                <p className="text-muted-foreground text-sm">{error || 'This pickup page could not be found.'}</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { customer, pickup_items, ship_items, booking, time_slots } = data;
  const firstName = customer.name.split(' ')[0];
  const orderNums = data.orders.map(o => o.shopify_order_number).join(', ');
  const totalPickupItems = pickup_items.reduce((s, i) => s + i.qty, 0);
  const vehicleRec = getVehicleRecommendation(customer.size);

  // Confirmed state
  if (step === 'confirmed' && booking && booking.time_slots && !isRescheduling) {
    return (
      <div className="min-h-[100svh] bg-background">
        <div ref={topRef} />
        <PickupHeader />
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-6 pb-24">
          <ConfirmationView
            customer={customer}
            booking={booking}
            pickupItems={pickup_items}
            shipItems={ship_items}
            orders={data.orders}
            token={token}
            canReschedule={booking.reschedule_count < 1}
            onReschedule={() => { setIsRescheduling(true); setStep('timeslot'); setSelectedSlot(null); scrollToTop(); }}
            label={data.label}
          />
        </main>
        <PickupFooter />
      </div>
    );
  }

  // Does Seg C have any items toggled to pickup?
  const segCHasPickupItems = customer.segment === 'C' &&
    Object.values(shipPreferences).some(p => p === 'pickup');

  // Determine if we should show items step (Seg B/C have ship toggles)
  const hasItemChoices = customer.segment === 'B' || customer.segment === 'C';

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <div ref={topRef} />
      <PickupHeader />

      {/* ============ STEP: WELCOME ============ */}
      {step === 'welcome' && (
        <main className="flex-1 flex flex-col justify-center px-5 sm:px-6 py-8 max-w-lg mx-auto w-full">
          <div className="text-center space-y-6">
            {/* Product preview */}
            {pickup_items.length > 0 && (() => {
              const product = getProductInfo(pickup_items[0].item_name);
              return product ? (
                <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full overflow-hidden border-4 border-secondary relative">
                  <img src={product.image} alt={product.shortName} className="absolute inset-0 w-full h-full object-cover" />
                </div>
              ) : null;
            })()}

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-2">{orderNums}</p>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                {firstName}, pick up<br />your Devaney order
              </h1>
            </div>

            <p className="text-foreground text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
              Your {totalPickupItems} {totalPickupItems === 1 ? 'item needs' : 'items need'} to be picked up in person.
              Choose a time slot below — spots are limited.
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-sm px-4 py-2.5 inline-block">
              <p className="text-xs sm:text-sm text-primary font-semibold flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Pickup required — select your time now
              </p>
            </div>

            {/* Quick info pills */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs bg-secondary rounded-full px-3 py-1.5">
                <Calendar className="w-3 h-3 text-primary" />
                Apr 2–4, 2026
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs bg-secondary rounded-full px-3 py-1.5">
                <MapPin className="w-3 h-3 text-primary" />
                Roca, NE
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs bg-secondary rounded-full px-3 py-1.5">
                <Truck className="w-3 h-3 text-primary" />
                {vehicleRec.split(' ').slice(0, 3).join(' ')}
              </span>
            </div>

            {/* Main CTA */}
            <button
              onClick={() => {
                if (hasItemChoices) {
                  setStep('items');
                } else {
                  setStep('timeslot');
                }
                scrollToTop();
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-sm font-sans font-semibold text-base sm:text-lg transition-colors flex items-center justify-center gap-2"
            >
              Select My Pickup Time
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Seg C decline option */}
            {customer.segment === 'C' && (
              <button
                onClick={handleDeclinePickup}
                disabled={confirming}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                I&apos;d rather have it shipped
              </button>
            )}
          </div>
        </main>
      )}

      {/* ============ STEP: ITEMS (Seg B/C only) ============ */}
      {step === 'items' && (
        <main className="flex-1 px-5 sm:px-6 py-6 max-w-lg mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold">Your Items</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {customer.segment === 'B'
                  ? 'Some items can be shipped instead of picked up. Choose below.'
                  : 'Toggle any items you\'d like to pick up instead of having shipped.'
                }
              </p>
            </div>

            {/* Pickup items (no toggle, must pick up) */}
            {pickup_items.length > 0 && (
              <ItemCard items={pickup_items} title="Must Pick Up" />
            )}

            {/* Shippable items with toggle */}
            {ship_items.length > 0 && (
              <ItemCard
                items={ship_items}
                title={customer.segment === 'B' ? 'Can Ship or Pick Up' : 'Your Items'}
                showToggle
                onToggle={(id, pref) => setShipPreferences(prev => ({ ...prev, [id]: pref }))}
                preferences={shipPreferences}
              />
            )}

            {customer.shipping_paid > 0 && (
              <p className="text-xs text-muted-foreground text-center bg-secondary/50 rounded-sm px-3 py-2">
                Shipping charge of ${customer.shipping_paid.toFixed(2)} is non-refundable regardless of fulfillment choice.
              </p>
            )}
          </div>

          {/* Sticky bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 safe-area-bottom z-20">
            <div className="max-w-lg mx-auto">
              {(customer.segment !== 'C' || segCHasPickupItems || pickup_items.length > 0) ? (
                <button
                  onClick={() => { setStep('timeslot'); scrollToTop(); }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-sm font-sans font-semibold text-base transition-colors flex items-center justify-center gap-2"
                >
                  Choose Your Time
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Toggle at least one item to &quot;Pick up&quot; to continue</p>
                  <button
                    onClick={handleDeclinePickup}
                    disabled={confirming}
                    className="w-full border border-border bg-card text-foreground px-6 py-3 rounded-sm font-sans font-medium hover:bg-secondary transition-colors"
                  >
                    Ship Everything Instead
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Bottom spacer for fixed CTA */}
          <div className="h-24" />
        </main>
      )}

      {/* ============ STEP: TIMESLOT ============ */}
      {step === 'timeslot' && (
        <main className="flex-1 px-5 sm:px-6 py-6 max-w-lg mx-auto w-full">
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                {isRescheduling ? 'Pick a New Time' : 'Pick Your Time'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Select a 30-minute window. We&apos;ll have your items staged and ready.
              </p>
            </div>

            <TimeSlotPicker
              slots={time_slots}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
            />

            {/* Location info - compact */}
            <div className="bg-card rounded-sm border border-border p-3 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">2410 Production Drive, Unit 6, Roca, NE 68430</p>
                <p className="text-muted-foreground mt-0.5">{vehicleRec}</p>
                {customer.drive_minutes > 0 && (
                  <p className="text-muted-foreground">~{customer.drive_minutes} min from {customer.city}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sticky bottom confirm bar */}
          {selectedSlot && (
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 safe-area-bottom z-20">
              <div className="max-w-lg mx-auto">
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-sm font-sans font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm {selectedSlot.day} at {selectedSlot.time}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {/* Bottom spacer for fixed CTA */}
          <div className="h-24" />
        </main>
      )}

      {step !== 'confirmed' && <PickupFooter />}
    </div>
  );
}

function PickupHeader() {
  return (
    <header className="bg-accent text-accent-foreground">
      <div className="max-w-lg mx-auto px-5 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
            alt="Nebraska N"
            width={28}
            height={28}
            className="opacity-80"
          />
          <span className="text-xs uppercase tracking-[0.15em] font-medium text-accent-foreground/70">Nebraska Devaney</span>
        </div>
      </div>
    </header>
  );
}

function PickupFooter() {
  return (
    <footer className="bg-accent text-accent-foreground/40 py-4 text-center mt-auto">
      <p className="text-[10px]">2410 Production Drive, Unit 6, Roca, NE 68430</p>
    </footer>
  );
}
