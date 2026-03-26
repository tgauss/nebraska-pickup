'use client';

import { Weight, Users, Package, Check } from 'lucide-react';
import type { LineItem } from '@/lib/types';
import { getProductInfo } from '@/lib/products';

interface ItemCardProps {
  items: LineItem[];
  title: string;
  showToggle?: boolean;
  onToggle?: (itemId: string, preference: 'ship' | 'pickup') => void;
  preferences?: Record<string, 'ship' | 'pickup'>;
}

export default function ItemCard({ items, title, showToggle, onToggle, preferences }: ItemCardProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">{title}</h3>
      {items.map(item => {
        const product = getProductInfo(item.item_name);

        return (
          <article
            key={item.id}
            className="group bg-card rounded-sm overflow-hidden border border-border hover:border-primary/30 transition-colors"
          >
            {/* Product image */}
            <div className="relative aspect-[3/2] bg-muted overflow-hidden">
              {product ? (
                <img
                  src={product.image}
                  alt={product.shortName}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Package className="w-12 h-12 text-muted-foreground/40" />
                </div>
              )}
              {/* Quantity badge */}
              <div className="absolute top-3 left-3">
                <span className="bg-primary text-primary-foreground text-xs sm:text-sm font-medium px-2.5 py-1 rounded-sm">
                  Qty: {item.qty}
                </span>
              </div>
            </div>

            {/* Product details */}
            <div className="p-4 sm:p-5">
              <h4 className="font-serif text-xl sm:text-2xl font-bold mb-1">
                {product?.shortName || item.item_name}
              </h4>
              {product && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  {product.description}
                </p>
              )}

              {/* Specs */}
              {product && (
                <ul className="space-y-1.5 mb-4">
                  <li className="flex items-center gap-2 text-xs sm:text-sm">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Weight: {product.weight}</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs sm:text-sm">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Handling: {product.handling}</span>
                  </li>
                  {product.category === 'bench' && (
                    <li className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Original padded cushions & numbered seat backs</span>
                    </li>
                  )}
                  {product.category === 'iron' && (
                    <li className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Features the Nebraska &apos;N&apos; logo</span>
                    </li>
                  )}
                </ul>
              )}

              {/* Ship/Pickup toggle */}
              {showToggle && onToggle && preferences && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fulfillment:</span>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs sm:text-sm ${preferences[item.id] === 'ship' ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        Ship to me
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
                      <span className={`text-xs sm:text-sm ${preferences[item.id] === 'pickup' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        Pick up
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
