import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import * as db from '@/lib/local-data';

export const dynamic = 'force-dynamic';

// GET /api/pickup/[token]/qr — generate QR code PNG for check-in
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const customer = db.getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // QR encodes the scan URL that staff will use
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2005';
  const scanUrl = `${appUrl}/admin/scan/${token}`;

  const qrBuffer = await QRCode.toBuffer(scanUrl, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a1a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  return new NextResponse(new Uint8Array(qrBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

// GET /api/pickup/[token]/qr?format=svg — generate QR code SVG
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const customer = db.getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2005';
  const scanUrl = `${appUrl}/admin/scan/${token}`;

  const svgString = await QRCode.toString(scanUrl, {
    type: 'svg',
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a1a',
      light: '#ffffff',
    },
  });

  return new NextResponse(svgString, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}
