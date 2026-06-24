import { NextResponse }        from 'next/server';
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import path                       from 'path';
import { getShareDir }            from '@/lib/utils';
import mime                       from 'mime-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const shareDir = getShareDir();
  if (!existsSync(shareDir)) mkdirSync(shareDir, { recursive: true });

  try {
    const files = readdirSync(shareDir)
      .filter(n => !n.startsWith('.'))
      .map(name => {
        const full = path.join(shareDir, name);
        const stat = statSync(full);
        return {
          name,
          size:  stat.size,
          mtime: stat.mtimeMs,
          type:  mime.lookup(name) || 'application/octet-stream',
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ files: [], error: e.message });
  }
}
