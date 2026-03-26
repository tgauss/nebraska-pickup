'use client';

import { Package } from 'lucide-react';
import type { LineItem } from '@/lib/types';
import { getProductInfo } from '@/lib/products';

/* eslint-disable @next/next/no-img-element */

interface ItemCardProps {
  items: LineItem[];
  title: string;
  showToggle?: boolean;
  compact?: boolean;
  onToggle?: (itemId: string, preference: 'ship' | 'pickup') => void;
  preferences?: Record<string, 'ship' | 'pickup'>;
}

export default function ItemCard({ items, title, showToggle, compact, onToggle, preferences }: ItemCardProps) {
  if (items.length === 0) return null;

  // Consolidate duplicate items by name — sum quantities, keep all IDs
  const consolidated = items.reduce<Array<{ ids: string[]; item_name: string; qty: number; firstItem: typeof items[0] }>>((acc, item) => {
    const existing = acc.find(a => a.item_name === item.item_name);
    if (existing) {
      existing.qty += item.qty;
      existing.ids.push(item.id);
    } else {
      acc.push({ ids: [item.id], item_name: item.item_name, qty: item.qty, firstItem: item });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-3">
      {title && <h3 className="font-serif text-lg font-bold text-foreground">{title}</h3>}
      {consolidated.map(group => {
        const item = group.firstItem;
        const product = getProductInfo(item.item_name);

        return (
          <article
            key={group.ids.join('-')}
            className="group bg-card rounded-sm overflow-hidden border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 p-3">
              {/* Thumbnail */}
              <div className="shrink-0 w-14 h-14 rounded-sm overflow-hidden bg-muted relative">
                {product ? (
                  <img
                    src={product.image}
                    alt={product.shortName}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Package className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-sm sm:text-base font-bold">
                  {product?.shortName || item.item_name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Qty: {group.qty}
                  {!compact && product && <> &middot; {product.weight}</>}
                </p>
              </div>

              {/* Ship/Pickup toggle */}
              {showToggle && onToggle && preferences && (
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-xs ${preferences[item.id] === 'ship' ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    Ship
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferences[item.id] === 'pickup'}
                    onClick={() =>
                      onToggle(item.id, preferences[item.id] === 'pickup' ? 'ship' : 'pickup')
                    }
                    className={`toggle-track ${
                      preferences[item.id] === 'pickup' ? 'bg-primary' : 'bg-border'
                    }`}
                  >
                    <span
                      className={`toggle-thumb ${
                        preferences[item.id] === 'pickup' ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className={`text-xs ${preferences[item.id] === 'pickup' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    Pickup
                  </span>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
