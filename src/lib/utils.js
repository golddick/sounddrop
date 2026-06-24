import os from 'os';
import fs from 'fs';
import path from 'path';

export function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

export function getOutputDir() {
  return process.env.SOUNDDROP_OUTPUT
    ? path.resolve(process.env.SOUNDDROP_OUTPUT)
    : path.join(os.homedir(), 'Downloads', 'SoundDrop');
}

export function getShareDir() {
  return path.join(getOutputDir(), 'share');
}

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getPort() {
  return parseInt(process.env.PORT || '3000', 10);
}
