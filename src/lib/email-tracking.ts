/**
 * In-memory email engagement tracking.
 * Populated by Postmark webhooks and email sends.
 */

export interface EmailEvent {
  customerId: string | null;
  email: string;
  token: string; // customer token from metadata
  event: 'sent' | 'opened' | 'clicked' | 'bounced';
  timestamp: string;
  details?: Record<string, unknown>;
}

const events: EmailEvent[] = [];

// Index: email → latest status
const statusByEmail = new Map<string, {
  sent: boolean;
  sentAt: string | null;
  opened: boolean;
  openedAt: string | null;
  clicked: boolean;
  clickedAt: string | null;
  bounced: boolean;
}>();

function ensureStatus(email: string) {
  if (!statusByEmail.has(email)) {
    statusByEmail.set(email, {
      sent: false, sentAt: null,
      opened: false, openedAt: null,
      clicked: false, clickedAt: null,
      bounced: false,
    });
  }
  return statusByEmail.get(email)!;
}

export function recordEvent(event: EmailEvent) {
  events.push(event);
  const status = ensureStatus(event.email);

  switch (event.event) {
    case 'sent':
      status.sent = true;
      status.sentAt = event.timestamp;
      break;
    case 'opened':
      status.opened = true;
      if (!status.openedAt) status.openedAt = event.timestamp;
      break;
    case 'clicked':
      status.clicked = true;
      if (!status.clickedAt) status.clickedAt = event.timestamp;
      break;
    case 'bounced':
      status.bounced = true;
      break;
  }
}

export function getStatusByEmail(email: string) {
  return statusByEmail.get(email.toLowerCase()) || {
    sent: false, sentAt: null,
    opened: false, openedAt: null,
    clicked: false, clickedAt: null,
    bounced: false,
  };
}

export function getAllStatuses() {
  return Object.fromEntries(statusByEmail);
}

export function getEvents(): EmailEvent[] {
  return [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function getEventSummary() {
  const sent = new Set([...statusByEmail.entries()].filter(([, s]) => s.sent).map(([e]) => e)).size;
  const opened = new Set([...statusByEmail.entries()].filter(([, s]) => s.opened).map(([e]) => e)).size;
  const clicked = new Set([...statusByEmail.entries()].filter(([, s]) => s.clicked).map(([e]) => e)).size;
  const bounced = new Set([...statusByEmail.entries()].filter(([, s]) => s.bounced).map(([e]) => e)).size;
  return { sent, opened, clicked, bounced };
}
