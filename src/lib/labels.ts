/**
 * Warehouse labeling system
 *
 * Format: {Product Prefix}{Sequential Number}
 *
 * Prefixes by primary item type:
 *   B  = Bench (heaviest, stage near loading dock)
 *   E  = End-Row Pair (bulky pairs, stage separately)
 *   S  = Standard Arena Seat (stackable)
 *   W  = Wall Mount Pair (medium, boxable)
 *   I  = Iron Side Piece (shippable but pickup converts)
 *   C  = Chair Back (small, shippable)
 *   X  = Mixed / other
 *
 * Examples: B01, B02, E01, S01, S02, I01, I02
 *
 * The prefix tells the warehouse team WHERE to stage:
 *   B/E → Loading dock area (heavy, need 2 people)
 *   S/W → Stackable staging area (1 person)
 *   I/C → Small items shelf / "maybe pickup" zone
 */

import * as db from './local-data';

export interface CustomerLabel {
  customerId: string;
  label: string;
  prefix: string;
  number: number;
  stagingZone: string;
}

type Prefix = 'B' | 'E' | 'S' | 'W' | 'I' | 'C' | 'X';

const STAGING_ZONES: Record<Prefix, string> = {
  B: 'Dock — Heavy (2 people)',
  E: 'Dock — Bulky pairs',
  S: 'Floor — Stackable seats',
  W: 'Floor — Wall mounts',
  I: 'Shelf — Iron pieces',
  C: 'Shelf — Chair backs',
  X: 'Floor — General',
};

// Priority order for determining primary item type
const PREFIX_PRIORITY: Prefix[] = ['B', 'E', 'S', 'W', 'I', 'C'];

function getItemPrefix(itemName: string): Prefix {
  const lower = itemName.toLowerCase();
  if (lower.includes('bench')) return 'B';
  if (lower.includes('end') && lower.includes('row') && lower.includes('seat')) return 'E';
  if (lower.includes('premium') && lower.includes('end')) return 'E';
  if (lower.includes('wall mount')) return 'W';
  if (lower.includes('arena seat') || lower.includes('standard') && lower.includes('seat')) return 'S';
  if (lower.includes('iron') || lower.includes('side piece')) return 'I';
  if (lower.includes('chair back') || lower.includes('chairback')) return 'C';
  return 'X';
}

function getCustomerPrefix(customerId: string): Prefix {
  const items = db.getLineItemsByCustomer(customerId);
  const pickupItems = items.filter(i => i.fulfillment_preference === 'pickup' || i.item_type === 'pickup');

  if (pickupItems.length === 0) return 'X';

  // Find the highest-priority (heaviest) item type
  const prefixes = pickupItems.map(i => getItemPrefix(i.item_name));
  for (const p of PREFIX_PRIORITY) {
    if (prefixes.includes(p)) return p;
  }
  return prefixes[0] || 'X';
}

// Cache for labels (computed once)
let _labels: Map<string, CustomerLabel> | null = null;

function computeLabels(): Map<string, CustomerLabel> {
  if (_labels) return _labels;

  const customers = db.getAllCustomers();
  // Only label customers who need pickup (Seg A, B, or C who convert)
  const pickupCustomers = customers.filter(c =>
    c.segment === 'A' || c.segment === 'B' || c.segment === 'C'
  );

  // Group by prefix
  const byPrefix = new Map<Prefix, string[]>();
  for (const c of pickupCustomers) {
    const prefix = getCustomerPrefix(c.id);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix)!.push(c.id);
  }

  // Assign sequential numbers within each prefix
  _labels = new Map();
  for (const [prefix, customerIds] of byPrefix) {
    // Sort by customer name for consistent ordering
    const sorted = customerIds.sort((a, b) => {
      const ca = db.getCustomerById(a);
      const cb = db.getCustomerById(b);
      return (ca?.name || '').localeCompare(cb?.name || '');
    });

    sorted.forEach((custId, index) => {
      const number = index + 1;
      const label = `${prefix}${String(number).padStart(2, '0')}`;
      _labels!.set(custId, {
        customerId: custId,
        label,
        prefix,
        number,
        stagingZone: STAGING_ZONES[prefix],
      });
    });
  }

  return _labels;
}

/** Get the warehouse label for a customer */
export function getCustomerLabel(customerId: string): CustomerLabel | null {
  const labels = computeLabels();
  return labels.get(customerId) || null;
}

/** Get all labels, optionally filtered by prefix */
export function getAllLabels(prefix?: string): CustomerLabel[] {
  const labels = computeLabels();
  const all = Array.from(labels.values());
  if (prefix) return all.filter(l => l.prefix === prefix);
  return all.sort((a, b) => {
    if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
    return a.number - b.number;
  });
}

/** Get label for a customer by token */
export function getLabelByToken(token: string): CustomerLabel | null {
  const customer = db.getCustomerByToken(token);
  if (!customer) return null;
  return getCustomerLabel(customer.id);
}

/** Staging zone summary */
export function getStagingZones(): Array<{ prefix: string; zone: string; count: number }> {
  const labels = getAllLabels();
  const zones = new Map<string, { prefix: string; zone: string; count: number }>();

  for (const l of labels) {
    if (!zones.has(l.prefix)) {
      zones.set(l.prefix, { prefix: l.prefix, zone: l.stagingZone, count: 0 });
    }
    zones.get(l.prefix)!.count++;
  }

  return Array.from(zones.values()).sort((a, b) => a.prefix.localeCompare(b.prefix));
}

/** Prefix descriptions for legend */
export const PREFIX_INFO: Record<string, { name: string; color: string; bgColor: string }> = {
  B: { name: 'Bench', color: 'text-amber-800', bgColor: 'bg-amber-100' },
  E: { name: 'End-Row', color: 'text-purple-800', bgColor: 'bg-purple-100' },
  S: { name: 'Seat', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  W: { name: 'Wall Mount', color: 'text-indigo-800', bgColor: 'bg-indigo-100' },
  I: { name: 'Iron', color: 'text-gray-800', bgColor: 'bg-gray-200' },
  C: { name: 'Chair Back', color: 'text-red-800', bgColor: 'bg-red-100' },
  X: { name: 'Other', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};
