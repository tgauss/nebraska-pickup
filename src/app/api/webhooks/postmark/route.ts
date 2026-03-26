import { NextResponse } from 'next/server';
import * as db from '@/lib/local-data';
import { ensureHydrated, flushWrites } from '@/lib/local-data';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/postmark — receives Postmark webhook events
 *
 * Configure in Postmark dashboard:
 *   Settings → Webhooks → Add webhook
 *   URL: https://huskerpickup.raregoods.com/api/webhooks/postmark
 *   Events: Open, Click, Bounce, Delivery
 */
export async function POST(request: Request) {
  await ensureHydrated();
  try {
    const body = await request.json();

    const recordType = body.RecordType;
    const email = (body.Recipient || body.Email || '').toLowerCase();
    const timestamp = body.ReceivedAt || body.DeliveredAt || body.BouncedAt || new Date().toISOString();
    const token = body.Metadata?.customer_token || '';

    // Find customer by token or email
    let customerId: string | null = null;
    if (token) {
      const customer = db.getCustomerByToken(token);
      if (customer) customerId = customer.id;
    }
    if (!customerId && email) {
      const match = db.getAllCustomers().find(c => c.email.toLowerCase() === email);
      if (match) customerId = match.id;
    }

    let eventType: string | null = null;
    switch (recordType) {
      case 'Delivery': eventType = 'sent'; break;
      case 'Open': eventType = 'opened'; break;
      case 'Click': eventType = 'clicked'; break;
      case 'Bounce': case 'SpamComplaint': eventType = 'bounced'; break;
    }

    if (eventType && customerId) {
      db.addActivityLog(customerId, `email_${eventType}`, {
        messageId: body.MessageID,
        link: body.OriginalLink,
        timestamp,
        email,
      });
      await flushWrites();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Postmark webhook error:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// HEAD — Postmark sends a HEAD request to verify the webhook URL
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
