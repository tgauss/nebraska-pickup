'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Package, CheckCircle, Truck, Loader2, MapPin,
  ChevronDown, ChevronUp, Check, Box, AlertTriangle
} from 'lucide-react';

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

interface PackingData {
  orders: PackingOrder[];
  stats: { totalOrders: number; unpackedOrders: number; packedOrders: number; shippedOrders: number; totalItems: number };
}

type Filter = 'all' | 'unpacked' | 'packed' | 'shipped';
type PackingTab = 'all' | 'iron';

interface IronCustomer {
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderNumbers: string[];
  qty: number;
  boxes: number;
  boxBreakdown: number[]; // e.g. [2, 2, 1] for 5 pieces
  packed: boolean;
  shipped: boolean;
  items: PackingItem[];
}

export default function PackingPage() {
  const [data, setData] = useState<PackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('unpacked');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [confirmShip, setConfirmShip] = useState<string | null>(null);
  const [packingTab, setPackingTab] = useState<PackingTab>('all');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/packing');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (action: string, params: Record<string, string>) => {
    // Optimistic update — instantly toggle the UI
    if (data && (action === 'pack_item' || action === 'unpack_item')) {
      setData(prev => {
        if (!prev) return prev;
        const newOrders = prev.orders.map(o => ({
          ...o,
          items: o.items.map(i => {
            if (i.lineItemId === params.lineItemId) {
              return { ...i, status: action === 'pack_item' ? 'packed' : 'ship_queued' };
            }
            return i;
          }),
        })).map(o => ({
          ...o,
          allPacked: o.items.every(i => i.status === 'packed' || i.status === 'shipped'),
        }));
        const packed = newOrders.filter(o => o.allPacked && !o.shipped).length;
        const shipped = newOrders.filter(o => o.shipped).length;
        return {
          ...prev,
          orders: newOrders,
          stats: { ...prev.stats, packedOrders: packed, unpackedOrders: prev.stats.totalOrders - packed - shipped },
        };
      });
    }
    if (data && action === 'pack_all') {
      setData(prev => {
        if (!prev) return prev;
        const newOrders = prev.orders.map(o => {
          if (o.customerId === params.customerId) {
            const newItems = o.items.map(i => i.status !== 'shipped' ? { ...i, status: 'packed' } : i);
            return { ...o, items: newItems, allPacked: true };
          }
          return o;
        });
        const packed = newOrders.filter(o => o.allPacked && !o.shipped).length;
        const shipped = newOrders.filter(o => o.shipped).length;
        return {
          ...prev,
          orders: newOrders,
          stats: { ...prev.stats, packedOrders: packed, unpackedOrders: prev.stats.totalOrders - packed - shipped },
        };
      });
    }

    // Fire and forget — don't wait for response to update UI
    fetch('/api/admin/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
  };

  const handleShip = async (order: PackingOrder) => {
    setActionLoading(`ship-${order.orderNumber}`);
    setConfirmShip(null);
    await fetch('/api/admin/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_shipped', orderNumber: order.orderNumber, customerId: order.customerId }),
    });
    await fetchData();
    setActionLoading(null);
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const { stats } = data;

  // Build iron box breakdown from all orders
  const ironByCustomer = new Map<string, IronCustomer>();
  for (const order of data.orders) {
    const ironItems = order.items.filter(i => i.name.toLowerCase().includes('iron') || i.name.toLowerCase().includes('side piece'));
    if (ironItems.length === 0) continue;

    const key = order.customerId;
    if (!ironByCustomer.has(key)) {
      ironByCustomer.set(key, {
        customerId: order.customerId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        orderNumbers: [],
        qty: 0,
        boxes: 0,
        boxBreakdown: [],
        packed: true,
        shipped: false,
        items: [],
      });
    }
    const ic = ironByCustomer.get(key)!;
    if (!ic.orderNumbers.includes(order.orderNumber)) ic.orderNumbers.push(order.orderNumber);
    for (const item of ironItems) {
      ic.qty += item.qty;
      ic.items.push(item);
      if (item.status !== 'packed' && item.status !== 'shipped') ic.packed = false;
      if (item.status === 'shipped') ic.shipped = true;
    }
  }
  // Calculate boxes (max 2 per box)
  for (const ic of ironByCustomer.values()) {
    ic.boxes = Math.ceil(ic.qty / 2);
    ic.boxBreakdown = [];
    let remaining = ic.qty;
    while (remaining > 0) {
      const inBox = Math.min(remaining, 2);
      ic.boxBreakdown.push(inBox);
      remaining -= inBox;
    }
  }
  const ironCustomers = [...ironByCustomer.values()].sort((a, b) => b.qty - a.qty);
  const ironTotalPieces = ironCustomers.reduce((s, c) => s + c.qty, 0);
  const ironTotalBoxes = ironCustomers.reduce((s, c) => s + c.boxes, 0);
  const ironPacked = ironCustomers.filter(c => c.packed).length;

  let filtered = data.orders;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(o =>
      o.customerName.toLowerCase().includes(q) ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
    );
  }
  if (filter === 'unpacked') filtered = filtered.filter(o => !o.allPacked && !o.shipped);
  if (filter === 'packed') filtered = filtered.filter(o => o.allPacked && !o.shipped);
  if (filter === 'shipped') filtered = filtered.filter(o => o.shipped);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Shipping Packing Station
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pack items, then ship when ready. Shopify stays in sync.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button onClick={() => setPackingTab('all')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${packingTab === 'all' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          All Orders
        </button>
        <button onClick={() => setPackingTab('iron')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${packingTab === 'iron' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Iron Pieces
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${packingTab === 'iron' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
            {ironCustomers.length}
          </span>
        </button>
      </div>

      {packingTab === 'iron' ? (
        /* ── Iron Boxes Tab ── */
        <div className="space-y-5">
          {/* Iron stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-medium text-gray-500">Customers</p>
              <p className="text-2xl font-bold">{ironCustomers.length}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-medium text-gray-500">Total Iron Pieces</p>
              <p className="text-2xl font-bold">{ironTotalPieces}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-medium text-gray-500">Boxes to Pack</p>
              <p className="text-2xl font-bold text-amber-600">{ironTotalBoxes}</p>
              <p className="text-[10px] text-gray-400">max 2 per box</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-medium text-gray-500">Packed</p>
              <p className="text-2xl font-bold text-green-600">{ironPacked}/{ironCustomers.length}</p>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${ironCustomers.length > 0 ? (ironPacked / ironCustomers.length * 100) : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Box summary by quantity */}
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Box Breakdown</p>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6].map(qty => {
                const count = ironCustomers.filter(c => c.qty === qty).length;
                if (count === 0) return null;
                const boxes = Math.ceil(qty / 2);
                return (
                  <div key={qty} className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-500">customer{count !== 1 ? 's' : ''} with {qty} piece{qty !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-amber-600 font-medium">{boxes} box{boxes !== 1 ? 'es' : ''} each</p>
                    <p className="text-[10px] text-gray-400">{count * boxes} boxes total</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name or order #..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Iron customer list */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Orders</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Iron Pieces</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Boxes Needed</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Box Layout</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ironCustomers
                  .filter(c => !search || c.customerName.toLowerCase().includes(search.toLowerCase()) || c.orderNumbers.some(o => o.toLowerCase().includes(search.toLowerCase())))
                  .map(c => (
                  <tr key={c.customerId} className={`${c.shipped ? 'opacity-50' : c.packed ? 'bg-green-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.customerName}</p>
                      <p className="text-xs text-gray-400">{c.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-500">{c.orderNumbers.join(', ')}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold">{c.qty}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-amber-600">{c.boxes}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {c.boxBreakdown.map((count, i) => (
                          <div key={i} className="flex items-center gap-0.5 bg-gray-100 rounded px-2 py-1">
                            <Box className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.shipped ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Shipped</span>
                      ) : c.packed ? (
                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded font-medium">Packed</span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">Needs packing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!c.packed && !c.shipped && (
                        <button onClick={() => doAction('pack_all', { customerId: c.customerId })}
                          className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium hover:bg-cyan-700">
                          Pack All
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
          <p className="text-xs text-gray-400">{stats.totalItems} items</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Need Packing</p>
          <p className="text-2xl font-bold text-amber-600">{stats.unpackedOrders}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Packed & Ready</p>
          <p className="text-2xl font-bold text-cyan-600">{stats.packedOrders}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Shipped</p>
          <p className="text-2xl font-bold text-green-600">{stats.shippedOrders}</p>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.totalOrders > 0 ? (stats.shippedOrders / stats.totalOrders * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search by name, email, or order #..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex border rounded-lg overflow-hidden text-sm">
          {(['all', 'unpacked', 'packed', 'shipped'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 font-medium capitalize ${filter === f ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {f} {f === 'unpacked' ? `(${stats.unpackedOrders})` : f === 'packed' ? `(${stats.packedOrders})` : f === 'shipped' ? `(${stats.shippedOrders})` : ''}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>

      {/* Order Cards */}
      <div className="space-y-3">
        {filtered.map(order => {
          const isExpanded = expandedOrder === order.orderId;
          const isShipping = actionLoading === `ship-${order.orderNumber}`;

          return (
            <div key={order.orderId} className={`bg-white rounded-xl border overflow-hidden ${order.shipped ? 'opacity-60' : ''}`}>
              {/* Order header row */}
              <button onClick={() => setExpandedOrder(isExpanded ? null : order.orderId)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Status icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    order.shipped ? 'bg-green-100' : order.allPacked ? 'bg-cyan-100' : 'bg-amber-100'
                  }`}>
                    {order.shipped ? <Truck className="w-5 h-5 text-green-600" /> :
                     order.allPacked ? <Check className="w-5 h-5 text-cyan-600" /> :
                     <Box className="w-5 h-5 text-amber-600" />}
                  </div>

                  {/* Customer + order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{order.customerName}</span>
                      <span className="text-xs font-mono text-gray-400">{order.orderNumber}</span>
                      {order.orderValue > 0 && <span className="text-xs text-gray-500">${order.orderValue.toFixed(0)}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{order.items.reduce((s, i) => s + i.qty, 0)} item{order.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}</span>
                      {order.shippingAddress && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                        </span>
                      )}
                      {order.shipped && <span className="text-green-600 font-medium">Shipped</span>}
                      {order.allPacked && !order.shipped && <span className="text-cyan-600 font-medium">Packed</span>}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {!order.shipped && !order.allPacked && (
                      <button
                        onClick={() => doAction('pack_all', { customerId: order.customerId })}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {actionLoading === `pack_all-${order.customerId}` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Pack All'}
                      </button>
                    )}
                    {order.allPacked && !order.shipped && confirmShip !== order.orderNumber && (
                      <button
                        onClick={() => setConfirmShip(order.orderNumber)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                      >
                        Mark Shipped
                      </button>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </button>

              {/* Ship confirmation */}
              {confirmShip === order.orderNumber && (
                <div className="border-t bg-amber-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 flex-1">
                      This will mark the order as fulfilled in Shopify and <strong>send the customer a shipping notification email</strong>. Are you sure?
                    </p>
                    <button onClick={() => handleShip(order)} disabled={isShipping}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      {isShipping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Ship It'}
                    </button>
                    <button onClick={() => setConfirmShip(null)}
                      className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-white">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded: item checklist */}
              {isExpanded && (
                <div className="border-t px-4 py-3 space-y-2">
                  {order.shippingAddress && (
                    <div className="text-xs text-gray-500 mb-3 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>
                        <p>{order.shippingAddress.address1}{order.shippingAddress.address2 ? `, ${order.shippingAddress.address2}` : ''}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}</p>
                      </div>
                    </div>
                  )}
                  {order.items.map(item => {
                    const isPacked = item.status === 'packed' || item.status === 'shipped';
                    const isItemLoading = actionLoading === `pack_item-${item.lineItemId}` || actionLoading === `unpack_item-${item.lineItemId}`;
                    return (
                      <div key={item.lineItemId} className="flex items-center gap-3 py-1.5">
                        <button
                          onClick={() => doAction(isPacked ? 'unpack_item' : 'pack_item', { lineItemId: item.lineItemId, customerId: order.customerId })}
                          disabled={order.shipped || !!actionLoading}
                          className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            isPacked ? 'bg-cyan-600 border-cyan-600 text-white' : 'border-gray-300 hover:border-cyan-400'
                          } ${order.shipped ? 'opacity-50' : ''}`}
                        >
                          {isItemLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isPacked ? <Check className="w-3.5 h-3.5" /> : null}
                        </button>
                        <div className="flex-1">
                          <span className={`text-sm ${isPacked ? 'line-through text-gray-400' : ''}`}>
                            {item.qty}x {item.name}
                          </span>
                          {item.weight && <span className="text-xs text-gray-400 ml-2">{item.weight}</span>}
                        </div>
                        {item.status === 'shipped' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Shipped</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold">{filter === 'unpacked' ? 'All packed!' : filter === 'packed' ? 'Nothing packed yet' : 'No orders match'}</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
