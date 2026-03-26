import { NextResponse } from 'next/server';
import { recordEvent } from '@/lib/email-tracking';
import * as db from '@/lib/local-data';

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
  try {
    const body = await request.json();

    // Postmark sends different event types via RecordType
    const recordType = body.RecordType;
    const email = (body.Recipient || body.Email || '').toLowerCase();
    const timestamp = body.ReceivedAt || body.DeliveredAt || body.BouncedAt || new Date().toISOString();

    // Extract customer token from metadata (set during send)
    const token = body.Metadata?.customer_token || '';

    // Find customer by email or token
    let customerId: string | null = null;
    if (token) {
      const customer = db.getCustomerByToken(token);
      if (customer) customerId = customer.id;
    }
    if (!customerId && email) {
      const allCustomers = db.getAllCustomers();
      const match = allCustomers.find(c => c.email.toLowerCase() === email);
      if (match) customerId = match.id;
    }

    let eventType: 'sent' | 'opened' | 'clicked' | 'bounced' | null = null;

    switch (recordType) {
      case 'Delivery':
        eventType = 'sent';
        break;
      case 'Open':
        eventType = 'opened';
        break;
      case 'Click':
        eventType = 'clicked';
        break;
      case 'Bounce':
      case 'SpamComplaint':
        eventType = 'bounced';
        break;
    }

    if (eventType && email) {
      recordEvent({
        customerId,
        email,
        token,
        event: eventType,
        timestamp,
        details: {
          recordType,
          tag: body.Tag,
          link: body.OriginalLink, // for clicks
          userAgent: body.UserAgent,
          platform: body.Platform,
          messageId: body.MessageID,
        },
      });

      // Also log to the customer's activity log
      if (customerId) {
        db.addActivityLog(customerId, `email_${eventType}`, {
          messageId: body.MessageID,
          link: body.OriginalLink,
          timestamp,
        });
      }
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
