'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle, Loader2, Package, Truck, Clock, User, Mail, Phone, MapPin, AlertTriangle
} from 'lucide-react';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import Image from 'next/image';
import { getProductInfo } from '@/lib/products';

interface ScanData {
  customer: {
    id: string; name: string; email: string; phone: string | null;
    size: string; is_vip: boolean; vip_note: string | null; segment: string;
    city: string; state: string;
  };
  orders: Array<{ shopify_order_number: string }>;
  pickup_items: Array<{ id: string; item_name: string; qty: number; fulfillment_status: string }>;
  ship_items: Array<{ id: string; item_name: string; qty: number; fulfillment_preference: string; fulfillment_status: string }>;
  booking: {
    id: string; status: string; time_slots: { day: string; time: string };
    checked_in_at: string | null; completed_at: string | null;
  } | null;
  label?: { label: string; prefix: string; stagingZone: string } | null;
}

export default function ScanPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/pickup/${token}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckIn = async () => {
    if (!data) return;
    setActionLoading(true);
    await fetch(`/api/admin/checkin/${data.customer.id}`, { method: 'POST' });
    await fetchData();
    setActionLoading(false);
  };

  const handleComplete = async () => {
    if (!data) return;
    setActionLoading(true);
    await fetch(`/api/admin/complete/${data.customer.id}`, { method: 'POST' });
    await fetchData();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold">Customer Not Found</h1>
          <p className="text-muted-foreground mt-2">This QR code is not valid.</p>
        </div>
      </div>
    );
  }

  const { customer, orders, pickup_items, ship_items, booking, label } = data;
  const allPickupItems = [
    ...pickup_items,
    ...ship_items.filter(i => i.fulfillment_preference === 'pickup'),
  ];
  const shippingItems = ship_items.filter(i => i.fulfillment_preference === 'ship');
  const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);
  const orderNums = orders.map(o => o.shopify_order_number).join(', ');
  const status = booking?.status || 'no_booking';

  return (
    <div className="min-h-screen bg-background">
      {/* Status banner */}
      <div className={`py-3 px-4 text-center text-sm font-medium ${
        status === 'completed' ? 'bg-green-600 text-white' :
        status === 'checked_in' ? 'bg-blue-600 text-white' :
        status === 'confirmed' ? 'bg-amber-500 text-white' :
        'bg-muted text-muted-foreground'
      }`}>
        {status === 'completed' && 'PICKUP COMPLETE'}
        {status === 'checked_in' && 'CHECKED IN — LOADING'}
        {status === 'confirmed' && 'CONFIRMED — READY TO CHECK IN'}
        {status === 'no_booking' && 'NO BOOKING — WALK-IN'}
        {status === 'no_show' && 'MARKED AS NO-SHOW'}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Giant warehouse label */}
        {label && (
          <div className="bg-card rounded-sm border-2 border-accent p-5 flex items-center gap-5">
            <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-sm bg-accent flex items-center justify-center">
              <span className="font-sans text-4xl sm:text-5xl font-black text-accent-foreground tracking-tight">
                {label.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Code</p>
              <p className="font-serif text-3xl sm:text-4xl font-bold">{label.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{label.stagingZone}</p>
            </div>
          </div>
        )}

        {/* Customer info */}
        <div className="bg-card rounded-sm border border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold">
                {customer.name}
                {customer.is_vip && (
                  <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-sm align-middle">VIP</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{orderNums}</p>
            </div>
            <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-sm">
              Seg {customer.segment}
            </span>
          </div>

          {customer.is_vip && customer.vip_note && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-sm p-3 text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {customer.vip_note}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> {customer.email}
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${customer.phone}`} className="underline">{customer.phone}</a>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" /> {customer.city}, {customer.state}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="w-3.5 h-3.5" /> {vehicleRec}
            </div>
          </div>

          {booking?.time_slots && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-serif font-bold">{booking.time_slots.day}, {booking.time_slots.time}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {status === 'confirmed' && (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="flex-1 bg-blue-600 text-white py-4 rounded-sm font-sans font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><User className="w-5 h-5" /> Check In</>}
            </button>
          )}
          {status === 'checked_in' && (
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="flex-1 bg-green-600 text-white py-4 rounded-sm font-sans font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Mark Complete</>}
            </button>
          )}
          {status === 'completed' && (
            <div className="flex-1 bg-green-100 text-green-800 py-4 rounded-sm font-semibold text-lg text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> Pickup Complete
            </div>
          )}
        </div>

        {/* Pickup items checklist */}
        <div className="space-y-2">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Pickup Items ({allPickupItems.reduce((s, i) => s + i.qty, 0)} items)
          </h3>
          {allPickupItems.map(item => {
            const product = getProductInfo(item.item_name);
            const isDone = item.fulfillment_status === 'picked_up' || item.fulfillment_status === 'staged';
            return (
              <div key={item.id} className={`bg-card rounded-sm border border-border flex gap-3 p-3 ${isDone ? 'opacity-60' : ''}`}>
                <div className="shrink-0 w-14 h-14 rounded-sm overflow-hidden bg-muted relative">
                  {product ? (
                    <Image src={product.image} alt={product.shortName} fill className="object-cover" sizes="56px" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-serif font-bold text-sm ${isDone ? 'line-through' : ''}`}>
                    {product?.shortName || item.item_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                  {product && (
                    <p className="text-xs text-muted-foreground">{product.weight} — {product.handling}</p>
                  )}
                </div>
                <div className="shrink-0 self-center">
                  {isDone ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-border" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Shipping items */}
        {shippingItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-serif text-sm font-bold text-muted-foreground">
              Shipping Separately ({shippingItems.length})
            </h3>
            {shippingItems.map(item => (
              <div key={item.id} className="bg-muted/50 rounded-sm border border-border p-3 text-sm flex justify-between">
                <span>{item.item_name}</span>
                <span className="text-muted-foreground">x{item.qty}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
