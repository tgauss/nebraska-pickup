'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
/* eslint-disable @next/next/no-img-element */
import { MessageCircle, X, Send, Loader2, User, AlertCircle, ExternalLink } from 'lucide-react';

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

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<ChatContext>({
    customerId: null,
    customerName: null,
    customerEmail: null,
    customerToken: null,
    identified: false,
    needsHuman: false,
    conversationId: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  const [step, setStep] = useState<'identify' | 'chat'>('identify');
  const [hasBooked, setHasBooked] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ id: string; day: string; time: string; available: number }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [identifyInput, setIdentifyInput] = useState('');
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && step === 'chat') {
      inputRef.current?.focus();
    }
  }, [isOpen, step]);

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
          ...prev,
          customerId: data.customerId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerToken: data.customerToken,
          identified: true,
        }));
        setStep('chat');
        setHasBooked(data.hasBooked);

        // Add welcome message
        const firstName = data.customerName.split(' ')[0];
        let welcome = `Hey ${firstName}! 👋 Great to have you here. I can see your order`;
        if (data.hasBooked) {
          welcome += ` — you're booked for ${data.bookingDay} at ${data.bookingTime}. How can I help you today?`;
        } else {
          welcome += ` with ${data.pickupItemCount} item${data.pickupItemCount !== 1 ? 's' : ''} for pickup. How can I help you today?`;
        }

        setMessages([{
          role: 'assistant',
          content: welcome,
          timestamp: new Date().toISOString(),
        }]);
      } else {
        setIdentifyError("I couldn't find an order with that email or phone number. Try a different one, or reach out to support@raregoods.com for help.");
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

    const newUserMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          message: userMessage,
          messages: updatedMessages,
          context,
        }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        timestamp: data.timestamp,
      }]);

      if (data.needsHuman) {
        setContext(prev => ({ ...prev, needsHuman: true }));
      }

      // Show reschedule slot picker if AI triggered it
      if (data.showReschedule) {
        setSlotsLoading(true);
        setShowSlotPicker(true);
        const slotsRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_slots' }),
        });
        const slotsData = await slotsRes.json();
        setAvailableSlots(slotsData.slots || []);
        setSlotsLoading(false);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please email support@raregoods.com and we'll help you out!",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg transition-transform hover:scale-110 safe-area-bottom overflow-hidden border-3 border-primary"
          aria-label="Open support chat"
        >
          <img src="/husker-helper.webp" alt="Husker Helper" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[100dvh] sm:h-[560px] bg-white sm:rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <img src="/husker-helper.webp" alt="Husker Helper" className="w-9 h-9 rounded-full border-2 border-white/30 object-cover" />
              <div>
                <h3 className="font-sans font-semibold text-sm">Husker Helper</h3>
                <p className="text-[10px] text-white/70">Nebraska Rare Goods Support</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Identify step */}
          {step === 'identify' && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
              <img src="/husker-helper.webp" alt="Husker Helper" className="w-20 h-20 rounded-full border-4 border-primary/20 object-cover mb-4" />
              <h2 className="font-serif text-xl font-bold mb-2">Hey there, Husker fan! 👋</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                I&apos;m Husker Helper — I can look up your order, answer questions about pickup, and help you get ready for the big day.
              </p>
              <p className="text-xs font-medium text-gray-700 mb-3">
                Enter your email or phone number to get started:
              </p>
              <div className="w-full flex gap-2">
                <input
                  type="text"
                  value={identifyInput}
                  onChange={e => { setIdentifyInput(e.target.value); setIdentifyError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                  placeholder="Email or phone number"
                  className="flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <button
                  onClick={handleIdentify}
                  disabled={identifying || !identifyInput.trim()}
                  className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {identifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
                </button>
              </div>
              {identifyError && (
                <div className="mt-3 flex items-start gap-2 text-left bg-amber-50 border border-amber-200 rounded-lg p-3 w-full">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{identifyError}</p>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-4">
                Or email us directly at support@raregoods.com
              </p>
            </div>
          )}

          {/* Chat step */}
          {step === 'chat' && (
            <>
              {/* Customer bar */}
              {context.customerName && (
                <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">{context.customerName}</span>
                  </div>
                  {context.needsHuman && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      Team notified
                    </span>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-2xl rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md'
                    } px-4 py-2.5`}>
                      <ChatMessageContent content={msg.content} />
                    </div>
                  </div>
                ))}

                {/* Quick action buttons after first AI message */}
                {messages.length === 1 && messages[0].role === 'assistant' && context.customerToken && (
                  <div className="flex flex-wrap gap-2 pl-2">
                    {hasBooked ? (
                      <>
                        <QuickButton label="View My Receipt" href={`/pickup/${context.customerToken}`} />
                        <QuickButton label="Reschedule Pickup" onClick={() => setInput('I need to reschedule my pickup time')} />
                        <QuickButton label="Get Directions" href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430" external />
                      </>
                    ) : (
                      <>
                        <QuickButton label="Schedule Pickup" href={`/pickup/${context.customerToken}`} />
                        <QuickButton label="Get Directions" href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430" external />
                        <QuickButton label="What should I bring?" onClick={() => setInput('What vehicle do I need for my items?')} />
                      </>
                    )}
                  </div>
                )}

                {/* In-chat slot picker for rescheduling */}
                {showSlotPicker && (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                    {slotsLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                        <p className="text-xs text-gray-400 mt-2">Loading available times...</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-gray-600 px-1">Pick a new time:</p>
                        {['Thursday', 'Friday', 'Saturday'].map(day => {
                          const daySlots = availableSlots.filter(s => s.day === day);
                          if (daySlots.length === 0) return null;
                          return (
                            <div key={day}>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">{day}</p>
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
                                        body: JSON.stringify({
                                          action: 'reschedule',
                                          customerId: context.customerId,
                                          slotId: slot.id,
                                        }),
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
                                          content: data.error || 'Sorry, that slot is no longer available. Try another one!',
                                          timestamp: new Date().toISOString(),
                                        }]);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                                  >
                                    {slot.time}
                                    <span className="text-[9px] text-gray-400 ml-1">({slot.available})</span>
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
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t bg-white shrink-0 safe-area-bottom">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={context.needsHuman ? "Our team will follow up soon..." : "Ask me anything about your pickup..."}
                    className="flex-1 border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Parse message content for [button:Label|URL] syntax and render inline buttons
 */
function ChatMessageContent({ content }: { content: string }) {
  const buttonRegex = /\[button:([^|]+)\|([^\]]+)\]/g;
  const parts: Array<{ type: 'text'; value: string } | { type: 'button'; label: string; url: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = buttonRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'button', label: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  // If no buttons found, render plain text
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
          <a
            key={i}
            href={part.url}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
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
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
      >
        {label}
        {external && <ExternalLink className="w-3 h-3" />}
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
    >
      {label}
    </button>
  );
}
