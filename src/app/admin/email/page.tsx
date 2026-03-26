'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Mail, Send, Eye, Users, CheckCircle, AlertTriangle,
  Loader2, MailOpen, MousePointerClick, XCircle, ChevronDown, ChevronRight
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
  const [previewCustomer, setPreviewCustomer] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [showBooked, setShowBooked] = useState(false);
  const [includeBooked, setIncludeBooked] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/email');
    if (res.ok) {
      const d: EmailData = await res.json();
      setData(d);
      // Select all not-booked by default
      setSelectedIds(new Set(d.recipients.map(r => r.id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePreview = async (customerId: string) => {
    setPreviewCustomer(customerId);
    const res = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preview', customerIds: [customerId] }),
    });
    if (res.ok) {
      const d = await res.json();
      setPreviewHtml(d.html);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    const firstRecipient = data?.recipients[0] || data?.all_recipients[0];
    const res = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        testEmail: testEmail.trim(),
        customerIds: firstRecipient ? [firstRecipient.id] : [],
      }),
    });
    const d = await res.json();
    setTestResult(d.success ? `Test sent to ${testEmail}` : `Failed: ${d.error}`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          Email Outreach
        </h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500">Eligible</span>
          </div>
          <p className="text-2xl font-bold">{data.eligible}</p>
          <p className="text-xs text-gray-400 mt-0.5">customers with pickup items</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500">Need Outreach</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{data.not_booked}</p>
          <p className="text-xs text-gray-400 mt-0.5">haven&apos;t scheduled yet</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500">Already Booked</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{data.booked}</p>
          <p className="text-xs text-gray-400 mt-0.5">have a time slot</p>
        </div>
        {data.stats && (
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <MailOpen className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-gray-500">Postmark Stats</span>
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
        )}
      </div>

      {/* Test send */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-gray-500" />
          Send Test Email
        </h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="Your email address for test"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleTestSend}
            disabled={testSending || !testEmail.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test
          </button>
        </div>
        {testResult && (
          <p className={`mt-2 text-sm ${testResult.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
            {testResult}
          </p>
        )}
      </div>

      {/* Send result */}
      {sendResult && (
        <div className={`rounded-xl border p-4 ${sendResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2">
            {sendResult.failed > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            <p className="font-medium text-sm">
              {sendResult.sent} emails sent successfully
              {sendResult.failed > 0 && `, ${sendResult.failed} failed`}
            </p>
          </div>
        </div>
      )}

      {/* Recipient list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              Recipients ({activeRecipients.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedIds.size} selected
              {includeBooked && ' (including already booked)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
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
              Include already booked
            </label>
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
            <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">None</button>
            <button
              onClick={() => activeRecipients[0] && handlePreview(activeRecipients[0].id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-gray-50"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={handleSendAll}
              disabled={sending || selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to {selectedIds.size}
            </button>
          </div>
        </div>

        {/* Not booked recipients */}
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {activeRecipients.filter(r => !r.hasBooked).map(r => (
            <RecipientRow
              key={r.id}
              recipient={r}
              selected={selectedIds.has(r.id)}
              onToggle={() => toggleSelect(r.id)}
              onPreview={() => handlePreview(r.id)}
            />
          ))}
        </div>

        {/* Booked recipients (collapsible) */}
        {bookedRecipients.length > 0 && includeBooked && (
          <>
            <button
              onClick={() => setShowBooked(!showBooked)}
              className="w-full px-5 py-3 bg-green-50 border-t flex items-center gap-2 text-sm text-green-700 font-medium hover:bg-green-100"
            >
              {showBooked ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <CheckCircle className="w-4 h-4" />
              Already Booked ({bookedRecipients.length})
            </button>
            {showBooked && (
              <div className="divide-y">
                {bookedRecipients.map(r => (
                  <RecipientRow
                    key={r.id}
                    recipient={r}
                    selected={selectedIds.has(r.id)}
                    onToggle={() => toggleSelect(r.id)}
                    onPreview={() => handlePreview(r.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Email preview modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setPreviewHtml(null); setPreviewCustomer(null); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Email Preview</h3>
              <button onClick={() => { setPreviewHtml(null); setPreviewCustomer(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[600px]"
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipientRow({ recipient, selected, onToggle, onPreview }: {
  recipient: Recipient;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 ${recipient.hasBooked ? 'bg-green-50/50' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{recipient.name}</p>
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
            Seg {recipient.segment}
          </span>
          {recipient.hasBooked && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Booked
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{recipient.email}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-600">{recipient.pickupItemCount} items</p>
        <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{recipient.pickupItemNames.join(', ')}</p>
      </div>
      <button onClick={onPreview} className="shrink-0 text-gray-400 hover:text-blue-500">
        <Eye className="w-4 h-4" />
      </button>
    </div>
  );
}
