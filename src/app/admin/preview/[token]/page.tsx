'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, Eye } from 'lucide-react';
import ConfirmationView from '@/components/pickup/ConfirmationView';
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

export default function PreviewReceiptPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<CustomerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pickup/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold">Cannot Preview</h1>
          <p className="text-muted-foreground mt-2">{error || 'Customer not found.'}</p>
        </div>
      </div>
    );
  }

  const { customer, pickup_items, ship_items, booking, time_slots } = data;

  // If the customer has a real booking, use it. Otherwise create a mock for preview.
  const previewBooking: Booking & { time_slots: TimeSlot } = booking && booking.time_slots
    ? booking
    : {
        id: 'preview',
        customer_id: customer.id,
        time_slot_id: time_slots[0]?.id || 'preview-slot',
        status: 'confirmed' as const,
        confirmed_at: new Date().toISOString(),
        checked_in_at: null,
        completed_at: null,
        reschedule_count: 0,
        created_at: new Date().toISOString(),
        time_slots: time_slots[0] || { id: 'preview-slot', day: 'Thursday', time: '9:00am', capacity: 10, current_bookings: 0 },
      };

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Admin preview banner */}
      <div className="bg-amber-500 text-white py-2 px-4 text-center text-xs font-sans font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
        <Eye className="w-3.5 h-3.5" />
        Admin Preview — This is what the customer sees
        {!booking && ' (mock booking — customer has not booked yet)'}
      </div>

      {/* Phone frame */}
      <div className="max-w-[390px] mx-auto my-6 bg-background rounded-2xl shadow-2xl overflow-hidden border border-border">
        {/* Fake phone header bar */}
        <header className="bg-accent text-accent-foreground">
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
                alt="Nebraska N"
                width={28}
                height={28}
                className="opacity-80"
              />
              <span className="text-xs uppercase tracking-[0.15em] font-medium text-accent-foreground/70">Nebraska Rare Goods</span>
            </div>
          </div>
        </header>

        {/* Receipt content */}
        <main className="px-4 py-6 pb-8">
          <ConfirmationView
            customer={customer}
            booking={previewBooking}
            pickupItems={pickup_items}
            shipItems={ship_items}
            orders={data.orders}
            token={token}
            canReschedule={previewBooking.reschedule_count < 2}
            onReschedule={() => {}}
            label={data.label}
          />
        </main>

        {/* Footer */}
        <footer className="bg-accent text-accent-foreground/40 py-4 text-center">
          <p className="text-[10px]">2410 Production Drive, Unit 4, Roca, NE 68430</p>
        </footer>
      </div>
    </div>
  );
}
