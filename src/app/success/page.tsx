'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ── Animated Section — triggers counters when scrolled into view ──
function AnimatedSection({ children, className }: { children: ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {visible ? children : <div style={{ minHeight: 100 }} />}
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

// ── Stats ──
const STATS = {
  customers: 377,
  totalPieces: 710,
  totalSeats: 213, // 95 benches (2-seat) + 79 standard + 23 end-row pairs + 16 wall mount pairs = counted as seat units
  seatbacks: 133,
  ironPieces: 230,
  revenue: 149294,
  weightLbs: 14921,
  weightTons: 7.5,
  cities: 187,
  states: 28,
  milesDriven: 36645,
  pickupsCompleted: 148,
  successRate: 98,
  avgMinutes: 4,
  emailsSent: 1908,
  calendarInvites: 140,
  yearsHistory: 47,
};

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
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#d00000]/20 via-[#1a1a1a] to-[#1a1a1a]" />
        <div className="relative text-center px-6 py-20 max-w-4xl mx-auto">
          <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" className="h-20 w-auto mx-auto mb-8 drop-shadow-2xl" />
          <h1 className="font-serif text-5xl sm:text-7xl font-bold tracking-tight mb-4">
            Husker Nation<br /><span className="text-[#d00000]">Showed Up.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/60 font-serif max-w-2xl mx-auto leading-relaxed">
            47 years of history. 710 pieces rescued from demolition.<br className="hidden sm:block" />
            377 fans across 28 states brought Devaney home.
          </p>
          <div className="mt-12 flex items-center justify-center gap-2 text-white/30 text-sm animate-bounce">
            <span>Scroll to explore</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" /></svg>
          </div>
        </div>
      </section>

      {/* ── By the Numbers ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">By the Numbers</h2>
          <p className="text-white/50 text-center mb-16 max-w-xl mx-auto">When the University of Nebraska announced the demolition of the Bob Devaney Sports Center, we asked: what happens to the seats?</p>
          <AnimatedSection className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            <BigStat><Counter end={377} /></BigStat><BigLabel>Fans Served</BigLabel>
            <BigStat><Counter end={710} /></BigStat><BigLabel>Pieces Rescued</BigLabel>
            <BigStat><Counter end={28} /></BigStat><BigLabel>States</BigLabel>
            <BigStat><Counter end={187} /></BigStat><BigLabel>Cities</BigLabel>
          </AnimatedSection>
        </div>
      </section>

      {/* ── What Was Saved ── */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#111]">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">
              <span className="text-[#d00000]"><Counter end={710} /></span> Pieces of History
            </h2>
            <p className="text-white/50 text-center mb-16 max-w-xl mx-auto">Every piece was headed for the landfill. Husker fans had other plans.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ItemCard number={213} label="Seats" detail="Benches, arena seats, end-rows, and wall mounts — every style that filled Devaney for 47 years" color="blue" />
            <ItemCard number={230} label="Iron N Collectibles" detail="Solid iron end-of-row pieces stamped with the Nebraska N — 15 lbs of pure Devaney" color="gray" />
            <ItemCard number={133} label="Numbered Seat Backs" detail="Individually numbered chair backs — each one a unique piece of arena history" color="red" />
          </div>
        </div>
      </section>

      {/* ── The Weight ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <p className="text-6xl sm:text-8xl font-black font-serif text-[#d00000]"><Counter end={14921} duration={2500} /></p>
            <p className="text-xl text-white/60 mt-2">pounds of Husker history</p>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/40 text-sm">
              <span>= 7.5 tons</span>
              <span>= 3 fully loaded pickup trucks</span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Map ── */}
      <section className="py-20 px-6 bg-[#111]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">From Coast to Coast</h2>
          <AnimatedSection>
            <p className="text-white/50 text-center mb-12 max-w-xl mx-auto">
              Fans drove a combined <span className="text-white font-bold"><Counter end={36645} duration={2500} /> miles</span> to bring Devaney home.
            </p>
          </AnimatedSection>

          <div className="rounded-xl overflow-hidden border border-white/10 h-[400px] sm:h-[500px]">
            <CustomerMap />
          </div>

          <div className="mt-12">
            <h3 className="font-serif text-xl font-bold text-center mb-6 text-white/80">The Farthest Fans</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {FARTHEST.map((f, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-[#d00000]">{Math.round(f.hours)}h</p>
                  <p className="text-sm text-white/60">{f.city}, {f.state}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 max-w-2xl mx-auto">
            <h3 className="font-serif text-xl font-bold text-center mb-6 text-white/80">Top States</h3>
            <div className="space-y-2">
              {TOP_STATES.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-white/50 w-8 text-right font-mono">{s.state}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#d00000] to-[#ff4444] rounded-full transition-all duration-1000" style={{ width: `${(s.count / TOP_STATES[0].count) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold w-8">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── The Shopping Experience ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">A Seamless Experience</h2>
          <p className="text-white/50 text-center mb-16 max-w-xl mx-auto">From browsing to pickup, every step was designed for the best fans in America.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCard
              title="Shopify-Powered Store"
              description="A custom microsite that made shopping fast, seamless, and clear. Fans could browse every piece, see detailed photos, and check out in minutes."
            />
            <FeatureCard
              title="AI-Powered Husker Bot"
              description="A fully autonomous support bot that helped fans with scheduling, rescheduling, order questions, and everything in between — making the experience fun and frictionless."
            />
            <FeatureCard
              title="Smart Pickup Platform"
              description="Fans easily set pickup times, got directions, received calendar invites, and stayed up to date on their orders. Automated follow-ups ensured no one was left behind."
            />
          </div>
        </div>
      </section>

      {/* ── Pickup Event ── */}
      <section className="py-20 px-6 bg-[#111]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">3 Days in Roca</h2>
          <p className="text-white/50 text-center mb-16 max-w-xl mx-auto">April 16&ndash;18, 2026. A warehouse outside Lincoln became Husker central.</p>

          <AnimatedSection className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
            <BigStat accent><Counter end={148} /></BigStat><BigLabel>Pickups Completed</BigLabel>
            <BigStat accent><Counter end={98} suffix="%" /></BigStat><BigLabel>Success Rate</BigLabel>
            <BigStat><Counter end={4} suffix=" min" /></BigStat><BigLabel>Avg Pickup Time</BigLabel>
          </AnimatedSection>

          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
            <DayCard day="Thursday" date="Apr 16" count={39} />
            <DayCard day="Friday" date="Apr 17" count={61} />
            <DayCard day="Saturday" date="Apr 18" count={48} />
          </div>
        </div>
      </section>

      {/* ── Revenue ── */}
      <section className="py-20 px-6">
        <AnimatedSection className="max-w-4xl mx-auto text-center">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Total Revenue</p>
          <p className="text-6xl sm:text-8xl font-black font-serif text-white">$<Counter end={149294} duration={2500} /></p>
          <p className="text-xl text-white/50 mt-4">from pieces of a building that was about to be torn down</p>
        </AnimatedSection>
      </section>

      {/* ── Closing ── */}
      <section className="py-32 px-6 text-center bg-gradient-to-b from-[#1a1a1a] to-[#111]">
        <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" className="h-16 w-auto mx-auto mb-8 opacity-30" />
        <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-4">
          47 years of memories.<br />
          <span className="text-[#d00000]">Now in 377 homes.</span>
        </h2>
        <p className="text-white/40 mt-12 text-sm">Nebraska Rare Goods &middot; Go Big Red</p>
      </section>
    </div>
  );
}

// ── Components ──

function BigStat({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <p className={`text-4xl sm:text-5xl font-black font-serif ${accent ? 'text-[#d00000]' : 'text-white'}`}>{children}</p>;
}

function BigLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm text-white/50 -mt-4 sm:-mt-6 mb-4">{children}</p>;
}

function ItemCard({ number, label, detail, color }: { number: number; label: string; detail: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-900/30 to-blue-900/10 border-blue-800/30',
    gray: 'from-gray-800/30 to-gray-800/10 border-gray-700/30',
    red: 'from-red-900/30 to-red-900/10 border-red-800/30',
  };
  return (
    <div className={`bg-gradient-to-b ${colors[color]} border rounded-xl p-6 text-center`}>
      <p className="text-4xl font-black font-serif text-white">{number}</p>
      <p className="text-lg font-medium text-white/80 mt-1">{label}</p>
      <p className="text-sm text-white/40 mt-2 leading-relaxed">{detail}</p>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="font-serif font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

function DayCard({ day, date, count }: { day: string; date: string; count: number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
      <p className="text-sm text-white/50">{day}</p>
      <p className="text-xs text-white/30">{date}</p>
      <p className="text-3xl font-black font-serif text-[#d00000] mt-2">{count}</p>
      <p className="text-xs text-white/40">pickups</p>
    </div>
  );
}

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
