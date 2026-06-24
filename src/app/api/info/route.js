import { NextResponse } from 'next/server';
import { getLocalIP, getOutputDir, getShareDir } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req) {
  const isRailway   = !!process.env.RAILWAY_ENVIRONMENT;
  const railwayHost = process.env.RAILWAY_PUBLIC_DOMAIN || null;

  // On Railway: public domain is the meaningful "address"
  // Locally: LAN IP so phone can reach the laptop
  const host = isRailway && railwayHost
    ? railwayHost
    : getLocalIP();

  const port     = process.env.PORT || 3000;
  const protocol = isRailway ? 'https' : 'https';

  return NextResponse.json({
    ip:        host,
    port:      isRailway ? 443 : port,
    protocol,
    baseUrl:   isRailway ? `https://${railwayHost}` : `https://${host}:${port}`,
    outputDir: getOutputDir(),
    shareDir:  getShareDir(),
    isRailway,
  });
}