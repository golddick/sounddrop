import { NextResponse } from 'next/server';
import {
  readStats,
  recordSoundTransfer,
  recordFileTransfer,
  recordHotspotHandshake,
  formatStatsForDisplay,
} from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/stats — return current stats
export async function GET() {
  const s = readStats();
  return NextResponse.json(formatStatsForDisplay(s));
}

// POST /api/stats — record a transfer event
// body: { type: 'sound'|'file'|'hotspot', subtype?: 'text'|'url'|'json', bytes?: number, count?: number }
export async function POST(req) {
  try {
    const body = await req.json();
    let updated;

    if (body.type === 'sound') {
      updated = recordSoundTransfer({ type: body.subtype || 'text', bytes: body.bytes || 0 });
    } else if (body.type === 'file') {
      updated = recordFileTransfer({ count: body.count || 1, bytes: body.bytes || 0 });
    } else if (body.type === 'hotspot') {
      updated = recordHotspotHandshake();
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json(formatStatsForDisplay(updated));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
