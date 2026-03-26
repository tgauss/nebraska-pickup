/**
 * Rebuild logistics_master.json from the raw Shopify CSV export.
 *
 * Key fix: groups customers by BILLING NAME (the actual buyer), not shipping name.
 * The shipping name on many orders was "Jacob Williams" (warehouse contact),
 * which caused 33 different customers to be merged into one record.
 *
 * Usage: node scripts/rebuild-master.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================
// CONFIG
// ============================================================

const CSV_PATH = path.resolve(__dirname, '../../files/Nebraska orders_export_1.csv');
const OUTPUT_PATH = path.resolve(__dirname, '../data/logistics_master.json');
const BACKUP_PATH = path.resolve(__dirname, '../data/logistics_master.backup.json');

// Items that must be picked up (too large to ship)
const PICKUP_ITEMS_RAW = [
  'Two Authentic Devaney Seats, Rebuilt as a Collectible Bench - Ready-to-use bench with feet',
  'Two Authentic Devaney Seats, Rebuilt as a Collectible Bench - Seats only-no feet',
  'Standard Arena Seats',
  'Premium End-Row Seat Pairs',
  'Standard Black "Wall Mount" Seat Pair',
  'Standard Red "Wall Mount" Seat Pair',
  'Premium Black "Wall Mount" Seat Pair - With N',
];
const PICKUP_ITEMS = new Set(PICKUP_ITEMS_RAW);

// Items that can be shipped (iron + chair backs only — ornaments already fulfilled)
const SHIP_ITEMS_RAW = [
  'Iron End-of-Row Side Pieces',
  'Devaney Numbered Chair Backs',
];
const SHIP_ITEMS = new Set(SHIP_ITEMS_RAW);

// Skip items (fees + already-shipped ornaments/wood items)
const SKIP_ITEMS = new Set([
  'Arena Removal and Handling Fee',
  'Herbie Historical Ornament Collectible',
  'Huskers Classic Holiday Ornament Collectible',
  'Nebraska Historical Ornament Collectible',
  'Nebraska Volleyball Historical Ornament Collectible',
]);

// Item categories for sizing
function classifyItem(itemName) {
  if (itemName.includes('Bench')) return 'bench';
  if (itemName.includes('End-Row')) return 'endrow';
  if (itemName.includes('Arena Seats')) return 'seat';
  if (itemName.includes('Wall Mount')) return 'wall_mount';
  if (itemName.includes('Iron')) return 'iron';
  if (itemName.includes('Chair Back')) return 'chairback';
  if (itemName.includes('Ornament')) return 'ornament';
  return 'other';
}

// Pickup size based on item mix
function calculateSize(counts) {
  if (counts.bench > 0) return 'XL';
  if (counts.endrow > 0 || counts.seat >= 3) return 'L';
  if (counts.seat > 0 || counts.wall_mount > 0) return 'M';
  return 'S';
}

// ============================================================
// CSV PARSER (handles quoted fields with commas)
// ============================================================

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Only toggle quotes if this is a field-opening quote (after comma or start)
      // or a field-closing quote (before comma or end)
      const atFieldStart = (current === '' && (i === 0 || line[i - 1] === ','));
      const atFieldEnd = (line[i + 1] === ',' || i + 1 >= line.length);

      if (atFieldStart && !inQuotes) {
        inQuotes = true;
      } else if (inQuotes && atFieldEnd) {
        inQuotes = false;
      } else if (inQuotes && line[i + 1] === '"') {
        // Escaped quote ""
        current += '"';
        i++;
      } else {
        // Unescaped quote in middle of field (like Wall Mount names)
        current += '"';
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// Normalize smart/curly quotes to straight quotes and em dashes
function normalizeText(text) {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // curly double quotes → straight
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")  // curly single quotes → straight
    .replace(/[\u2013\u2014]/g, '-')                           // en/em dashes → hyphen
    .replace(/\u2026/g, '...');                                // ellipsis
}

// ============================================================
// MAIN
// ============================================================

console.log('Reading CSV...');
const csvRaw = fs.readFileSync(CSV_PATH, 'utf-8');
const csvLines = csvRaw.split('\n');
const headers = parseCSVLine(csvLines[0]);

// Map header names to indices
const col = {};
headers.forEach((h, i) => { col[h.trim()] = i; });

console.log(`  ${csvLines.length - 1} rows, ${Object.keys(col).length} columns`);

// Parse all line items
// Shopify CSV quirk: for multi-line-item orders, only the first row has full customer info.
// Subsequent rows for the same order have empty email, billing name, etc.
// We need to carry forward the customer info from the first row of each order.
const lineItems = [];
const orderInfoCache = new Map(); // orderNum → first row's customer info

for (let i = 1; i < csvLines.length; i++) {
  const line = csvLines[i].trim();
  if (!line) continue;

  const fields = parseCSVLine(line);

  const orderNum = fields[col['Name']] || '';
  if (!orderNum.startsWith('#NEB')) continue;

  const rowEmail = (fields[col['Email']] || '').trim().toLowerCase();
  const rowBillingName = (fields[col['Billing Name']] || '').trim();
  const rowBillingCity = (fields[col['Billing City']] || '').replace(/^'/, '').trim();
  const rowBillingState = (fields[col['Billing Province']] || '').trim();
  const rowBillingZip = (fields[col['Billing Zip']] || '').replace(/^'/, '').trim();
  const rowBillingPhone = (fields[col['Billing Phone']] || '').trim();
  const rowShippingPhone = (fields[col['Shipping Phone']] || '').trim();
  const rowPhone = (fields[col['Phone']] || '').trim();
  const rowShipping = parseFloat(fields[col['Shipping']] || '0') || 0;

  // Cache customer info from the first row of each order
  if (!orderInfoCache.has(orderNum) && (rowBillingName || rowEmail)) {
    orderInfoCache.set(orderNum, {
      email: rowEmail,
      billingName: rowBillingName,
      billingCity: rowBillingCity,
      billingState: rowBillingState,
      billingZip: rowBillingZip,
      billingPhone: rowBillingPhone,
      shippingPhone: rowShippingPhone,
      phone: rowPhone,
      shipping: rowShipping,
    });
  }

  // Use cached info for rows that lack customer data
  const cached = orderInfoCache.get(orderNum) || {};
  const email = rowEmail || cached.email || '';
  const billingName = rowBillingName || cached.billingName || '';
  const billingCity = rowBillingCity || cached.billingCity || '';
  const billingState = rowBillingState || cached.billingState || '';
  const billingZip = rowBillingZip || cached.billingZip || '';
  const billingPhone = rowBillingPhone || cached.billingPhone || '';
  const shippingPhone = rowShippingPhone || cached.shippingPhone || '';
  const phone = rowPhone || cached.phone || '';
  const shipping = rowShipping || cached.shipping || 0;

  const itemName = normalizeText((fields[col['Lineitem name']] || '').trim());
  const itemQty = parseInt(fields[col['Lineitem quantity']] || '1') || 1;
  const itemPrice = parseFloat(fields[col['Lineitem price']] || '0') || 0;

  lineItems.push({
    orderNum,
    email,
    billingName,
    billingCity,
    billingState,
    billingZip,
    billingPhone,
    shippingPhone,
    phone,
    shipping,
    itemName,
    itemQty,
    itemPrice,
  });
}

console.log(`  Parsed ${lineItems.length} line items`);

// ============================================================
// GROUP BY CUSTOMER
// Customer identity = email (if available), else billing name + billing zip
// ============================================================

const customerMap = new Map();
const nameToEmailKey = new Map(); // name+zip → email key, for merging no-email rows

for (const li of lineItems) {
  // Determine customer key
  let customerKey;
  if (li.email) {
    customerKey = `email:${li.email}`;
    // Also register this email under the name+zip key so no-email rows can find it
    const nameKey = `name:${li.billingName.toLowerCase()}|${li.billingZip}`;
    if (!nameToEmailKey.has(nameKey)) nameToEmailKey.set(nameKey, customerKey);
  } else {
    // Use billing name + zip as fallback identity
    const nameKey = `name:${li.billingName.toLowerCase()}|${li.billingZip}`;
    // Check if we've seen an email-based customer with same name+zip
    customerKey = nameToEmailKey.get(nameKey) || nameKey;
  }

  if (!customerMap.has(customerKey)) {
    customerMap.set(customerKey, {
      key: customerKey,
      name: li.billingName,
      email: li.email,
      phone: li.phone || li.billingPhone || li.shippingPhone || '',
      city: li.billingCity,
      state: li.billingState,
      zip: li.billingZip,
      orders: new Set(),
      items: [],
      totalShipping: 0,
    });
  }

  const cust = customerMap.get(customerKey);
  cust.orders.add(li.orderNum);

  // Update customer info if we have better data
  if (!cust.name && li.billingName) cust.name = li.billingName;
  if (!cust.email && li.email) cust.email = li.email;
  if (!cust.phone && (li.phone || li.billingPhone || li.shippingPhone)) {
    cust.phone = li.phone || li.billingPhone || li.shippingPhone;
  }
  if (!cust.city && li.billingCity) cust.city = li.billingCity;
  if (!cust.state && li.billingState) cust.state = li.billingState;

  // Track shipping per order (only count once per order)
  if (li.shipping > 0 && !cust._shippingOrders) cust._shippingOrders = new Set();
  if (li.shipping > 0 && cust._shippingOrders && !cust._shippingOrders.has(li.orderNum)) {
    cust._shippingOrders.add(li.orderNum);
    cust.totalShipping += li.shipping;
  }

  // Add item (skip fees)
  if (!SKIP_ITEMS.has(li.itemName) && li.itemName) {
    cust.items.push({
      item: li.itemName,
      qty: li.itemQty,
      order: li.orderNum,
    });
  }
}

console.log(`  ${customerMap.size} unique customers identified`);

// ============================================================
// BUILD CUSTOMER RECORDS
// ============================================================

// Load existing master to preserve drive_minutes where available
let existingDriveTimes = {};
try {
  const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
  for (const c of existing.customers) {
    // Index by email and by name+city for matching
    if (c.email) existingDriveTimes[`email:${c.email.toLowerCase()}`] = c.drive_minutes;
    existingDriveTimes[`name:${c.name.toLowerCase()}|${c.city.toLowerCase()}`] = c.drive_minutes;
  }
  console.log(`  Loaded ${Object.keys(existingDriveTimes).length} existing drive times`);
} catch { /* no existing file */ }

const customers = [];

for (const [key, cust] of customerMap) {
  // Classify items
  const pickupItems = [];
  const shipItems = [];
  const counts = { bench: 0, seat: 0, endrow: 0, wall_mount: 0, iron: 0, chairback: 0, ornament: 0, other: 0 };

  for (const item of cust.items) {
    const isPickup = PICKUP_ITEMS.has(item.item);
    const isShip = SHIP_ITEMS.has(item.item);

    if (isPickup) {
      pickupItems.push({ item: item.item, qty: item.qty, order: item.order, fulfillment: 'pickup' });
    } else if (isShip) {
      shipItems.push({ item: item.item, qty: item.qty, order: item.order, fulfillment: 'ship' });
    }
    // else: skip (fees, etc.)

    const cat = classifyItem(item.item);
    if (counts[cat] !== undefined) counts[cat] += item.qty;
  }

  // Determine segment
  // A = has pickup items, no ship items
  // B = has pickup items AND ship items
  // D = ship-only, iron/chairback/heavy (far away or no drive time)
  // E = ship-only, ornaments/small items only
  const hasPickup = pickupItems.length > 0;
  const hasShip = shipItems.length > 0;

  let segment;
  if (hasPickup && hasShip) segment = 'B';
  else if (hasPickup) segment = 'A';
  else if (hasShip) {
    // D = has iron or chair backs; E = ornaments only
    const hasIronOrChairback = shipItems.some(i =>
      i.item.includes('Iron') || i.item.includes('Chair Back')
    );
    segment = hasIronOrChairback ? 'D' : 'E';
  } else {
    // No items (just fees?) — skip
    continue;
  }

  const size = calculateSize(counts);

  // Generate deterministic token from customer key
  const token = crypto.createHash('md5').update(key).digest('hex').slice(0, 12);

  // Look up existing drive time
  let driveMinutes = 0;
  if (cust.email) {
    driveMinutes = existingDriveTimes[`email:${cust.email}`] || 0;
  }
  if (!driveMinutes && cust.name && cust.city) {
    driveMinutes = existingDriveTimes[`name:${cust.name.toLowerCase()}|${cust.city.toLowerCase()}`] || 0;
  }

  customers.push({
    token,
    segment,
    name: cust.name || 'Unknown',
    email: cust.email || '',
    phone: cust.phone || '',
    city: cust.city || '',
    state: cust.state || '',
    drive_minutes: driveMinutes,
    size,
    orders: [...cust.orders].sort(),
    pickup_items: pickupItems,
    ship_items: shipItems,
    bench_count: counts.bench,
    seat_count: counts.seat,
    wall_mount_count: counts.wall_mount,
    endrow_count: counts.endrow,
    iron_qty: counts.iron,
    chairback_qty: counts.chairback,
    ornament_qty: counts.ornament,
    shipping_paid: cust.totalShipping,
    needs_pickup_scheduling: hasPickup,
    offer_pickup_conversion: false,  // will be set by local-data.ts for Seg C
    offer_ship_to_pickup: segment === 'B',
    ship_as_normal: segment === 'D' || segment === 'E',
  });
}

// Sort by name
customers.sort((a, b) => a.name.localeCompare(b.name));

console.log(`\nBuilt ${customers.length} customer records`);

// Segment breakdown
const segCounts = {};
customers.forEach(c => { segCounts[c.segment] = (segCounts[c.segment] || 0) + 1; });
console.log('Segments:', segCounts);

// Verify order count
const allOrders = new Set(customers.flatMap(c => c.orders));
console.log('Total unique orders:', allOrders.size);

// Check for the old fake Jacob Williams
const jacobs = customers.filter(c => c.name.toLowerCase().includes('jacob williams'));
console.log(`\nJacob Williams entries: ${jacobs.length}`);
jacobs.forEach(j => {
  console.log(`  ${j.name} | ${j.email} | ${j.city} | Orders: ${j.orders.length} | Seg: ${j.segment}`);
});

// Load existing time slots
const existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));

// ============================================================
// OUTPUT
// ============================================================

// Backup existing
fs.copyFileSync(OUTPUT_PATH, BACKUP_PATH);
console.log(`\nBacked up existing to ${BACKUP_PATH}`);

const output = {
  event: existingData.event || {
    name: 'Devaney Stadium Collectibles Pickup',
    location: '2410 Production Drive, Unit 4, Roca, NE 68430',
  },
  segments: {
    A: { label: 'Pickup Only', count: segCounts['A'] || 0, action: 'Must schedule pickup' },
    B: { label: 'Pickup + Ship Options', count: segCounts['B'] || 0, action: 'Schedule pickup, choose fulfillment per item' },
    C: { label: 'Local Iron (Offer Pickup)', count: segCounts['C'] || 0, action: 'Offered pickup conversion (set by runtime)' },
    D: { label: 'Ship Only (Iron/Heavy)', count: segCounts['D'] || 0, action: 'Ship as normal' },
    E: { label: 'Ship Only (Small)', count: segCounts['E'] || 0, action: 'Ship as normal' },
  },
  time_slots: existingData.time_slots, // Preserve existing time slots
  customers,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`Wrote ${OUTPUT_PATH}`);
console.log('Done!');
