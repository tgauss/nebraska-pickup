/**
 * In-memory data layer for pickup prep: checklist items + guides/SOPs.
 * Persists only for the server session (same pattern as local-data.ts).
 */

import { randomUUID } from 'crypto';

// ============================================================
// Types
// ============================================================

export interface ChecklistItem {
  id: string;
  title: string;
  category: 'supplies' | 'equipment' | 'tasks' | 'signage' | 'other';
  completed: boolean;
  notes: string;
  qty: string;        // e.g. "2 rolls", "50 boxes", or ""
  qty_number: number;  // numeric quantity for cost calc (0 if not applicable)
  unit_price: number;  // price per unit in dollars (0 if n/a)
  source: 'order_online' | 'pickup_local' | 'ship_to_warehouse' | 'on_hand' | '';
  source_url: string;  // link to where to buy, or ""
  priority: 'low' | 'medium' | 'high';
  assigned_to: string; // person responsible, or ""
  created_at: string;
  completed_at: string | null;
}

export interface Guide {
  id: string;
  title: string;
  category: 'sop' | 'reference' | 'safety' | 'training';
  content: string;   // markdown
  created_at: string;
  updated_at: string;
}

// ============================================================
// In-memory stores
// ============================================================

const checklistItems: ChecklistItem[] = [];
const guides: Guide[] = [];
let seeded = false;

function seed() {
  if (seeded) return;
  seeded = true;

  // Starter checklist items for a pickup event
  const starterItems: Omit<ChecklistItem, 'id' | 'created_at' | 'completed_at'>[] = [
    { title: 'Shipping boxes (medium)', category: 'supplies', completed: false, notes: 'For iron side pieces and chair backs', qty: '50', qty_number: 50, unit_price: 2.50, source: 'order_online', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Shipping boxes (large)', category: 'supplies', completed: false, notes: 'For wall mounts', qty: '30', qty_number: 30, unit_price: 4.00, source: 'order_online', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Bubble wrap rolls', category: 'supplies', completed: false, notes: '', qty: '4 rolls', qty_number: 4, unit_price: 18.00, source: 'order_online', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Packing tape + dispensers', category: 'supplies', completed: false, notes: '', qty: '6', qty_number: 6, unit_price: 8.00, source: 'pickup_local', source_url: '', priority: 'medium', assigned_to: '' },
    { title: 'Furniture blankets / moving pads', category: 'supplies', completed: false, notes: 'For bench and seat loading', qty: '12', qty_number: 12, unit_price: 12.00, source: 'order_online', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Zip ties (large)', category: 'supplies', completed: false, notes: 'For bundling end-row pairs', qty: '1 bag', qty_number: 1, unit_price: 6.00, source: 'pickup_local', source_url: '', priority: 'low', assigned_to: '' },
    { title: 'Cleaning spray + rags', category: 'supplies', completed: false, notes: 'Wipe down items before handoff', qty: '', qty_number: 1, unit_price: 15.00, source: 'pickup_local', source_url: '', priority: 'medium', assigned_to: '' },
    { title: 'Label printer paper', category: 'supplies', completed: false, notes: 'For warehouse labels (B01, S05, etc.)', qty: '1 roll', qty_number: 1, unit_price: 25.00, source: 'order_online', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Folding tables', category: 'equipment', completed: false, notes: 'Check-in station + staging', qty: '3', qty_number: 3, unit_price: 45.00, source: 'pickup_local', source_url: '', priority: 'medium', assigned_to: '' },
    { title: 'Canopy / pop-up tent', category: 'equipment', completed: false, notes: 'Outdoor check-in if weather is nice', qty: '1', qty_number: 1, unit_price: 89.00, source: 'order_online', source_url: '', priority: 'low', assigned_to: '' },
    { title: 'Dolly / hand truck', category: 'equipment', completed: false, notes: 'For bench loading', qty: '2', qty_number: 2, unit_price: 65.00, source: 'pickup_local', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Furniture dolly (flat)', category: 'equipment', completed: false, notes: 'For heavy seats', qty: '1', qty_number: 1, unit_price: 40.00, source: 'pickup_local', source_url: '', priority: 'medium', assigned_to: '' },
    { title: 'Print staging zone signs', category: 'signage', completed: false, notes: 'Dock, Floor, Shelf — match label prefixes', qty: '', qty_number: 0, unit_price: 0, source: '', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Print directional signs to warehouse', category: 'signage', completed: false, notes: 'From road to Unit 4 entrance', qty: '4', qty_number: 0, unit_price: 0, source: '', source_url: '', priority: 'medium', assigned_to: '' },
    { title: 'Print "Check In Here" banner', category: 'signage', completed: false, notes: '', qty: '1', qty_number: 1, unit_price: 35.00, source: 'order_online', source_url: '', priority: 'medium', assigned_to: '' },
    { title: 'Set up staging zones in warehouse', category: 'tasks', completed: false, notes: 'Dock for benches/end-rows, Floor for seats/mounts, Shelf for iron/chair backs', qty: '', qty_number: 0, unit_price: 0, source: '', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Test QR scanner on phones', category: 'tasks', completed: false, notes: 'Make sure /admin/scan works on team phones', qty: '', qty_number: 0, unit_price: 0, source: '', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Charge walkie-talkies', category: 'tasks', completed: false, notes: '', qty: '', qty_number: 0, unit_price: 0, source: '', source_url: '', priority: 'medium', assigned_to: '' },
    { title: 'Brief volunteer team', category: 'tasks', completed: false, notes: 'Walk through check-in flow, loading procedures, VIP handling', qty: '', qty_number: 0, unit_price: 0, source: '', source_url: '', priority: 'high', assigned_to: '' },
    { title: 'Water / snacks for team', category: 'other', completed: false, notes: '', qty: '', qty_number: 1, unit_price: 40.00, source: 'pickup_local', source_url: '', priority: 'low', assigned_to: '' },
  ];

  for (const item of starterItems) {
    checklistItems.push({
      ...item,
      id: randomUUID(),
      created_at: new Date().toISOString(),
      completed_at: null,
    });
  }

  // Starter guides
  const starterGuides: Omit<Guide, 'id' | 'created_at' | 'updated_at'>[] = [
    {
      title: 'Check-In Flow',
      category: 'sop',
      content: `## Customer Check-In Process

1. **Customer arrives** — greet them and ask to see their QR code (on phone) or give their name
2. **Scan QR code** — use your phone camera, it opens the admin scan page automatically
3. **Tap "Check In"** — this updates their status and notifies the staging team
4. **Direct to waiting area** — tell them approximately how long until their items are ready
5. **Staging team pulls items** — uses the warehouse label (e.g. B02) to find items
6. **Load items** — help customer load into their vehicle
7. **Tap "Mark Complete"** — on the scan page or admin detail page

### VIP Customers
- Flagged with a yellow VIP badge
- Read the VIP note carefully — may have special instructions
- Prioritize their loading

### Walk-ins (no booking)
- Search by name or email in the Day-of Ops walk-in search
- Tap "Walk-in" to assign them to the current time slot
- Proceed with normal check-in flow`,
    },
    {
      title: 'Staging Zones',
      category: 'reference',
      content: `## Warehouse Staging Layout

### Dock — Heavy Items (2 people required)
- **B** (Bench) — Full stadium benches, heaviest items
- **E** (End-Row) — End-row seat pairs, bulky

### Floor — Stackable / Medium
- **S** (Seat) — Standard arena seats, can be stacked
- **W** (Wall Mount) — Wall-mounted display pieces

### Shelf — Small Items
- **I** (Iron) — Iron side pieces, compact
- **C** (Chair Back) — Chair back pieces, small

### General
- **X** (Other/Mixed) — Items that don't fit other categories

## Label System
Each customer gets a label like **B02** or **S05**:
- Letter = item type (staging zone)
- Number = sequence within that type

Pre-stage items by label the night before each pickup day.`,
    },
    {
      title: 'Vehicle Loading Guide',
      category: 'sop',
      content: `## Vehicle Recommendations by Size

### XL — Full-size truck or trailer
- Benches, multiple seats
- Always use furniture blankets
- Two people minimum for loading

### L — SUV, minivan, or truck bed
- Individual seats, wall mounts
- Fold down rear seats if SUV
- Use blankets to prevent scratches

### M — Large sedan or hatchback
- Iron pieces, chair backs, small items
- Fits in trunk or back seat

### S — Any vehicle
- Small iron pieces, chair backs only
- Single box in the trunk

## Loading Tips
- Heaviest items first, deepest in the vehicle
- Wrap in furniture blankets before loading
- Secure with ratchet straps if available
- For benches: load lengthwise, pad contact points`,
    },
    {
      title: 'Safety Guidelines',
      category: 'safety',
      content: `## Pickup Event Safety

### Lifting
- **Two people** for benches (B) and end-rows (E)
- Lift with legs, not back
- Use dolly/hand truck whenever possible
- Clear the path before moving heavy items

### Warehouse
- Keep staging lanes clear at all times
- No running in the warehouse
- Closed-toe shoes required
- High-vis vests for anyone in the dock area

### Customer Vehicles
- Wait for the customer to open their vehicle
- Ask before placing items — let them direct placement
- Do not climb into customer vehicles
- If an item won't fit, help them figure out alternatives (come back with bigger vehicle, etc.)

### Weather
- If rain: keep items under cover until vehicle is at the dock
- If extreme heat: keep water available for team and customers
- Move check-in inside if needed

### First Aid
- Kit located at the check-in table
- Nearest hospital: Bryan Medical Center East (Lincoln, ~20 min)`,
    },
  ];

  for (const guide of starterGuides) {
    const now = new Date().toISOString();
    guides.push({
      ...guide,
      id: randomUUID(),
      created_at: now,
      updated_at: now,
    });
  }
}

// ============================================================
// Checklist CRUD
// ============================================================

export function getAllChecklistItems(): ChecklistItem[] {
  seed();
  return [...checklistItems].sort((a, b) => {
    // Incomplete first, then by priority, then by category
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const prio: Record<string, number> = { high: 0, medium: 1, low: 2 };
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority];
    return a.category.localeCompare(b.category);
  });
}

export function addChecklistItem(item: Omit<ChecklistItem, 'id' | 'created_at' | 'completed_at'>): ChecklistItem {
  seed();
  const newItem: ChecklistItem = {
    ...item,
    id: randomUUID(),
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  checklistItems.push(newItem);
  return newItem;
}

export function updateChecklistItem(id: string, updates: Partial<ChecklistItem>): ChecklistItem | undefined {
  seed();
  const item = checklistItems.find(i => i.id === id);
  if (!item) return undefined;
  Object.assign(item, updates);
  if (updates.completed === true && !item.completed_at) {
    item.completed_at = new Date().toISOString();
  }
  if (updates.completed === false) {
    item.completed_at = null;
  }
  return item;
}

export function deleteChecklistItem(id: string): boolean {
  seed();
  const idx = checklistItems.findIndex(i => i.id === id);
  if (idx === -1) return false;
  checklistItems.splice(idx, 1);
  return true;
}

// ============================================================
// Guides CRUD
// ============================================================

export function getAllGuides(): Guide[] {
  seed();
  return [...guides].sort((a, b) => a.title.localeCompare(b.title));
}

export function getGuideById(id: string): Guide | undefined {
  seed();
  return guides.find(g => g.id === id);
}

export function addGuide(guide: Omit<Guide, 'id' | 'created_at' | 'updated_at'>): Guide {
  seed();
  const now = new Date().toISOString();
  const newGuide: Guide = {
    ...guide,
    id: randomUUID(),
    created_at: now,
    updated_at: now,
  };
  guides.push(newGuide);
  return newGuide;
}

export function updateGuide(id: string, updates: Partial<Omit<Guide, 'id' | 'created_at'>>): Guide | undefined {
  seed();
  const guide = guides.find(g => g.id === id);
  if (!guide) return undefined;
  Object.assign(guide, updates, { updated_at: new Date().toISOString() });
  return guide;
}

export function deleteGuide(id: string): boolean {
  seed();
  const idx = guides.findIndex(g => g.id === id);
  if (idx === -1) return false;
  guides.splice(idx, 1);
  return true;
}
