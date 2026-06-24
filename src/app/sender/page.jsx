'use client';
import { useState, useEffect, useRef } from 'react';
import Nav from '@/components/Nav';
import Waveform from '@/components/Waveform';
import { ToastProvider, useToast } from '@/components/Toast';
import { buildTextPayload, buildHotspotPayload, transmit, generatePIN, payloadWarning } from '@/lib/sound';
import styles from './page.module.css';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s    = document.createElement('script');
    s.src      = src;
    s.async    = false;
    s.onload   = resolve;
    s.onerror  = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function SenderInner() {
  const toast = useToast();
  const [quietReady, setQuietReady] = useState(false);
  const [quietError, setQuietError] = useState('');
  const [mode, setMode]             = useState('text');
  const [text, setText]             = useState('');
  const [ssid, setSsid]             = useState('');
  const [pw, setPw]                 = useState('');
  const [hotspotIP, setHotspotIP]   = useState('192.168.43.1');
  const [pin, setPin]               = useState('');
  const [waveState, setWaveState]   = useState('idle');
  const [status, setStatus]         = useState('');
  const [warning, setWarning]       = useState('');
  const [sending, setSending]       = useState(false);
  const initDone = useRef(false);

  useEffect(() => { setPin(generatePIN()); }, []);

  useEffect(() => {
    if (mode === 'text' && text) setWarning(payloadWarning(text) || '');
    else setWarning('');
  }, [text, mode]);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    async function initQuiet() {
      try {
        // 1. Load quiet.js first — sets up window.Quiet + Module global
        await loadScript('/quiet/quiet.js');
        if (!window.Quiet) throw new Error('window.Quiet not defined after load');

        // 2. Call init() BEFORE loading emscripten — sets memoryInitializerPrefixURL
        //    which quiet-emscripten.js calls immediately via locateFile on load
        window.Quiet.init({
          profilesPrefix:          '/quiet/',
          memoryInitializerPrefix: '/quiet/',
        });

        // 3. NOW load emscripten — locateFile is ready
        await loadScript('/quiet/quiet-emscripten.js');

        window.Quiet.addReadyCallback(
          ()    => { console.log('[SoundDrop] Quiet ready'); setQuietReady(true); },
          (err) => { console.error('[SoundDrop] Quiet error', err); setQuietError(String(err || 'Init failed')); }
        );
      } catch (e) {
        console.error('[SoundDrop] load error', e);
        setQuietError(e.message);
      }
    }

    initQuiet();
  }, []);

  async function handleSend() {
    if (!quietReady) { toast('Audio engine still initialising…', 'error'); return; }
    if (mode === 'text' && !text.trim()) { toast('Enter something to send', 'error'); return; }
    if (mode === 'hotspot' && (!ssid || !pw)) { toast('Enter SSID and password', 'error'); return; }

    let payload;
    try {
      payload = mode === 'text'
        ? await buildTextPayload(text.trim(), pin)
        : await buildHotspotPayload({ ssid, pw, ip: hotspotIP, port: 3000 }, pin);
    } catch (e) {
      toast('Payload error: ' + e.message, 'error'); return;
    }

    setSending(true);
    setWaveState('active');

    transmit(payload, {
      onStart: () => setStatus('Transmitting…'),
      onDone:  () => {
        setWaveState('idle'); setSending(false);
        setStatus('✓ Tone sent!');
        toast('Tone sent!', 'success');
      },
      onError: (e) => {
        setWaveState('idle'); setSending(false); setStatus('');
        toast('Error: ' + e, 'error');
      },
    });
  }

  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>📢 Send via Sound</h1>
          <p>Transmit text, keys, or hotspot credentials as an inaudible tone. No WiFi needed.</p>
        </div>

        {quietError && <div className={styles.errorBanner}>⚠️ {quietError}</div>}
        {!quietReady && !quietError && <div className={styles.infoBanner}>⏳ Initialising audio engine…</div>}
        {quietReady && <div className={styles.readyBanner}>✓ Audio engine ready</div>}

        <div className={styles.card}>
          <div className={styles.cardLabel}>Your PIN — share with receiver</div>
          <div className={styles.pinRow}>
            {pin.split('').map((d, i) => (
              <div key={i} className={styles.pinDigit}>{d}</div>
            ))}
            <button className={styles.regenBtn} onClick={() => setPin(generatePIN())} title="New PIN">↻</button>
          </div>
          <p className={styles.pinHint}>Receiver enters this PIN to unlock their ear.</p>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode==='text' ? styles.tabActive : ''}`} onClick={() => setMode('text')}>
            💬 Text / Key / URL
          </button>
          <button className={`${styles.tab} ${mode==='hotspot' ? styles.tabActive : ''}`} onClick={() => setMode('hotspot')}>
            📶 Hotspot Creds
          </button>
        </div>

        {mode === 'text' && (
          <div className={styles.card}>
            <label className={styles.label}>What do you want to send?</label>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="API key, password, URL, any text…"
              rows={5}
            />
            {warning && <div className={styles.warning}>{warning}</div>}
          </div>
        )}

        {mode === 'hotspot' && (
          <div className={styles.card}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Hotspot SSID</label>
              <input className={styles.input} value={ssid} onChange={e => setSsid(e.target.value)} placeholder="MyPhone Hotspot" />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Hotspot Password</label>
              <input className={styles.input} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="password123" />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Phone IP on hotspot</label>
              <input className={styles.input} value={hotspotIP} onChange={e => setHotspotIP(e.target.value)} />
              <small className={styles.hint}>Android: 192.168.43.1 · iPhone: 172.20.10.1</small>
            </div>
          </div>
        )}

        <div className={styles.sendArea}>
          <Waveform state={waveState} />
          {status && <p className={styles.statusText}>{status}</p>}
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={sending || !quietReady}
          >
            {sending    ? 'Transmitting…'    :
             quietError ? '⚠️ Audio error'   :
             !quietReady? '⏳ Initialising…' :
             '📢 Send Tone'}
          </button>
        </div>

        <div className={styles.helpCard}>
          <strong>How to receive:</strong>
          <ol className={styles.helpList}>
            <li>Open <code>/receiver</code> on the other device</li>
            <li>Enter PIN: <strong>{pin}</strong> → tap Unlock</li>
            <li>Tap Send Tone above</li>
          </ol>
        </div>
      </main>
    </div>
  );
}

export default function SenderPage() {
  return <ToastProvider><SenderInner /></ToastProvider>;
}





// 'use client';
// import { useState, useEffect, useRef } from 'react';
// import Script from 'next/script';
// import Nav from '@/components/Nav';
// import Waveform from '@/components/Waveform';
// import { ToastProvider, useToast } from '@/components/Toast';
// import { buildTextPayload, buildHotspotPayload, transmit, generatePIN, payloadWarning } from '@/lib/sound';
// import styles from './page.module.css';

// function SenderInner() {
//   const toast = useToast();
//   const [quietReady, setQuietReady]   = useState(false);
//   const [mode, setMode]               = useState('text'); // 'text' | 'hotspot'
//   const [text, setText]               = useState('');
//   const [ssid, setSsid]               = useState('');
//   const [pw, setPw]                   = useState('');
//   const [hotspotIP, setHotspotIP]     = useState('192.168.43.1');
//   const [pin, setPin]                 = useState('');
//   const [waveState, setWaveState]     = useState('idle');
//   const [status, setStatus]           = useState('');
//   const [warning, setWarning]         = useState('');
//   const [sending, setSending]         = useState(false);

//   // generate PIN on mount
//   useEffect(() => { setPin(generatePIN()); }, []);

//   // update warning as text changes
//   useEffect(() => {
//     if (mode === 'text' && text) {
//       setWarning(payloadWarning(text) || '');
//     } else {
//       setWarning('');
//     }
//   }, [text, mode]);

//   async function handleSend() {
//     if (!quietReady) { toast('Quiet.js still loading — wait a moment', 'error'); return; }
//     if (mode === 'text' && !text.trim()) { toast('Enter something to send', 'error'); return; }
//     if (mode === 'hotspot' && (!ssid || !pw)) { toast('Enter SSID and password', 'error'); return; }

//     let payload;
//     try {
//       if (mode === 'text') {
//         payload = await buildTextPayload(text.trim(), pin);
//       } else {
//         payload = await buildHotspotPayload({ ssid, pw, ip: hotspotIP, port: 3000 }, pin);
//       }
//     } catch (e) {
//       toast('Failed to build payload: ' + e.message, 'error');
//       return;
//     }

//     setSending(true);
//     setWaveState('active');
//     setStatus('Transmitting…');

//     transmit(payload, {
//       onStart: () => setStatus('Playing ultrasonic tone…'),
//       onDone:  () => {
//         setWaveState('idle');
//         setSending(false);
//         setStatus('✓ Tone sent. Receiver should have decoded it.');
//         toast('Tone sent!', 'success');
//       },
//       onError: (e) => {
//         setWaveState('idle');
//         setSending(false);
//         setStatus('');
//         toast('Error: ' + e, 'error');
//       },
//     });
//   }

//   return (
//     <div className={styles.page}>
//       <Nav />
//       <Script
//         src="/quiet/quiet.js"
//         strategy="afterInteractive"
//         onLoad={() => {
//           window.Quiet?.init({ profilesPrefix: "/quiet/", memoryInitializerPrefix: "/quiet/" });
//           setQuietReady(true);
//         }}
//       />

//       <main className={styles.main}>
//         <div className={styles.header}>
//           <h1>📢 Send via Sound</h1>
//           <p>Transmit text, keys, or hotspot credentials as an inaudible ultrasonic tone. No WiFi needed.</p>
//         </div>

//         {/* PIN display */}
//         <div className={styles.card}>
//           <div className={styles.cardLabel}>Your PIN — share this with the receiver</div>
//           <div className={styles.pinRow}>
//             {pin.split('').map((d, i) => (
//               <div key={i} className={styles.pinDigit}>{d}</div>
//             ))}
//             <button className={styles.regenBtn} onClick={() => setPin(generatePIN())} title="New PIN">↻</button>
//           </div>
//           <p className={styles.pinHint}>The receiver enters this PIN before listening. Keeps strangers out.</p>
//         </div>

//         {/* Mode tabs */}
//         <div className={styles.tabs}>
//           <button className={`${styles.tab} ${mode === 'text' ? styles.tabActive : ''}`} onClick={() => setMode('text')}>
//             💬 Text / Key / URL
//           </button>
//           <button className={`${styles.tab} ${mode === 'hotspot' ? styles.tabActive : ''}`} onClick={() => setMode('hotspot')}>
//             📶 Hotspot Creds
//           </button>
//         </div>

//         {mode === 'text' && (
//           <div className={styles.card}>
//             <label className={styles.label}>What do you want to send?</label>
//             <textarea
//               className={styles.textarea}
//               value={text}
//               onChange={e => setText(e.target.value)}
//               placeholder={'API key, password, URL, any text…\n\nsk-ant-api03-...\nhttps://example.com\nmy secret note'}
//               rows={6}
//             />
//             {warning && <div className={styles.warning}>{warning}</div>}
//           </div>
//         )}

//         {mode === 'hotspot' && (
//           <div className={styles.card}>
//             <div className={styles.fieldGroup}>
//               <label className={styles.label}>Hotspot SSID</label>
//               <input className={styles.input} value={ssid} onChange={e => setSsid(e.target.value)} placeholder="MyPhone Hotspot" />
//             </div>
//             <div className={styles.fieldGroup}>
//               <label className={styles.label}>Hotspot Password</label>
//               <input className={styles.input} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="password123" />
//             </div>
//             <div className={styles.fieldGroup}>
//               <label className={styles.label}>Phone IP (on hotspot)</label>
//               <input className={styles.input} value={hotspotIP} onChange={e => setHotspotIP(e.target.value)} placeholder="192.168.43.1" />
//               <small className={styles.hint}>Android default: 192.168.43.1 — iPhone default: 172.20.10.1</small>
//             </div>
//           </div>
//         )}

//         {/* Waveform + send */}
//         <div className={styles.sendArea}>
//           <Waveform state={waveState} />
//           {status && <p className={styles.statusText}>{status}</p>}
//           <button
//             className={styles.sendBtn}
//             onClick={handleSend}
//             disabled={sending || !quietReady}
//           >
//             {sending ? 'Transmitting…' : quietReady ? '📢 Send Tone' : 'Loading…'}
//           </button>
//         </div>

//         <div className={styles.helpCard}>
//           <strong>How to receive:</strong>
//           <ol className={styles.helpList}>
//             <li>Open <code>/receiver</code> on the other device.</li>
//             <li>Enter your PIN: <strong>{pin}</strong></li>
//             <li>Hit "Start Listening" — then press Send above.</li>
//           </ol>
//         </div>
//       </main>
//     </div>
//   );
// }

// export default function SenderPage() {
//   return <ToastProvider><SenderInner /></ToastProvider>;
// }
