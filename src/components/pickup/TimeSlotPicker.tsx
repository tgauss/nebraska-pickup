'use client';

import { TimeSlot } from '@/lib/types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
}

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
const DAY_DATES: Record<string, string> = { Thursday: 'Apr 2', Friday: 'Apr 3', Saturday: 'Apr 4' };

function sortSlots(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });
}

function getSlotStyle(slot: TimeSlot, selected: boolean) {
  if (selected) {
    return {
      wrapper: 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20',
      time: 'text-primary',
      badge: 'bg-primary text-white',
      badgeText: 'Selected',
    };
  }

  const remaining = slot.capacity - slot.current_bookings;
  const pct = slot.capacity > 0 ? remaining / slot.capacity : 0;

  if (remaining <= 0) {
    return {
      wrapper: 'border border-border bg-muted cursor-not-allowed',
      time: 'text-muted-foreground line-through',
      badge: 'bg-muted-foreground/20 text-muted-foreground',
      badgeText: 'Full',
    };
  }
  if (remaining === 1) {
    return {
      wrapper: 'border border-red-300 bg-red-50 cursor-pointer',
      time: 'text-red-900',
      badge: 'bg-red-500 text-white',
      badgeText: '1 left!',
    };
  }
  if (pct <= 0.5) {
    return {
      wrapper: 'border border-amber-300 bg-amber-50 cursor-pointer',
      time: 'text-amber-900',
      badge: 'bg-amber-500 text-white',
      badgeText: `${remaining} left`,
    };
  }
  return {
    wrapper: 'border border-green-300 bg-green-50 cursor-pointer',
    time: 'text-green-900',
    badge: 'bg-green-600 text-white',
    badgeText: `${remaining} open`,
  };
}

export default function TimeSlotPicker({ slots, selectedSlot, onSelectSlot }: TimeSlotPickerProps) {
  const days = ['Thursday', 'Friday', 'Saturday'];

  const slotsByDay = days.map(day => ({
    day,
    date: DAY_DATES[day],
    slots: sortSlots(slots.filter(s => s.day === day)),
  }));

  return (
    <div className="space-y-0">
      {/* Heat legend */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <Legend color="bg-green-500" label="Open" />
        <Legend color="bg-amber-500" label="Filling" />
        <Legend color="bg-red-500" label="1 left" />
        <Legend color="bg-muted-foreground/30" label="Full" />
      </div>

      {slotsByDay.map(({ day, date, slots: daySlots }) => (
        <div key={day}>
          {/* Sticky day header */}
          <div className="sticky top-0 z-10 bg-secondary/95 backdrop-blur-sm border-b border-border -mx-5 sm:-mx-6 px-5 sm:px-6 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h3 className="font-serif font-bold text-base">{day}</h3>
                <span className="text-xs text-muted-foreground">{date}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {daySlots.filter(s => s.current_bookings < s.capacity).length} of {daySlots.length} available
              </span>
            </div>
          </div>

          {/* Slot grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3">
            {daySlots.map(slot => {
              const isFull = slot.current_bookings >= slot.capacity;
              const isSelected = selectedSlot?.id === slot.id;
              const style = getSlotStyle(slot, isSelected);

              return (
                <button
                  key={slot.id}
                  onClick={() => !isFull && onSelectSlot(slot)}
                  disabled={isFull}
                  className={`${style.wrapper} rounded-sm p-3 text-center transition-all active:scale-[0.98]`}
                >
                  <div className={`font-sans text-sm sm:text-base font-semibold ${style.time}`}>
                    {slot.time}
                  </div>
                  <div className="mt-1">
                    <span className={`inline-block text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                      {style.badgeText}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
