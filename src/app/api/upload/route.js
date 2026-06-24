import { NextResponse }  from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync }    from 'fs';
import path              from 'path';
import { getOutputDir }  from '@/lib/utils';
import { recordFileTransfer } from '@/lib/stats';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const outputDir = getOutputDir();
    if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

    const formData = await req.formData();
    const files    = formData.getAll('files');
    if (!files.length) return NextResponse.json({ error: 'No files received' }, { status: 400 });

    const saved = [];
    let totalBytes = 0;

    for (const file of files) {
      const safe   = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
      const unique = `${Date.now()}-${safe}`;
      const dest   = path.join(outputDir, unique);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(dest, buffer);
      totalBytes += buffer.length;
      saved.push({ name: file.name, saved: unique, size: buffer.length, path: dest });
    }

    // record stats
    recordFileTransfer({ count: saved.length, bytes: totalBytes });

    return NextResponse.json({ ok: true, files: saved });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
