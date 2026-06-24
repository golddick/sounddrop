import { NextResponse }      from 'next/server';
import { readdirSync, statSync, existsSync } from 'fs';
import path                  from 'path';
import { getOutputDir }      from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const outputDir = getOutputDir();
  if (!existsSync(outputDir)) return NextResponse.json({ files: [] });

  try {
    const files = readdirSync(outputDir)
      .filter(n => {
        const full = path.join(outputDir, n);
        return !statSync(full).isDirectory() && !n.startsWith('.');
      })
      .map(name => {
        const stat = statSync(path.join(outputDir, name));
        return { name, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ files: [], error: e.message });
  }
}
