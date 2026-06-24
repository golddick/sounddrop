#!/usr/bin/env node
/**
 * SoundDrop setup script
 * Downloads Quiet.js and its required assets into public/quiet/
 * Run once after pnpm install: node scripts/setup.js
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const QUIET_DIR = path.join(__dirname, '../public/quiet');

const FILES = [
  {
    url:  'https://cdn.jsdelivr.net/npm/quiet-js@1.0.1/quiet.js',
    dest: 'quiet.js',
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/quiet-js@1.0.1/quiet-profiles.json',
    dest: 'quiet-profiles.json',
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/quiet-js@1.0.1/quiet.js.mem',
    dest: 'quiet.js.mem',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get  = (u) => https.get(u, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location); // follow redirect
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
    get(url);
  });
}

async function main() {
  if (!fs.existsSync(QUIET_DIR)) fs.mkdirSync(QUIET_DIR, { recursive: true });

  console.log('\n🔊 SoundDrop Setup\n');

  for (const { url, dest } of FILES) {
    const fullDest = path.join(QUIET_DIR, dest);
    if (fs.existsSync(fullDest)) {
      console.log(`  ✓ ${dest} (already exists)`);
      continue;
    }
    process.stdout.write(`  ↓ Downloading ${dest}…`);
    try {
      await download(url, fullDest);
      console.log(' done');
    } catch (e) {
      console.log(` FAILED: ${e.message}`);
      console.log(`    Manual download: ${url}`);
      console.log(`    Save to: ${fullDest}`);
    }
  }

  console.log('\n✅ Setup complete! Run: pnpm dev\n');
  console.log('  Open https://localhost:3000 in your browser.');
  console.log('  Accept the self-signed certificate when prompted.\n');
}

main();
