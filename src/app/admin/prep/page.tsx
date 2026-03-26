'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, CheckCircle, Circle, ChevronDown, ChevronRight,
  FileText, BookOpen, ShieldCheck, GraduationCap, Package,
  Wrench, Tag, AlertTriangle, Loader2, X, Save, Edit3,
  DollarSign, ShoppingCart, Store, Truck, ArchiveRestore, ExternalLink, Pencil
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface ChecklistItem {
  id: string;
  title: string;
  category: 'supplies' | 'equipment' | 'tasks' | 'signage' | 'other';
  completed: boolean;
  notes: string;
  qty: string;
  qty_number: number;
  unit_price: number;
  source: 'order_online' | 'pickup_local' | 'ship_to_warehouse' | 'on_hand' | '';
  source_url: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  created_at: string;
  completed_at: string | null;
}

interface CostSummary {
  total_estimated: number;
  completed: number;
  remaining: number;
  by_source: {
    order_online: number;
    pickup_local: number;
    ship_to_warehouse: number;
    on_hand: number;
  };
}

interface Guide {
  id: string;
  title: string;
  category: 'sop' | 'reference' | 'safety' | 'training';
  content: string;
  created_at: string;
  updated_at: string;
}

type Tab = 'checklist' | 'guides';

const CATEGORY_INFO: Record<string, { label: string; icon: typeof Package; color: string }> = {
  supplies: { label: 'Supplies', icon: Package, color: 'text-blue-600 bg-blue-50' },
  equipment: { label: 'Equipment', icon: Wrench, color: 'text-purple-600 bg-purple-50' },
  tasks: { label: 'Tasks', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  signage: { label: 'Signage', icon: Tag, color: 'text-amber-600 bg-amber-50' },
  other: { label: 'Other', icon: Package, color: 'text-gray-600 bg-gray-50' },
};

const SOURCE_INFO: Record<string, { label: string; icon: typeof ShoppingCart; color: string }> = {
  order_online: { label: 'Order Online', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
  pickup_local: { label: 'Pickup Local', icon: Store, color: 'text-green-600 bg-green-50' },
  ship_to_warehouse: { label: 'Ship to Warehouse', icon: Truck, color: 'text-amber-600 bg-amber-50' },
  on_hand: { label: 'On Hand', icon: ArchiveRestore, color: 'text-gray-600 bg-gray-50' },
};

const GUIDE_CATEGORY_INFO: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  sop: { label: 'SOP', icon: FileText, color: 'text-blue-600 bg-blue-50' },
  reference: { label: 'Reference', icon: BookOpen, color: 'text-purple-600 bg-purple-50' },
  safety: { label: 'Safety', icon: ShieldCheck, color: 'text-red-600 bg-red-50' },
  training: { label: 'Training', icon: GraduationCap, color: 'text-green-600 bg-green-50' },
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-400',
  low: 'border-l-gray-300',
};

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ============================================================
// Main Component
// ============================================================

export default function PrepPage() {
  const [tab, setTab] = useState<Tab>('checklist');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  // Checklist state
  const [showAddItem, setShowAddItem] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Guide state
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [editingGuide, setEditingGuide] = useState(false);
  const [showAddGuide, setShowAddGuide] = useState(false);

  const fetchAll = useCallback(async () => {
    const [itemsRes, guidesRes] = await Promise.all([
      fetch('/api/admin/prep'),
      fetch('/api/admin/guides'),
    ]);
    if (itemsRes.ok) {
      const d = await itemsRes.json();
      setItems(d.items || []);
      setCostSummary(d.cost_summary || null);
    }
    if (guidesRes.ok) {
      const d = await guidesRes.json();
      setGuides(d.guides || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateItem = useCallback(async (id: string, updates: Partial<ChecklistItem>) => {
    await fetch(`/api/admin/prep/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchAll();
  }, [fetchAll]);

  const deleteItem = useCallback(async (id: string) => {
    await fetch(`/api/admin/prep/${id}`, { method: 'DELETE' });
    if (editingItemId === id) setEditingItemId(null);
    fetchAll();
  }, [fetchAll, editingItemId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  const incomplete = items.filter(i => !i.completed);
  const completed = items.filter(i => i.completed);
  const filtered = filterCategory === 'all' ? incomplete : incomplete.filter(i => i.category === filterCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pickup Prep</h1>
        <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
          <button
            onClick={() => setTab('checklist')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'checklist' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Checklist ({incomplete.length})
          </button>
          <button
            onClick={() => setTab('guides')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'guides' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Guides ({guides.length})
          </button>
        </div>
      </div>

      {/* ============ CHECKLIST TAB ============ */}
      {tab === 'checklist' && (
        <div className="space-y-4">
          {/* Cost summary cards */}
          {costSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-500">Total Budget</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(costSummary.total_estimated)}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-gray-500">Completed</span>
                </div>
                <p className="text-xl font-bold text-green-600">{formatCurrency(costSummary.completed)}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-500">Order Online</span>
                </div>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(costSummary.by_source.order_online)}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-gray-500">Pickup Local</span>
                </div>
                <p className="text-xl font-bold text-green-600">{formatCurrency(costSummary.by_source.pickup_local)}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-gray-500">Ship to Warehouse</span>
                </div>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(costSummary.by_source.ship_to_warehouse)}</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {completed.length} of {items.length} items complete
              </span>
              <span className="text-sm text-gray-400">
                {items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${items.length > 0 ? (completed.length / items.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Filters + Add */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'supplies', 'equipment', 'tasks', 'signage', 'other'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterCategory === cat
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat === 'all' ? 'All' : CATEGORY_INFO[cat]?.label || cat}
                  {cat !== 'all' && (
                    <span className="ml-1 opacity-60">
                      ({incomplete.filter(i => i.category === cat).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {/* Add item form */}
          {showAddItem && (
            <AddItemForm
              onSave={async (item) => {
                await fetch('/api/admin/prep', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(item),
                });
                setShowAddItem(false);
                fetchAll();
              }}
              onCancel={() => setShowAddItem(false)}
            />
          )}

          {/* Items list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                {filterCategory === 'all' ? 'All items complete!' : `No ${CATEGORY_INFO[filterCategory]?.label || filterCategory} items remaining`}
              </div>
            ) : (
              filtered.map(item => (
                editingItemId === item.id ? (
                  <EditItemForm
                    key={item.id}
                    item={item}
                    onSave={(updates) => { updateItem(item.id, updates); setEditingItemId(null); }}
                    onCancel={() => setEditingItemId(null)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ) : (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    onToggle={() => updateItem(item.id, { completed: !item.completed })}
                    onEdit={() => setEditingItemId(item.id)}
                    onDelete={() => deleteItem(item.id)}
                  />
                )
              ))
            )}
          </div>

          {/* Completed items (collapsible) */}
          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {completed.length} completed item{completed.length !== 1 ? 's' : ''}
                <span className="text-xs text-gray-400 ml-1">
                  ({formatCurrency(completed.reduce((s, i) => s + (i.qty_number * i.unit_price), 0))})
                </span>
              </button>
              {showCompleted && (
                <div className="mt-2 space-y-1">
                  {completed.map(item => (
                    editingItemId === item.id ? (
                      <EditItemForm
                        key={item.id}
                        item={item}
                        onSave={(updates) => { updateItem(item.id, updates); setEditingItemId(null); }}
                        onCancel={() => setEditingItemId(null)}
                        onDelete={() => deleteItem(item.id)}
                      />
                    ) : (
                      <ChecklistRow
                        key={item.id}
                        item={item}
                        onToggle={() => updateItem(item.id, { completed: !item.completed })}
                        onEdit={() => setEditingItemId(item.id)}
                        onDelete={() => deleteItem(item.id)}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============ GUIDES TAB ============ */}
      {tab === 'guides' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <button
              onClick={() => { setShowAddGuide(true); setSelectedGuide(null); setEditingGuide(false); }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Guide
            </button>
            {guides.map(guide => {
              const info = GUIDE_CATEGORY_INFO[guide.category] || GUIDE_CATEGORY_INFO.sop;
              const Icon = info.icon;
              const isSelected = selectedGuide?.id === guide.id;
              return (
                <button
                  key={guide.id}
                  onClick={() => { setSelectedGuide(guide); setEditingGuide(false); setShowAddGuide(false); }}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-colors ${
                    isSelected ? 'border-primary ring-1 ring-primary/20' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg ${info.color}`}><Icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{guide.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{info.label}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="lg:col-span-2">
            {showAddGuide ? (
              <GuideEditor
                onSave={async (guide) => {
                  await fetch('/api/admin/guides', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(guide),
                  });
                  setShowAddGuide(false);
                  fetchAll();
                }}
                onCancel={() => setShowAddGuide(false)}
              />
            ) : selectedGuide ? (
              editingGuide ? (
                <GuideEditor
                  guide={selectedGuide}
                  onSave={async (updates) => {
                    await fetch(`/api/admin/guides/${selectedGuide.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updates),
                    });
                    setEditingGuide(false);
                    const res = await fetch(`/api/admin/guides/${selectedGuide.id}`);
                    if (res.ok) setSelectedGuide(await res.json());
                    fetchAll();
                  }}
                  onCancel={() => setEditingGuide(false)}
                />
              ) : (
                <GuideViewer
                  guide={selectedGuide}
                  onEdit={() => setEditingGuide(true)}
                  onDelete={async () => {
                    await fetch(`/api/admin/guides/${selectedGuide.id}`, { method: 'DELETE' });
                    setSelectedGuide(null);
                    fetchAll();
                  }}
                />
              )
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a guide to view, or create a new one</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Checklist Row (read-only view)
// ============================================================

function ChecklistRow({ item, onToggle, onEdit, onDelete }: {
  item: ChecklistItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORY_INFO[item.category] || CATEGORY_INFO.other;
  const CatIcon = cat.icon;
  const src = item.source ? SOURCE_INFO[item.source] : null;
  const lineTotal = item.qty_number * item.unit_price;

  return (
    <div className={`bg-white rounded-xl border border-l-4 ${PRIORITY_STYLES[item.priority]} ${item.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="shrink-0">
          {item.completed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 hover:text-green-400 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : ''}`}>
              {item.title}
            </p>
            {item.qty && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.qty}</span>
            )}
            {item.assigned_to && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{item.assigned_to}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{item.notes}</p>}
          </div>
        </div>

        {/* Source badge */}
        {src && (
          <div className="shrink-0 flex items-center gap-1">
            {item.source_url ? (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${src.color} hover:opacity-80`}
                onClick={e => e.stopPropagation()}
              >
                <src.icon className="w-3 h-3" />
                {src.label}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${src.color}`}>
                <src.icon className="w-3 h-3" />
                {src.label}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        {lineTotal > 0 && (
          <span className="shrink-0 text-xs font-medium text-gray-500 min-w-[60px] text-right">
            {formatCurrency(lineTotal)}
          </span>
        )}

        {/* Category */}
        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${cat.color} hidden sm:flex items-center gap-1`}>
          <CatIcon className="w-3 h-3" />
          {cat.label}
        </span>

        {item.priority === 'high' && !item.completed && (
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        )}

        <button onClick={onEdit} className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Edit Item Form (inline)
// ============================================================

function EditItemForm({ item, onSave, onCancel, onDelete }: {
  item: ChecklistItem;
  onSave: (updates: Partial<ChecklistItem>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState(item.category);
  const [priority, setPriority] = useState(item.priority);
  const [qty, setQty] = useState(item.qty);
  const [qtyNumber, setQtyNumber] = useState(String(item.qty_number || ''));
  const [unitPrice, setUnitPrice] = useState(String(item.unit_price || ''));
  const [source, setSource] = useState(item.source);
  const [sourceUrl, setSourceUrl] = useState(item.source_url);
  const [notes, setNotes] = useState(item.notes);
  const [assignedTo, setAssignedTo] = useState(item.assigned_to);

  const lineTotal = (Number(qtyNumber) || 0) * (Number(unitPrice) || 0);

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-blue-500" /> Edit Item
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">Delete</button>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Item name"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select value={category} onChange={e => setCategory(e.target.value as ChecklistItem['category'])} className="border rounded-lg px-3 py-2 text-sm">
          <option value="supplies">Supplies</option>
          <option value="equipment">Equipment</option>
          <option value="tasks">Tasks</option>
          <option value="signage">Signage</option>
          <option value="other">Other</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value as ChecklistItem['priority'])} className="border rounded-lg px-3 py-2 text-sm">
          <option value="high">High Priority</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input type="text" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty label (e.g. 4 rolls)" className="border rounded-lg px-3 py-2 text-sm" />
        <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Assigned to" className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
          <input type="number" value={qtyNumber} onChange={e => setQtyNumber(e.target.value)} placeholder="0" className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm" />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm" />
        </div>
        <select value={source} onChange={e => setSource(e.target.value as ChecklistItem['source'])} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">No source</option>
          <option value="order_online">Order Online</option>
          <option value="pickup_local">Pickup Local</option>
          <option value="ship_to_warehouse">Ship to Warehouse</option>
          <option value="on_hand">On Hand</option>
        </select>
        <div className="flex items-center gap-2">
          {lineTotal > 0 && (
            <span className="text-sm font-bold text-gray-700">= {formatCurrency(lineTotal)}</span>
          )}
        </div>
      </div>

      {(source === 'order_online' || source === 'ship_to_warehouse') && (
        <input
          type="url"
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
          placeholder="Link to product (optional)"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      )}

      <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
        <button
          onClick={() => onSave({
            title, category, priority, qty, notes, assigned_to: assignedTo,
            qty_number: Number(qtyNumber) || 0,
            unit_price: Number(unitPrice) || 0,
            source, source_url: sourceUrl,
          })}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Save
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Add Item Form
// ============================================================

function AddItemForm({ onSave, onCancel }: {
  onSave: (item: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('supplies');
  const [priority, setPriority] = useState('medium');
  const [qty, setQty] = useState('');
  const [qtyNumber, setQtyNumber] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');

  const lineTotal = (Number(qtyNumber) || 0) * (Number(unitPrice) || 0);

  return (
    <div className="bg-white rounded-xl border-2 border-green-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-600" /> New Item
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What needs to be done or ordered?"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
        autoFocus
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="supplies">Supplies</option>
          <option value="equipment">Equipment</option>
          <option value="tasks">Tasks</option>
          <option value="signage">Signage</option>
          <option value="other">Other</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="high">High Priority</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input type="text" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty label (e.g. 4 rolls)" className="border rounded-lg px-3 py-2 text-sm" />
        <select value={source} onChange={e => setSource(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">No source</option>
          <option value="order_online">Order Online</option>
          <option value="pickup_local">Pickup Local</option>
          <option value="ship_to_warehouse">Ship to Warehouse</option>
          <option value="on_hand">On Hand</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
          <input type="number" value={qtyNumber} onChange={e => setQtyNumber(e.target.value)} placeholder="Qty" className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm" />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="Unit price" className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm" />
        </div>
        {lineTotal > 0 && (
          <div className="flex items-center px-3 text-sm font-bold text-gray-700">= {formatCurrency(lineTotal)}</div>
        )}
      </div>

      {(source === 'order_online' || source === 'ship_to_warehouse') && (
        <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="Link to product (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}

      <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
        <button
          onClick={() => title.trim() && onSave({
            title, category, priority, qty, notes,
            qty_number: Number(qtyNumber) || 0,
            unit_price: Number(unitPrice) || 0,
            source, source_url: sourceUrl,
          })}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Guide Viewer
// ============================================================

function GuideViewer({ guide, onEdit, onDelete }: {
  guide: Guide; onEdit: () => void; onDelete: () => void;
}) {
  const info = GUIDE_CATEGORY_INFO[guide.category] || GUIDE_CATEGORY_INFO.sop;
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${info.color}`}>{info.label}</span>
          <h2 className="text-lg font-bold">{guide.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
      <div className="px-6 py-5 prose prose-sm max-w-none"><MarkdownRenderer content={guide.content} /></div>
      <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-400">Last updated {new Date(guide.updated_at).toLocaleString()}</div>
    </div>
  );
}

// ============================================================
// Guide Editor
// ============================================================

function GuideEditor({ guide, onSave, onCancel }: {
  guide?: Guide;
  onSave: (data: { title: string; category: string; content: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(guide?.title || '');
  const [category, setCategory] = useState<string>(guide?.category || 'sop');
  const [content, setContent] = useState(guide?.content || '');
  const [saving, setSaving] = useState(false);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-bold">{guide ? 'Edit Guide' : 'New Guide'}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Guide title" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="sop">SOP</option>
              <option value="reference">Reference</option>
              <option value="safety">Safety</option>
              <option value="training">Training</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Content (Markdown)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y" placeholder="Write your guide content here..." />
        </div>
      </div>
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
        <button
          onClick={async () => { if (!title.trim()) return; setSaving(true); await onSave({ title, category, content }); setSaving(false); }}
          disabled={!title.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {guide ? 'Save Changes' : 'Create Guide'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Simple Markdown Renderer
// ============================================================

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' = 'ul';

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(li) }} />);
    elements.push(listType === 'ol'
      ? <ol key={elements.length} className="list-decimal pl-5 space-y-1 my-2">{items}</ol>
      : <ul key={elements.length} className="list-disc pl-5 space-y-1 my-2">{items}</ul>
    );
    listItems = [];
  };

  for (const line of lines) {
    if (line.startsWith('### ')) { flushList(); elements.push(<h4 key={elements.length} className="font-bold text-sm mt-4 mb-1">{line.slice(4)}</h4>); }
    else if (line.startsWith('## ')) { flushList(); elements.push(<h3 key={elements.length} className="font-bold text-base mt-5 mb-2">{line.slice(3)}</h3>); }
    else if (line.startsWith('# ')) { flushList(); elements.push(<h2 key={elements.length} className="font-bold text-lg mt-5 mb-2">{line.slice(2)}</h2>); }
    else if (line.match(/^[-*] /)) { listType = 'ul'; listItems.push(line.slice(2)); }
    else if (line.match(/^\d+\. /)) { listType = 'ol'; listItems.push(line.replace(/^\d+\. /, '')); }
    else if (line.trim() === '') { flushList(); }
    else { flushList(); elements.push(<p key={elements.length} className="my-1.5" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />); }
  }
  flushList();
  return <div>{elements}</div>;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/---/g, '<hr class="my-3 border-gray-200">');
}
