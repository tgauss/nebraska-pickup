'use client';

import { useEffect, useState } from 'react';
import { Users, CalendarCheck, TrendingUp, AlertTriangle, Package, Truck } from 'lucide-react';
import { SEGMENT_LABELS } from '@/lib/types';
import type { TimeSlot } from '@/lib/types';

interface DashboardData {
  total_customers: number;
  segments: Record<string, { count: number; confirmed: number; pending: number }>;
  total_bookings: number;
  confirmed: number;
  checked_in: number;
  completed: number;
  no_show: number;
  seg_c_conversions: number;
  seg_c_total: number;
  shipping_savings: number;
  time_slot_fill: TimeSlot[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="text-center py-12 text-gray-400">Loading dashboard...</div>;
  }

  const pickupCustomers = (data.segments['A']?.count || 0) + (data.segments['B']?.count || 0);
  const pickupConfirmed = (data.segments['A']?.confirmed || 0) + (data.segments['B']?.confirmed || 0);
  const schedulingRate = pickupCustomers > 0 ? Math.round((pickupConfirmed / pickupCustomers) * 100) : 0;
  const segCRate = data.seg_c_total > 0 ? Math.round((data.seg_c_conversions / data.seg_c_total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Command Center</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
          label="Scheduling Rate"
          value={`${schedulingRate}%`}
          sub={`${pickupConfirmed} / ${pickupCustomers} pickup customers`}
          color="blue"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          label="Seg C Conversion"
          value={`${segCRate}%`}
          sub={`${data.seg_c_conversions} / ${data.seg_c_total} local iron`}
          color="amber"
        />
        <KPICard
          icon={<Truck className="w-5 h-5 text-green-600" />}
          label="Shipping Savings"
          value={`$${data.shipping_savings.toLocaleString()}`}
          sub="Estimated from conversions"
          color="green"
        />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          label="No-Shows"
          value={String(data.no_show)}
          sub={`${data.completed} completed pickups`}
          color="red"
        />
      </div>

      {/* Segment breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {(['A', 'B', 'C', 'D', 'E'] as const).map(seg => {
          const s = data.segments[seg] || { count: 0, confirmed: 0, pending: 0 };
          const pct = s.count > 0 ? Math.round((s.confirmed / s.count) * 100) : 0;
          return (
            <div key={seg} className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">SEG {seg}</span>
                <span className="text-xs text-gray-400">{s.count}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-2">{SEGMENT_LABELS[seg]}</p>
              {(seg === 'A' || seg === 'B' || seg === 'C') ? (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{s.confirmed} confirmed / {s.pending} pending</p>
                </>
              ) : (
                <p className="text-xs text-gray-500">Shipping only</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Time slot heatmap */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Time Slot Heatmap</h2>
        <div className="space-y-6">
          {['Thursday', 'Friday', 'Saturday'].map(day => {
            const daySlots = data.time_slot_fill.filter(s => s.day === day);
            return (
              <div key={day}>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{day}</h3>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map(slot => {
                    const pct = slot.capacity > 0 ? slot.current_bookings / slot.capacity : 0;
                    let bg = 'bg-green-100 text-green-800';
                    if (pct >= 1) bg = 'bg-red-200 text-red-900';
                    else if (pct >= 0.5) bg = 'bg-yellow-100 text-yellow-800';

                    return (
                      <div
                        key={slot.id}
                        className={`${bg} rounded-lg px-3 py-2 text-xs font-medium min-w-[80px] text-center`}
                        title={`${slot.current_bookings}/${slot.capacity} booked`}
                      >
                        <div>{slot.time}</div>
                        <div className="font-normal">{slot.current_bookings}/{slot.capacity}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking status summary */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Fulfillment Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatusCard label="Confirmed" count={data.confirmed} icon={<CalendarCheck className="w-4 h-4" />} color="text-blue-600" />
          <StatusCard label="Checked In" count={data.checked_in} icon={<Users className="w-4 h-4" />} color="text-indigo-600" />
          <StatusCard label="Completed" count={data.completed} icon={<Package className="w-4 h-4" />} color="text-green-600" />
          <StatusCard label="No-Show" count={data.no_show} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-600" />
          <StatusCard label="Total Bookings" count={data.total_bookings} icon={<Users className="w-4 h-4" />} color="text-gray-600" />
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function StatusCard({ label, count, icon, color }: {
  label: string; count: number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="text-center">
      <div className={`${color} flex justify-center mb-1`}>{icon}</div>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
