import { NextResponse }     from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path                 from 'path';
import { getShareDir }      from '@/lib/utils';
import mime                 from 'mime-types';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const shareDir = getShareDir();
  const safe     = path.basename(params.filename);
  const full     = path.join(shareDir, safe);

  if (!existsSync(full)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const buffer      = readFileSync(full);
  const contentType = mime.lookup(safe) || 'application/octet-stream';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        contentType,
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Content-Length':      String(buffer.length),
    },
  });
}
