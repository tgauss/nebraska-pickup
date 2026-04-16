'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, Calendar, Clock, ArrowRight, Mail, Phone, ExternalLink } from 'lucide-react';
import { SEGMENT_COLORS } from '@/lib/types';

interface RescheduleEvent {
  action: string;
  day: string | null;
  time: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface RescheduledCustomer {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  segment: string;
  token: string;
  rescheduleCount: number;
  currentDay: string | null;
  currentTime: string | null;
  bookingStatus: string;
  orders: string[];
  history: RescheduleEvent[];
  lastRescheduled: string;
}

export default function RescheduledPage() {
  const router = useRouter();
  const [data, setData] = useState<{ total: number; customers: RescheduledCustomer[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/rescheduled');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-primary" />
          Rescheduled Pickups
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{data.total} customer{data.total !== 1 ? 's' : ''} have rescheduled, sorted by most recent</p>
      </div>

      <div className="space-y-3">
        {data.customers.map(c => (
          <div key={c.customerId} className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{c.customerName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEGMENT_COLORS[c.segment as keyof typeof SEGMENT_COLORS]}`}>
                      {c.segment}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                      {c.rescheduleCount}x rescheduled
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {c.customerEmail && (
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {c.customerEmail}</span>
                    )}
                    {c.customerPhone && (
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {c.customerPhone}</span>
                    )}
                    <span className="font-mono text-xs">{c.orders.join(', ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold">{c.currentTime}</p>
                    <p className="text-xs text-gray-500">{c.currentDay}</p>
                  </div>
                  <button onClick={() => router.push(`/admin/customers/${c.customerId}`)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">History</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {c.history.map((event, i) => {
                    const isLast = i === c.history.length - 1;
                    const actionLabel = event.action === 'booking_created' ? 'Booked' :
                      event.action === 'admin_booked' ? 'Admin booked' :
                      event.action === 'admin_rescheduled' ? 'Admin rescheduled' : 'Rescheduled';
                    const day = event.day || (event.details?.day as string) || '';
                    const time = event.time || (event.details?.time as string) || '';
                    const date = new Date(event.created_at);

                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`px-3 py-1.5 rounded-lg text-xs border ${
                          isLast ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}>
                          <p className="font-medium">{actionLabel}</p>
                          {day && time && <p className="flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {day} {time}</p>}
                          <p className="text-[10px] opacity-60 mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!isLast && <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.total === 0 && (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-bold">No reschedules yet</p>
        </div>
      )}
    </div>
  );
}
