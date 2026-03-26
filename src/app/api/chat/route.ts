import { NextResponse } from 'next/server';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import * as db from '@/lib/local-data';
import { chatWithAI, identifyCustomer } from '@/lib/chat';
import type { ChatMessage, ChatContext } from '@/lib/chat';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/chat — handle chat messages
export async function POST(request: Request) {
  await ensureHydrated();

  const body = await request.json();
  const { action } = body;

  // IDENTIFY: look up customer by email/phone
  if (action === 'identify') {
    const { identifier } = body;
    if (!identifier) {
      return NextResponse.json({ error: 'No identifier provided' }, { status: 400 });
    }
    const result = identifyCustomer(identifier);
    if (!result) {
      return NextResponse.json({ found: false });
    }

    const booking = db.getBookingByCustomer(result.customerId);
    const items = db.getLineItemsByCustomer(result.customerId);
    const pickupCount = items.filter(i => i.item_type === 'pickup').reduce((s, i) => s + i.qty, 0);

    return NextResponse.json({
      found: true,
      customerId: result.customerId,
      customerName: result.customerName,
      customerEmail: result.customerEmail,
      customerToken: result.customerToken,
      hasBooked: !!booking,
      bookingDay: booking?.time_slots?.day || null,
      bookingTime: booking?.time_slots?.time || null,
      bookingStatus: booking?.status || null,
      pickupItemCount: pickupCount,
    });
  }

  // MESSAGE: send a message and get AI response
  if (action === 'message') {
    const { message, messages, context } = body as {
      message: string;
      messages: ChatMessage[];
      context: ChatContext;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    const fullMessages: ChatMessage[] = [
      ...messages,
      { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
    ];

    try {
      const { reply, needsHuman } = await chatWithAI(fullMessages, context);

      // Persist to Supabase activity_log
      if (context.customerId) {
        db.addActivityLog(context.customerId, 'chat_message', {
          conversationId: context.conversationId,
          role: 'user',
          content: message,
        });
        db.addActivityLog(context.customerId, 'chat_message', {
          conversationId: context.conversationId,
          role: 'assistant',
          content: reply,
          needsHuman,
        });
        if (needsHuman) {
          db.addActivityLog(context.customerId, 'chat_needs_human', {
            conversationId: context.conversationId,
          });
        }
      }

      await flushWrites();

      return NextResponse.json({
        reply,
        needsHuman,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Chat AI error:', err);
      return NextResponse.json({
        reply: "I'm having a little trouble right now — but don't worry! You can reach our team at support@raregoods.com and we'll get you sorted out. Go Big Red! 🌽",
        needsHuman: true,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ADMIN REPLY: send a human reply
  if (action === 'admin_reply') {
    const { conversationId, customerId, message: adminMessage } = body;
    if (!conversationId || !adminMessage?.trim()) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    if (customerId) {
      db.addActivityLog(customerId, 'chat_message', {
        conversationId,
        role: 'admin',
        content: adminMessage,
      });
      db.addActivityLog(customerId, 'chat_resolved', { conversationId });
      await flushWrites();
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// GET /api/chat — admin: get all conversations or messages for one
export async function GET(request: Request) {
  await ensureHydrated();

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  const sb = createAdminClient();
  if (!sb) {
    return NextResponse.json({ conversations: [], messages: [] });
  }

  // Get messages for a specific conversation
  if (conversationId) {
    const { data: logs } = await sb.from('activity_log')
      .select('details, created_at')
      .eq('action', 'chat_message')
      .order('created_at', { ascending: true });

    const messages = (logs || [])
      .filter(log => (log.details as Record<string, unknown>).conversationId === conversationId)
      .map(log => {
        const d = log.details as Record<string, unknown>;
        return {
          role: d.role as string,
          content: d.content as string,
          needsHuman: d.needsHuman as boolean || false,
          timestamp: log.created_at,
        };
      });

    return NextResponse.json({ messages });
  }

  // Get all conversations (grouped)
  const { data: logs } = await sb.from('activity_log')
    .select('customer_id, details, created_at, customers(name, email, token)')
    .eq('action', 'chat_message')
    .order('created_at', { ascending: false })
    .limit(1000);

  // Also get needs_human flags
  const { data: humanFlags } = await sb.from('activity_log')
    .select('details')
    .eq('action', 'chat_needs_human');

  const needsHumanConvIds = new Set(
    (humanFlags || []).map(f => (f.details as Record<string, unknown>).conversationId as string)
  );

  // Get resolved flags
  const { data: resolvedFlags } = await sb.from('activity_log')
    .select('details')
    .eq('action', 'chat_resolved');

  const resolvedConvIds = new Set(
    (resolvedFlags || []).map(f => (f.details as Record<string, unknown>).conversationId as string)
  );

  // Group by conversation ID
  const convMap = new Map<string, {
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
  }>();

  for (const log of logs || []) {
    const d = log.details as Record<string, unknown>;
    const convId = d.conversationId as string;
    if (!convId) continue;

    const custData = log.customers as unknown as { name: string; email: string; token: string } | { name: string; email: string; token: string }[] | null;
    const cust = Array.isArray(custData) ? custData[0] : custData;
    if (!cust) continue;

    if (!convMap.has(convId)) {
      // Find in-memory customer ID
      const inMemCust = db.getAllCustomers().find(c => c.token === cust.token);
      convMap.set(convId, {
        conversationId: convId,
        customerId: inMemCust?.id || (log.customer_id as string),
        customerName: cust.name,
        customerEmail: cust.email,
        customerToken: cust.token,
        messageCount: 0,
        lastUserMessage: '',
        lastAt: log.created_at,
        needsHuman: needsHumanConvIds.has(convId) && !resolvedConvIds.has(convId),
        resolved: resolvedConvIds.has(convId),
      });
    }

    const conv = convMap.get(convId)!;
    conv.messageCount++;
    if (d.role === 'user') {
      conv.lastUserMessage = d.content as string;
    }
  }

  const conversations = [...convMap.values()].sort((a, b) => {
    if (a.needsHuman !== b.needsHuman) return a.needsHuman ? -1 : 1;
    return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
  });

  return NextResponse.json({ conversations });
}
