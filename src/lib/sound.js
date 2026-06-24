



// /**
//  * SoundDrop audio layer — Quiet.js wrapper
//  */

// export const PROFILE        = 'audible-7k-channel-0';
// export const MAX_SAFE_BYTES = 500;

// // ── HMAC-SHA256 signing ───────────────────────────────────────────────────
// async function signPayload(data, pin) {
//   const enc = new TextEncoder();
//   const key = await crypto.subtle.importKey(
//     'raw', enc.encode(pin), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
//   );
//   const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
//   return Array.from(new Uint8Array(sig))
//     .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
// }

// async function verifySignature(data, pin, sig) {
//   const expected = await signPayload(data, pin);
//   console.log('[SoundDrop] verify — pin:', pin, 'expected:', expected, 'got:', sig, 'match:', expected === sig);
//   return expected === sig;
// }

// async function getLocalIP() {
//   try {
//     const r = await fetch('/api/info');
//     const d = await r.json();
//     return d.ip || '';
//   } catch { return ''; }
// }

// // ── Payload builders ──────────────────────────────────────────────────────
// export async function buildTextPayload(text, pin) {
//   const ip   = await getLocalIP();
//   const type = text.startsWith('http') ? 'url' : 'text';
//   const core = JSON.stringify({ v: 1, type, data: text, ip });
//   const sig  = await signPayload(core, pin);
//   const payload = JSON.stringify({ v: 1, type, data: text, ip, sig });
//   console.log('[SoundDrop] built payload:', payload);
//   return payload;
// }

// export async function buildHotspotPayload({ ssid, pw, ip, port }, pin) {
//   const core = JSON.stringify({ v: 1, type: 'hotspot', ssid, pw, ip, port });
//   const sig  = await signPayload(core, pin);
//   return JSON.stringify({ v: 1, type: 'hotspot', ssid, pw, ip, port, sig });
// }

// export function payloadWarning(payload) {
//   const bytes = new TextEncoder().encode(payload).length;
//   if (bytes > MAX_SAFE_BYTES) {
//     const secs = Math.ceil(bytes / 150);
//     return `⚠️ Payload is ${bytes} bytes — sound transfer ~${secs}s. DropZone would be instant.`;
//   }
//   return null;
// }

// // ── Transmit ──────────────────────────────────────────────────────────────
// export function transmit(payload, { onStart, onDone, onError } = {}) {
//   if (!window.Quiet) { onError?.('Quiet.js not loaded'); return; }
//   console.log('[SoundDrop] transmitting:', payload.length, 'bytes');
//   onStart?.();
//   try {
//     const tx = window.Quiet.transmitter({
//       profile:  PROFILE,
//       onFinish: () => { console.log('[SoundDrop] transmit done'); onDone?.(); },
//       onError:  (e) => { console.error('[SoundDrop] transmit error:', e); onError?.(String(e)); },
//     });
//     tx.transmit(window.Quiet.str2ab(payload));
//   } catch (e) {
//     onError?.(e.message);
//   }
// }

// // ── Receive ───────────────────────────────────────────────────────────────
// let activeReceiver = null;

// export function startListening({ pin, onReceive, onReceiveFail, onError } = {}) {
//   if (!window.Quiet) { onError?.('Quiet.js not loaded'); return; }
//   if (activeReceiver) stopListening();

//   console.log('[SoundDrop] starting listener with pin:', pin, 'profile:', PROFILE);

//   try {
//     activeReceiver = window.Quiet.receiver({
//       profile:       PROFILE,
//       onReceive:     async (buf) => {
//         console.log('[SoundDrop] raw received buf length:', buf.byteLength);
//         const payload = window.Quiet.ab2str(buf);
//         console.log('[SoundDrop] decoded string:', payload);

//         let parsed;
//         try { parsed = JSON.parse(payload); }
//         catch (e) { console.warn('[SoundDrop] JSON parse failed:', e.message); return; }

//         const { sig, ...rest } = parsed;
//         const core  = JSON.stringify(rest);
//         const valid = await verifySignature(core, pin || '0000', sig || '');

//         if (!valid) {
//           console.warn('[SoundDrop] signature rejected — wrong PIN?');
//           return;
//         }

//         console.log('[SoundDrop] accepted payload:', parsed);
//         onReceive?.(parsed);
//       },
//       onReceiveFail: (total) => {
//         console.warn('[SoundDrop] frame checksum fail, total fails:', total);
//         onReceiveFail?.(total);
//       },
//       onError: (e) => {
//         console.error('[SoundDrop] receiver error:', e);
//         onError?.(String(e) || 'Receive error');
//       },
//     });
//     console.log('[SoundDrop] receiver created ok');
//   } catch (e) {
//     console.error('[SoundDrop] failed to create receiver:', e);
//     onError?.(e.message);
//   }
// }

// export function stopListening() {
//   try { activeReceiver?.destroy(); } catch {}
//   activeReceiver = null;
// }

// export function generatePIN() {
//   return String(Math.floor(1000 + Math.random() * 9000));
// }



/**
 * SoundDrop audio layer — Quiet.js wrapper
 *
 * Profile: audible-fsk-robust
 *   - FSK8 modulation — much more noise tolerant than QAM
 *   - frame_length: 20 bytes — tiny frames, less chance of corruption
 *   - v29 outer FEC — strong error correction
 *   - Audible (you'll hear it) but reliable over laptop speaker → mic
 */

export const PROFILE        = 'audible-fsk-robust';
export const MAX_SAFE_BYTES = 500;

// ── HMAC-SHA256 signing ───────────────────────────────────────────────────
async function signPayload(data, pin) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(pin), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function verifySignature(data, pin, sig) {
  const expected = await signPayload(data, pin);
  console.log('[SoundDrop] verify pin:', pin, '| match:', expected === sig);
  return expected === sig;
}

async function getLocalIP() {
  try {
    const r = await fetch('/api/info');
    const d = await r.json();
    return d.ip || '';
  } catch { return ''; }
}

// ── Payload builders ──────────────────────────────────────────────────────
export async function buildTextPayload(text, pin) {
  const ip   = await getLocalIP();
  const type = text.startsWith('http') ? 'url' : 'text';
  const core = JSON.stringify({ v: 1, type, data: text, ip });
  const sig  = await signPayload(core, pin);
  const out  = JSON.stringify({ v: 1, type, data: text, ip, sig });
  console.log('[SoundDrop] payload built, bytes:', new TextEncoder().encode(out).length, 'pin:', pin);
  return out;
}

export async function buildHotspotPayload({ ssid, pw, ip, port }, pin) {
  const core = JSON.stringify({ v: 1, type: 'hotspot', ssid, pw, ip, port });
  const sig  = await signPayload(core, pin);
  return JSON.stringify({ v: 1, type: 'hotspot', ssid, pw, ip, port, sig });
}

export function payloadWarning(payload) {
  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > MAX_SAFE_BYTES) {
    const secs = Math.ceil(bytes / 50); // fsk-robust is ~50 bytes/sec
    return `⚠️ Payload is ${bytes} bytes — will take ~${secs}s via sound. DropZone would be instant.`;
  }
  return null;
}

// ── Transmit ──────────────────────────────────────────────────────────────
export function transmit(payload, { onStart, onDone, onError } = {}) {
  if (!window.Quiet) { onError?.('Quiet.js not loaded'); return; }
  console.log('[SoundDrop] transmit start, bytes:', payload.length);
  onStart?.();
  try {
    const tx = window.Quiet.transmitter({
      profile:  PROFILE,
      onFinish: () => { console.log('[SoundDrop] transmit done'); onDone?.(); },
      onError:  (e) => { console.error('[SoundDrop] transmit err:', e); onError?.(String(e)); },
    });
    tx.transmit(window.Quiet.str2ab(payload));
  } catch (e) {
    onError?.(e.message);
  }
}

// ── Receive ───────────────────────────────────────────────────────────────
let activeReceiver = null;

export function startListening({ pin, onReceive, onReceiveFail, onError } = {}) {
  if (!window.Quiet) { onError?.('Quiet.js not loaded'); return; }
  if (activeReceiver) stopListening();

  console.log('[SoundDrop] listening | profile:', PROFILE, '| pin:', pin);

  try {
    activeReceiver = window.Quiet.receiver({
      profile:   PROFILE,
      onReceive: async (buf) => {
        console.log('[SoundDrop] buf received, bytes:', buf.byteLength);
        let payload;
        try { payload = window.Quiet.ab2str(buf); }
        catch (e) { console.warn('[SoundDrop] ab2str failed:', e); return; }

        console.log('[SoundDrop] decoded:', payload);

        let parsed;
        try { parsed = JSON.parse(payload); }
        catch (e) { console.warn('[SoundDrop] JSON parse failed:', e.message, '| raw:', payload); return; }

        const { sig, ...rest } = parsed;
        const core  = JSON.stringify(rest);
        const valid = await verifySignature(core, pin, sig || '');

        if (!valid) {
          console.warn('[SoundDrop] sig rejected — PIN mismatch. Receiver PIN:', pin);
          return;
        }

        console.log('[SoundDrop] ✓ accepted:', parsed);
        onReceive?.(parsed);
      },
      onReceiveFail: (total) => {
        console.warn('[SoundDrop] checksum fail #' + total + ' — devices too far apart or ambient noise too high');
        onReceiveFail?.(total);
      },
      onError: (e) => {
        console.error('[SoundDrop] receiver err:', e);
        onError?.(String(e));
      },
    });
    console.log('[SoundDrop] receiver created ok');
  } catch (e) {
    console.error('[SoundDrop] failed to create receiver:', e);
    onError?.(e.message);
  }
}

export function stopListening() {
  try { activeReceiver?.destroy(); } catch {}
  activeReceiver = null;
}

export function generatePIN() {
  return String(Math.floor(1000 + Math.random() * 9000));
}