'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Mail, Send, Eye, Users, CheckCircle, AlertTriangle,
  Loader2, MailOpen, XCircle, ChevronDown, ChevronRight, Search
} from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  email: string;
  token: string;
  segment: string;
  hasBooked: boolean;
  pickupItemCount: number;
  pickupItemNames: string[];
}

interface EmailData {
  eligible: number;
  not_booked: number;
  booked: number;
  recipients: Recipient[];
  all_recipients: Recipient[];
  stats: { sent: number; opened: number; clicked: number; bounced: number } | null;
}

export default function EmailPage() {
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [showBooked, setShowBooked] = useState(false);
  const [includeBooked, setIncludeBooked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/email');
    if (res.ok) {
      const d: EmailData = await res.json();
      setData(d);
      setSelectedIds(new Set(d.recipients.map(r => r.id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePreview = useCallback(async (recipient: Recipient) => {
    setActivePreviewId(recipient.id);
    setPreviewName(recipient.name);
    setPreviewEmail(recipient.email);
    setPreviewLoading(true);
    const res = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preview', customerIds: [recipient.id] }),
    });
    if (res.ok) {
      const d = await res.json();
      setPreviewHtml(d.html);
    }
    setPreviewLoading(false);
  }, []);

  // Auto-preview first recipient on load
  useEffect(() => {
    if (data && !activePreviewId) {
      const first = data.recipients[0] || data.all_recipients[0];
      if (first) handlePreview(first);
    }
  }, [data, activePreviewId, handlePreview]);

  const handleTestSend = async () => {
    if (!testEmail.trim() || !activePreviewId) return;
    setTestSending(true);
    setTestResult(null);
    const res = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        testEmail: testEmail.trim(),
        customerIds: [activePreviewId],
      }),
    });
    const d = await res.json();
    setTestResult(d.success ? `Test sent to ${testEmail} (as ${previewName})` : `Failed: ${d.error}`);
    setTestSending(false);
  };

  const handleSendAll = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Send pickup scheduling email to ${selectedIds.size} customers?`)) return;

    setSending(true);
    setSendResult(null);
    const res = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', customerIds: [...selectedIds] }),
    });
    const d = await res.json();
    setSendResult({ sent: d.sent, failed: d.failed });
    setSending(false);
    fetchData();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const recipients = includeBooked ? data?.all_recipients : data?.recipients;
    if (!recipients) return;
    setSelectedIds(new Set(recipients.map(r => r.id)));
  };

  const selectNone = () => setSelectedIds(new Set());

  if (loading || !data) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  const activeRecipients = includeBooked ? data.all_recipients : data.recipients;
  const bookedRecipients = data.all_recipients.filter(r => r.hasBooked);

  // Filter by search
  const filteredRecipients = searchQuery.trim()
    ? activeRecipients.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeRecipients;

  const notBookedFiltered = filteredRecipients.filter(r => !r.hasBooked);
  const bookedFiltered = filteredRecipients.filter(r => r.hasBooked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          Email Outreach
        </h1>
        <button
          onClick={handleSendAll}
          disabled={sending || selectedIds.size === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send to {selectedIds.size} Recipients
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500">Eligible</span>
          </div>
          <p className="text-2xl font-bold">{data.eligible}</p>
          <p className="text-xs text-gray-400 mt-0.5">with pickup items</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500">Need Outreach</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{data.not_booked}</p>
          <p className="text-xs text-gray-400 mt-0.5">haven&apos;t scheduled</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500">Booked</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{data.booked}</p>
          <p className="text-xs text-gray-400 mt-0.5">have a time slot</p>
        </div>
        {data.stats ? (
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <MailOpen className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-gray-500">Delivery Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              <div className="text-center">
                <p className="text-lg font-bold">{data.stats.sent}</p>
                <p className="text-[10px] text-gray-400">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{data.stats.opened}</p>
                <p className="text-[10px] text-gray-400">Opened</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{data.stats.clicked}</p>
                <p className="text-[10px] text-gray-400">Clicked</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <MailOpen className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Delivery Stats</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Available after first send</p>
          </div>
        )}
      </div>

      {/* Send result */}
      {sendResult && (
        <div className={`rounded-xl border p-4 ${sendResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2">
            {sendResult.failed > 0 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
            <p className="font-medium text-sm">
              {sendResult.sent} emails sent{sendResult.failed > 0 && `, ${sendResult.failed} failed`}
            </p>
          </div>
        </div>
      )}

      {/* Two-panel layout: recipients + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Recipient list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search + controls */}
          <div className="bg-white rounded-xl border p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">All</button>
                <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">None</button>
                <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBooked}
                  onChange={e => {
                    setIncludeBooked(e.target.checked);
                    if (e.target.checked) {
                      setSelectedIds(new Set(data.all_recipients.map(r => r.id)));
                    } else {
                      setSelectedIds(new Set(data.recipients.map(r => r.id)));
                    }
                  }}
                  className="rounded"
                />
                Include booked
              </label>
            </div>
          </div>

          {/* Recipient rows */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {notBookedFiltered.map(r => (
                <RecipientRow
                  key={r.id}
                  recipient={r}
                  selected={selectedIds.has(r.id)}
                  active={activePreviewId === r.id}
                  onToggle={() => toggleSelect(r.id)}
                  onPreview={() => handlePreview(r)}
                />
              ))}
              {notBookedFiltered.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  {searchQuery ? 'No matches' : 'All customers have booked!'}
                </div>
              )}
            </div>

            {/* Booked section */}
            {includeBooked && bookedFiltered.length > 0 && (
              <>
                <button
                  onClick={() => setShowBooked(!showBooked)}
                  className="w-full px-4 py-2.5 bg-green-50 border-t flex items-center gap-2 text-xs text-green-700 font-medium hover:bg-green-100"
                >
                  {showBooked ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <CheckCircle className="w-3.5 h-3.5" />
                  Already Booked ({bookedFiltered.length})
                </button>
                {showBooked && (
                  <div className="divide-y">
                    {bookedFiltered.map(r => (
                      <RecipientRow
                        key={r.id}
                        recipient={r}
                        selected={selectedIds.has(r.id)}
                        active={activePreviewId === r.id}
                        onToggle={() => toggleSelect(r.id)}
                        onPreview={() => handlePreview(r)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Email preview */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border overflow-hidden sticky top-20">
            {/* Preview header */}
            <div className="px-5 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-sm">
                      {previewName ? `Preview: ${previewName}` : 'Email Preview'}
                    </h3>
                  </div>
                  {previewEmail && (
                    <p className="text-xs text-gray-400 mt-0.5">To: {previewEmail}</p>
                  )}
                </div>
                {/* Test send from preview */}
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="Test email address"
                    className="border rounded-lg px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleTestSend}
                    disabled={testSending || !testEmail.trim() || !activePreviewId}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send Test
                  </button>
                </div>
              </div>
              {testResult && (
                <p className={`mt-2 text-xs ${testResult.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                  {testResult}
                </p>
              )}
            </div>

            {/* Preview content */}
            {previewLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{ height: '700px' }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Mail className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Click a recipient to preview their email</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipientRow({ recipient, selected, active, onToggle, onPreview }: {
  recipient: Recipient;
  selected: boolean;
  active: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
        active
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : recipient.hasBooked
            ? 'bg-green-50/30 hover:bg-gray-50'
            : 'hover:bg-gray-50'
      }`}
      onClick={onPreview}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={e => { e.stopPropagation(); onToggle(); }}
        onClick={e => e.stopPropagation()}
        className="rounded shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{recipient.name}</p>
          {recipient.hasBooked && (
            <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate">{recipient.email}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] text-gray-500">{recipient.pickupItemCount} items</p>
        <p className="text-[10px] text-gray-400 truncate max-w-[100px]">Seg {recipient.segment}</p>
      </div>
    </div>
  );
}
