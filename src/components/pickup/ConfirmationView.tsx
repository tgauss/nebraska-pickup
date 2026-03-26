'use client';

import { Calendar, MapPin, Car, Mail, Download, Navigation, Clock, CheckCircle, Package, Truck } from 'lucide-react';
/* eslint-disable @next/next/no-img-element */
import type { Customer, Booking, LineItem, TimeSlot, Order } from '@/lib/types';
import { getVehicleRecommendation } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
import type { PickupSize } from '@/lib/types';

interface LabelInfo {
  label: string;
  prefix: string;
  stagingZone: string;
}

interface ConfirmationViewProps {
  customer: Customer;
  booking: Booking & { time_slots: TimeSlot };
  pickupItems: LineItem[];
  shipItems: LineItem[];
  orders: Order[];
  token: string;
  canReschedule: boolean;
  onReschedule: () => void;
  label?: LabelInfo | null;
}

const WAREHOUSE_ADDRESS = '2410 Production Drive, Unit 4, Roca, NE 68430';
const GOOGLE_MAPS_URL = 'https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430';
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGdhdXNzIiwiYSI6ImUxelFyZWsifQ.ewANL0BvfdZa9RRcOIQSVA';

export default function ConfirmationView({
  customer,
  booking,
  pickupItems,
  shipItems,
  orders,
  token,
  canReschedule,
  onReschedule,
  label,
}: ConfirmationViewProps) {
  const slot = booking.time_slots;
  const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);
  const pickingUpShipItems = shipItems.filter(i => i.fulfillment_preference === 'pickup');
  const shippingItems = shipItems.filter(i => i.fulfillment_preference === 'ship');
  const allPickupItems = [...pickupItems, ...pickingUpShipItems];
  const orderNums = orders.map(o => o.shopify_order_number).join(', ');
  const firstName = customer.name.split(' ')[0];

  // Determine status display
  const status = booking.status || 'confirmed';

  // Google Calendar link
  const gcalStart = formatGcalDate(slot.day, slot.time);
  const gcalEnd = formatGcalDate(slot.day, slot.time, 30);
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Devaney Pickup — ${orderNums}`)}&dates=${gcalStart}/${gcalEnd}&location=${encodeURIComponent(WAREHOUSE_ADDRESS)}&details=${encodeURIComponent(`Order: ${orderNums}\nItems: ${allPickupItems.map(i => `${i.qty}x ${i.item_name}`).join(', ')}\n\nVehicle: ${vehicleRec}\n\nDirections: ${GOOGLE_MAPS_URL}`)}`;

  // Get the date string for display
  const dateMap: Record<string, string> = {
    Thursday: 'Thu, Apr 16',
    Friday: 'Fri, Apr 17',
    Saturday: 'Sat, Apr 18',
  };
  const displayDate = dateMap[slot.day] || slot.day;

  return (
    <div className="space-y-5">

      {/* ========== RECEIPT CARD — above the fold ========== */}
      <div className="bg-card rounded-sm border-2 border-border overflow-hidden">
        {/* Status bar at top of card */}
        <div className={`py-2 px-4 text-center text-xs font-sans font-semibold uppercase tracking-wider ${
          status === 'completed' ? 'bg-green-600 text-white' :
          status === 'checked_in' ? 'bg-blue-600 text-white' :
          'bg-green-50 text-green-700 border-b border-green-200'
        }`}>
          {status === 'completed' && 'Pickup Complete'}
          {status === 'checked_in' && 'Checked In'}
          {(status === 'confirmed' || status === 'pending') && 'Pickup Confirmed'}
        </div>

        <div className="px-5 pt-5 pb-6 flex flex-col items-center text-center">
          {/* Warehouse label — big, black, unmistakable */}
          {label && (
            <div className="w-24 h-24 rounded-sm bg-accent flex items-center justify-center mb-4">
              <span className="font-sans text-4xl font-black text-accent-foreground tracking-tight">
                {label.label}
              </span>
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white rounded-sm p-2 border border-border mb-4">
            <img
              src={`/api/pickup/${token}/qr`}
              alt="Check-in QR Code"
              width={160}
              height={160}
            />
          </div>

          {/* Customer name */}
          <h2 className="font-serif text-xl font-bold">{customer.name}</h2>

          {/* Order number(s) */}
          <p className="text-xs text-muted-foreground font-mono tracking-wider mt-1">
            {orderNums}
          </p>

          {/* Pickup time — prominent */}
          <div className="mt-4 flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-serif font-bold">{displayDate} &middot; {slot.time}</span>
          </div>
        </div>
      </div>

      {/* ========== ACTION BUTTONS ========== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Directions */}
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3.5 rounded-sm font-sans text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Navigation className="w-4 h-4" />
          Directions
        </a>

        {/* Add to Calendar — dropdown-like with two options stacked */}
        <a
          href={`/api/pickup/${token}/calendar`}
          className="flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-3.5 rounded-sm font-sans text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Add to Calendar
        </a>
      </div>
      <div className="flex justify-center">
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Or add to Google Calendar
        </a>
      </div>

      {/* ========== DETAILS SECTION ========== */}

      {/* Time & Location card */}
      <div className="bg-card rounded-sm border border-border p-4 space-y-3">
        <h3 className="font-serif font-bold text-base">Pickup Details</h3>

        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">{slot.day}, {slot.time}</p>
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
          <p className="text-sm">{vehicleRec}</p>
        </div>

        {customer.drive_minutes > 0 && (
          <div className="flex items-center gap-3">
            <Truck className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">~{customer.drive_minutes} min drive from {customer.city}</p>
          </div>
        )}

        {/* Status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {status === 'completed' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : status === 'checked_in' ? (
              <CheckCircle className="w-4 h-4 text-blue-600" />
            ) : (
              <Package className="w-4 h-4 text-amber-600" />
            )}
            <span className={`text-sm font-medium ${
              status === 'completed' ? 'text-green-700' :
              status === 'checked_in' ? 'text-blue-700' :
              'text-amber-700'
            }`}>
              {status === 'completed' ? 'Picked Up' :
               status === 'checked_in' ? 'Checked In — Loading Your Items' :
               'Pending Pickup'}
            </span>
          </div>
        </div>
      </div>

      {/* Map — clickable, opens directions */}
      <a
        href={GOOGLE_MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-sm overflow-hidden border border-border"
      >
        <img
          src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+d00000(-96.6197,40.6753)/-96.6197,40.6753,13,0/600x200@2x?access_token=${MAPBOX_TOKEN}`}
          alt="Pickup location map"
          className="w-full h-auto"
          loading="lazy"
        />
      </a>

      {/* Pickup items */}
      {allPickupItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-serif text-base font-bold">
            Your Pickup Items ({allPickupItems.reduce((s, i) => s + i.qty, 0)})
          </h3>
          {allPickupItems.map(item => {
            const product = getProductInfo(item.item_name);
            const isConverted = pickingUpShipItems.some(i => i.id === item.id);
            return (
              <div key={item.id} className="bg-card rounded-sm border border-border flex gap-3 p-3">
                <div className="shrink-0 w-14 h-14 rounded-sm overflow-hidden bg-muted relative">
                  {product ? (
                    <img src={product.image} alt={product.shortName} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-sm">
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
      )}

      {/* Shipping items */}
      {shippingItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-serif text-sm font-bold text-muted-foreground">Shipping Separately</h3>
          {shippingItems.map(item => {
            const product = getProductInfo(item.item_name);
            return (
              <div key={item.id} className="bg-muted/50 rounded-sm border border-border flex gap-3 p-3">
                <div className="shrink-0 w-10 h-10 rounded-sm overflow-hidden bg-muted relative">
                  {product ? (
                    <img src={product.image} alt={product.shortName} className="absolute inset-0 w-full h-full object-cover" />
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
    Thursday: '2026-04-16',
    Friday: '2026-04-17',
    Saturday: '2026-04-18',
  };
  const dateStr = dayMap[day] || '2026-04-16';
  const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return '20260416T170000Z';

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
