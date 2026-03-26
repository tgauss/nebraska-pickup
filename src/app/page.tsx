'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, User, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatContext {
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerToken: string | null;
  identified: boolean;
  needsHuman: boolean;
  conversationId: string;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <HomeChat />
    </Suspense>
  );
}

function HomeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<ChatContext>({
    customerId: null, customerName: null, customerEmail: null, customerToken: null,
    identified: false, needsHuman: false,
    conversationId: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  const [step, setStep] = useState<'identify' | 'chat'>('identify');
  const [identifyInput, setIdentifyInput] = useState('');
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ id: string; day: string; time: string; available: number }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const searchParams = useSearchParams();

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (step === 'chat') inputRef.current?.focus(); }, [step]);

  // Auto-identify from URL param: /support?email=joe@raregoods.com
  const autoIdentified = useRef(false);
  useEffect(() => {
    if (autoIdentified.current) return;
    const email = searchParams.get('email');
    if (email) {
      autoIdentified.current = true;
      setIdentifyInput(email);
      // Auto-submit after a tick
      setTimeout(async () => {
        setIdentifying(true);
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'identify', identifier: email.trim() }),
          });
          const data = await res.json();
          if (data.found) {
            setContext(prev => ({
              ...prev, customerId: data.customerId, customerName: data.customerName,
              customerEmail: data.customerEmail, customerToken: data.customerToken, identified: true,
            }));
            setStep('chat');
            const firstName = data.customerName.split(' ')[0];
            let welcome = `Hey ${firstName}! 👋 Great to have you here. I can see your order`;
            if (data.hasBooked) {
              welcome += ` — you're booked for ${data.bookingDay} at ${data.bookingTime}. How can I help you today?`;
            } else {
              welcome += ` with ${data.pickupItemCount} item${data.pickupItemCount !== 1 ? 's' : ''} for pickup. How can I help you today?`;
            }
            setMessages([{ role: 'assistant', content: welcome, timestamp: new Date().toISOString() }]);
          }
        } catch { /* fallback to manual */ }
        setIdentifying(false);
      }, 100);
    }
  }, [searchParams]);

  const handleIdentify = async () => {
    if (!identifyInput.trim()) return;
    setIdentifying(true);
    setIdentifyError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'identify', identifier: identifyInput.trim() }),
      });
      const data = await res.json();
      if (data.found) {
        setContext(prev => ({
          ...prev, customerId: data.customerId, customerName: data.customerName,
          customerEmail: data.customerEmail, customerToken: data.customerToken, identified: true,
        }));
        setStep('chat');
        const firstName = data.customerName.split(' ')[0];
        let welcome = `Hey ${firstName}! 👋 Great to have you here. I can see your order`;
        if (data.hasBooked) {
          welcome += ` — you're booked for ${data.bookingDay} at ${data.bookingTime}. How can I help you today?`;
        } else {
          welcome += ` with ${data.pickupItemCount} item${data.pickupItemCount !== 1 ? 's' : ''} for pickup. How can I help you today?`;
        }
        setMessages([{ role: 'assistant', content: welcome, timestamp: new Date().toISOString() }]);
      } else {
        setIdentifyError("I couldn't find an order with that info. Try your email address, phone number, or name.");
      }
    } catch {
      setIdentifyError('Something went wrong. Please try again.');
    } finally {
      setIdentifying(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage, timestamp: new Date().toISOString() }];
    setMessages(updatedMessages);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', message: userMessage, messages: updatedMessages, context }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: data.timestamp }]);
      if (data.needsHuman) setContext(prev => ({ ...prev, needsHuman: true }));
      if (data.showReschedule) {
        setSlotsLoading(true);
        setShowSlotPicker(true);
        const slotsRes = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_slots' }) });
        const slotsData = await slotsRes.json();
        setAvailableSlots(slotsData.slots || []);
        setSlotsLoading(false);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please email support@raregoods.com!", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-accent text-accent-foreground">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width={28} height={28} className="opacity-80" />
            <span className="text-xs uppercase tracking-[0.15em] font-medium text-accent-foreground/70">Nebraska Rare Goods</span>
          </div>
          <Link href="/lookup" className="text-xs text-accent-foreground/50 hover:text-accent-foreground/80 transition-colors">
            Look Up Order
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Identify step */}
        {step === 'identify' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <img src="/husker-helper.webp" alt="Husker Helper" className="w-28 h-28 rounded-full border-4 border-primary/20 object-cover mb-6" />
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-2">
              Hey there, Husker fan!
            </h1>
            <p className="text-muted-foreground text-center text-sm sm:text-base leading-relaxed max-w-sm mb-2">
              I&apos;m <strong>Husker Helper</strong> — I can look up your Devaney seats order, help you schedule your pickup, answer questions, and get you ready for the big day.
            </p>
            <p className="text-xs text-muted-foreground text-center mb-8">
              Pickup dates: April 16–18 in Roca, NE
            </p>

            <div className="w-full max-w-sm">
              <label className="text-sm font-medium text-foreground mb-2 block text-center">
                Enter your email, phone, or name to get started:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={identifyInput}
                  onChange={e => { setIdentifyInput(e.target.value); setIdentifyError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                  placeholder="Email, phone, or name"
                  className="flex-1 border-2 border-border rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={handleIdentify}
                  disabled={identifying || !identifyInput.trim()}
                  className="px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {identifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
                </button>
              </div>
              {identifyError && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{identifyError}</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-8">
              Or email us at <a href="mailto:support@raregoods.com" className="text-primary hover:underline">support@raregoods.com</a>
            </p>
          </div>
        )}

        {/* Chat step */}
        {step === 'chat' && (
          <>
            {/* Customer bar */}
            {context.customerName && (
              <div className="px-5 py-2.5 bg-secondary border-b flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src="/husker-helper.webp" alt="Husker Helper" className="w-7 h-7 rounded-full object-cover" />
                  <div>
                    <span className="text-xs font-medium text-foreground">Chatting with Husker Helper</span>
                    <span className="text-[10px] text-muted-foreground ml-2">({context.customerName})</span>
                  </div>
                </div>
                {context.needsHuman && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Team notified</span>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5`}>
                  {msg.role === 'assistant' && (
                    <img src="/husker-helper.webp" alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" />
                  )}
                  <div className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-2xl rounded-br-md'
                      : 'bg-secondary text-foreground rounded-2xl rounded-bl-md'
                  } px-4 py-3`}>
                    <ChatMessageContent content={msg.content} />
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-accent-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Quick actions after first message */}
              {messages.length === 1 && messages[0].role === 'assistant' && context.customerToken && (
                <div className="flex flex-wrap gap-2 pl-11">
                  <QuickButton label="Schedule Pickup" href={`/pickup/${context.customerToken}`} />
                  <QuickButton label="Get Directions" href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430" external />
                  <QuickButton label="What should I bring?" onClick={() => setInput('What vehicle do I need for my items?')} />
                </div>
              )}

              {/* Slot picker for rescheduling */}
              {showSlotPicker && (
                <div className="bg-white border border-border rounded-xl p-4 ml-11 space-y-2">
                  {slotsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground mt-2">Loading available times...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-foreground">Pick a new time:</p>
                      {['Thursday', 'Friday', 'Saturday'].map(day => {
                        const daySlots = availableSlots.filter(s => s.day === day);
                        if (daySlots.length === 0) return null;
                        return (
                          <div key={day}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{day}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {daySlots.map(slot => (
                                <button
                                  key={slot.id}
                                  disabled={rescheduling}
                                  onClick={async () => {
                                    setRescheduling(true);
                                    const res = await fetch('/api/chat', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'reschedule', customerId: context.customerId, slotId: slot.id }),
                                    });
                                    const data = await res.json();
                                    setShowSlotPicker(false);
                                    setRescheduling(false);
                                    if (data.success) {
                                      setMessages(prev => [...prev, {
                                        role: 'assistant' as const,
                                        content: `Done! You're now booked for ${data.day} at ${data.time}. See you there! 🎉\n\n[button:View Updated Receipt|/pickup/${context.customerToken}]`,
                                        timestamp: new Date().toISOString(),
                                      }]);
                                    } else {
                                      setMessages(prev => [...prev, {
                                        role: 'assistant' as const,
                                        content: data.error || 'Sorry, that slot is no longer available. Try another!',
                                        timestamp: new Date().toISOString(),
                                      }]);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                                >
                                  {slot.time}
                                  <span className="text-[9px] text-muted-foreground ml-1">({slot.available})</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {loading && (
                <div className="flex justify-start gap-2.5">
                  <img src="/husker-helper.webp" alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" />
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t bg-background safe-area-bottom">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={context.needsHuman ? "Our team will follow up soon..." : "Ask about your order, pickup, directions..."}
                  className="flex-1 border-2 border-border rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-accent text-accent-foreground/40 py-4 text-center">
        <p className="text-[10px]">2410 Production Drive, Unit 4, Roca, NE 68430</p>
      </footer>
    </div>
  );
}

// ============================================================
// Chat message content with button parsing
// ============================================================

function ChatMessageContent({ content }: { content: string }) {
  const buttonRegex = /\[button:([^|]+)\|([^\]]+)\]/g;
  const parts: Array<{ type: 'text'; value: string } | { type: 'button'; label: string; url: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = buttonRegex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    parts.push({ type: 'button', label: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });

  if (parts.length === 1 && parts[0].type === 'text') {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          const trimmed = part.value.trim();
          if (!trimmed) return null;
          return <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{trimmed}</p>;
        }
        const isExternal = part.url.startsWith('http') || part.url.startsWith('mailto:');
        return (
          <a key={i} href={part.url} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-1.5 mt-2 mr-2 px-4 py-2 bg-white text-primary border border-primary/30 rounded-full text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
          >
            {part.label}
            {isExternal && <ExternalLink className="w-3 h-3" />}
          </a>
        );
      })}
    </div>
  );
}

function QuickButton({ label, href, external, onClick }: {
  label: string; href?: string; external?: boolean; onClick?: () => void;
}) {
  if (href) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-border rounded-full text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
      >
        {label}
        {external && <ExternalLink className="w-3 h-3" />}
      </a>
    );
  }
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-border rounded-full text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
    >
      {label}
    </button>
  );
}
