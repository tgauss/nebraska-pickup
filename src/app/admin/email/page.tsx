'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Mail, Send, Eye, Users, CheckCircle, AlertTriangle,
  Loader2, MailOpen, ChevronDown, ChevronRight, Search,
  MousePointerClick, Package, Filter
} from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  email: string;
  token: string;
  segment: string;
  hasBooked: boolean;
  pickupItemCount: number;
  pickupRequired: boolean;
  shipItemCount: number;
  pickupItemNames: string[];
  emailSent: boolean;
  emailOpened: boolean;
  emailClicked: boolean;
  emailBounced: boolean;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
}

interface EmailData {
  total: number;
  pickup_required_count: number;
  pickup_optional_count: number;
  booked_count: number;
  not_booked_count: number;
  all_recipients: Recipient[];
  engagement: { sent: number; opened: number; clicked: number; bounced: number };
}

type SegmentFilter = 'pickup_required' | 'pickup_optional' | 'all';
type StatusFilter = 'all' | 'not_sent' | 'sent' | 'opened' | 'clicked' | 'not_booked' | 'booked';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('pickup_required');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emailTemplate, setEmailTemplate] = useState<'initial' | 'reminder' | 'confirmation' | 'seg_c' | 'alternate'>('initial');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/email');
    if (res.ok) {
      const d: EmailData = await res.json();
      setData(d);
      // Default: select all pickup-required who haven't been sent
      const pickupReq = d.all_recipients.filter(r => r.pickupRequired && !r.emailSent);
      setSelectedIds(new Set(pickupReq.map(r => r.id)));
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
      body: JSON.stringify({ action: 'preview', customerIds: [recipient.id], template: emailTemplate }),
    });
    if (res.ok) {
      const d = await res.json();
      setPreviewHtml(d.html);
    }
    setPreviewLoading(false);
  }, [emailTemplate]);

  useEffect(() => {
    if (data && !activePreviewId) {
      const first = data.all_recipients.find(r => r.pickupRequired) || data.all_recipients[0];
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
      body: JSON.stringify({ action: 'test', testEmail: testEmail.trim(), customerIds: [activePreviewId], template: emailTemplate }),
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
      body: JSON.stringify({ action: 'send', customerIds: [...selectedIds], template: emailTemplate }),
    });
    const d = await res.json();
    setSendResult({ sent: d.sent, failed: d.failed });
    setSending(false);
    fetchData();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading || !data) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  // Apply filters
  let filtered = data.all_recipients;
  if (segmentFilter === 'pickup_required') filtered = filtered.filter(r => r.pickupRequired);
  else if (segmentFilter === 'pickup_optional') filtered = filtered.filter(r => !r.pickupRequired);

  if (statusFilter === 'not_sent') filtered = filtered.filter(r => !r.emailSent);
  else if (statusFilter === 'sent') filtered = filtered.filter(r => r.emailSent);
  else if (statusFilter === 'opened') filtered = filtered.filter(r => r.emailOpened);
  else if (statusFilter === 'clicked') filtered = filtered.filter(r => r.emailClicked);
  else if (statusFilter === 'not_booked') filtered = filtered.filter(r => !r.hasBooked);
  else if (statusFilter === 'booked') filtered = filtered.filter(r => r.hasBooked);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }

  const selectFiltered = () => setSelectedIds(new Set(filtered.map(r => r.id)));
  const selectNone = () => setSelectedIds(new Set());

  // Engagement counts for current segment
  const segRecipients = segmentFilter === 'pickup_required'
    ? data.all_recipients.filter(r => r.pickupRequired)
    : segmentFilter === 'pickup_optional'
      ? data.all_recipients.filter(r => !r.pickupRequired)
      : data.all_recipients;

  const engSent = segRecipients.filter(r => r.emailSent).length;
  const engOpened = segRecipients.filter(r => r.emailOpened).length;
  const engClicked = segRecipients.filter(r => r.emailClicked).length;
  const engBooked = segRecipients.filter(r => r.hasBooked).length;

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
          Send to {selectedIds.size}
        </button>
      </div>

      {/* Template + Segment */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Template selector */}
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => { setEmailTemplate('initial'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              emailTemplate === 'initial' ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            Initial Outreach
          </button>
          <button
            onClick={() => {
              setEmailTemplate('reminder');
              setStatusFilter('not_booked');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              emailTemplate === 'reminder' ? 'bg-amber-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            Reminder
          </button>
          <button
            onClick={() => {
              setEmailTemplate('seg_c');
              setSegmentFilter('pickup_optional');
              setStatusFilter('all');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              emailTemplate === 'seg_c' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            Pickup Option (Local)
          </button>
          <button
            onClick={() => {
              setEmailTemplate('alternate');
              setStatusFilter('not_booked');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              emailTemplate === 'alternate' ? 'bg-green-700 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            May 2nd Invite
          </button>
          <button
            onClick={() => {
              setEmailTemplate('confirmation');
              setStatusFilter('booked');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              emailTemplate === 'confirmation' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            Confirmation
          </button>
        </div>

        {/* Segment filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {[
            { key: 'pickup_required' as const, label: 'Pickup Required', count: data.pickup_required_count },
            { key: 'pickup_optional' as const, label: 'Seg C', count: data.pickup_optional_count },
            { key: 'all' as const, label: 'All', count: data.total },
          ].map(seg => (
            <button
              key={seg.key}
              onClick={() => { setSegmentFilter(seg.key); setSearchQuery(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                segmentFilter === seg.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {seg.label} <span className="opacity-60">({seg.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Engagement funnel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FunnelCard
          icon={<Users className="w-4 h-4 text-gray-500" />}
          label="Total"
          count={segRecipients.length}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FunnelCard
          icon={<Mail className="w-4 h-4 text-blue-500" />}
          label="Sent"
          count={engSent}
          total={segRecipients.length}
          active={statusFilter === 'sent'}
          onClick={() => setStatusFilter(statusFilter === 'sent' ? 'all' : 'sent')}
          altLabel="Not Sent"
          altCount={segRecipients.length - engSent}
          altActive={statusFilter === 'not_sent'}
          onAltClick={() => setStatusFilter(statusFilter === 'not_sent' ? 'all' : 'not_sent')}
        />
        <FunnelCard
          icon={<MailOpen className="w-4 h-4 text-green-500" />}
          label="Opened"
          count={engOpened}
          total={engSent}
          active={statusFilter === 'opened'}
          onClick={() => setStatusFilter(statusFilter === 'opened' ? 'all' : 'opened')}
        />
        <FunnelCard
          icon={<MousePointerClick className="w-4 h-4 text-purple-500" />}
          label="Clicked"
          count={engClicked}
          total={engSent}
          active={statusFilter === 'clicked'}
          onClick={() => setStatusFilter(statusFilter === 'clicked' ? 'all' : 'clicked')}
        />
        <FunnelCard
          icon={<CheckCircle className="w-4 h-4 text-green-600" />}
          label="Booked"
          count={engBooked}
          total={segRecipients.length}
          active={statusFilter === 'booked'}
          onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
          altLabel="Not Booked"
          altCount={segRecipients.length - engBooked}
          altActive={statusFilter === 'not_booked'}
          onAltClick={() => setStatusFilter(statusFilter === 'not_booked' ? 'all' : 'not_booked')}
        />
      </div>

      {/* Send result */}
      {sendResult && (
        <div className={`rounded-xl border p-4 ${sendResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2">
            {sendResult.failed > 0 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
            <p className="font-medium text-sm">{sendResult.sent} sent{sendResult.failed > 0 && `, ${sendResult.failed} failed`}</p>
          </div>
        </div>
      )}

      {/* Two-panel: list + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Recipient list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-xl border p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={selectFiltered} className="text-xs text-blue-600 hover:underline">Select Visible ({filtered.length})</button>
                <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">None</button>
                <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  {searchQuery ? 'No matches' : 'No recipients in this filter'}
                </div>
              ) : (
                filtered.map(r => (
                  <RecipientRow
                    key={r.id}
                    recipient={r}
                    selected={selectedIds.has(r.id)}
                    active={activePreviewId === r.id}
                    onToggle={() => toggleSelect(r.id)}
                    onPreview={() => handlePreview(r)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border overflow-hidden sticky top-20">
            <div className="px-5 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-sm">
                      {previewName ? `Preview: ${previewName}` : 'Email Preview'}
                    </h3>
                  </div>
                  {previewEmail && <p className="text-xs text-gray-400 mt-0.5">To: {previewEmail}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="Test email"
                    className="border rounded-lg px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleTestSend}
                    disabled={testSending || !testEmail.trim() || !activePreviewId}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Test
                  </button>
                </div>
              </div>
              {testResult && (
                <p className={`mt-2 text-xs ${testResult.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{testResult}</p>
              )}
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : previewHtml ? (
              <iframe srcDoc={previewHtml} className="w-full border-0" style={{ height: '700px' }} title="Email preview" sandbox="allow-same-origin" />
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

// ============================================================
// Funnel Card
// ============================================================

function FunnelCard({ icon, label, count, total, active, onClick, altLabel, altCount, altActive, onAltClick }: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total?: number;
  active: boolean;
  onClick: () => void;
  altLabel?: string;
  altCount?: number;
  altActive?: boolean;
  onAltClick?: () => void;
}) {
  const pct = total && total > 0 ? Math.round((count / total) * 100) : null;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${active ? 'ring-2 ring-primary border-primary' : 'hover:border-gray-300'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold">{count}</p>
      {pct !== null && (
        <div className="mt-1">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{pct}% of {total}</p>
        </div>
      )}
      {altLabel && onAltClick && altCount !== undefined && (
        <button
          onClick={e => { e.stopPropagation(); onAltClick(); }}
          className={`mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${altActive ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {altLabel}: {altCount}
        </button>
      )}
    </div>
  );
}

// ============================================================
// Recipient Row
// ============================================================

function RecipientRow({ recipient, selected, active, onToggle, onPreview }: {
  recipient: Recipient;
  selected: boolean;
  active: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors ${
        active ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
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
          {recipient.pickupRequired && (
            <span title="Pickup required"><Package className="w-3 h-3 text-red-500 shrink-0" /></span>
          )}
          {recipient.hasBooked && (
            <span title="Booked"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" /></span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate">{recipient.email}</p>
      </div>

      {/* Engagement indicators */}
      <div className="shrink-0 flex items-center gap-1">
        {recipient.emailSent && (
          <span className={`w-4 h-4 rounded-full flex items-center justify-center ${recipient.emailOpened ? 'bg-green-100' : 'bg-blue-100'}`} title={recipient.emailOpened ? `Opened${recipient.openedAt ? ' ' + new Date(recipient.openedAt).toLocaleString() : ''}` : `Sent${recipient.sentAt ? ' ' + new Date(recipient.sentAt).toLocaleString() : ''}`}>
            {recipient.emailOpened ? (
              <MailOpen className="w-2.5 h-2.5 text-green-600" />
            ) : (
              <Mail className="w-2.5 h-2.5 text-blue-600" />
            )}
          </span>
        )}
        {recipient.emailClicked && (
          <span className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center" title={`Clicked${recipient.clickedAt ? ' ' + new Date(recipient.clickedAt).toLocaleString() : ''}`}>
            <MousePointerClick className="w-2.5 h-2.5 text-purple-600" />
          </span>
        )}
        {recipient.emailBounced && (
          <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center" title="Bounced">
            <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
          </span>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[11px] text-gray-500">{(recipient.pickupItemCount + recipient.shipItemCount) || 0} items</p>
        <p className="text-[10px] text-gray-400">Seg {recipient.segment}</p>
      </div>
    </div>
  );
}
