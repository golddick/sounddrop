import fs   from 'fs';
import path from 'path';
import os   from 'os';

function getStatsFile() {
  const dir = process.env.RAILWAY_VOLUME_MOUNT_PATH
    || process.env.SOUNDDROP_OUTPUT
    || path.join(os.homedir(), 'Downloads', 'SoundDrop');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'sounddrop-stats.json');
}

const DEFAULT = {
  totalTransfers:    0,
  soundTransfers:    0,
  fileTransfers:     0,
  hotspotHandshakes: 0,
  totalBytesSound:   0,
  totalBytesFiles:   0,
  byType: { text: 0, url: 0, json: 0, hotspot: 0, file: 0 },
  lastTransferAt: null,
  startedAt: new Date().toISOString(),
};

export function readStats() {
  try {
    const f = getStatsFile();
    if (!fs.existsSync(f)) return { ...DEFAULT, byType: { ...DEFAULT.byType } };
    return { ...DEFAULT, ...JSON.parse(fs.readFileSync(f, 'utf8')) };
  } catch { return { ...DEFAULT, byType: { ...DEFAULT.byType } }; }
}

function writeStats(s) {
  try { fs.writeFileSync(getStatsFile(), JSON.stringify(s, null, 2)); }
  catch (e) { console.error('[stats] write failed:', e.message); }
}

export function recordSoundTransfer({ type = 'text', bytes = 0 } = {}) {
  const s = readStats();
  s.totalTransfers++;
  s.soundTransfers++;
  s.totalBytesSound += bytes;
  s.byType[type] = (s.byType[type] || 0) + 1;
  s.lastTransferAt = new Date().toISOString();
  writeStats(s);
  return s;
}

export function recordFileTransfer({ count = 1, bytes = 0 } = {}) {
  const s = readStats();
  s.totalTransfers  += count;
  s.fileTransfers   += count;
  s.totalBytesFiles += bytes;
  s.byType.file      = (s.byType.file || 0) + count;
  s.lastTransferAt   = new Date().toISOString();
  writeStats(s);
  return s;
}

export function recordHotspotHandshake() {
  const s = readStats();
  s.hotspotHandshakes++;
  s.byType.hotspot = (s.byType.hotspot || 0) + 1;
  s.lastTransferAt = new Date().toISOString();
  writeStats(s);
  return s;
}

function formatBytes(b = 0) {
  if (b === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatStatsForDisplay(s) {
  return {
    ...s,
    totalBytesSoundFmt: formatBytes(s.totalBytesSound),
    totalBytesFilesFmt: formatBytes(s.totalBytesFiles),
    totalBytesFmt:      formatBytes((s.totalBytesSound || 0) + (s.totalBytesFiles || 0)),
  };
}
