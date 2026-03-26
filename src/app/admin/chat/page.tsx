'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageCircle, User, Bot, AlertTriangle, CheckCircle, Send,
  Loader2, RefreshCw, ExternalLink, Calendar, Package
} from 'lucide-react';

interface Conversation {
  conversationId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerToken: string;
  messageCount: number;
  lastUserMessage: string;
  lastAt: string;
  needsHuman: boolean;
  resolved: boolean;
}

interface Message {
  role: 'user' | 'assistant' | 'admin';
  content: string;
  needsHuman?: boolean;
  timestamp: string;
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    const res = await fetch('/api/chat');
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const loadMessages = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setMessagesLoading(true);
    const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(conv.conversationId)}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
    setMessagesLoading(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReply = async () => {
    if (!replyText.trim() || !activeConv) return;
    setReplying(true);

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin_reply',
        conversationId: activeConv.conversationId,
        customerId: activeConv.customerId,
        message: replyText.trim(),
      }),
    });

    setMessages(prev => [...prev, {
      role: 'admin',
      content: replyText.trim(),
      timestamp: new Date().toISOString(),
    }]);

    setReplyText('');
    setReplying(false);
    fetchConversations();
  };

  const needsHumanCount = conversations.filter(c => c.needsHuman).length;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          Support Chat
          {needsHumanCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {needsHumanCount} needs attention
            </span>
          )}
        </h1>
        <button
          onClick={fetchConversations}
          className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No chat conversations yet</p>
          <p className="text-xs mt-1">When customers use the chat widget, conversations will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation list */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto">
            {conversations.map(conv => (
              <button
                key={conv.conversationId}
                onClick={() => loadMessages(conv)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-colors ${
                  activeConv?.conversationId === conv.conversationId
                    ? 'border-primary ring-1 ring-primary/20'
                    : conv.needsHuman
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{conv.customerName}</p>
                      {conv.needsHuman && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      {conv.resolved && (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{conv.customerEmail}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">&ldquo;{conv.lastUserMessage}&rdquo;</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-gray-400">
                      {new Date(conv.lastAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(conv.lastAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {conv.messageCount} msgs
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Chat detail */}
          <div className="lg:col-span-2">
            {activeConv ? (
              <div className="bg-white rounded-xl border overflow-hidden flex flex-col" style={{ height: '700px' }}>
                {/* Header */}
                <div className="px-5 py-3 border-b bg-gray-50 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <h3 className="font-semibold text-sm">{activeConv.customerName}</h3>
                        {activeConv.needsHuman && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Needs attention
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{activeConv.customerEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/admin/customers`}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Package className="w-3 h-3" /> Order
                      </a>
                      <a
                        href={`/pickup/${activeConv.customerToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <ExternalLink className="w-3 h-3" /> Pickup Page
                      </a>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {messagesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-12">No messages</p>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex items-start gap-2 max-w-[80%]">
                          {msg.role !== 'user' && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              msg.role === 'admin' ? 'bg-primary/10' : 'bg-gray-100'
                            }`}>
                              {msg.role === 'admin' ? (
                                <User className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <Bot className="w-3.5 h-3.5 text-gray-500" />
                              )}
                            </div>
                          )}
                          <div>
                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-primary text-white rounded-br-md'
                                : msg.role === 'admin'
                                  ? 'bg-primary/10 text-gray-800 rounded-bl-md border border-primary/20'
                                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 px-1">
                              <span className="text-[10px] text-gray-400">
                                {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              {msg.role === 'admin' && (
                                <span className="text-[10px] text-primary font-medium">Team reply</span>
                              )}
                              {msg.role === 'assistant' && (
                                <span className="text-[10px] text-gray-400">AI</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Admin reply */}
                <div className="px-5 py-3 border-t bg-white shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleReply()}
                      placeholder="Reply as team member..."
                      className="flex-1 border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleReply}
                      disabled={replying || !replyText.trim()}
                      className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0"
                    >
                      {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400" style={{ height: '700px' }}>
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
