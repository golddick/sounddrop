import { NextResponse } from 'next/server';
import { getLocalIP, getOutputDir, getShareDir } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ip:        getLocalIP(),
    port:      process.env.PORT || 3000,
    outputDir: getOutputDir(),
    shareDir:  getShareDir(),
  });
}
