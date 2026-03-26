'use client';

import { useState } from 'react';
import { Search, ArrowRight, Package, Truck, Loader2 } from 'lucide-react';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

interface LookupResult {
  found: boolean;
  token?: string;
  name?: string;
  segment?: string;
  order_numbers?: string[];
  has_booking?: boolean;
  needs_pickup?: boolean;
}

export default function LookupPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);

    const res = await fetch(`/api/lookup?email=${encodeURIComponent(email.trim())}`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-accent text-accent-foreground border-b border-border">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-accent-foreground/60 font-medium">
              Nebraska Devaney
            </p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold mt-0.5">
              Find Your Order
            </h1>
          </div>
          <img
            src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
            alt="Nebraska N"
            width={36}
            height={36}
            className="opacity-80"

          />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-2">
            Look Up Your Pickup
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter the email address you used when placing your order.
            We&apos;ll find your pickup page where you can schedule your time slot.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-12 pr-4 py-4 border border-border rounded-sm text-base bg-card focus:outline-none focus:ring-2 focus:ring-primary font-serif"
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-sm font-sans font-semibold text-base transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Find My Order'
            )}
          </button>
        </form>

        {/* Results */}
        {searched && result && !loading && (
          <div className="mt-8">
            {result.found ? (
              <div className="bg-card rounded-sm border border-border overflow-hidden">
                <div className="p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Welcome back</p>
                  <h3 className="font-serif text-xl font-bold">{result.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {result.order_numbers?.join(', ')}
                  </p>

                  {result.has_booking && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-sm p-3 text-sm text-green-800 flex items-center gap-2">
                      <Package className="w-4 h-4 shrink-0" />
                      You already have a pickup time scheduled!
                    </div>
                  )}

                  {!result.needs_pickup && (
                    <div className="mt-3 bg-secondary rounded-sm p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Truck className="w-4 h-4 shrink-0" />
                      Your order is being shipped — no pickup needed.
                    </div>
                  )}
                </div>

                {result.needs_pickup && (
                  <Link
                    href={`/pickup/${result.token}`}
                    className="flex items-center justify-between bg-primary text-primary-foreground px-5 py-4 font-sans font-medium hover:bg-primary/90 transition-colors"
                  >
                    <span>{result.has_booking ? 'View Your Pickup Details' : 'Schedule Your Pickup'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-sm border border-border p-6 text-center">
                <p className="text-muted-foreground text-sm">
                  No orders found for <strong>{email}</strong>.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Make sure you&apos;re using the same email from your Shopify order.
                  If you need help, reply to your order confirmation email.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-accent text-accent-foreground/60 border-t border-border">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 text-center">
          <img
            src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png"
            alt="Nebraska N"
            width={28}
            height={28}
            className="opacity-40 mx-auto mb-3"

          />
          <p className="text-xs">Nebraska Stadium Collectibles</p>
          <p className="text-[10px] mt-1 text-accent-foreground/40">
            2410 Production Drive, Unit 6, Roca, NE 68430
          </p>
        </div>
      </footer>
    </div>
  );
}
