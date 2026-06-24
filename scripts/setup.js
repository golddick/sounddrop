#!/usr/bin/env node
/**
 * SoundDrop setup — downloads Quiet.js files into public/quiet/
 * Run once after pnpm install: node scripts/setup.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const QUIET_DIR = path.join(__dirname, '../public/quiet');

const BASE = 'https://raw.githubusercontent.com/quiet/quiet-js/master';

const FILES = [
  { url: `${BASE}/quiet.js`,                dest: 'quiet.js' },
  { url: `${BASE}/quiet-profiles.json`,     dest: 'quiet-profiles.json' },
  { url: `${BASE}/quiet-emscripten.js`,     dest: 'quiet-emscripten.js' },
  { url: `${BASE}/quiet-emscripten.js.mem`, dest: 'quiet-emscripten.js.mem' },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get  = (u) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.destroy();
          try { fs.unlinkSync(dest); } catch {}
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error',  reject);
      }).on('error', reject);
    };
    get(url);
  });
}

async function main() {
  if (!fs.existsSync(QUIET_DIR)) fs.mkdirSync(QUIET_DIR, { recursive: true });

  console.log('\n🔊 SoundDrop Setup\n');

  for (const { url, dest } of FILES) {
    const fullDest = path.join(QUIET_DIR, dest);

    // Remove empty files from previous failed attempts
    if (fs.existsSync(fullDest) && fs.statSync(fullDest).size === 0) {
      fs.unlinkSync(fullDest);
    }

    if (fs.existsSync(fullDest)) {
      console.log(`  ✓ ${dest} (${fs.statSync(fullDest).size} bytes — already exists)`);
      continue;
    }

    process.stdout.write(`  ↓ ${dest}…`);
    try {
      await download(url, fullDest);
      console.log(` ✓ (${fs.statSync(fullDest).size} bytes)`);
    } catch (e) {
      console.log(` ✗ ${e.message}`);
    }
  }

  const allGood = FILES.every(({ dest }) => {
    const f = path.join(QUIET_DIR, dest);
    return fs.existsSync(f) && fs.statSync(f).size > 0;
  });

  if (allGood) {
    console.log('\n✅ Done. Run: pnpm dev\n');
  } else {
    console.log('\n❌ Some files failed — check connection and retry.\n');
    process.exit(1);
  }
}

main();