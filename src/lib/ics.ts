// ICS calendar file generator for pickup confirmations

interface ICSEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  url?: string;
  geo?: { lat: number; lng: number };
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICS(event: ICSEvent): string {
  const formatDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nebraska Devaney Pickup//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Devaney Pickup',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(event.startDate)}`,
    `DTEND:${formatDate(event.endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(event.location)}`,
    'STATUS:CONFIRMED',
    `UID:${crypto.randomUUID()}@devaney-pickup`,
    `DTSTAMP:${formatDate(new Date())}`,
  ];

  // Add Google Maps URL
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  // Add geo coordinates for map apps
  if (event.geo) {
    lines.push(`GEO:${event.geo.lat};${event.geo.lng}`);
  }

  // 1 hour reminder
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Devaney pickup is in 1 hour!',
    'END:VALARM',
  );

  // Morning-of reminder
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Devaney pickup today. Don\'t forget your vehicle!',
    'END:VALARM',
  );

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

// Roca warehouse coordinates
export const ROCA_GEO = { lat: 40.6414, lng: -96.6614 };
export const ROCA_ADDRESS = '2410 Production Drive, Unit 6, Roca, NE 68430';
export const ROCA_MAPS_URL = 'https://maps.google.com/?q=2410+Production+Drive+Unit+6+Roca+NE+68430';

// Convert day + time string to a Date object
export function getSlotDate(day: string, time: string): Date {
  const dayMap: Record<string, string> = {
    Thursday: '2026-04-02',
    Friday: '2026-04-03',
    Saturday: '2026-04-04',
  };

  const dateStr = dayMap[day];
  if (!dateStr) throw new Error(`Unknown day: ${day}`);

  const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) throw new Error(`Invalid time format: ${time}`);

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toLowerCase();

  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`);
}

export function getSlotEndDate(day: string, time: string): Date {
  const start = getSlotDate(day, time);
  return new Date(start.getTime() + 30 * 60 * 1000);
}
