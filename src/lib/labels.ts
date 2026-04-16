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
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

/**
 * Labels are FROZEN as of 2026-04-14 (print night).
 * They are loaded from data/frozen-labels.json and never recomputed.
 * This prevents label numbers from shifting when customers are
 * added, removed, or change segments.
 */

// Cache for labels (loaded once from frozen file)
let _labels: Map<string, CustomerLabel> | null = null;

function loadFrozenLabels(): Map<string, CustomerLabel> {
  if (_labels) return _labels;

  _labels = new Map();

  const possiblePaths = [
    resolve(process.cwd(), 'data/frozen-labels.json'),
    resolve(process.cwd(), '../data/frozen-labels.json'),
  ];

  let raw = '';
  for (const p of possiblePaths) {
    try { raw = readFileSync(p, 'utf-8'); break; } catch { /* try next */ }
  }

  if (!raw) {
    console.error('[labels] frozen-labels.json not found — labels will be empty');
    return _labels;
  }

  const frozen = JSON.parse(raw);
  for (const entry of frozen.labels) {
    // Map token-based customer ID to the in-memory stable ID
    const customer = db.getCustomerByToken(entry.customerToken);
    const customerId = customer?.id || entry.customerId;

    _labels.set(customerId, {
      customerId,
      label: entry.label,
      prefix: entry.prefix,
      number: entry.number,
      stagingZone: STAGING_ZONES[entry.prefix as Prefix] || 'Floor — General',
    });
  }

  console.log(`[labels] Loaded ${_labels.size} frozen labels`);
  return _labels;
}

/** Get the warehouse label for a customer */
export function getCustomerLabel(customerId: string): CustomerLabel | null {
  const labels = loadFrozenLabels();
  return labels.get(customerId) || null;
}

/** Get all labels, optionally filtered by prefix */
export function getAllLabels(prefix?: string): CustomerLabel[] {
  const labels = loadFrozenLabels();
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
