import { NextResponse } from 'next/server';
import * as prep from '@/lib/prep-data';

export const dynamic = 'force-dynamic';

// GET /api/admin/prep — list all checklist items + cost summary
export async function GET() {
  const items = prep.getAllChecklistItems();
  const total_estimated_cost = items.reduce((sum, i) => sum + (i.qty_number * i.unit_price), 0);
  const spent = items.filter(i => i.completed).reduce((sum, i) => sum + (i.qty_number * i.unit_price), 0);
  const remaining = total_estimated_cost - spent;

  return NextResponse.json({
    items,
    cost_summary: {
      total_estimated: total_estimated_cost,
      completed: spent,
      remaining,
      by_source: {
        order_online: items.filter(i => i.source === 'order_online').reduce((s, i) => s + (i.qty_number * i.unit_price), 0),
        pickup_local: items.filter(i => i.source === 'pickup_local').reduce((s, i) => s + (i.qty_number * i.unit_price), 0),
        ship_to_warehouse: items.filter(i => i.source === 'ship_to_warehouse').reduce((s, i) => s + (i.qty_number * i.unit_price), 0),
        on_hand: items.filter(i => i.source === 'on_hand').reduce((s, i) => s + (i.qty_number * i.unit_price), 0),
      },
    },
  });
}

// POST /api/admin/prep — add a new checklist item
export async function POST(request: Request) {
  const body = await request.json();
  const item = prep.addChecklistItem({
    title: body.title || '',
    category: body.category || 'other',
    completed: false,
    notes: body.notes || '',
    qty: body.qty || '',
    qty_number: Number(body.qty_number) || 0,
    unit_price: Number(body.unit_price) || 0,
    source: body.source || '',
    source_url: body.source_url || '',
    priority: body.priority || 'medium',
    assigned_to: body.assigned_to || '',
  });
  return NextResponse.json(item, { status: 201 });
}
