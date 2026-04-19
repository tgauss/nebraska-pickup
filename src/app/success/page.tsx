'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ── Animated Section ──
function AnimatedSection({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) setTimeout(() => setVisible(true), delay);
          else setVisible(true);
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className || ''}`}>
      {visible ? children : <div style={{ minHeight: 80 }} />}
    </div>
  );
}

// ── Animated Counter ──
function Counter({ end, duration = 2000, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(end * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <>{prefix}{value.toLocaleString()}{suffix}</>;
}

// ── Data ──
const TOP_STATES = [
  { state: 'NE', count: 275 }, { state: 'KS', count: 14 }, { state: 'MO', count: 11 },
  { state: 'CO', count: 11 }, { state: 'IA', count: 10 }, { state: 'SD', count: 7 },
  { state: 'IL', count: 5 }, { state: 'TX', count: 5 }, { state: 'OH', count: 4 },
  { state: 'CA', count: 4 },
];

const FARTHEST = [
  { city: 'Shoreline', state: 'WA', hours: 26.8 },
  { city: 'Portsmouth', state: 'RI', hours: 24.7 },
  { city: 'Pinellas Park', state: 'FL', hours: 22.3 },
  { city: 'Alexandria', state: 'VA', hours: 19.2 },
  { city: 'Gaithersburg', state: 'MD', hours: 19.6 },
];

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#d00000]/15 via-transparent to-[#0d0d0d]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative text-center px-6 py-24 max-w-4xl mx-auto">
          <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" className="h-20 w-auto mx-auto mb-10 drop-shadow-2xl" />
          <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-6">
            Husker Nation<br /><span className="text-[#d00000]">Showed Up.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/50 font-serif max-w-2xl mx-auto leading-relaxed mt-6">
            When the University of Nebraska upgraded the Bob Devaney Sports Center, 47 years of historic arena seats were set to be removed. We gave fans across America the chance to bring a piece of Devaney home.
          </p>
          <p className="text-base text-white/30 font-serif max-w-xl mx-auto mt-4">
            They didn&rsquo;t just show up. They showed out.
          </p>
          <div className="mt-16 flex items-center justify-center gap-2 text-white/20 text-sm animate-bounce">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7" /></svg>
          </div>
        </div>
      </section>

      {/* ── The Impact ── */}
      <section className="py-24 px-6 relative">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d00000]/30 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <p className="text-center text-sm text-[#d00000] uppercase tracking-[0.3em] font-medium mb-4">The Impact</p>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-center mb-20">Every number tells a story.</h2>
          </AnimatedSection>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-16 gap-x-8">
            <AnimatedSection className="text-center" delay={0}>
              <p className="text-5xl sm:text-7xl font-black font-serif text-white leading-none"><Counter end={377} /></p>
              <div className="w-8 h-0.5 bg-[#d00000] mx-auto my-3" />
              <p className="text-sm text-white/40 uppercase tracking-widest">Fans Served</p>
            </AnimatedSection>
            <AnimatedSection className="text-center" delay={150}>
              <p className="text-5xl sm:text-7xl font-black font-serif text-white leading-none"><Counter end={710} /></p>
              <div className="w-8 h-0.5 bg-[#d00000] mx-auto my-3" />
              <p className="text-sm text-white/40 uppercase tracking-widest">Pieces Rescued</p>
            </AnimatedSection>
            <AnimatedSection className="text-center" delay={300}>
              <p className="text-5xl sm:text-7xl font-black font-serif text-[#d00000] leading-none"><Counter end={28} /></p>
              <div className="w-8 h-0.5 bg-white/20 mx-auto my-3" />
              <p className="text-sm text-white/40 uppercase tracking-widest">States</p>
            </AnimatedSection>
            <AnimatedSection className="text-center" delay={450}>
              <p className="text-5xl sm:text-7xl font-black font-serif text-[#d00000] leading-none"><Counter end={187} /></p>
              <div className="w-8 h-0.5 bg-white/20 mx-auto my-3" />
              <p className="text-sm text-white/40 uppercase tracking-widest">Cities</p>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── What Was Saved ── */}
      <section className="py-24 px-6 bg-[#111]">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <p className="text-center text-sm text-[#d00000] uppercase tracking-[0.3em] font-medium mb-4">Rescued from Removal</p>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-center mb-6">
              <span className="text-[#d00000]">710</span> Pieces of History
            </h2>
            <p className="text-white/40 text-center mb-16 max-w-lg mx-auto">These seats witnessed championships, heartbreaks, and 47 years of Husker basketball. Now they live on.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <AnimatedSection delay={0}>
              <div className="relative bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl p-8 text-center hover:border-[#d00000]/30 transition-colors">
                <p className="text-6xl font-black font-serif text-white">213</p>
                <p className="text-lg font-medium text-white/80 mt-2">Seats</p>
                <p className="text-sm text-white/35 mt-3 leading-relaxed">Benches, arena seats, end-rows, and wall mounts &mdash; every style that filled Devaney for 47 years</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <div className="relative bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl p-8 text-center hover:border-[#d00000]/30 transition-colors">
                <p className="text-6xl font-black font-serif text-white">230</p>
                <p className="text-lg font-medium text-white/80 mt-2">Iron N Collectibles</p>
                <p className="text-sm text-white/35 mt-3 leading-relaxed">Solid iron end-of-row pieces stamped with the Nebraska N &mdash; 15 lbs of pure Devaney</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={400}>
              <div className="relative bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl p-8 text-center hover:border-[#d00000]/30 transition-colors">
                <p className="text-6xl font-black font-serif text-white">133</p>
                <p className="text-lg font-medium text-white/80 mt-2">Numbered Seat Backs</p>
                <p className="text-sm text-white/35 mt-3 leading-relaxed">Individually numbered chair backs &mdash; each one a unique piece of arena history</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── The Weight ── */}
      <section className="py-28 px-6">
        <AnimatedSection className="max-w-4xl mx-auto text-center">
          <p className="text-7xl sm:text-9xl font-black font-serif text-[#d00000] leading-none"><Counter end={14921} duration={2500} /></p>
          <p className="text-xl sm:text-2xl text-white/50 mt-3 font-serif">pounds of Husker history</p>
          <div className="mt-6 flex flex-wrap justify-center gap-8 text-white/25 text-sm tracking-wide">
            <span>7.5 tons</span>
            <span>&middot;</span>
            <span>3 fully loaded pickup trucks</span>
          </div>
        </AnimatedSection>
      </section>

      {/* ── Map ── */}
      <section className="py-24 px-6 bg-[#111]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <p className="text-center text-sm text-[#d00000] uppercase tracking-[0.3em] font-medium mb-4">Literally &amp; Figuratively</p>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-center mb-4">From Coast to Coast</h2>
            <p className="text-white/40 text-center mb-14 max-w-lg mx-auto">
              Fans drove a combined <span className="text-white font-semibold">36,645 miles</span> to pick up their piece of Devaney.
            </p>
          </AnimatedSection>

          <div className="rounded-2xl overflow-hidden border border-white/10 h-[400px] sm:h-[500px]">
            <CustomerMap />
          </div>

          {/* Farthest fans */}
          <AnimatedSection className="mt-14">
            <h3 className="font-serif text-xl font-bold text-center mb-8 text-white/70">The Farthest Fans</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {FARTHEST.map((f, i) => (
                <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-6 py-4 text-center hover:border-[#d00000]/30 transition-colors">
                  <p className="text-3xl font-black text-[#d00000] font-serif">{Math.round(f.hours)}h</p>
                  <p className="text-sm text-white/50 mt-1">{f.city}, {f.state}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* State breakdown */}
          <AnimatedSection className="mt-14 max-w-2xl mx-auto">
            <h3 className="font-serif text-xl font-bold text-center mb-8 text-white/70">Top States</h3>
            <div className="space-y-2.5">
              {TOP_STATES.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-white/40 w-8 text-right font-mono">{s.state}</span>
                  <div className="flex-1 h-7 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#d00000] to-[#ff3333] rounded-full" style={{ width: `${(s.count / TOP_STATES[0].count) * 100}%`, transition: 'width 1.5s ease-out' }} />
                  </div>
                  <span className="text-sm font-bold w-10 text-right tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── The Experience ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <p className="text-center text-sm text-[#d00000] uppercase tracking-[0.3em] font-medium mb-4">The Experience</p>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-center mb-6">Built for the Best Fans in America</h2>
            <p className="text-white/40 text-center mb-16 max-w-lg mx-auto">Every touchpoint was designed to make this effortless and fun.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <AnimatedSection delay={0}>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 hover:border-[#d00000]/30 transition-colors h-full">
                <p className="text-3xl mb-4">🛒</p>
                <h3 className="font-serif font-bold text-lg mb-2">Shopify-Powered Store</h3>
                <p className="text-sm text-white/40 leading-relaxed">A custom microsite that made shopping fast, seamless, and clear. Fans could browse every piece, see detailed photos, and check out in minutes.</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 hover:border-[#d00000]/30 transition-colors h-full">
                <p className="text-3xl mb-4">🤖</p>
                <h3 className="font-serif font-bold text-lg mb-2">AI-Powered Husker Bot</h3>
                <p className="text-sm text-white/40 leading-relaxed">A fully autonomous support bot that helped fans with scheduling, rescheduling, order questions, and everything in between &mdash; making it fun and frictionless.</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={400}>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 hover:border-[#d00000]/30 transition-colors h-full">
                <p className="text-3xl mb-4">📦</p>
                <h3 className="font-serif font-bold text-lg mb-2">Smart Pickup Platform</h3>
                <p className="text-sm text-white/40 leading-relaxed">Fans easily set pickup times, got directions, received calendar invites, and stayed up to date. Automated follow-ups ensured no one was left behind.</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── Pickup Event ── */}
      <section className="py-24 px-6 bg-[#111]">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <p className="text-center text-sm text-[#d00000] uppercase tracking-[0.3em] font-medium mb-4">The Activation</p>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-center mb-6">3 Days in Roca</h2>
            <p className="text-white/40 text-center mb-16 max-w-lg mx-auto">April 16&ndash;18, 2026. A warehouse outside Lincoln, Nebraska became Husker central for three unforgettable days.</p>
          </AnimatedSection>

          <AnimatedSection className="grid grid-cols-3 gap-6 sm:gap-10 mb-16">
            <div className="text-center">
              <p className="text-5xl sm:text-7xl font-black font-serif text-[#d00000] leading-none"><Counter end={148} /></p>
              <div className="w-8 h-0.5 bg-[#d00000] mx-auto my-3" />
              <p className="text-sm text-white/40 uppercase tracking-widest">Pickups</p>
            </div>
            <div className="text-center">
              <p className="text-5xl sm:text-7xl font-black font-serif text-white leading-none"><Counter end={98} suffix="%" /></p>
              <div className="w-8 h-0.5 bg-white/20 mx-auto my-3" />
              <p className="text-sm text-white/40 uppercase tracking-widest">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-5xl sm:text-7xl font-black font-serif text-white leading-none"><Counter end={4} /></p>
              <div className="w-8 h-0.5 bg-white/20 mx-auto my-3" />
              <p className="text-sm text-white/40 uppercase tracking-widest">Min Avg Pickup</p>
            </div>
          </AnimatedSection>

          <AnimatedSection className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { day: 'Thursday', date: 'Apr 16', count: 39 },
              { day: 'Friday', date: 'Apr 17', count: 61 },
              { day: 'Saturday', date: 'Apr 18', count: 48 },
            ].map(d => (
              <div key={d.day} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 text-center">
                <p className="text-xs text-white/30 uppercase tracking-wider">{d.day}</p>
                <p className="text-[10px] text-white/20">{d.date}</p>
                <p className="text-3xl font-black font-serif text-[#d00000] mt-2">{d.count}</p>
              </div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── Revenue ── */}
      <section className="py-28 px-6">
        <AnimatedSection className="max-w-4xl mx-auto text-center">
          <p className="text-white/25 text-sm uppercase tracking-[0.3em] mb-4">Total Revenue Generated</p>
          <p className="text-6xl sm:text-9xl font-black font-serif text-white leading-none">$<Counter end={149294} duration={2500} /></p>
          <p className="text-lg text-white/40 mt-4 font-serif">from pieces of a building being upgraded</p>
        </AnimatedSection>
      </section>

      {/* ── Closing ── */}
      <section className="py-32 px-6 text-center bg-[#111] relative">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d00000]/30 to-transparent" />
        <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" className="h-16 w-auto mx-auto mb-10 opacity-20" />
        <h2 className="font-serif text-4xl sm:text-6xl font-bold leading-tight">
          47 years of memories.<br />
          <span className="text-[#d00000]">Now in 377 homes.</span>
        </h2>
        <p className="text-white/30 mt-16 text-sm tracking-wide">Nebraska Rare Goods &middot; Go Big Red</p>
      </section>
    </div>
  );
}

// ── Map ──
function CustomerMap() {
  const cityPins = [
    { city: 'Lincoln', state: 'NE', count: 55, lat: 40.8136, lng: -96.7026 },
    { city: 'Omaha', state: 'NE', count: 51, lat: 41.2565, lng: -95.9345 },
    { city: 'Elkhorn', state: 'NE', count: 10, lat: 41.2870, lng: -96.2376 },
    { city: 'Fremont', state: 'NE', count: 8, lat: 41.4333, lng: -96.4989 },
    { city: 'Kearney', state: 'NE', count: 7, lat: 40.6993, lng: -99.0832 },
    { city: 'Kansas City', state: 'MO', count: 6, lat: 39.0997, lng: -94.5786 },
    { city: 'Columbus', state: 'NE', count: 6, lat: 41.4297, lng: -97.3684 },
    { city: 'Hastings', state: 'NE', count: 5, lat: 40.5862, lng: -98.3886 },
    { city: 'Grand Island', state: 'NE', count: 5, lat: 40.9264, lng: -98.3420 },
    { city: 'Denver', state: 'CO', count: 4, lat: 39.7392, lng: -104.9903 },
    { city: 'Sioux City', state: 'IA', count: 3, lat: 42.4963, lng: -96.4049 },
    { city: 'Dallas', state: 'TX', count: 2, lat: 32.7767, lng: -96.7970 },
    { city: 'Seattle', state: 'WA', count: 2, lat: 47.6062, lng: -122.3321 },
    { city: 'Sacramento', state: 'CA', count: 1, lat: 38.5816, lng: -121.4944 },
    { city: 'Jacksonville', state: 'FL', count: 1, lat: 30.3322, lng: -81.6557 },
    { city: 'Portsmouth', state: 'RI', count: 1, lat: 41.6023, lng: -71.2539 },
    { city: 'Alexandria', state: 'VA', count: 1, lat: 38.8048, lng: -77.0469 },
    { city: 'Pittsburgh', state: 'PA', count: 1, lat: 40.4406, lng: -79.9959 },
    { city: 'Norfolk', state: 'NE', count: 4, lat: 42.0285, lng: -97.4170 },
    { city: 'North Platte', state: 'NE', count: 3, lat: 41.1403, lng: -100.7601 },
  ];

  return (
    <MapView
      markers={cityPins.map(p => ({
        lng: p.lng, lat: p.lat, color: '#d00000', label: String(p.count),
        popup: `<strong>${p.city}, ${p.state}</strong><br>${p.count} fan${p.count > 1 ? 's' : ''}`,
      }))}
      showWarehouse
      center={{ lng: -96.5, lat: 39.5 }}
      zoom={4}
      className="w-full h-full"
    />
  );
}
