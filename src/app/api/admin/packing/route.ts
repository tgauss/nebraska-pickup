import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import { getProductInfo } from '@/lib/products';
import { fulfillOrder, getOrderShippingAddress, getOrderValues } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

interface PackingItem {
  lineItemId: string;
  name: string;
  qty: number;
  status: string;
  weight: string;
}

interface PackingOrder {
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderId: string;
  orderValue: number;
  shippingAddress: { address1: string; address2?: string; city: string; province: string; zip: string; country: string } | null;
  items: PackingItem[];
  allPacked: boolean;
  shipped: boolean;
}

// GET — list all orders needing shipping
export async function GET() {
  await ensureHydrated();

  const customers = db.getAllCustomers();
  const allItems = db.getAllLineItems();

  // Find all ship items (preference=ship, NOT converted to pickup)
  const shipItems = allItems.filter(i => i.fulfillment_preference === 'ship' && i.item_type === 'ship');

  // Group by customer → order
  const orderMap = new Map<string, PackingOrder>();

  for (const item of shipItems) {
    const customer = customers.find(c => c.id === item.customer_id);
    if (!customer) continue;

    // Skip cancelled customers (segment E with no pickup items = cancelled/ship-only is fine, but check for specific cancelled ones)
    const orders = db.getOrdersByCustomer(customer.id);
    const order = orders.find(o => o.id === item.order_id);
    if (!order) continue;

    const key = `${customer.id}-${order.id}`;
    if (!orderMap.has(key)) {
      orderMap.set(key, {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        orderNumber: order.shopify_order_number,
        orderId: order.id,
        orderValue: 0,
        shippingAddress: null,
        items: [],
        allPacked: true,
        shipped: false,
      });
    }

    const product = getProductInfo(item.item_name);
    const packingOrder = orderMap.get(key)!;
    packingOrder.items.push({
      lineItemId: item.id,
      name: product?.shortName || item.item_name,
      qty: item.qty,
      status: item.fulfillment_status,
      weight: product?.weight || '',
    });

    if (item.fulfillment_status !== 'packed' && item.fulfillment_status !== 'shipped') {
      packingOrder.allPacked = false;
    }
    if (item.fulfillment_status === 'shipped') {
      packingOrder.shipped = true;
    }
  }

  const packingOrders = Array.from(orderMap.values());

  // Fetch real order values from Shopify
  const orderNums = packingOrders.map(o => o.orderNumber);
  const values = await getOrderValues(orderNums);
  for (const o of packingOrders) {
    o.orderValue = values.get(`#${o.orderNumber}`) || 0;
  }

  // Fetch shipping addresses (batch — just for the first 50 unpacked to keep it fast)
  const needAddress = packingOrders.filter(o => !o.shipped).slice(0, 50);
  await Promise.all(needAddress.map(async (o) => {
    o.shippingAddress = await getOrderShippingAddress(o.orderNumber);
  }));

  // Stats
  const totalOrders = packingOrders.length;
  const packedOrders = packingOrders.filter(o => o.allPacked && !o.shipped).length;
  const shippedOrders = packingOrders.filter(o => o.shipped).length;
  const unpackedOrders = totalOrders - packedOrders - shippedOrders;
  const totalItems = packingOrders.reduce((s, o) => s + o.items.reduce((s2, i) => s2 + i.qty, 0), 0);

  // Sort: unpacked first, then packed, then shipped
  packingOrders.sort((a, b) => {
    if (a.shipped !== b.shipped) return a.shipped ? 1 : -1;
    if (a.allPacked !== b.allPacked) return a.allPacked ? 1 : -1;
    return a.customerName.localeCompare(b.customerName);
  });

  return NextResponse.json({
    orders: packingOrders,
    stats: { totalOrders, unpackedOrders, packedOrders, shippedOrders, totalItems },
  });
}

// POST — pack items, mark shipped
export async function POST(request: Request) {
  await ensureHydrated();
  const { action, customerId, lineItemId, orderNumber } = await request.json();

  if (action === 'pack_item') {
    // Mark a single item as packed
    db.updateLineItemPreference(lineItemId, 'ship', 'packed');
    await flushWrites();
    return NextResponse.json({ success: true });
  }

  if (action === 'unpack_item') {
    db.updateLineItemPreference(lineItemId, 'ship', 'ship_queued');
    await flushWrites();
    return NextResponse.json({ success: true });
  }

  if (action === 'pack_all') {
    // Mark all ship items for a customer as packed
    const items = db.getLineItemsByCustomer(customerId);
    for (const item of items) {
      if (item.fulfillment_preference === 'ship' && item.item_type === 'ship' && item.fulfillment_status !== 'shipped') {
        db.updateLineItemPreference(item.id, 'ship', 'packed');
      }
    }
    await flushWrites();
    return NextResponse.json({ success: true });
  }

  if (action === 'mark_shipped') {
    // Fulfill in Shopify (sends customer email with tracking) and update our system
    if (!orderNumber) return NextResponse.json({ error: 'Order number required' }, { status: 400 });

    const result = await fulfillOrder(orderNumber);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Shopify fulfillment failed' }, { status: 500 });
    }

    // Update our line items to shipped
    if (customerId) {
      db.updateLineItemsStatus(customerId, { fulfillment_preference: 'ship' as const, item_type: 'ship' as const }, 'shipped');
      db.addActivityLog(customerId, 'order_shipped', {
        orderNumber,
        timestamp: new Date().toISOString(),
      });
    }

    await flushWrites();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
