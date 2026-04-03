import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';
import { sendPickupEmail, generatePickupEmail, generateReminderEmail, generateConfirmationEmail, generateSegCEmail, generateAlternateEmail, generateUrgentReminderEmail, generateUrgentSegCEmail } from '@/lib/email';
import type { EmailTemplate } from '@/lib/email';
import { getVehicleRecommendation } from '@/lib/types';
import type { PickupSize } from '@/lib/types';
import { getProductInfo } from '@/lib/products';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Load email engagement data from Supabase activity_log.
 * Returns a map of email → { sent, opened, clicked, bounced, sentAt, openedAt, clickedAt }
 */
async function getEmailEngagement(): Promise<Map<string, {
  sent: boolean; sentAt: string | null;
  opened: boolean; openedAt: string | null;
  clicked: boolean; clickedAt: string | null;
  bounced: boolean;
}>> {
  const map = new Map<string, {
    sent: boolean; sentAt: string | null;
    opened: boolean; openedAt: string | null;
    clicked: boolean; clickedAt: string | null;
    bounced: boolean;
  }>();

  const sb = createAdminClient();
  if (!sb) return map;

  // Query activity log for email events
  const { data: logs } = await sb
    .from('activity_log')
    .select('action, details, created_at, customers(email)')
    .in('action', ['email_sent', 'email_opened', 'email_clicked', 'email_bounced'])
    .order('created_at', { ascending: true });

  if (!logs) return map;

  for (const log of logs) {
    const email = (log.customers as unknown as { email: string } | { email: string }[] | null);
    const emailAddr = Array.isArray(email) ? email[0]?.email : email?.email;
    if (!emailAddr) continue;

    const key = emailAddr.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { sent: false, sentAt: null, opened: false, openedAt: null, clicked: false, clickedAt: null, bounced: false });
    }
    const status = map.get(key)!;

    switch (log.action) {
      case 'email_sent':
        status.sent = true;
        if (!status.sentAt) status.sentAt = log.created_at;
        break;
      case 'email_opened':
        status.opened = true;
        if (!status.openedAt) status.openedAt = log.created_at;
        break;
      case 'email_clicked':
        status.clicked = true;
        if (!status.clickedAt) status.clickedAt = log.created_at;
        break;
      case 'email_bounced':
        status.bounced = true;
        break;
    }
  }

  return map;
}

// GET /api/admin/email — get eligible recipients + stats + engagement
export async function GET() {
  await ensureHydrated();
  const customers = db.getAllCustomers();
  const allBookings = db.getAllBookings();
  const bookedIds = new Set(allBookings.map(b => b.customer_id));

  // Load engagement from Supabase
  const engagement = await getEmailEngagement();

  // Build full recipient list with engagement data
  const allRecipients = customers
    .filter(c => {
      if (!c.email) return false;
      const items = db.getLineItemsByCustomer(c.id);
      const hasPickup = items.some(i => i.item_type === 'pickup');
      return hasPickup || c.offer_pickup_conversion;
    })
    .map(c => {
      const items = db.getLineItemsByCustomer(c.id);
      const pickupItems = items.filter(i => i.item_type === 'pickup');
      const pickupRequired = pickupItems.reduce((s, i) => s + i.qty, 0);
      const shipItems = items.filter(i => i.item_type === 'ship');
      const emailStatus = engagement.get(c.email.toLowerCase()) || {
        sent: false, sentAt: null, opened: false, openedAt: null,
        clicked: false, clickedAt: null, bounced: false,
      };

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        token: c.token,
        segment: c.segment,
        hasBooked: bookedIds.has(c.id),
        pickupItemCount: pickupRequired,
        pickupRequired: pickupRequired > 0,
        shipItemCount: shipItems.reduce((s, i) => s + i.qty, 0),
        pickupItemNames: [...new Set((pickupRequired > 0 ? pickupItems : shipItems).map(i => {
          const p = getProductInfo(i.item_name);
          return p?.shortName || i.item_name;
        }))],
        emailSent: emailStatus.sent,
        emailOpened: emailStatus.opened,
        emailClicked: emailStatus.clicked,
        emailBounced: emailStatus.bounced,
        sentAt: emailStatus.sentAt,
        openedAt: emailStatus.openedAt,
        clickedAt: emailStatus.clickedAt,
      };
    });

  const engSummary = {
    sent: allRecipients.filter(r => r.emailSent).length,
    opened: allRecipients.filter(r => r.emailOpened).length,
    clicked: allRecipients.filter(r => r.emailClicked).length,
    bounced: allRecipients.filter(r => r.emailBounced).length,
  };

  return NextResponse.json({
    total: allRecipients.length,
    pickup_required_count: allRecipients.filter(r => r.pickupRequired).length,
    pickup_optional_count: allRecipients.filter(r => !r.pickupRequired).length,
    booked_count: allRecipients.filter(r => r.hasBooked).length,
    not_booked_count: allRecipients.filter(r => !r.hasBooked).length,
    all_recipients: allRecipients,
    engagement: engSummary,
  });
}

// POST /api/admin/email — send emails
export async function POST(request: Request) {
  await ensureHydrated();
  const body = await request.json();
  const { action, customerIds, testEmail, template: templateName } = body;
  const templateMap: Record<string, EmailTemplate> = { reminder: 'reminder', confirmation: 'confirmation', seg_c: 'seg_c', alternate: 'alternate', urgent_reminder: 'urgent_reminder', urgent_seg_c: 'urgent_seg_c' };
  const template: EmailTemplate = templateMap[templateName as string] || 'initial';

  // Preview: return HTML for a specific customer
  if (action === 'preview') {
    const customerId = customerIds?.[0];
    if (!customerId) {
      return NextResponse.json({ error: 'No customer ID' }, { status: 400 });
    }
    const customer = db.getCustomerById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const items = db.getLineItemsByCustomer(customer.id);
    const pickupTypeItems = items.filter(i => i.item_type === 'pickup');
    const shipTypeItems = items.filter(i => i.item_type === 'ship');
    // For Seg C, show their ship items since that's all they have
    const displayItems = (template === 'seg_c' && pickupTypeItems.length === 0 ? shipTypeItems : pickupTypeItems)
      .map(i => {
        const p = getProductInfo(i.item_name);
        return { name: p?.shortName || i.item_name, qty: i.qty };
      });
    // Consolidate dupes
    const consolidated: typeof displayItems = [];
    for (const item of displayItems) {
      const existing = consolidated.find(c => c.name === item.name);
      if (existing) existing.qty += item.qty;
      else consolidated.push({ ...item });
    }
    const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

    const recipient = { name: customer.name, email: customer.email, token: customer.token, pickupItems: consolidated, vehicleRec };

    let html: string;
    if (template === 'urgent_reminder') {
      html = generateUrgentReminderEmail(recipient);
    } else if (template === 'urgent_seg_c') {
      html = generateUrgentSegCEmail(recipient);
    } else if (template === 'alternate') {
      html = generateAlternateEmail(recipient);
    } else if (template === 'seg_c') {
      html = generateSegCEmail(recipient);
    } else if (template === 'confirmation') {
      const booking = db.getBookingByCustomer(customer.id);
      const { getLabelByToken } = await import('@/lib/labels');
      const label = getLabelByToken(customer.token);
      html = generateConfirmationEmail({
        ...recipient,
        day: booking?.time_slots?.day || 'Friday',
        time: booking?.time_slots?.time || '10:00am',
        label: label?.label || 'B01',
        pickupPageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://huskerpickup.raregoods.com'}/pickup/${customer.token}`,
        isReschedule: false,
      });
    } else if (template === 'reminder') {
      html = generateReminderEmail(recipient);
    } else {
      html = generatePickupEmail(recipient);
    }

    return NextResponse.json({ html, to: customer.email, name: customer.name });
  }

  // Test send: send to a test email address
  if (action === 'test') {
    if (!testEmail) {
      return NextResponse.json({ error: 'No test email' }, { status: 400 });
    }
    const customerId = customerIds?.[0];
    const customer = customerId ? db.getCustomerById(customerId) : db.getAllCustomers().find(c => c.email);
    if (!customer) {
      return NextResponse.json({ error: 'No customer to preview' }, { status: 404 });
    }
    const items = db.getLineItemsByCustomer(customer.id);
    const hasPickupType = items.some(i => i.item_type === 'pickup');
    const pickupItems = items
      .filter(i => template === 'seg_c' && !hasPickupType ? i.item_type === 'ship' : i.item_type === 'pickup')
      .map(i => {
        const p = getProductInfo(i.item_name);
        return { name: p?.shortName || i.item_name, qty: i.qty };
      });
    const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

    const result = await sendPickupEmail({
      name: customer.name,
      email: testEmail,
      token: customer.token,
      pickupItems,
      vehicleRec,
    }, template);

    return NextResponse.json(result);
  }

  // Send: batch send to selected customers
  if (action === 'send') {
    const ids: string[] = customerIds || [];
    const force = body.force === true; // allow explicit override
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No customers selected' }, { status: 400 });
    }

    // Check for already-sent emails with this template to prevent duplicates
    const sb = createAdminClient();
    let alreadySentEmails = new Set<string>();
    if (sb && !force) {
      const { data: priorSends } = await sb.from('activity_log')
        .select('customers(email)')
        .eq('action', 'email_sent');
      alreadySentEmails = new Set(
        (priorSends || []).map(s => {
          const c = s.customers as unknown as { email: string } | { email: string }[] | null;
          return Array.isArray(c) ? c[0]?.email : c?.email;
        }).filter(Boolean).map(e => (e as string).toLowerCase())
      );
    }

    const results: Array<{ name: string; email: string; success: boolean; messageId?: string; error?: string; skipped?: boolean }> = [];

    for (const id of ids) {
      const customer = db.getCustomerById(id);
      if (!customer || !customer.email) {
        results.push({ name: id, email: '', success: false, error: 'Customer not found or no email' });
        continue;
      }

      // Skip if already sent this template (unless forced)
      if (!force && template === 'initial' && alreadySentEmails.has(customer.email.toLowerCase())) {
        results.push({ name: customer.name, email: customer.email, success: true, skipped: true, error: 'Already sent — skipped' });
        continue;
      }

      const items = db.getLineItemsByCustomer(customer.id);
      const hasPickupType = items.some(i => i.item_type === 'pickup');
      const pickupItems = items
        .filter(i => template === 'seg_c' && !hasPickupType ? i.item_type === 'ship' : i.item_type === 'pickup')
        .map(i => {
          const p = getProductInfo(i.item_name);
          return { name: p?.shortName || i.item_name, qty: i.qty };
        });
      const vehicleRec = getVehicleRecommendation(customer.size as PickupSize);

      const result = await sendPickupEmail({
        name: customer.name,
        email: customer.email,
        token: customer.token,
        pickupItems,
        vehicleRec,
      }, template);

      results.push({
        name: customer.name,
        email: customer.email,
        ...result,
      });

      // Log the send to activity_log (persists to Supabase)
      db.addActivityLog(customer.id, 'email_sent', {
        type: 'pickup_scheduling',
        success: result.success,
        messageId: result.messageId,
      });
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    await flushWrites();
    return NextResponse.json({ sent, failed, results });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
