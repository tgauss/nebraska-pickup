'use client';

import { CheckCircle, Calendar, MapPin, Car, Mail, Download, QrCode } from 'lucide-react';
import Image from 'next/image';
import type { Customer, Booking, LineItem, TimeSlot, Order } from '@/lib/types';
import { getVehicleRecommendation } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
import type { PickupSize } from '@/lib/types';

interface ConfirmationViewProps {
  customer: Customer;
  booking: Booking & { time_slots: TimeSlot };
  pickupItems: LineItem[];
  shipItems: LineItem[];
  orders: Order[];
  token: string;
  canReschedule: boolean;
  onReschedule: () => void;
}

export default function ConfirmationView({
  customer,
  booking,
  pickupItems,
  shipItems,
  orders,
  token,
  canReschedule,
  onReschedule,
}: ConfirmationViewProps) {
  const slot = booking.time_slots;
  const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);
  const pickingUpShipItems = shipItems.filter(i => i.fulfillment_preference === 'pickup');
  const shippingItems = shipItems.filter(i => i.fulfillment_preference === 'ship');
  const orderNums = orders.map(o => o.shopify_order_number).join(', ');

  // Google Calendar link
  const gcalStart = formatGcalDate(slot.day, slot.time);
  const gcalEnd = formatGcalDate(slot.day, slot.time, 30);
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Devaney Pickup — ${orderNums}`)}&dates=${gcalStart}/${gcalEnd}&location=${encodeURIComponent('2410 Production Drive, Unit 6, Roca, NE 68430')}&details=${encodeURIComponent(`Order: ${orderNums}\nItems: ${[...pickupItems, ...pickingUpShipItems].map(i => `${i.qty}x ${i.item_name}`).join(', ')}\n\nVehicle: ${vehicleRec}\n\nDirections: https://maps.google.com/?q=2410+Production+Drive+Unit+6+Roca+NE+68430`)}`;

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="text-center py-4">
        <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-3" />
        <h2 className="font-serif text-3xl sm:text-4xl font-bold">You&apos;re All Set!</h2>
        <p className="text-muted-foreground mt-1">Your pickup is confirmed</p>
        <p className="text-xs text-muted-foreground mt-2 font-mono tracking-wider">{orderNums}</p>
      </div>

      {/* QR Code — front and center */}
      <div className="bg-card rounded-sm border border-border p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <QrCode className="w-4 h-4 text-primary" />
          <h3 className="font-serif font-bold text-sm">Your Check-in QR Code</h3>
        </div>
        <div className="bg-white rounded-sm p-3 inline-block border border-border">
          <Image
            src={`/api/pickup/${token}/qr`}
            alt="Check-in QR Code"
            width={200}
            height={200}
            unoptimized
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Show this when you arrive for fast check-in
        </p>
      </div>

      {/* Time & location */}
      <div className="bg-card rounded-sm border-2 border-primary/20 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="font-serif text-lg font-bold">{slot.day}, {slot.time}</p>
            <p className="text-sm text-muted-foreground">30-minute pickup window</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">2410 Production Drive, Unit 6</p>
            <p className="text-sm text-muted-foreground">Roca, NE 68430</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Car className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm">{vehicleRec}</p>
        </div>
        <a
          href="https://maps.google.com/?q=2410+Production+Drive+Unit+6+Roca+NE+68430"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-primary hover:underline font-medium ml-8"
        >
          Open in Maps
        </a>
      </div>

      {/* Add to Calendar */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`/api/pickup/${token}/calendar`}
          className="flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-3 rounded-sm font-sans text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Apple Calendar
        </a>
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-card border border-border text-foreground px-4 py-3 rounded-sm font-sans text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Google Calendar
        </a>
      </div>

      {/* Pickup items with product images */}
      <div className="space-y-2">
        <h3 className="font-serif text-lg font-bold">Pickup Items</h3>
        {[...pickupItems, ...pickingUpShipItems].map(item => {
          const product = getProductInfo(item.item_name);
          const isConverted = pickingUpShipItems.some(i => i.id === item.id);
          return (
            <div key={item.id} className="bg-card rounded-sm border border-border flex gap-3 p-3 hover:border-primary/30 transition-colors">
              <div className="shrink-0 w-16 h-16 rounded-sm overflow-hidden bg-muted relative">
                {product ? (
                  <Image src={product.image} alt={product.shortName} fill className="object-cover" sizes="64px" unoptimized />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-sm sm:text-base">
                  {product?.shortName || item.item_name}
                </p>
                {isConverted && (
                  <span className="text-xs text-primary font-medium">Added to pickup</span>
                )}
                <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shipping items */}
      {shippingItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-serif text-lg font-bold">Shipping Separately</h3>
          {shippingItems.map(item => {
            const product = getProductInfo(item.item_name);
            return (
              <div key={item.id} className="bg-muted/50 rounded-sm border border-border flex gap-3 p-3">
                <div className="shrink-0 w-12 h-12 rounded-sm overflow-hidden bg-muted relative">
                  {product ? (
                    <Image src={product.image} alt={product.shortName} fill className="object-cover" sizes="48px" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-serif font-bold text-sm">{product?.shortName || item.item_name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule / contact */}
      <div className="text-center space-y-2 pt-4 border-t border-border">
        {canReschedule ? (
          <button
            onClick={onReschedule}
            className="text-sm text-primary hover:underline font-medium"
          >
            Need to change your time?
          </button>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Mail className="w-3 h-3" />
            Need to change? Email the team for help.
          </p>
        )}
      </div>
    </div>
  );
}

// Helper: format date for Google Calendar URL (YYYYMMDDTHHMMSS format, UTC)
function formatGcalDate(day: string, time: string, addMinutes = 0): string {
  const dayMap: Record<string, string> = {
    Thursday: '2026-04-02',
    Friday: '2026-04-03',
    Saturday: '2026-04-04',
  };
  const dateStr = dayMap[day] || '2026-04-02';
  const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return '20260402T170000Z';

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  // CDT is UTC-5
  const utcHours = hours + 5;
  const totalMinutes = utcHours * 60 + minutes + addMinutes;
  const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');

  return `${dateStr.replace(/-/g, '')}T${h}${m}00Z`;
}
