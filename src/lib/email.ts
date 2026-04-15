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
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2005').trim();

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
              <h1 style="margin: 0 0 8px; font-family: 'Oswald', Arial, sans-serif; font-size: 26px; font-weight: 700; color: #1a1a1a;">
                Good news, ${firstName}!
              </h1>
              <p style="margin: 0 0 20px; font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; color: #1a1a1a; line-height: 1.6;">
                Your Devaney Center seats are ready and it&rsquo;s time to pick your pickup window. We can&rsquo;t wait for you to bring home a piece of Husker history!
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
/**
 * Generate reminder email HTML for customers who haven't booked yet
 */
export function generateReminderEmail(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;
  const supportUrl = `${APP_URL}/support?email=${encodeURIComponent(recipient.email)}`;

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
  <title>Reminder: Schedule Your Devaney Pickup</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f1e7; font-family: 'Source Serif 4', Georgia, serif;">

  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${firstName}, you still need to schedule your pickup time. Spots are filling up — don't miss out.
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

              <h1 style="margin: 0 0 8px; font-family: 'Oswald', Arial, sans-serif; font-size: 26px; font-weight: 700; color: #1a1a1a;">
                Hey ${firstName}, quick reminder!
              </h1>
              <p style="margin: 0 0 20px; font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; color: #1a1a1a; line-height: 1.6;">
                We noticed you haven&rsquo;t scheduled your Devaney seats pickup yet. Spots are filling up fast &mdash; make sure you grab a time that works for you before they&rsquo;re gone!
              </p>

              <!-- URGENT CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #d00000; border-radius: 8px; padding: 24px; text-align: center;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px;">
                      &#9888; Pickup Scheduling Required
                    </p>
                    <p style="margin: 0 0 16px; font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; color: #ffffff; line-height: 1.4;">
                      Time slots are limited. Please schedule now.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 28px; color: rgba(255,255,255,0.8);">&#9660;</p>
                    <a href="${pickupUrl}" style="display: inline-block; background-color: #ffffff; color: #d00000; font-family: 'Oswald', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 44px; border-radius: 50px; letter-spacing: 0.5px; text-transform: uppercase;">
                      Schedule My Pickup Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; color: #666; text-align: center; line-height: 1.5;">
                Or copy this link: <a href="${pickupUrl}" style="color: #d00000; word-break: break-all;">${pickupUrl}</a>
              </p>

              <hr style="border: none; border-top: 2px solid #f5f1e7; margin: 24px 0;" />

              <!-- YOUR ITEMS -->
              <h2 style="margin: 0 0 12px; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">
                Your Items Waiting for You
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
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f5f1e7; border-radius: 4px; border-left: 4px solid #d00000;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1a1a1a;">April 16&ndash;18, 2026</p>
                    <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #666;">Thursday 12pm&ndash;8pm &middot; Friday &amp; Saturday 10am&ndash;8pm</p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #1a1a1a; border-radius: 4px;">
                    <p style="margin: 0 0 4px; font-family: 'Oswald', Arial, sans-serif; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px;">Location</p>
                    <p style="margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 15px; color: #ffffff;">
                      2410 Production Dr, Unit 4 &middot; Roca, NE 68430
                    </p>
                  </td>
                </tr>
              </table>

              <hr style="border: none; border-top: 2px solid #f5f1e7; margin: 24px 0;" />

              <p style="margin: 0 0 0; font-family: 'Source Serif 4', Georgia, serif; font-size: 15px; color: #1a1a1a; line-height: 1.6;">
                Don&rsquo;t miss out on bringing home your piece of Husker history. We&rsquo;ve got your items staged and ready to go!
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
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 12px; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #666;">
                      Questions or need help? Chat with our AI assistant.
                    </p>
                    <a href="${supportUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 50px; letter-spacing: 0.5px;">
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

export function generateReminderEmailText(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;
  const itemList = recipient.pickupItems.map(i => `  - ${i.qty}x ${i.name}`).join('\n');

  return `Hey ${firstName}, quick reminder!

We noticed you haven't scheduled your Devaney seats pickup yet. Spots are filling up fast — grab a time before they're gone!

SCHEDULE NOW: ${pickupUrl}

YOUR ITEMS:
${itemList}

PICKUP DATES: April 16-18, 2026
LOCATION: 2410 Production Dr, Unit 4, Roca, NE 68430

Don't miss out on bringing home your piece of Husker history!

Go Big Red!
- Nebraska Rare Goods Support Team
`.trim();
}

interface ConfirmationRecipient extends EmailRecipient {
  day: string;
  time: string;
  label: string;
  pickupPageUrl: string;
  isReschedule: boolean;
}

/**
 * Generate booking confirmation email
 */
export function generateConfirmationEmail(r: ConfirmationRecipient): string {
  const firstName = r.name.split(' ')[0];
  const dateMap: Record<string, string> = {
    Thursday: 'Thursday, April 16',
    Friday: 'Friday, April 17',
    Saturday: 'Saturday, April 18',
    May2: 'Saturday, May 2',
  };
  const displayDate = dateMap[r.day] || r.day;
  const supportUrl = `${APP_URL}/support?email=${encodeURIComponent(r.email)}`;

  const itemRows = r.pickupItems.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">${item.qty}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pickup Confirmed</title></head>
<body style="margin:0;padding:0;background-color:#f5f1e7;font-family:Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;">Your Devaney pickup is ${r.isReschedule ? 'rescheduled' : 'confirmed'} for ${displayDate} at ${r.time}. Save this email as your receipt.</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f1e7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

<!-- HEADER -->
<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:8px 8px 0 0;text-align:center;">
<img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" height="40" style="display:block;margin:0 auto 8px;width:40px;height:auto;" />
<span style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Nebraska Rare Goods</span>
</td></tr>

<!-- GREEN CONFIRMATION BAR -->
<tr><td style="background-color:#16a34a;padding:16px 32px;text-align:center;">
<p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">
&#10003; Pickup ${r.isReschedule ? 'Rescheduled' : 'Confirmed'}
</p>
</td></tr>

<!-- MAIN -->
<tr><td style="background-color:#ffffff;padding:32px;">

<h1 style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;text-align:center;">
${r.isReschedule ? 'Updated' : 'You\'re all set'}, ${firstName}!
</h1>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:15px;color:#666;text-align:center;line-height:1.5;">
${r.isReschedule ? 'Your pickup has been rescheduled. Here are your updated details.' : 'Your pickup is confirmed. Save this email — it\'s your receipt.'}
</p>

<!-- PICKUP CARD -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:2px solid #e5e5e5;border-radius:8px;overflow:hidden;margin-bottom:24px;">
<tr><td style="padding:24px;text-align:center;">

<!-- LABEL -->
${r.label ? `<div style="display:inline-block;background-color:#1a1a1a;color:#ffffff;font-family:Arial,sans-serif;font-size:32px;font-weight:900;padding:16px 24px;border-radius:8px;letter-spacing:2px;margin-bottom:16px;">${r.label}</div><br/>` : ''}

<!-- QR CODE -->
<img src="${APP_URL}/api/pickup/${r.token}/qr" alt="Pickup QR Code" width="180" height="180" style="display:block;margin:12px auto;border:1px solid #e5e5e5;border-radius:4px;" />

<p style="margin:12px 0 4px;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;">${r.name}</p>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:13px;color:#666;">Show this QR code at pickup</p>

<!-- DATE/TIME -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td style="padding:12px 16px;background-color:#f5f1e7;border-radius:4px;text-align:center;">
<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#1a1a1a;">${displayDate}</p>
<p style="margin:0;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#d00000;">${r.time}</p>
<p style="margin:4px 0 0;font-family:Georgia,serif;font-size:12px;color:#666;">30-minute pickup window</p>
</td></tr>
</table>

</td></tr>
</table>

<!-- IMPORTANT BOX -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fff8f0;border:1px solid #fed7aa;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:1px;">Save This Email</p>
<p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.5;">
This email is your pickup receipt. Screenshot the QR code above or show this email on your phone when you arrive. You can also send a friend or family member with this receipt to pick up on your behalf.
</p>
</td></tr>
</table>

<!-- LOCATION -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="padding:12px 16px;background-color:#1a1a1a;border-radius:4px;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Pickup Location</p>
<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#ffffff;">2410 Production Dr, Unit 4<br/>Roca, NE 68430</p>
<a href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430" style="font-family:Georgia,serif;font-size:13px;color:#d00000;margin-top:6px;display:inline-block;">Get Directions &rarr;</a>
</td></tr>
</table>

<!-- ITEMS -->
<h2 style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Your Items</h2>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e5e5e5;border-radius:4px;overflow:hidden;margin-bottom:24px;">
<tr style="background-color:#f5f1e7;">
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;">Item</td>
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;text-align:center;">Qty</td>
</tr>
${itemRows}
</table>

<!-- VEHICLE -->
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:14px;color:#666;line-height:1.5;">
&#128663; <strong>Vehicle:</strong> ${r.vehicleRec}<br/>
Our team will be there to help load. Dress comfortably — pickup is in a warehouse.
</p>

<!-- VIEW PICKUP PAGE BUTTON -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center">
<a href="${r.pickupPageUrl}" style="display:inline-block;background-color:#1a1a1a;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:50px;">View My Pickup Page</a>
</td></tr>
</table>

<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6;text-align:center;">
See you there &mdash; Go Big Red! &#127805;
</p>
<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">
&mdash; Nebraska Rare Goods
</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center">
<a href="${supportUrl}" style="font-family:Georgia,serif;font-size:13px;color:#1a1a1a;text-decoration:underline;">Questions? Chat with Husker Helper &rarr;</a>
</td></tr>
</table>

</td></tr>

<!-- FOOTER -->
<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:0 0 8px 8px;text-align:center;">
<p style="margin:0;font-family:Georgia,serif;font-size:11px;color:rgba(255,255,255,0.3);">2410 Production Dr, Unit 4, Roca, NE 68430</p>
</td></tr>

</table></td></tr></table>
</body></html>`.trim();
}

/**
 * Send booking confirmation email + CC to team
 */
export async function sendConfirmationEmail(r: ConfirmationRecipient): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const firstName = r.name.split(' ')[0];
  const dateMap: Record<string, string> = { Thursday: 'Thursday, April 16', Friday: 'Friday, April 17', Saturday: 'Saturday, April 18' };
  const displayDate = dateMap[r.day] || r.day;

  const subject = r.isReschedule
    ? `${firstName}, your pickup is rescheduled — ${displayDate} at ${r.time}`
    : `Confirmed! ${firstName}, your Devaney pickup is ${displayDate} at ${r.time}`;

  const html = generateConfirmationEmail(r);
  const text = `${r.isReschedule ? 'RESCHEDULED' : 'CONFIRMED'}: Your Devaney Pickup

Hey ${firstName},

Your pickup is ${r.isReschedule ? 'rescheduled' : 'confirmed'}:
  ${displayDate} at ${r.time}
  ${r.label ? 'Label: ' + r.label : ''}

Location: 2410 Production Dr, Unit 4, Roca, NE 68430
Directions: https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430

Your items:
${r.pickupItems.map(i => '  - ' + i.qty + 'x ' + i.name).join('\n')}

Vehicle: ${r.vehicleRec}

View your pickup page: ${r.pickupPageUrl}

Show the QR code on your pickup page when you arrive. You can also send a friend or family member with your receipt.

Go Big Red!
- Nebraska Rare Goods`;

  try {
    const pm = getClient();
    const result = await pm.sendEmail({
      From: FROM_EMAIL,
      To: r.email,
      Cc: 'taylor@raregoods.com, support@raregoods.com',
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText,
      Tag: r.isReschedule ? 'pickup-rescheduled' : 'pickup-confirmed',
      Metadata: { customer_token: r.token, customer_name: r.name },
      MessageStream: 'outbound',
    });
    return { success: true, messageId: result.MessageID };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Generate Seg C email — local ship customers offered pickup option
 */
export function generateSegCEmail(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;
  const supportUrl = `${APP_URL}/support?email=${encodeURIComponent(recipient.email)}`;

  const itemRows = recipient.pickupItems.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">${item.qty}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pickup Option Available</title></head>
<body style="margin:0;padding:0;background-color:#f5f1e7;font-family:Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;">${firstName}, want your Devaney items sooner? Pick up near Lincoln at no extra charge — some fans have already signed up!</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f1e7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

<!-- HEADER -->
<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:8px 8px 0 0;text-align:center;">
<img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" height="40" style="display:block;margin:0 auto 8px;width:40px;height:auto;" />
<span style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Nebraska Rare Goods</span>
</td></tr>

<!-- MAIN -->
<tr><td style="background-color:#ffffff;padding:32px;">

<h1 style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;">
Good news, ${firstName}!
</h1>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
Our team is processing orders <strong>April 16&ndash;18</strong> to prepare them for shipping. Since you&rsquo;re nearby, some fans have asked about picking up in person &mdash; so we&rsquo;re opening that option for you too.
</p>
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
You can <strong>pick up near Lincoln at no additional cost</strong> and get your items the same day, or we&rsquo;ll ship them to you in a few weeks.
</p>

<!-- OPTIONS BOX -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="padding:20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="padding:8px 12px;text-align:center;width:50%;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#16a34a;">&#10003; Pick Up (soonest)</p>
<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#666;">April 16&ndash;18 near Lincoln<br/>No extra cost</p>
</td>
<td style="padding:8px 12px;text-align:center;width:50%;border-left:1px solid #d1d5db;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#666;">Ship to Me</p>
<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#666;">A few weeks later<br/>No action needed</p>
</td>
</tr>
</table>
</td></tr>
</table>

<!-- CTA -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center" style="padding:0 0 24px;">
<a href="${pickupUrl}" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;letter-spacing:0.5px;">
See My Options
</a>
</td></tr>
</table>

<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">
Or copy this link: <a href="${pickupUrl}" style="color:#d00000;word-break:break-all;">${pickupUrl}</a>
</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />

<!-- ITEMS -->
<h2 style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Your Items</h2>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e5e5e5;border-radius:4px;overflow:hidden;margin-bottom:24px;">
<tr style="background-color:#f5f1e7;">
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;">Item</td>
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;text-align:center;">Qty</td>
</tr>
${itemRows}
</table>

<!-- PICKUP DETAILS -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:16px;">
<tr><td style="padding:12px 16px;background-color:#f5f1e7;border-radius:4px;border-left:4px solid #16a34a;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#1a1a1a;">Pickup: April 16&ndash;18, 2026</p>
<p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#666;">2410 Production Dr, Unit 4, Roca, NE &middot; Near Lincoln</p>
</td></tr>
</table>

<!-- SHIPPING NOTE -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e5e5;border-radius:4px;">
<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#666;line-height:1.5;">
<strong>Please note:</strong> Shipping charges are non-refundable as they have already been purchased and processed. Pickup is available at no additional cost as a convenience.
</p>
</td></tr>
</table>

<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
We&rsquo;re excited to get these to you &mdash; whether you pick up or we ship!
</p>
<p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#d00000;">Go Big Red!</p>
<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:14px;color:#666;">&mdash; Nebraska Rare Goods</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center">
<a href="${supportUrl}" style="font-family:Georgia,serif;font-size:13px;color:#1a1a1a;text-decoration:underline;">Questions? Chat with Husker Helper &rarr;</a>
</td></tr>
</table>

</td></tr>

<!-- FOOTER -->
<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:0 0 8px 8px;text-align:center;">
<p style="margin:0;font-family:Georgia,serif;font-size:11px;color:rgba(255,255,255,0.3);">2410 Production Dr, Unit 4, Roca, NE 68430</p>
</td></tr>

</table></td></tr></table>
</body></html>`.trim();
}

export function generateSegCEmailText(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;
  const itemList = recipient.pickupItems.map(i => `  - ${i.qty}x ${i.name}`).join('\n');
  return `Good news, ${firstName}!

Our team is processing orders April 16-18 to prepare them for shipping. Since you're nearby, some fans have asked about picking up in person — so we're opening that option for you too.

You can pick up near Lincoln at no additional cost and get your items the same day, or we'll ship them to you in a few weeks.

SEE YOUR OPTIONS: ${pickupUrl}

YOUR ITEMS:
${itemList}

PICKUP: April 16-18, 2026
LOCATION: 2410 Production Dr, Unit 4, Roca, NE (near Lincoln)

Please note: Shipping charges are non-refundable as they have already been purchased and processed. Pickup is available at no additional cost as a convenience.

Go Big Red!
- Nebraska Rare Goods`.trim();
}

/**
 * Generate alternate pickup day email for customers who said April doesn't work
 */
export function generateAlternateEmail(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const alternateUrl = `${APP_URL}/pickup/alternate?email=${encodeURIComponent(recipient.email)}`;
  const supportUrl = `${APP_URL}/support?email=${encodeURIComponent(recipient.email)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Alternate Pickup Day</title></head>
<body style="margin:0;padding:0;background-color:#f5f1e7;font-family:Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;">${firstName}, we heard you — we've opened an alternate pickup day on May 2nd just for you.</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f1e7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:8px 8px 0 0;text-align:center;">
<img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" height="40" style="display:block;margin:0 auto 8px;width:40px;height:auto;" />
<span style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Nebraska Rare Goods</span>
</td></tr>

<tr><td style="background-color:#ffffff;padding:32px;">

<h1 style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;">
Good news, ${firstName}!
</h1>
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
Thank you for your patience as we worked with the university on an alternate pickup date as you requested. We&rsquo;re happy to let you know that we now have one available for you!
</p>

<!-- DATE CARD -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="background-color:#16a34a;border-radius:8px;padding:24px;text-align:center;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">
Alternate Pickup Day
</p>
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;">
Saturday, May 2, 2026
</p>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:14px;color:rgba(255,255,255,0.85);">
10:00 AM &ndash; 4:00 PM &middot; Same location in Roca, NE
</p>
<p style="margin:0 0 12px;font-size:28px;color:rgba(255,255,255,0.8);">&#9660;</p>
<a href="${alternateUrl}" style="display:inline-block;background-color:#ffffff;color:#16a34a;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;">
Schedule My May 2nd Pickup
</a>
</td></tr>
</table>

<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">
Or copy this link: <a href="${alternateUrl}" style="color:#d00000;word-break:break-all;">${alternateUrl}</a>
</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />

<!-- DETAILS -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:16px;">
<tr><td style="padding:12px 16px;background-color:#1a1a1a;border-radius:4px;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Pickup Location</p>
<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#ffffff;">2410 Production Dr, Unit 4<br/>Roca, NE 68430</p>
<a href="https://maps.google.com/?q=2410+Production+Drive+Unit+4+Roca+NE+68430" style="font-family:Georgia,serif;font-size:13px;color:#d00000;margin-top:6px;display:inline-block;">Get Directions &rarr;</a>
</td></tr>
</table>

<p style="margin:0 0 0;font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
This is a limited invite &mdash; spots are available on a first-come basis. If you can&rsquo;t make this date either, you&rsquo;re welcome to send a friend or family member with your pickup receipt.
</p>
<p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#d00000;">Go Big Red!</p>
<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:14px;color:#666;">&mdash; Nebraska Rare Goods</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center">
<a href="${supportUrl}" style="font-family:Georgia,serif;font-size:13px;color:#1a1a1a;text-decoration:underline;">Questions? Chat with Husker Helper &rarr;</a>
</td></tr>
</table>

</td></tr>

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:0 0 8px 8px;text-align:center;">
<p style="margin:0;font-family:Georgia,serif;font-size:11px;color:rgba(255,255,255,0.3);">2410 Production Dr, Unit 4, Roca, NE 68430</p>
</td></tr>

</table></td></tr></table>
</body></html>`.trim();
}

/**
 * Generate urgent follow-up for pickup-required customers who haven't booked
 */
export function generateUrgentReminderEmail(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;
  const supportUrl = `${APP_URL}/support?email=${encodeURIComponent(recipient.email)}`;

  const itemRows = recipient.pickupItems.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">${item.qty}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Action Needed — Book Your Pickup</title></head>
<body style="margin:0;padding:0;background-color:#f5f1e7;font-family:Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;">${firstName}, pickup is in less than 2 weeks and your slot isn't booked yet. Time slots are filling up — please book today.</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f1e7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:8px 8px 0 0;text-align:center;">
<img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" height="40" style="display:block;margin:0 auto 8px;width:40px;height:auto;" />
<span style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Nebraska Rare Goods</span>
</td></tr>

<tr><td style="background-color:#ffffff;padding:32px;">

<h1 style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;">
${firstName}, we still need you to book your pickup!
</h1>
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
Pickup is less than two weeks away and <strong>time slots are filling up fast</strong>. We want to make sure you get a spot that works for you &mdash; please take a moment to book today.
</p>

<!-- URGENT CTA -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="background-color:#d00000;border-radius:8px;padding:24px;text-align:center;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">
&#9888; Pickup Required &mdash; Book Today
</p>
<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">
April 16&ndash;18 near Lincoln, NE
</p>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:14px;color:rgba(255,255,255,0.85);">
Spots are booking up &mdash; secure yours now
</p>
<p style="margin:0 0 12px;font-size:28px;color:rgba(255,255,255,0.8);">&#9660;</p>
<a href="${pickupUrl}" style="display:inline-block;background-color:#ffffff;color:#d00000;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;">
Book My Pickup Slot
</a>
</td></tr>
</table>

<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">
Or copy this link: <a href="${pickupUrl}" style="color:#d00000;word-break:break-all;">${pickupUrl}</a>
</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />

<!-- ITEMS -->
<h2 style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Your Items Waiting for You</h2>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e5e5e5;border-radius:4px;overflow:hidden;margin-bottom:24px;">
<tr style="background-color:#f5f1e7;">
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;">Item</td>
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;text-align:center;">Qty</td>
</tr>
${itemRows}
</table>

<!-- REMINDER -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fff8f0;border:1px solid #fed7aa;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:1px;">Reminder</p>
<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.5;">
&#9679;&nbsp;&nbsp;Seats and benches are pickup only &mdash; shipping is not available for these items
</p>
<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.5;">
&#9679;&nbsp;&nbsp;${recipient.vehicleRec}
</p>
<p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.5;">
&#9679;&nbsp;&nbsp;Can&rsquo;t make it? A friend or family member can pick up with your receipt
</p>
</td></tr>
</table>

<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
We can&rsquo;t wait for you to bring home your piece of Husker history!
</p>
<p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#d00000;">Go Big Red!</p>
<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:14px;color:#666;">&mdash; Nebraska Rare Goods</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center">
<a href="${supportUrl}" style="font-family:Georgia,serif;font-size:13px;color:#1a1a1a;text-decoration:underline;">Questions? Chat with Husker Helper &rarr;</a>
</td></tr>
</table>

</td></tr>

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:0 0 8px 8px;text-align:center;">
<p style="margin:0;font-family:Georgia,serif;font-size:11px;color:rgba(255,255,255,0.3);">2410 Production Dr, Unit 4, Roca, NE 68430</p>
</td></tr>

</table></td></tr></table>
</body></html>`.trim();
}

/**
 * Generate urgent follow-up for Seg C customers who haven't opted in
 */
export function generateUrgentSegCEmail(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const pickupUrl = `${APP_URL}/pickup/${recipient.token}`;
  const supportUrl = `${APP_URL}/support?email=${encodeURIComponent(recipient.email)}`;

  const itemRows = recipient.pickupItems.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">${item.qty}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Last Chance — Pickup Option</title></head>
<body style="margin:0;padding:0;background-color:#f5f1e7;font-family:Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;">${firstName}, last chance to pick up your Devaney items in person April 16-18. Get them weeks sooner than shipping!</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f1e7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:8px 8px 0 0;text-align:center;">
<img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" height="40" style="display:block;margin:0 auto 8px;width:40px;height:auto;" />
<span style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Nebraska Rare Goods</span>
</td></tr>

<tr><td style="background-color:#ffffff;padding:32px;">

<h1 style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;">
Last chance, ${firstName}!
</h1>
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
Our team is processing orders April 16&ndash;18 and pickup spots are filling up. If you&rsquo;d like your items sooner &mdash; at no extra cost &mdash; now&rsquo;s the time to grab a slot. Otherwise, we&rsquo;ll ship them to you in a few weeks.
</p>

<!-- OPTIONS -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="padding:20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="padding:8px 12px;text-align:center;width:50%;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#16a34a;">&#10003; Pick Up (soonest)</p>
<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#666;">April 16&ndash;18 near Lincoln<br/>No extra cost &middot; Spots filling up</p>
</td>
<td style="padding:8px 12px;text-align:center;width:50%;border-left:1px solid #d1d5db;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#666;">Ship to Me</p>
<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#666;">A few weeks later<br/>No action needed</p>
</td>
</tr>
</table>
</td></tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center" style="padding:0 0 24px;">
<a href="${pickupUrl}" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;">
Choose My Option
</a>
</td></tr>
</table>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />

<h2 style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Your Items</h2>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e5e5e5;border-radius:4px;overflow:hidden;margin-bottom:24px;">
<tr style="background-color:#f5f1e7;">
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;">Item</td>
<td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;text-align:center;">Qty</td>
</tr>
${itemRows}
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="padding:12px 16px;background-color:#f9fafb;border:1px solid #e5e5e5;border-radius:4px;">
<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#666;line-height:1.5;">
<strong>Please note:</strong> Shipping charges are non-refundable as they have already been purchased and processed. Pickup is available at no additional cost.
</p>
</td></tr>
</table>

<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6;">Whether you pick up or we ship &mdash; we can&rsquo;t wait for you to enjoy your piece of Husker history!</p>
<p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#d00000;">Go Big Red!</p>
<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:14px;color:#666;">&mdash; Nebraska Rare Goods</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center">
<a href="${supportUrl}" style="font-family:Georgia,serif;font-size:13px;color:#1a1a1a;text-decoration:underline;">Questions? Chat with Husker Helper &rarr;</a>
</td></tr>
</table>

</td></tr>

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:0 0 8px 8px;text-align:center;">
<p style="margin:0;font-family:Georgia,serif;font-size:11px;color:rgba(255,255,255,0.3);">2410 Production Dr, Unit 4, Roca, NE 68430</p>
</td></tr>

</table></td></tr></table>
</body></html>`.trim();
}

/**
 * Generate May 2nd reminder for people who got the invite but haven't booked
 */
export function generateAlternateReminderEmail(recipient: EmailRecipient): string {
  const firstName = recipient.name.split(' ')[0];
  const alternateUrl = `${APP_URL}/pickup/alternate?email=${encodeURIComponent(recipient.email)}`;
  const supportUrl = `${APP_URL}/support?email=${encodeURIComponent(recipient.email)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reminder — Lock In Your May 2nd Pickup</title></head>
<body style="margin:0;padding:0;background-color:#f5f1e7;font-family:Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;">${firstName}, you still need to confirm your May 2nd pickup time. Spots are limited — please lock in your slot today.</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f1e7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:8px 8px 0 0;text-align:center;">
<img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" height="40" style="display:block;margin:0 auto 8px;width:40px;height:auto;" />
<span style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Nebraska Rare Goods</span>
</td></tr>

<tr><td style="background-color:#ffffff;padding:32px;">

<h1 style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;">
${firstName}, friendly reminder!
</h1>
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
We opened an alternate pickup day on <strong>May 2nd</strong> just for you, but we haven&rsquo;t seen you lock in a time yet. Spots are limited on this invite-only day &mdash; please confirm your slot today so we can have your items ready.
</p>

<!-- CTA -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
<tr><td style="background-color:#16a34a;border-radius:8px;padding:24px;text-align:center;">
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">
&#9888; Please Confirm Your Slot
</p>
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;">
Saturday, May 2, 2026
</p>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:14px;color:rgba(255,255,255,0.85);">
10:00 AM &ndash; 4:00 PM &middot; Roca, NE
</p>
<p style="margin:0 0 12px;font-size:28px;color:rgba(255,255,255,0.8);">&#9660;</p>
<a href="${alternateUrl}" style="display:inline-block;background-color:#ffffff;color:#16a34a;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;">
Lock In My Time
</a>
</td></tr>
</table>

<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:14px;color:#666;text-align:center;">
Or copy this link: <a href="${alternateUrl}" style="color:#d00000;word-break:break-all;">${alternateUrl}</a>
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fff8f0;border:1px solid #fed7aa;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.5;">
&#9679;&nbsp;&nbsp;This is an invite-only date with limited spots
</p>
<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.5;">
&#9679;&nbsp;&nbsp;Pickup is required for seats and benches &mdash; shipping is not available
</p>
<p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.5;">
&#9679;&nbsp;&nbsp;Can&rsquo;t make it? A friend or family member can pick up with your receipt
</p>
</td></tr>
</table>

<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.6;">We want to get your Husker history home to you &mdash; let&rsquo;s lock this in!</p>
<p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#d00000;">Go Big Red!</p>
<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:14px;color:#666;">&mdash; Nebraska Rare Goods</p>

<hr style="border:none;border-top:2px solid #f5f1e7;margin:24px 0;" />
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center">
<a href="${supportUrl}" style="font-family:Georgia,serif;font-size:13px;color:#1a1a1a;text-decoration:underline;">Questions? Chat with Husker Helper &rarr;</a>
</td></tr>
</table>

</td></tr>

<tr><td style="background-color:#1a1a1a;padding:20px 32px;border-radius:0 0 8px 8px;text-align:center;">
<p style="margin:0;font-family:Georgia,serif;font-size:11px;color:rgba(255,255,255,0.3);">2410 Production Dr, Unit 4, Roca, NE 68430</p>
</td></tr>

</table></td></tr></table>
</body></html>`.trim();
}

export type EmailTemplate = 'initial' | 'reminder' | 'confirmation' | 'seg_c' | 'alternate' | 'urgent_reminder' | 'urgent_seg_c' | 'alternate_reminder';

/**
 * Send an email using the specified template
 */
export async function sendPickupEmail(recipient: EmailRecipient, template: EmailTemplate = 'initial'): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const firstName = recipient.name.split(' ')[0];

  const templates: Record<string, { subject: string; html: string; text: string; tag: string }> = {
    initial: {
      subject: `${firstName}, your Devaney seats are ready — schedule your pickup`,
      html: generatePickupEmail(recipient),
      text: generatePickupEmailText(recipient),
      tag: 'pickup-scheduling',
    },
    reminder: {
      subject: `${firstName}, don't forget — schedule your Devaney pickup (spots filling up)`,
      html: generateReminderEmail(recipient),
      text: generateReminderEmailText(recipient),
      tag: 'pickup-reminder',
    },
    seg_c: {
      subject: `${firstName}, want your Devaney items sooner? Pickup option now available`,
      html: generateSegCEmail(recipient),
      text: generateSegCEmailText(recipient),
      tag: 'pickup-option-offered',
    },
    alternate: {
      subject: `Good news ${firstName} — alternate pickup day May 2nd is now available`,
      html: generateAlternateEmail(recipient),
      text: `Good news, ${firstName}!\n\nThank you for your patience as we worked with the university on an alternate pickup date. We now have one available for you!\n\nSaturday, May 2, 2026 — 10am to 4pm\n2410 Production Dr, Unit 4, Roca, NE\n\nSchedule here: ${APP_URL}/pickup/alternate?email=${encodeURIComponent(recipient.email)}\n\nSpots are limited. If you can't make this date either, you can send a friend or family member with your receipt.\n\nGo Big Red!\n- Nebraska Rare Goods`,
      tag: 'alternate-pickup',
    },
    urgent_reminder: {
      subject: `🚨 Important: ${firstName}, please book your Devaney pickup — spots filling up`,
      html: generateUrgentReminderEmail(recipient),
      text: `${firstName}, pickup is less than two weeks away and time slots are filling up fast! Please book your slot today: ${APP_URL}/pickup/${recipient.token}\n\nGo Big Red!\n- Nebraska Rare Goods`,
      tag: 'urgent-reminder',
    },
    urgent_seg_c: {
      subject: `📦 ${firstName}, last chance to pick up your Devaney items sooner — spots filling up`,
      html: generateUrgentSegCEmail(recipient),
      text: `Last chance, ${firstName}! Pickup spots are filling up. Pick up sooner at no extra cost: ${APP_URL}/pickup/${recipient.token}\n\nGo Big Red!\n- Nebraska Rare Goods`,
      tag: 'urgent-seg-c',
    },
    alternate_reminder: {
      subject: `${firstName}, please confirm your May 2nd pickup — spots are limited`,
      html: generateAlternateReminderEmail(recipient),
      text: `${firstName}, friendly reminder! We opened May 2nd for you but you haven't locked in a time yet. Spots are limited: ${APP_URL}/pickup/alternate?email=${encodeURIComponent(recipient.email)}\n\nGo Big Red!\n- Nebraska Rare Goods`,
      tag: 'alternate-reminder',
    },
  };

  const tmpl = templates[template] || templates.initial;

  try {
    const pm = getClient();
    const result = await pm.sendEmail({
      From: FROM_EMAIL,
      To: recipient.email,
      Subject: tmpl.subject,
      HtmlBody: tmpl.html,
      TextBody: tmpl.text,
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText,
      Tag: tmpl.tag,
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
 * Send a calendar invite email for a confirmed pickup booking.
 * Uses METHOD:REQUEST so it appears as a real calendar invite in Gmail/Outlook/Apple Mail.
 * Each customer gets their own individual invite (not a group event).
 */
export interface CalendarInviteRecipient {
  name: string;
  email: string;
  token: string;
  day: string;
  time: string;
  pickupItems: Array<{ name: string; qty: number }>;
  vehicleRec: string;
  label?: string;
  bookingId: string;
}

export async function sendCalendarInvite(r: CalendarInviteRecipient): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Import ICS helpers inline to avoid circular deps
  const { getSlotDate, getSlotEndDate, ROCA_ADDRESS, ROCA_MAPS_URL, ROCA_GEO } = await import('./ics');

  const firstName = r.name.split(' ')[0];
  const dateMap: Record<string, string> = { Thursday: 'Thursday, April 16', Friday: 'Friday, April 17', Saturday: 'Saturday, April 18', May2: 'Saturday, May 2' };
  const displayDate = dateMap[r.day] || r.day;

  const startDate = getSlotDate(r.day, r.time);
  const endDate = getSlotEndDate(r.day, r.time);
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const now = formatDate(new Date());
  const uid = `${r.bookingId}@devaney-pickup`;
  const organizerEmail = 'support@raregoods.com';

  const itemList = r.pickupItems.map(i => `${i.qty}x ${i.name}`).join('\\n');
  const description = [
    `DEVANEY PICKUP — ${displayDate} at ${r.time}`,
    '',
    `Customer: ${r.name}`,
    r.label ? `Label: ${r.label}` : '',
    '',
    'ITEMS:',
    ...r.pickupItems.map(i => `  ${i.qty}x ${i.name}`),
    '',
    `VEHICLE: ${r.vehicleRec}`,
    '',
    `LOCATION:`,
    ROCA_ADDRESS,
    '',
    `DIRECTIONS: ${ROCA_MAPS_URL}`,
    '',
    `Your pickup page: ${APP_URL}/pickup/${r.token}`,
    '',
    'Show the QR code on your pickup page when you arrive.',
  ].filter(Boolean).join('\\n');

  // Build ICS with METHOD:REQUEST for proper calendar invite
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nebraska Rare Goods//Devaney Pickup//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:Devaney Pickup — ${r.name}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${ROCA_ADDRESS.replace(/,/g, '\\,')}`,
    `GEO:${ROCA_GEO.lat};${ROCA_GEO.lng}`,
    `URL:${ROCA_MAPS_URL}`,
    `ORGANIZER;CN=Nebraska Rare Goods:mailto:${organizerEmail}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${r.name.replace(/,/g, '')}:mailto:${r.email}`,
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `CREATED:${now}`,
    `LAST-MODIFIED:${now}`,
    `SEQUENCE:0`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    // 1 hour reminder
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Devaney pickup is in 1 hour!',
    'END:VALARM',
    // Morning-of reminder
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Devaney pickup today. Don\'t forget your vehicle!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const icsBase64 = Buffer.from(icsContent).toString('base64');

  const subject = `${firstName}, your Nebraska Seats pickup is coming soon — ${displayDate}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f1e7;font-family:Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;">We just added your Devaney pickup to your calendar — ${displayDate} at ${r.time}. See you in Roca!</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f1e7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;">

<tr><td style="background-color:#d00000;padding:20px 24px;border-radius:8px 8px 0 0;text-align:center;">
  <img src="https://nebraska-seats.raregoods.com/images/nebraska-n-logo.png" alt="Nebraska N" width="40" style="display:inline-block;width:40px;height:auto;margin-bottom:6px;" />
  <p style="margin:0;font-family:'Trebuchet MS',sans-serif;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:2px;">Nebraska Rare Goods</p>
</td></tr>

<tr><td style="background-color:#ffffff;padding:36px 32px 28px;">
  <h1 style="margin:0 0 8px;font-family:'Trebuchet MS',sans-serif;font-size:24px;color:#1a1a1a;">You're all set, ${firstName}!</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">We just dropped your Devaney pickup right onto your calendar — one less thing to remember. We're getting everything ready for you and can't wait to see you out in Roca!</p>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#faf8f3;border:1px solid #e8e4da;border-radius:8px;margin-bottom:24px;">
    <tr><td style="padding:24px 28px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="vertical-align:top;width:50%;">
            <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;font-family:'Trebuchet MS',sans-serif;">When</p>
            <p style="margin:0 0 0;font-size:20px;font-weight:bold;color:#1a1a1a;font-family:'Trebuchet MS',sans-serif;">${displayDate}</p>
            <p style="margin:2px 0 0;font-size:20px;font-weight:bold;color:#d00000;font-family:'Trebuchet MS',sans-serif;">${r.time}</p>
          </td>
          <td style="vertical-align:top;width:50%;">
            <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;font-family:'Trebuchet MS',sans-serif;">Where</p>
            <p style="margin:0 0 2px;font-size:14px;color:#1a1a1a;font-weight:600;">Roca Warehouse</p>
            <p style="margin:0;font-size:13px;color:#666;">2410 Production Dr, Unit 4</p>
            <p style="margin:0;font-size:13px;color:#666;">Roca, NE 68430</p>
          </td>
        </tr>
      </table>

      <div style="border-top:1px solid #e8e4da;margin:18px 0 14px;"></div>

      <p style="margin:0 0 8px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;font-family:'Trebuchet MS',sans-serif;">Your Items</p>
      ${r.pickupItems.map(i => `<p style="margin:0 0 4px;font-size:14px;color:#1a1a1a;"><strong>${i.qty}x</strong> ${i.name}</p>`).join('')}
      ${r.label ? `
      <div style="border-top:1px solid #e8e4da;margin:14px 0;"></div>
      <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;font-family:'Trebuchet MS',sans-serif;">Your Pickup Label</p>
      <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:28px;font-weight:900;color:#1a1a1a;letter-spacing:2px;">${r.label}</p>` : ''}
    </td></tr>
  </table>

  <p style="margin:0 0 10px;font-size:14px;color:#555;line-height:1.5;">🚗 <strong>Vehicle tip:</strong> ${r.vehicleRec}</p>
  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.5;">📱 When you arrive, pull up your <a href="${APP_URL}/pickup/${r.token}" style="color:#d00000;font-weight:600;">pickup page</a> and show us the QR code. You can also send a friend or family member with your receipt if needed.</p>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:4px 0 8px;">
        <a href="${ROCA_MAPS_URL}" style="display:inline-block;background-color:#d00000;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-family:'Trebuchet MS',sans-serif;font-size:15px;font-weight:bold;">Get Directions to Pickup</a>
      </td>
    </tr>
  </table>
</td></tr>

<tr><td style="background-color:#1a1a1a;padding:20px 28px;border-radius:0 0 8px 8px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#ccc;">This event should appear on your calendar automatically.</p>
  <p style="margin:0 0 10px;font-size:12px;color:#888;">If you don't see it, check the attached .ics file in this email.</p>
  <p style="margin:0;font-size:11px;color:#666;">Go Big Red! &mdash; Nebraska Rare Goods</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = `You're all set, ${firstName}!

We just dropped your Devaney pickup right onto your calendar — one less thing to remember!

WHEN: ${displayDate} at ${r.time}
WHERE: 2410 Production Drive, Unit 4, Roca, NE 68430

YOUR ITEMS:
${r.pickupItems.map(i => `  ${i.qty}x ${i.name}`).join('\n')}
${r.label ? `\nPICKUP LABEL: ${r.label}` : ''}

VEHICLE TIP: ${r.vehicleRec}

When you arrive, pull up your pickup page and show us the QR code:
${APP_URL}/pickup/${r.token}

Directions: ${ROCA_MAPS_URL}

You can also send a friend or family member with your receipt if needed.

We're getting everything ready and can't wait to see you out in Roca!

Go Big Red!
- Nebraska Rare Goods`;

  try {
    const pm = getClient();
    const result = await pm.sendEmail({
      From: FROM_EMAIL,
      To: r.email,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText,
      Tag: 'calendar-invite',
      Metadata: { customer_token: r.token, customer_name: r.name },
      MessageStream: 'outbound',
      Attachments: [{
        Name: 'pickup-invite.ics',
        Content: icsBase64,
        ContentType: 'text/calendar; method=REQUEST',
        ContentID: '',
      }],
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
