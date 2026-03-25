'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Truck, Clock, AlertCircle, Loader2, Package } from 'lucide-react';
import Image from 'next/image';
import TimeSlotGrid from '@/components/pickup/TimeSlotGrid';
import ItemCard from '@/components/pickup/ItemCard';
import ConfirmationView from '@/components/pickup/ConfirmationView';
import { getVehicleRecommendation } from '@/lib/types';
import { getSupabase } from '@/lib/supabase';
import type { Customer, LineItem, TimeSlot, Booking, Order } from '@/lib/types';

interface CustomerPageData {
  customer: Customer;
  orders: Order[];
  pickup_items: LineItem[];
  ship_items: LineItem[];
  booking: (Booking & { time_slots: TimeSlot }) | null;
  time_slots: TimeSlot[];
}

export default function PickupPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<CustomerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [shipPreferences, setShipPreferences] = useState<Record<string, 'ship' | 'pickup'>>({});
  const [confirming, setConfirming] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

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

  const handleConfirm = async () => {
    if (!data || !selectedSlotId) return;
    setConfirming(true);
    try {
      const body: Record<string, unknown> = { time_slot_id: selectedSlotId };
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PickupHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            {error === 'Your order will be shipped to you. Thanks!' ? (
              <>
                <Package className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Shipping Confirmed</h2>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Page Not Found</h2>
              </>
            )}
            <p className="text-muted-foreground">{error || 'This pickup page could not be found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { customer, pickup_items, ship_items, booking, time_slots } = data;

  // Confirmation state
  if (booking && booking.time_slots && !isRescheduling) {
    return (
      <div className="min-h-screen bg-background">
        <PickupHeader name={customer.name} />
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-6 pb-20">
          <ConfirmationView
            customer={customer}
            booking={booking}
            pickupItems={pickup_items}
            shipItems={ship_items}
            orders={data.orders}
            token={token}
            canReschedule={booking.reschedule_count < 1}
            onReschedule={() => setIsRescheduling(true)}
          />
        </main>
        <PickupFooter />
      </div>
    );
  }

  const segCHasPickupItems = customer.segment === 'C' &&
    Object.values(shipPreferences).some(p => p === 'pickup');
  const showTimeSlots = customer.segment === 'A' || customer.segment === 'B' || segCHasPickupItems || isRescheduling;

  return (
    <div className="min-h-screen bg-background">
      <PickupHeader name={customer.name} />

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6 pb-20 space-y-8">
        {/* Order reference */}
        <div className="text-center">
          <p className="text-xs sm:text-sm text-muted-foreground tracking-wider uppercase">
            {data.orders.map(o => o.shopify_order_number).join(' / ')}
          </p>
        </div>

        {/* Segment C hero offer */}
        {customer.segment === 'C' && (
          <div className="bg-card rounded-sm border border-border p-5 sm:p-6 text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold mb-2">
              Skip the Wait — Pick Up in Roca
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your items are ready now. Toggle any item below to &quot;Pick up&quot; to grab it this week
              instead of waiting for shipping.
            </p>
            {customer.shipping_paid > 0 && (
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                Your shipping charge of ${customer.shipping_paid.toFixed(2)} is non-refundable.
                Choosing pickup gets your items to you faster.
              </p>
            )}
          </div>
        )}

        {/* Pickup items */}
        {pickup_items.length > 0 && (
          <ItemCard items={pickup_items} title="Your Pickup Items" />
        )}

        {/* Shippable items with toggle */}
        {ship_items.length > 0 && (customer.segment === 'B' || customer.segment === 'C') && (
          <div className="space-y-4">
            <ItemCard
              items={ship_items}
              title={customer.segment === 'B' ? 'Shippable Items' : 'Your Items'}
              showToggle
              onToggle={(id, pref) => setShipPreferences(prev => ({ ...prev, [id]: pref }))}
              preferences={shipPreferences}
            />
            {customer.segment === 'B' && (
              <p className="text-xs text-muted-foreground text-center bg-secondary/50 rounded-sm px-4 py-2">
                Shipping charges are non-refundable regardless of fulfillment method.
              </p>
            )}
          </div>
        )}

        {/* Time slots */}
        {showTimeSlots && (
          <div className="bg-secondary/30 rounded-sm p-4 sm:p-5">
            <TimeSlotGrid
              slots={time_slots}
              selectedSlotId={selectedSlotId}
              onSelectSlot={slot => setSelectedSlotId(slot.id)}
              disabled={confirming}
            />
          </div>
        )}

        {/* Location card */}
        {showTimeSlots && (
          <div className="bg-card rounded-sm border border-border p-4 sm:p-5 space-y-3">
            <h4 className="font-serif font-bold text-foreground">Pickup Location</h4>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">2410 Production Drive, Unit 6</p>
                <p className="text-sm text-muted-foreground">Roca, NE 68430</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {getVehicleRecommendation(customer.size)}
              </p>
            </div>
            {customer.drive_minutes > 0 && (
              <p className="text-xs text-muted-foreground pl-7">
                ~{customer.drive_minutes} min drive from {customer.city}, {customer.state}
              </p>
            )}
          </div>
        )}

        {/* Confirm button */}
        {showTimeSlots && (
          <button
            onClick={handleConfirm}
            disabled={!selectedSlotId || confirming}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-sm font-sans font-semibold text-base sm:text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed safe-area-bottom"
          >
            {confirming ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : isRescheduling ? (
              'Confirm New Time'
            ) : (
              'Confirm Pickup'
            )}
          </button>
        )}

        {/* Seg C decline */}
        {customer.segment === 'C' && !segCHasPickupItems && !isRescheduling && (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Toggle items above to &quot;Pick up&quot; to see available times, or:
            </p>
            <button
              onClick={handleDeclinePickup}
              disabled={confirming}
              className="w-full border border-border bg-card text-foreground px-6 py-3 rounded-sm font-sans font-medium hover:bg-secondary transition-colors"
            >
              Ship My Order Instead
            </button>
          </div>
        )}
      </main>

      <PickupFooter />
    </div>
  );
}

function PickupHeader({ name }: { name?: string }) {
  return (
    <header className="bg-accent text-accent-foreground border-b border-border">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-accent-foreground/60 font-medium">
            Nebraska Devaney
          </p>
          <h1 className="font-serif text-xl sm:text-2xl font-bold mt-0.5">
            {name ? `Your Pickup, ${name.split(' ')[0]}` : 'Pickup & Fulfillment'}
          </h1>
        </div>
        <Image
          src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
          alt="Nebraska N"
          width={36}
          height={36}
          className="opacity-80"
          unoptimized
        />
      </div>
    </header>
  );
}

function PickupFooter() {
  return (
    <footer className="bg-accent text-accent-foreground/60 border-t border-border">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 text-center">
        <Image
          src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
          alt="Nebraska N"
          width={28}
          height={28}
          className="opacity-40 mx-auto mb-3"
          unoptimized
        />
        <p className="text-xs">
          Nebraska Stadium Collectibles
        </p>
        <p className="text-[10px] mt-1 text-accent-foreground/40">
          2410 Production Drive, Unit 6, Roca, NE 68430
        </p>
      </div>
    </footer>
  );
}
