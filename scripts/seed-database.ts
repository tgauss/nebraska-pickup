/**
 * Seed script: Import logistics_master.json into Supabase
 *
 * Usage:
 *   npx tsx scripts/seed-database.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface MasterCustomer {
  token: string;
  segment: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  drive_minutes: number;
  size: string;
  orders: string[];
  pickup_items: Array<{ item: string; qty: number; order: string; fulfillment: string }>;
  ship_items: Array<{ item: string; qty: number; order: string; fulfillment: string }>;
  shipping_paid: number;
  needs_pickup_scheduling: boolean;
  offer_pickup_conversion: boolean;
  offer_ship_to_pickup: boolean;
  ship_as_normal: boolean;
}

interface MasterData {
  time_slots: Array<{ day: string; time: string; capacity: number }>;
  customers: MasterCustomer[];
}

async function seed() {
  console.log('Loading logistics_master.json...');
  const dataPath = resolve(__dirname, '../../files/logistics_master.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const data: MasterData = JSON.parse(raw);

  // 1. Clear existing data (in reverse dependency order)
  console.log('Clearing existing data...');
  await supabase.from('activity_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('line_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('time_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Insert time slots
  console.log(`Inserting ${data.time_slots.length} time slots...`);
  const { data: slots, error: slotErr } = await supabase
    .from('time_slots')
    .insert(data.time_slots.map(s => ({
      day: s.day,
      time: s.time,
      capacity: s.capacity,
      current_bookings: 0,
    })))
    .select();

  if (slotErr) {
    console.error('Error inserting time slots:', slotErr);
    process.exit(1);
  }
  console.log(`  Inserted ${slots.length} time slots`);

  // 3. Insert customers
  console.log(`Inserting ${data.customers.length} customers...`);

  // Jacob Williams VIP detection
  const JACOB_EMAIL = 'jacob.williams199743@gmail.com';

  let customerCount = 0;
  let orderCount = 0;
  let lineItemCount = 0;

  for (const c of data.customers) {
    const isVip = c.email.toLowerCase() === JACOB_EMAIL;

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .insert({
        token: c.token,
        segment: c.segment,
        name: c.name,
        email: c.email,
        phone: c.phone || null,
        city: c.city,
        state: c.state,
        drive_minutes: c.drive_minutes,
        size: c.size,
        shipping_paid: c.shipping_paid,
        needs_pickup_scheduling: c.needs_pickup_scheduling,
        offer_pickup_conversion: c.offer_pickup_conversion,
        offer_ship_to_pickup: c.offer_ship_to_pickup,
        ship_as_normal: c.ship_as_normal,
        is_vip: isVip,
        vip_note: isVip ? 'Bulk buyer: 8 benches, 15+ seats, 3 end-row pairs, ~25 iron. Dedicated Friday 10:00am truck-loading slot.' : null,
      })
      .select()
      .single();

    if (custErr) {
      console.error(`Error inserting customer ${c.name}:`, custErr);
      continue;
    }
    customerCount++;

    // Insert orders
    const uniqueOrders = [...new Set(c.orders)];
    for (const orderNum of uniqueOrders) {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          shopify_order_number: orderNum,
        })
        .select()
        .single();

      if (orderErr) {
        console.error(`Error inserting order ${orderNum}:`, orderErr);
        continue;
      }
      orderCount++;

      // Insert pickup line items for this order
      for (const item of c.pickup_items.filter(i => i.order === orderNum)) {
        const { error: liErr } = await supabase.from('line_items').insert({
          order_id: order.id,
          customer_id: customer.id,
          item_name: item.item,
          qty: item.qty,
          item_type: 'pickup',
          fulfillment_preference: 'pickup',
          fulfillment_status: 'pending',
        });
        if (liErr) console.error(`Error inserting line item:`, liErr);
        else lineItemCount++;
      }

      // Insert ship line items for this order
      for (const item of c.ship_items.filter(i => i.order === orderNum)) {
        const { error: liErr } = await supabase.from('line_items').insert({
          order_id: order.id,
          customer_id: customer.id,
          item_name: item.item,
          qty: item.qty,
          item_type: 'ship',
          fulfillment_preference: 'ship',
          fulfillment_status: c.segment === 'D' || c.segment === 'E' ? 'ship_queued' : 'pending',
        });
        if (liErr) console.error(`Error inserting line item:`, liErr);
        else lineItemCount++;
      }
    }
  }

  console.log('\nSeed complete!');
  console.log(`  Customers: ${customerCount}`);
  console.log(`  Orders: ${orderCount}`);
  console.log(`  Line items: ${lineItemCount}`);
  console.log(`  Time slots: ${slots.length}`);
}

seed().catch(console.error);
