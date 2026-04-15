/**
 * Shopify Admin API integration
 * Handles: fulfillment sync, order data, notes sync, order values
 */

const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'buy-rare-goods.myshopify.com';
const API_VERSION = '2024-10';
const GRAPHQL_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`;

async function shopifyGraphQL(query: string, variables?: Record<string, unknown>) {
  if (!SHOPIFY_TOKEN) return null;
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) console.error('[shopify]', JSON.stringify(data.errors));
  return data.data || null;
}

// ── Auto-fulfill on pickup completion ──────────────────────────

/**
 * Mark a Shopify order as fulfilled when customer completes pickup.
 * Finds the order by order number, gets its fulfillment orders, and fulfills them.
 */
export async function markOrderFulfilled(orderNumber: string): Promise<{ success: boolean; error?: string }> {
  if (!SHOPIFY_TOKEN) return { success: false, error: 'Shopify not configured' };

  // Find the order
  const searchData = await shopifyGraphQL(`{
    orders(first: 1, query: "name:#${orderNumber}") {
      edges { node {
        id name displayFulfillmentStatus
        fulfillmentOrders(first: 10) {
          edges { node { id status } }
        }
      } }
    }
  }`);

  const order = searchData?.orders?.edges?.[0]?.node;
  if (!order) return { success: false, error: `Order #${orderNumber} not found` };
  if (order.displayFulfillmentStatus === 'FULFILLED') return { success: true };

  // Get open fulfillment orders
  const openFOs = order.fulfillmentOrders.edges
    .filter((e: { node: { status: string } }) => e.node.status === 'OPEN' || e.node.status === 'IN_PROGRESS')
    .map((e: { node: { id: string } }) => e.node.id);

  if (openFOs.length === 0) return { success: true };

  // Fulfill each fulfillment order
  for (const foId of openFOs) {
    const fulfillData = await shopifyGraphQL(`
      mutation {
        fulfillmentCreateV2(fulfillment: {
          lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: "${foId}" }]
          notifyCustomer: false
          trackingInfo: { company: "In-Person Pickup", number: "PICKUP" }
        }) {
          fulfillment { id status }
          userErrors { message field }
        }
      }
    `);

    const errors = fulfillData?.fulfillmentCreateV2?.userErrors;
    if (errors && errors.length > 0) {
      return { success: false, error: errors[0].message };
    }
  }

  return { success: true };
}

// ── Pull real-time order data ──────────────────────────────────

export interface ShopifyOrder {
  id: string;
  name: string;
  totalPrice: number;
  subtotal: number;
  shippingPrice: number;
  fulfillmentStatus: string;
  note: string | null;
  tags: string[];
  customerName: string;
  customerEmail: string;
  lineItems: Array<{ name: string; quantity: number; price: number }>;
}

/**
 * Fetch order data from Shopify by order number(s).
 */
export async function getShopifyOrder(orderNumber: string): Promise<ShopifyOrder | null> {
  const data = await shopifyGraphQL(`{
    orders(first: 1, query: "name:#${orderNumber}") {
      edges { node {
        id name
        totalPriceSet { shopMoney { amount } }
        subtotalPriceSet { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }
        displayFulfillmentStatus
        note tags
        customer { firstName lastName email }
        lineItems(first: 20) {
          edges { node { name quantity originalUnitPriceSet { shopMoney { amount } } } }
        }
      } }
    }
  }`);

  const node = data?.orders?.edges?.[0]?.node;
  if (!node) return null;

  return {
    id: node.id,
    name: node.name,
    totalPrice: parseFloat(node.totalPriceSet.shopMoney.amount),
    subtotal: parseFloat(node.subtotalPriceSet.shopMoney.amount),
    shippingPrice: parseFloat(node.totalShippingPriceSet.shopMoney.amount),
    fulfillmentStatus: node.displayFulfillmentStatus,
    note: node.note,
    tags: node.tags,
    customerName: node.customer ? `${node.customer.firstName} ${node.customer.lastName}` : '',
    customerEmail: node.customer?.email || '',
    lineItems: node.lineItems.edges.map((e: { node: { name: string; quantity: number; originalUnitPriceSet: { shopMoney: { amount: string } } } }) => ({
      name: e.node.name,
      quantity: e.node.quantity,
      price: parseFloat(e.node.originalUnitPriceSet.shopMoney.amount),
    })),
  };
}

/**
 * Fetch actual paid amounts for multiple orders (for order value tracking).
 */
export async function getOrderValues(orderNumbers: string[]): Promise<Map<string, number>> {
  const values = new Map<string, number>();
  if (!SHOPIFY_TOKEN || orderNumbers.length === 0) return values;

  // Process in batches of 10
  for (let i = 0; i < orderNumbers.length; i += 10) {
    const batch = orderNumbers.slice(i, i + 10);
    const query = batch.map(n => `name:#${n}`).join(' OR ');
    const data = await shopifyGraphQL(`{
      orders(first: 10, query: "${query}") {
        edges { node {
          name
          subtotalPriceSet { shopMoney { amount } }
        } }
      }
    }`);

    for (const edge of (data?.orders?.edges || [])) {
      values.set(edge.node.name, parseFloat(edge.node.subtotalPriceSet.shopMoney.amount));
    }
  }
  return values;
}

// ── Sync notes to Shopify ──────────────────────────────────────

/**
 * Append a note to a Shopify order. Preserves existing notes.
 */
export async function addNoteToOrder(orderNumber: string, note: string): Promise<{ success: boolean; error?: string }> {
  if (!SHOPIFY_TOKEN) return { success: false, error: 'Shopify not configured' };

  // Get order ID and existing note
  const data = await shopifyGraphQL(`{
    orders(first: 1, query: "name:#${orderNumber}") {
      edges { node { id note } }
    }
  }`);

  const order = data?.orders?.edges?.[0]?.node;
  if (!order) return { success: false, error: 'Order not found' };

  const existingNote = order.note || '';
  const timestamp = new Date().toLocaleString();
  const newNote = existingNote
    ? `${existingNote}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;

  const updateData = await shopifyGraphQL(`
    mutation {
      orderUpdate(input: { id: "${order.id}", note: "${newNote.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" }) {
        order { id }
        userErrors { message }
      }
    }
  `);

  const errors = updateData?.orderUpdate?.userErrors;
  if (errors && errors.length > 0) return { success: false, error: errors[0].message };
  return { success: true };
}

/**
 * Add a tag to a Shopify order.
 */
export async function addTagToOrder(orderNumber: string, tag: string): Promise<{ success: boolean }> {
  if (!SHOPIFY_TOKEN) return { success: false };

  const data = await shopifyGraphQL(`{
    orders(first: 1, query: "name:#${orderNumber}") {
      edges { node { id } }
    }
  }`);

  const orderId = data?.orders?.edges?.[0]?.node?.id;
  if (!orderId) return { success: false };

  await shopifyGraphQL(`mutation { tagsAdd(id: "${orderId}", tags: ["${tag}"]) { userErrors { message } } }`);
  return { success: true };
}

// ── Shipping Labels ────────────────────────────────────────────

export interface ShippingRate {
  serviceId: string;
  serviceName: string;
  price: number;
  currency: string;
  deliveryDays: string | null;
}

/**
 * Get available shipping rates for a fulfillment order.
 */
export async function getShippingRates(fulfillmentOrderId: string): Promise<ShippingRate[]> {
  if (!SHOPIFY_TOKEN) return [];

  const data = await shopifyGraphQL(`{
    fulfillmentOrder(id: "${fulfillmentOrderId}") {
      id
      deliveryMethod { methodType }
      fulfillmentOrderMerchantRequest: merchantRequests(first: 1) { edges { node { message } } }
    }
  }`);

  // Use the REST API for shipping rates since GraphQL shipping label support is limited
  // For now, we'll use Shopify's calculated rates from the order
  return [];
}

/**
 * Fulfill an order with tracking info (after label is purchased externally or via Shopify).
 */
export async function fulfillOrder(orderNumber: string, tracking?: { number: string; company: string; url?: string }): Promise<{ success: boolean; error?: string }> {
  if (!SHOPIFY_TOKEN) return { success: false, error: 'Shopify not configured' };

  const searchData = await shopifyGraphQL(`{
    orders(first: 1, query: "name:#${orderNumber}") {
      edges { node {
        id displayFulfillmentStatus
        fulfillmentOrders(first: 10) { edges { node { id status } } }
      } }
    }
  }`);

  const order = searchData?.orders?.edges?.[0]?.node;
  if (!order) return { success: false, error: 'Order not found' };
  if (order.displayFulfillmentStatus === 'FULFILLED') return { success: true };

  const openFOs = order.fulfillmentOrders.edges
    .filter((e: { node: { status: string } }) => e.node.status === 'OPEN' || e.node.status === 'IN_PROGRESS')
    .map((e: { node: { id: string } }) => e.node.id);

  if (openFOs.length === 0) return { success: true };

  for (const foId of openFOs) {
    const trackingInfo = tracking
      ? `trackingInfo: { company: "${tracking.company}", number: "${tracking.number}"${tracking.url ? `, url: "${tracking.url}"` : ''} }`
      : `trackingInfo: { company: "Shipping", number: "" }`;

    const result = await shopifyGraphQL(`
      mutation {
        fulfillmentCreateV2(fulfillment: {
          lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: "${foId}" }]
          notifyCustomer: true
          ${trackingInfo}
        }) {
          fulfillment { id status }
          userErrors { message field }
        }
      }
    `);

    const errors = result?.fulfillmentCreateV2?.userErrors;
    if (errors && errors.length > 0) {
      return { success: false, error: errors[0].message };
    }
  }

  return { success: true };
}

/**
 * Get shipping address for an order from Shopify.
 */
export async function getOrderShippingAddress(orderNumber: string): Promise<{
  address1: string; address2?: string; city: string; province: string; zip: string; country: string;
} | null> {
  const data = await shopifyGraphQL(`{
    orders(first: 1, query: "name:#${orderNumber}") {
      edges { node {
        shippingAddress { address1 address2 city provinceCode zip countryCode }
      } }
    }
  }`);

  const addr = data?.orders?.edges?.[0]?.node?.shippingAddress;
  if (!addr) return null;
  return {
    address1: addr.address1 || '',
    address2: addr.address2 || undefined,
    city: addr.city || '',
    province: addr.provinceCode || '',
    zip: addr.zip || '',
    country: addr.countryCode || 'US',
  };
}

/**
 * Get fulfillment status and Shopify tags for an order.
 */
export async function getOrderFulfillmentInfo(orderNumber: string): Promise<{
  status: string; tags: string[];
} | null> {
  const data = await shopifyGraphQL(`{
    orders(first: 1, query: "name:#${orderNumber}") {
      edges { node { displayFulfillmentStatus tags } }
    }
  }`);

  const node = data?.orders?.edges?.[0]?.node;
  if (!node) return null;
  return { status: node.displayFulfillmentStatus, tags: node.tags };
}

// ── Utility ────────────────────────────────────────────────────

export function isShopifyConfigured(): boolean {
  return !!SHOPIFY_TOKEN;
}
