'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Phone, MessageSquare, CheckCircle, Copy, ExternalLink,
  Loader2, AlertTriangle, Check
} from 'lucide-react';

interface OutreachCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  token: string;
  city: string;
  state: string;
  segment: string;
  hasBooked: boolean;
  bookingDay: string | null;
  bookingTime: string | null;
  pickupItems: string[];
  pickupLink: string;
  smsText: string;
  texted: boolean;
  called: boolean;
  outreachNote: string;
  phoneOnly: boolean;
}

interface OutreachData {
  total: number;
  contacted: number;
  phoneOnly: number;
  hasEmail: number;
  customers: OutreachCustomer[];
}

export default function OutreachPage() {
  const [data, setData] = useState<OutreachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/outreach');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markAction = async (customerId: string, action: string, note?: string) => {
    setActionLoading(customerId + action);
    await fetch('/api/admin/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, action, note }),
    });
    await fetchData();
    setActionLoading(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading || !data) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Phone className="w-6 h-6 text-primary" />
          Phone / SMS Outreach
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Need Outreach</p>
          <p className="text-2xl font-bold">{data.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Phone Only</p>
          <p className="text-2xl font-bold text-amber-600">{data.phoneOnly}</p>
          <p className="text-[10px] text-gray-400">No email on file</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Has Email Too</p>
          <p className="text-2xl font-bold text-purple-600">{data.hasEmail}</p>
          <p className="text-[10px] text-gray-400">Not responding to email</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500">Contacted</p>
          <p className="text-2xl font-bold text-blue-600">{data.contacted}</p>
        </div>
      </div>

      {/* Customer cards */}
      <div className="space-y-4">
        {data.customers.map(c => (
          <div
            key={c.id}
            className={`bg-white rounded-xl border overflow-hidden ${
              c.hasBooked ? 'opacity-60 border-green-200' : c.texted || c.called ? 'border-blue-200' : ''
            }`}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    {c.phoneOnly ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Phone Only</span>
                    ) : (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Has Email</span>
                    )}
                    {c.texted && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Texted
                      </span>
                    )}
                    {c.called && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Called
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {c.city}, {c.state} &middot; Seg {c.segment}
                    {c.email && <span className="ml-2 text-gray-400">&middot; {c.email}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(c.phone, c.id + '-phone')}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {copied === c.id + '-phone' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === c.id + '-phone' ? 'Copied!' : 'Copy #'}
                  </button>
                  <a
                    href={`tel:${c.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    <Phone className="w-4 h-4" />
                    {c.phone}
                  </a>
                </div>
              </div>

              {/* Items */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Items</p>
                {c.pickupItems.map((item, i) => (
                  <p key={i} className="text-sm text-gray-700">{item}</p>
                ))}
              </div>

              {/* SMS text — copyable */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-500">SMS Text (tap to copy)</p>
                  <button
                    onClick={() => copyToClipboard(c.smsText, c.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {copied === c.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === c.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{c.smsText}</p>
              </div>

              {/* Pickup link */}
              <div className="flex items-center gap-2 mb-4">
                <a
                  href={c.pickupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {c.pickupLink}
                </a>
                <button
                  onClick={() => copyToClipboard(c.pickupLink, c.id + '-link')}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {copied === c.id + '-link' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {!c.texted && (
                  <button
                    onClick={() => markAction(c.id, 'sms_sent')}
                    disabled={actionLoading === c.id + 'sms_sent'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading === c.id + 'sms_sent' ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                    Mark Texted
                  </button>
                )}
                {!c.called && (
                  <button
                    onClick={() => markAction(c.id, 'phone_called')}
                    disabled={actionLoading === c.id + 'phone_called'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {actionLoading === c.id + 'phone_called' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
                    Mark Called
                  </button>
                )}
                <button
                  onClick={() => {
                    const note = prompt('Add a note about this outreach:');
                    if (note) markAction(c.id, 'outreach_note', note);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Add Note
                </button>
              </div>

              {/* Warning for not contacted */}
              {!c.texted && !c.called && (
                <div className="mt-3 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Not contacted yet — needs outreach</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
