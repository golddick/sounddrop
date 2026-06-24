import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getLocalIP } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET() {
  const ip   = getLocalIP();
  const port = process.env.PORT || 3000;
  const proto = 'https';
  const url  = `${proto}://${ip}:${port}`;

  try {
    const qr = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#f0f0f0', light: '#161616' },
    });
    return NextResponse.json({ url, qr });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
