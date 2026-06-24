import { NextResponse }        from 'next/server';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path                    from 'path';
import { getOutputDir }        from '@/lib/utils';
import { recordFileTransfer }  from '@/lib/stats';
import { Readable }            from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const outputDir = getOutputDir();
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const filename = req.headers.get('x-filename') || `upload-${Date.now()}`;
    const safe     = filename.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
    const dest     = path.join(outputDir, `${Date.now()}-${safe}`);

    const nodeReadable = Readable.fromWeb(req.body);
    const out          = createWriteStream(dest);

    await new Promise((resolve, reject) => {
      nodeReadable.pipe(out);
      out.on('finish', resolve);
      out.on('error',  reject);
      nodeReadable.on('error', reject);
    });

    const { statSync } = await import('fs');
    const size = statSync(dest).size;

    // record stats
    recordFileTransfer({ count: 1, bytes: size });

    return NextResponse.json({ ok: true, file: path.basename(dest), size });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
