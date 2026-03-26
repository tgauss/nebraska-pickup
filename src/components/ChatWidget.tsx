'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, User, Bot, AlertCircle } from 'lucide-react';

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
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 safe-area-bottom"
          aria-label="Open support chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[100dvh] sm:h-[560px] bg-white sm:rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
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
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
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
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

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
