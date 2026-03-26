/**
 * Email sending via Postmark — pickup scheduling outreach + tracking
 */

import { ServerClient, Models } from 'postmark';

let client: ServerClient | null = null;

function getClient(): ServerClient {
  if (!client) {
    const token = process.env.POSTMARK_API_TOKEN;
    if (!token) throw new Error('POSTMARK_API_TOKEN not set');
    client = new ServerClient(token);
  }
  return client;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Nebraska Rare Goods <support@raregoods.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2005';

interface EmailRecipient {
  name: string;
  email: string;
  token: string;
  pickupItems: Array<{ name: string; qty: number }>;
  vehicleRec: string;
}

/**
 * Generate the pickup scheduling email HTML for a customer
 */
export function generatePickupEmail(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;

  const itemRows = recipient.pickupItems.map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #1a1a1a;">
        ${item.name}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #666; text-align: center;">
        ${item.qty}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Devaney Pickup is Ready</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f1e7; font-family: 'Source Serif 4', Georgia, serif;">

  <!-- Preheader text (hidden, shows in inbox preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    Action needed: Pick your time slot for April 16-18 in Roca, NE. Spots are limited and filling up.
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f1e7;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 20px 32px; border-radius: 8px 8px 0 0; text-align: center;">
              <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" height="40" style="display: block; margin: 0 auto 8px; width: 40px; height: auto;" />
              <span style="font-family: 'Oswald', Arial, sans-serif; font-size: 13px; letter-spacing: 2px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Nebraska Rare Goods</span>
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px;">

              <!-- Greeting -->
              <p style="margin: 0 0 8px; font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; color: #1a1a1a; line-height: 1.6;">
                Hey ${firstName},
              </p>
              <p style="margin: 0 0 20px; font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; color: #1a1a1a; line-height: 1.6;">
                Your Nebraska Devaney Seats order is now ready to schedule pickup.
              </p>

              <!-- REQUIRED ACTION BOX -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #d00000; border-radius: 8px; padding: 24px; text-align: center;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px;">
                      &#9888; Action Required
                    </p>
                    <p style="margin: 0 0 16px; font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; color: #ffffff; line-height: 1.4;">
                      You must schedule a pickup time.<br />Spots are limited and filling up.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 28px; color: rgba(255,255,255,0.8);">&#9660;</p>
                    <a href="${pickupUrl}" style="display: inline-block; background-color: #ffffff; color: #d00000; font-family: 'Oswald', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 44px; border-radius: 50px; letter-spacing: 0.5px; text-transform: uppercase;">
                      Select My Pickup Time
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 20px;">
                    <a href="${APP_URL}/support?email=${encodeURIComponent(recipient.email)}" style="font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #1a1a1a; text-decoration: underline;">
                      Questions? Chat with our Husker Helper &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #666; text-align: center; line-height: 1.5;">
                Or copy this link: <a href="${pickupUrl}" style="color: #d00000; word-break: break-all;">${pickupUrl}</a>
              </p>

              <!-- DIVIDER -->
              <hr style="border: none; border-top: 2px solid #f5f1e7; margin: 24px 0;" />

              <!-- YOUR ITEMS -->
              <h2 style="margin: 0 0 12px; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">
                Your Items
              </h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden; margin-bottom: 24px;">
                <tr style="background-color: #f5f1e7;">
                  <td style="padding: 8px 12px; font-family: 'Oswald', Arial, sans-serif; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px;">Item</td>
                  <td style="padding: 8px 12px; font-family: 'Oswald', Arial, sans-serif; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Qty</td>
                </tr>
                ${itemRows}
              </table>

              <!-- PICKUP DETAILS -->
              <h2 style="margin: 0 0 12px; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">
                Pickup Details
              </h2>

              <!-- Date/Time Cards -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f5f1e7; border-radius: 4px; border-left: 4px solid #d00000;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1a1a1a;">Thursday, April 16</p>
                    <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #666;">12:00 PM &ndash; 8:00 PM</p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f5f1e7; border-radius: 4px; border-left: 4px solid #d00000;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1a1a1a;">Friday, April 17</p>
                    <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #666;">10:00 AM &ndash; 8:00 PM</p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f5f1e7; border-radius: 4px; border-left: 4px solid #d00000;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1a1a1a;">Saturday, April 18</p>
                    <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #666;">10:00 AM &ndash; 7:00 PM</p>
                  </td>
                </tr>
              </table>

              <!-- Location -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #1a1a1a; border-radius: 4px;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px;">Pickup Location</p>
                    <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 15px; color: #ffffff;">
                      2410 Production Dr, Unit 4<br />
                      Roca, NE 68430
                    </p>
                    <a href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430" style="font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #d00000; margin-top: 6px; display: inline-block;">
                      Get Directions &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- DIVIDER -->
              <hr style="border: none; border-top: 2px solid #f5f1e7; margin: 24px 0;" />

              <!-- IMPORTANT INFO -->
              <h2 style="margin: 0 0 12px; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">
                Important Information
              </h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 6px 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #1a1a1a; line-height: 1.6;">
                    &#9679;&nbsp;&nbsp;Your seats are fully assembled. Seat pairs are approximately 5 ft wide &times; 3 ft tall
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #1a1a1a; line-height: 1.6;">
                    &#9679;&nbsp;&nbsp;${recipient.vehicleRec}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #1a1a1a; line-height: 1.6;">
                    &#9679;&nbsp;&nbsp;You will receive a unique QR code tied to your order &mdash; have it ready on arrival
                  </td>
                </tr>
              </table>

              <!-- DIVIDER -->
              <hr style="border: none; border-top: 2px solid #f5f1e7; margin: 24px 0;" />

              <!-- WHAT TO EXPECT -->
              <h2 style="margin: 0 0 12px; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">
                What to Expect
              </h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 6px 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #1a1a1a; line-height: 1.6;">
                    &#9679;&nbsp;&nbsp;Follow posted signage and staff directions upon arrival
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #1a1a1a; line-height: 1.6;">
                    &#9679;&nbsp;&nbsp;Your order will be verified via QR code
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #1a1a1a; line-height: 1.6;">
                    &#9679;&nbsp;&nbsp;Our team will assist with locating your items, but loading assistance may be limited &mdash; plan accordingly
                  </td>
                </tr>
              </table>

              <!-- DIVIDER -->
              <hr style="border: none; border-top: 2px solid #f5f1e7; margin: 24px 0;" />

              <!-- IMPORTANT NOTES -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff8f8; border: 1px solid #fecaca; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #d00000; text-transform: uppercase; letter-spacing: 1px;">
                      Important Notes
                    </p>
                    <p style="margin: 0 0 6px; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #1a1a1a; line-height: 1.5;">
                      &#9679;&nbsp;&nbsp;Pickup is required &mdash; shipping is not available for full seats or seat pairs
                    </p>
                    <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #1a1a1a; line-height: 1.5;">
                      &#9679;&nbsp;&nbsp;If you are unable to attend your selected time, please contact us in advance to reschedule (availability may be limited)
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON REPEAT -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${pickupUrl}" style="display: inline-block; background-color: #d00000; color: #ffffff; font-family: 'Oswald', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
                      Schedule My Pickup Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- CLOSING -->
              <p style="margin: 24px 0 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 15px; color: #1a1a1a; line-height: 1.6;">
                Thank you for being part of this special piece of Nebraska history. We can&rsquo;t wait for you to bring your Devaney Center seats home.
              </p>
              <p style="margin: 12px 0 0; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #d00000;">
                Go Big Red!
              </p>
              <p style="margin: 8px 0 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #666;">
                &mdash; Nebraska Rare Goods Support Team
              </p>

              <hr style="border: none; border-top: 2px solid #f5f1e7; margin: 24px 0;" />

              <!-- SUPPORT CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f1e7; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <img src="${APP_URL}/husker-helper.webp" alt="Husker Helper" width="56" height="56" style="display: block; margin: 0 auto 12px; width: 56px; height: 56px; border-radius: 50%; border: 3px solid #d00000;" />
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #1a1a1a;">
                      Questions or Need Help?
                    </p>
                    <p style="margin: 0 0 16px; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #666;">
                      Chat with Husker Helper — our AI assistant can look up your order, answer questions, and even reschedule your pickup.
                    </p>
                    <a href="${APP_URL}/support?email=${encodeURIComponent(recipient.email)}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; font-family: 'Oswald', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 50px; letter-spacing: 0.5px;">
                      Chat with Husker Helper &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px 32px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 4px; font-family: 'Source Serif 4', Georgia, serif; font-size: 12px; color: rgba(255,255,255,0.4);">
                2410 Production Dr, Unit 4, Roca, NE 68430
              </p>
              <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 11px; color: rgba(255,255,255,0.3);">
                You are receiving this because you purchased Devaney Center seating.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/**
 * Generate plain-text version of the email
 */
export function generatePickupEmailText(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;
  const itemList = recipient.pickupItems.map(i => `  - ${i.qty}x ${i.name}`).join('\n');

  return `Hey ${firstName},

Pickup scheduling for your Devaney Center legacy seating order is now live.

SELECT YOUR PICKUP TIME: ${pickupUrl}

YOUR ITEMS:
${itemList}

PICKUP DETAILS:
  Thursday, April 16: 12:00 PM - 8:00 PM
  Friday, April 17: 10:00 AM - 8:00 PM
  Saturday, April 18: 10:00 AM - 7:00 PM

LOCATION:
  2410 Production Dr, Unit 4
  Roca, NE 68430
  Directions: https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430

IMPORTANT INFORMATION:
  - Your seats are fully assembled. Seat pairs are approximately 5 ft wide x 3 ft tall
  - ${recipient.vehicleRec}
  - You will receive a unique QR code tied to your order - have it ready on arrival

WHAT TO EXPECT:
  - Follow posted signage and staff directions upon arrival
  - Your order will be verified via QR code
  - Our team will assist with locating your items, but loading assistance may be limited

IMPORTANT NOTES:
  - Pickup is required - shipping is not available for full seats or seat pairs
  - If you are unable to attend, please contact us in advance to reschedule

Thank you for being part of this special piece of Nebraska history. We can't wait for you to bring your Devaney Center seats home.

Go Big Red!
- Nebraska Rare Goods Support Team
`.trim();
}

/**
 * Send a single pickup scheduling email via Postmark
 */
export async function sendPickupEmail(recipient: EmailRecipient): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const pm = getClient();
    const result = await pm.sendEmail({
      From: FROM_EMAIL,
      To: recipient.email,
      Subject: `${recipient.name.split(' ')[0]}, your Devaney seats are ready — schedule your pickup`,
      HtmlBody: generatePickupEmail(recipient),
      TextBody: generatePickupEmailText(recipient),
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText,
      Tag: 'pickup-scheduling',
      Metadata: {
        customer_token: recipient.token,
        customer_name: recipient.name,
      },
      MessageStream: 'outbound',
    });
    return { success: true, messageId: result.MessageID };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get email delivery stats from Postmark
 */
export async function getEmailStats(): Promise<{ sent: number; opened: number; clicked: number; bounced: number } | null> {
  try {
    const pm = getClient();
    const stats = await pm.getOutboundOverview({ tag: 'pickup-scheduling' });
    return {
      sent: stats.Sent,
      opened: stats.UniqueOpens || stats.Opens,
      clicked: stats.UniqueLinksClicked || stats.TotalClicks || 0,
      bounced: stats.Bounced,
    };
  } catch {
    return null;
  }
}
