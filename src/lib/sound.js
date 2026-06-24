/**
 * SoundDrop audio layer
 * Uses Quiet.js (loaded via <Script> in each page) for FSK/OFDM ultrasonic encode/decode.
 * Falls back to audible profile during dev if browser doesn't support ultrasonic range.
 *
 * Payload schema:
 *   Mode 1 (text): { v:1, type:'text'|'url'|'json', data: string, ip: string, sig: string }
 *   Mode 2 (hotspot): { v:1, type:'hotspot', ssid, pw, ip, port, sig }
 */

const PROFILE = 'audible-7k-channel-1'; // swap to 'ultrasound' when quiet-profiles supports it
const MAX_SAFE_BYTES = 500;

// ── HMAC-SHA256 signing via Web Crypto ─────────────────────────────────────
async function signPayload(data, pin) {
  const enc   = new TextEncoder();
  const key   = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig   = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function verifySignature(data, pin, sig) {
  const expected = await signPayload(data, pin);
  return expected === sig;
}

// ── Get local IP (client-side best-effort via API) ────────────────────────
async function getLocalIP() {
  try {
    const r = await fetch('/api/info');
    const d = await r.json();
    return d.ip || '';
  } catch { return ''; }
}

// ── Build and sign a Mode 1 payload ──────────────────────────────────────
export async function buildTextPayload(text, pin) {
  const ip      = await getLocalIP();
  const type    = text.startsWith('http') ? 'url' : 'text';
  const core    = JSON.stringify({ v: 1, type, data: text, ip });
  const sig     = await signPayload(core, pin);
  return JSON.stringify({ v: 1, type, data: text, ip, sig });
}

// ── Build and sign a Mode 2 hotspot payload ───────────────────────────────
export async function buildHotspotPayload({ ssid, pw, ip, port }, pin) {
  const core = JSON.stringify({ v: 1, type: 'hotspot', ssid, pw, ip, port });
  const sig  = await signPayload(core, pin);
  return JSON.stringify({ v: 1, type: 'hotspot', ssid, pw, ip, port, sig });
}

// ── Warn if payload is large ──────────────────────────────────────────────
export function payloadWarning(payload) {
  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > MAX_SAFE_BYTES) {
    const secs = Math.ceil(bytes / 150);
    return `⚠️  Payload is ${bytes} bytes. Sound transfer will take ~${secs}s. DropZone would be instant.`;
  }
  return null;
}

// ── Transmit via Quiet.js ─────────────────────────────────────────────────
export function transmit(payload, { onStart, onDone, onError } = {}) {
  if (typeof window === 'undefined' || !window.Quiet) {
    onError?.('Quiet.js not loaded yet');
    return;
  }
  onStart?.();
  try {
    window.Quiet.transmit({
      profile: PROFILE,
      payload,
      onFinish: () => onDone?.(),
      onError:  (e) => onError?.(e?.toString() || 'Transmit error'),
    });
  } catch (e) {
    onError?.(e.message);
  }
}

// ── Receive via Quiet.js ──────────────────────────────────────────────────
let activeReceiver = null;

export function startListening({ pin, onReceive, onError } = {}) {
  if (typeof window === 'undefined' || !window.Quiet) {
    onError?.('Quiet.js not loaded yet');
    return;
  }
  if (activeReceiver) stopListening();

  try {
    activeReceiver = window.Quiet.receiver({
      profile: PROFILE,
      onReceive: async (payload) => {
        let parsed;
        try { parsed = JSON.parse(payload); } catch { return; } // malformed — ignore

        // Trust check: verify HMAC signature
        const { sig, ...rest } = parsed;
        const core    = JSON.stringify(rest);
        const valid   = await verifySignature(core, pin || '0000', sig || '');

        if (!valid) {
          console.warn('[SoundDrop] Tone rejected — signature mismatch');
          return; // silent discard
        }

        onReceive?.(parsed);
      },
      onError: (e) => onError?.(e?.toString() || 'Receive error'),
    });
  } catch (e) {
    onError?.(e.message);
  }
}

export function stopListening() {
  try { activeReceiver?.destroy(); } catch {}
  activeReceiver = null;
}

// ── Generate 4-digit PIN ──────────────────────────────────────────────────
export function generatePIN() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export { MAX_SAFE_BYTES };
