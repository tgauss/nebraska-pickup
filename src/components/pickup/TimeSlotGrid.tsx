'use client';

import { TimeSlot } from '@/lib/types';

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  disabled?: boolean;
}

// Parse time string to minutes for sorting
function timeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

const DAY_ORDER: Record<string, number> = { Thursday: 0, Friday: 1, Saturday: 2 };
const DAY_DATES: Record<string, string> = { Thursday: 'Apr 16', Friday: 'Apr 17', Saturday: 'Apr 18' };

function sortSlots(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });
}

function getHeatColor(slot: TimeSlot, selected: boolean): {
  bg: string;
  border: string;
  text: string;
  badge: string;
  label: string;
} {
  if (selected) {
    return {
      bg: 'bg-primary/10',
      border: 'border-2 border-primary ring-2 ring-primary/20',
      text: 'text-foreground',
      badge: 'bg-primary text-primary-foreground',
      label: 'Selected',
    };
  }

  const remaining = slot.capacity - slot.current_bookings;
  const pct = slot.capacity > 0 ? remaining / slot.capacity : 0;

  if (remaining <= 0) {
    return {
      bg: 'bg-muted',
      border: 'border border-border',
      text: 'text-muted-foreground',
      badge: 'bg-muted-foreground/20 text-muted-foreground',
      label: 'Full',
    };
  }
  if (remaining === 1) {
    return {
      bg: 'bg-red-50',
      border: 'border border-red-300',
      text: 'text-red-900',
      badge: 'bg-red-500 text-white',
      label: '1 left',
    };
  }
  if (pct <= 0.5) {
    return {
      bg: 'bg-amber-50',
      border: 'border border-amber-300',
      text: 'text-amber-900',
      badge: 'bg-amber-500 text-white',
      label: `${remaining} left`,
    };
  }
  return {
    bg: 'bg-green-50',
    border: 'border border-green-300',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white',
    label: `${remaining} open`,
  };
}

export default function TimeSlotGrid({ slots, selectedSlotId, onSelectSlot, disabled }: TimeSlotGridProps) {
  const days = ['Thursday', 'Friday', 'Saturday'];

  const slotsByDay = days.map(day => ({
    day,
    date: DAY_DATES[day],
    slots: sortSlots(slots.filter(s => s.day === day)),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">Choose Your Pickup Time</h3>
        <HeatLegend />
      </div>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {slotsByDay.map(({ day, date, slots: daySlots }) => (
          <div key={day}>
            <div className="text-center pb-2 mb-2 border-b border-border">
              <h4 className="font-serif font-bold text-foreground">{day}</h4>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
            <div className="space-y-1.5">
              {daySlots.map(slot => (
                <SlotButton
                  key={slot.id}
                  slot={slot}
                  selected={selectedSlotId === slot.id}
                  onClick={() => onSelectSlot(slot)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: stacked with sticky day headers */}
      <div className="md:hidden space-y-0">
        {slotsByDay.map(({ day, date, slots: daySlots }) => (
          <div key={day}>
            <div className="sticky top-0 z-10 bg-secondary/90 backdrop-blur-sm border-b border-border px-3 py-2.5 -mx-4 sm:-mx-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-foreground">{day}</h4>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {daySlots.filter(s => s.current_bookings < s.capacity).length} of {daySlots.length} open
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 py-3">
              {daySlots.map(slot => (
                <SlotButton
                  key={slot.id}
                  slot={slot}
                  selected={selectedSlotId === slot.id}
                  onClick={() => onSelectSlot(slot)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  selected,
  onClick,
  disabled,
}: {
  slot: TimeSlot;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const isFull = slot.current_bookings >= slot.capacity;
  const heat = getHeatColor(slot, selected);

  if (isFull) {
    return (
      <div className={`${heat.bg} ${heat.border} rounded-sm px-3 py-2.5 text-center cursor-not-allowed`}>
        <div className={`font-sans text-sm font-medium ${heat.text} line-through`}>{slot.time}</div>
        <div className="text-[10px] mt-0.5 text-muted-foreground">Full</div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full ${heat.bg} ${heat.border} rounded-sm px-3 py-2.5 text-center transition-all hover:shadow-sm ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className={`font-sans text-sm font-medium ${heat.text}`}>{slot.time}</div>
      <div className="mt-0.5">
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${heat.badge}`}>
          {heat.label}
        </span>
      </div>
    </button>
  );
}

function HeatLegend() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
        <span className="text-[10px] text-muted-foreground">Open</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
        <span className="text-[10px] text-muted-foreground">Filling</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
        <span className="text-[10px] text-muted-foreground">1 left</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30" />
        <span className="text-[10px] text-muted-foreground">Full</span>
      </div>
    </div>
  );
}
