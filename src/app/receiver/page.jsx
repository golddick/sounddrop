// 'use client';
// import { useState, useEffect, useRef } from 'react';
// import Nav from '@/components/Nav';
// import Waveform from '@/components/Waveform';
// import { ToastProvider, useToast } from '@/components/Toast';
// import { startListening, stopListening } from '@/lib/sound';
// import styles from './page.module.css';

// function loadScript(src) {
//   return new Promise((resolve, reject) => {
//     if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
//     const s = document.createElement('script');
//     s.src = src;
//     s.async = false;
//     s.onload  = resolve;
//     s.onerror = () => reject(new Error(`Failed to load ${src}`));
//     document.head.appendChild(s);
//   });
// }

// function ReceiverInner() {
//   const toast = useToast();
//   const [quietReady, setQuietReady]   = useState(false);
//   const [quietError, setQuietError]   = useState('');
//   const [listening, setListening]     = useState(false);
//   const [pinInput, setPinInput]       = useState(['', '', '', '']);
//   const [pinUnlocked, setPinUnlocked] = useState(false);
//   const [countdown, setCountdown]     = useState(0);
//   const [waveState, setWaveState]     = useState('idle');
//   const [received, setReceived]       = useState(null);
//   const [history, setHistory]         = useState([]);
//   const countRef   = useRef(null);
//   const activePinRef = useRef('0000');
//   const inputRefs  = [useRef(), useRef(), useRef(), useRef()];
//   const initDone   = useRef(false);

//   useEffect(() => {
//     if (initDone.current) return;
//     initDone.current = true;

//     async function initQuiet() {
//       try {
//         await loadScript('/quiet/quiet.js');
//         if (!window.Quiet) throw new Error('window.Quiet not found');
//         // init() MUST be called before quiet-emscripten.js loads
//         // because emscripten calls locateFile immediately on execution
//         window.Quiet.init({
//           profilesPrefix:          '/quiet/',
//           memoryInitializerPrefix: '/quiet/',
//         });
//         await loadScript('/quiet/quiet-emscripten.js');
//         window.Quiet.addReadyCallback(
//           () => setQuietReady(true),
//           (err) => setQuietError(String(err || 'Quiet init failed'))
//         );
//       } catch (e) {
//         setQuietError(e.message);
//       }
//     }

//     initQuiet();
//     return () => { stopListening(); clearInterval(countRef.current); };
//   }, []);

//   // Start ear once Quiet is ready
//   useEffect(() => {
//     if (quietReady) startEar('0000');
//   }, [quietReady]);

//   function startEar(pin) {
//     activePinRef.current = pin;
//     setListening(true);
//     setWaveState('idle');
//     startListening({
//       pin,
//       onReceive:    handleReceive,
//       onReceiveFail: (total) => console.warn(`[SoundDrop] frame failed checksum (total fails: ${total})`),
//       onError:      (e) => {
//         console.error('[SoundDrop] receiver error:', e);
//         setTimeout(() => {
//           if (quietReady) startEar(activePinRef.current);
//         }, 1500);
//       },
//     });
//   }

//   function handleReceive(payload) {
//     setWaveState('receiving');
//     setTimeout(() => setWaveState('idle'), 2000);
//     const item = { ...payload, receivedAt: Date.now() };
//     setReceived(item);
//     setHistory(prev => [item, ...prev].slice(0, 20));
//     toast(payload.type === 'hotspot' ? `Hotspot: ${payload.ssid}` : 'Received!', 'success');
//     fetch('/api/stats', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ type: 'sound', subtype: payload.type, bytes: JSON.stringify(payload).length }),
//     }).catch(() => {});
//   }

//   function unlockPIN() {
//     const entered = pinInput.join('');
//     if (entered.length < 4) { toast('Enter all 4 digits', 'error'); return; }
//     setPinUnlocked(true);
//     setCountdown(60);
//     toast('PIN accepted — ear unlocked for 60s', 'success');
//     stopListening();
//     setTimeout(() => startEar(entered), 100);
//     clearInterval(countRef.current);
//     countRef.current = setInterval(() => {
//       setCountdown(prev => {
//         if (prev <= 1) {
//           clearInterval(countRef.current);
//           setPinUnlocked(false);
//           setPinInput(['', '', '', '']);
//           stopListening();
//           setTimeout(() => startEar('0000'), 100);
//           toast('PIN expired', 'info');
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   }

//   function handlePinKey(i, val) {
//     if (!/^\d?$/.test(val)) return;
//     const next = [...pinInput];
//     next[i] = val;
//     setPinInput(next);
//     if (val && i < 3) inputRefs[i + 1].current?.focus();
//   }

//   function handleKeyDown(i, e) {
//     if (e.key === 'Backspace' && !pinInput[i] && i > 0) inputRefs[i - 1].current?.focus();
//     if (e.key === 'Enter') unlockPIN();
//   }

//   function copy(text) {
//     navigator.clipboard.writeText(text).then(() => toast('Copied!', 'success'));
//   }

//   function renderPayload(item) {
//     if (item.type === 'hotspot') return (
//       <div className={styles.hotspotCard}>
//         <div className={styles.hotspotLabel}>📶 Hotspot Credentials</div>
//         {[['SSID', item.ssid], ['Password', item.pw]].map(([k, v]) => (
//           <div key={k} className={styles.credRow}>
//             <span className={styles.credKey}>{k}</span>
//             <span className={styles.credVal}>{v}</span>
//             <button className={styles.copyBtn} onClick={() => copy(v)}>Copy</button>
//           </div>
//         ))}
//         <a className={styles.dropzoneLink} href={`https://${item.ip}:${item.port}/dropzone`} target="_blank" rel="noreferrer">
//           Open DropZone →
//         </a>
//         <p className={styles.hotspotHint}>Join the hotspot above then tap Open DropZone.</p>
//       </div>
//     );

//     const isURL = item.type === 'url' || item.data?.startsWith('http');
//     return (
//       <div className={styles.textCard}>
//         <div className={styles.textLabel}>{isURL ? '🔗 URL' : '💬 Text'}</div>
//         <div className={styles.textContent}>{item.data}</div>
//         <div className={styles.textActions}>
//           <button className={styles.copyBtn} onClick={() => copy(item.data)}>Copy</button>
//           {isURL && <a className={styles.openBtn} href={item.data} target="_blank" rel="noreferrer">Open →</a>}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.page}>
//       <Nav />
//       <main className={styles.main}>
//         <div className={styles.header}>
//           <h1>👂 Receiver Ear</h1>
//           <p>Always listening. Only accepts tones signed with your PIN.</p>
//         </div>

//         {quietError && <div className={styles.errorBanner}>⚠️ {quietError}</div>}

//         <div className={styles.statusCard}>
//           <div className={styles.statusRow}>
//             <span className={`${styles.dot} ${listening ? styles.dotGreen : styles.dotGray}`} />
//             <span>
//               {!quietReady && !quietError ? 'Initialising audio engine…'
//                : listening
//                  ? pinUnlocked ? `Listening — PIN unlocked (${countdown}s)` : 'Listening — enter PIN to unlock'
//                  : 'Not listening'}
//             </span>
//           </div>
//           <Waveform state={waveState} />
//         </div>

//         {!pinUnlocked && (
//           <div className={styles.card}>
//             <div className={styles.cardLabel}>Enter PIN from sender</div>
//             <div className={styles.pinRow}>
//               {pinInput.map((d, i) => (
//                 <input
//                   key={i} ref={inputRefs[i]}
//                   className={styles.pinCell}
//                   maxLength={1} value={d} inputMode="numeric"
//                   onChange={e => handlePinKey(i, e.target.value)}
//                   onKeyDown={e => handleKeyDown(i, e)}
//                 />
//               ))}
//               <button className={styles.unlockBtn} onClick={unlockPIN}>Unlock</button>
//             </div>
//             <p className={styles.pinHint}>Without PIN only same-network tones accepted.</p>
//           </div>
//         )}

//         {pinUnlocked && (
//           <div className={styles.unlockedCard}>
//             <span>🔓 Unlocked — <strong>{countdown}s</strong> remaining</span>
//             <button className={styles.lockBtn} onClick={() => {
//               clearInterval(countRef.current);
//               setPinUnlocked(false); setPinInput(['', '', '', '']);
//               stopListening(); setTimeout(() => startEar('0000'), 100);
//             }}>Lock</button>
//           </div>
//         )}

//         {received && (
//           <div className={styles.section}>
//             <div className={styles.sectionLabel}>Latest</div>
//             {renderPayload(received)}
//           </div>
//         )}

//         {history.length > 1 && (
//           <div className={styles.section}>
//             <div className={styles.sectionLabel}>History</div>
//             <div className={styles.historyList}>
//               {history.slice(1).map((item, i) => (
//                 <div key={i} className={styles.historyItem}>
//                   <span>{item.type === 'hotspot' ? '📶' : item.type === 'url' ? '🔗' : '💬'}</span>
//                   <span className={styles.historyData}>
//                     {item.type === 'hotspot' ? item.ssid : item.data?.slice(0, 60)}
//                   </span>
//                   <button className={styles.copyBtn} onClick={() => copy(item.type === 'hotspot' ? item.pw : item.data)}>
//                     Copy
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {!received && quietReady && (
//           <div className={styles.emptyState}>
//             <span className={styles.emptyIcon}>📡</span>
//             <p>Waiting for a tone…</p>
//             <small>Open /sender on the other device, share the PIN, hit Send Tone.</small>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }

// export default function ReceiverPage() {
//   return <ToastProvider><ReceiverInner /></ToastProvider>;
// }




'use client';
import { useState, useEffect, useRef } from 'react';
import Nav from '@/components/Nav';
import Waveform from '@/components/Waveform';
import { ToastProvider, useToast } from '@/components/Toast';
import { startListening, stopListening } from '@/lib/sound';
import styles from './page.module.css';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s   = document.createElement('script');
    s.src     = src;
    s.async   = false;
    s.onload  = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function ReceiverInner() {
  const toast = useToast();
  const [quietReady, setQuietReady]   = useState(false);
  const [quietError, setQuietError]   = useState('');
  const [listening, setListening]     = useState(false);
  const [pinInput, setPinInput]       = useState(['', '', '', '']);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [activePIN, setActivePIN]     = useState('');   // PIN currently used by ear
  const [countdown, setCountdown]     = useState(0);
  const [waveState, setWaveState]     = useState('idle');
  const [received, setReceived]       = useState(null);
  const [history, setHistory]         = useState([]);
  const [failCount, setFailCount]     = useState(0);
  const countRef  = useRef(null);
  const initDone  = useRef(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  // ── Init Quiet.js ──────────────────────────────────────────────────────
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    async function initQuiet() {
      try {
        await loadScript('/quiet/quiet.js');
        if (!window.Quiet) throw new Error('window.Quiet not defined');
        window.Quiet.init({
          profilesPrefix:          '/quiet/',
          memoryInitializerPrefix: '/quiet/',
        });
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
    return () => { stopListening(); clearInterval(countRef.current); };
  }, []);

  // ── Start ear once Quiet is ready — no PIN yet, just waiting ──────────
  useEffect(() => {
    if (quietReady) startEar(null); // null = ear on but will reject any signed payload
  }, [quietReady]);

  // ── Start ear with given PIN ───────────────────────────────────────────
  function startEar(pin) {
    setListening(true);
    setWaveState('idle');
    setFailCount(0);
    console.log('[SoundDrop] starting ear with PIN:', pin);
    startListening({
      pin,
      onReceive:     handleReceive,
      onReceiveFail: (total) => setFailCount(total),
      onError:       (e) => {
        console.error('[SoundDrop] ear error:', e);
        setTimeout(() => { if (quietReady) startEar(pin); }, 1500);
      },
    });
  }

  // ── Handle received payload ────────────────────────────────────────────
  function handleReceive(payload) {
    setWaveState('receiving');
    setTimeout(() => setWaveState('idle'), 2000);
    const item = { ...payload, receivedAt: Date.now() };
    setReceived(item);
    setHistory(prev => [item, ...prev].slice(0, 20));
    setFailCount(0);
    toast(payload.type === 'hotspot' ? `Hotspot: ${payload.ssid}` : '✓ Received!', 'success');
    fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sound', subtype: payload.type, bytes: JSON.stringify(payload).length }),
    }).catch(() => {});
  }

  // ── Unlock PIN ─────────────────────────────────────────────────────────
  function unlockPIN() {
    const entered = pinInput.join('');
    if (entered.length < 4) { toast('Enter all 4 digits', 'error'); return; }

    setPinUnlocked(true);
    setActivePIN(entered);
    setCountdown(60);
    toast(`PIN ${entered} accepted — listening for 60s`, 'success');

    // Restart ear with the real PIN
    stopListening();
    setTimeout(() => startEar(entered), 100);

    // Countdown timer
    clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countRef.current);
          setPinUnlocked(false);
          setPinInput(['', '', '', '']);
          setActivePIN('');
          stopListening();
          setTimeout(() => startEar(null), 100);
          toast('PIN expired — ear locked', 'info');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handlePinKey(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...pinInput];
    next[i] = val;
    setPinInput(next);
    if (val && i < 3) inputRefs[i + 1].current?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !pinInput[i] && i > 0) inputRefs[i - 1].current?.focus();
    if (e.key === 'Enter') unlockPIN();
  }

  function copy(text) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!', 'success'));
  }

  function renderPayload(item) {
    if (item.type === 'hotspot') return (
      <div className={styles.hotspotCard}>
        <div className={styles.hotspotLabel}>📶 Hotspot Credentials</div>
        {[['SSID', item.ssid], ['Password', item.pw]].map(([k, v]) => (
          <div key={k} className={styles.credRow}>
            <span className={styles.credKey}>{k}</span>
            <span className={styles.credVal}>{v}</span>
            <button className={styles.copyBtn} onClick={() => copy(v)}>Copy</button>
          </div>
        ))}
        <a className={styles.dropzoneLink}
          href={`https://${item.ip}:${item.port}/dropzone`}
          target="_blank" rel="noreferrer">
          Open DropZone →
        </a>
        <p className={styles.hotspotHint}>Join hotspot above, then tap Open DropZone.</p>
      </div>
    );

    const isURL = item.type === 'url' || item.data?.startsWith('http');
    return (
      <div className={styles.textCard}>
        <div className={styles.textLabel}>{isURL ? '🔗 URL' : '💬 Text'}</div>
        <div className={styles.textContent}>{item.data}</div>
        <div className={styles.textActions}>
          <button className={styles.copyBtn} onClick={() => copy(item.data)}>Copy</button>
          {isURL && <a className={styles.openBtn} href={item.data} target="_blank" rel="noreferrer">Open →</a>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>👂 Receiver Ear</h1>
          <p>Always listening. Only accepts tones signed with your PIN.</p>
        </div>

        {quietError && <div className={styles.errorBanner}>⚠️ {quietError}</div>}

        {/* Status */}
        <div className={styles.statusCard}>
          <div className={styles.statusRow}>
            <span className={`${styles.dot} ${listening ? styles.dotGreen : styles.dotGray}`} />
            <span>
              {!quietReady && !quietError ? 'Initialising audio engine…'
               : pinUnlocked ? `🔓 Listening with PIN ${activePIN} — ${countdown}s left`
               : listening   ? 'Listening — enter PIN to unlock'
               : 'Not listening'}
            </span>
          </div>
          <Waveform state={waveState} />
          {failCount > 0 && (
            <div className={styles.failHint}>
              ⚠️ {failCount} frame(s) failed — move devices closer together
            </div>
          )}
        </div>

        {/* PIN entry */}
        {!pinUnlocked && (
          <div className={styles.card}>
            <div className={styles.cardLabel}>Enter PIN shown on sender</div>
            <div className={styles.pinRow}>
              {pinInput.map((d, i) => (
                <input
                  key={i} ref={inputRefs[i]}
                  className={styles.pinCell}
                  maxLength={1} value={d} inputMode="numeric"
                  onChange={e => handlePinKey(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                />
              ))}
              <button className={styles.unlockBtn} onClick={unlockPIN}>Unlock</button>
            </div>
            <p className={styles.pinHint}>
              The sender shows a 4-digit PIN. Enter it here so the ear accepts their tone.
            </p>
          </div>
        )}

        {/* Unlocked state */}
        {pinUnlocked && (
          <div className={styles.unlockedCard}>
            <span>🔓 PIN <strong>{activePIN}</strong> active — <strong>{countdown}s</strong> remaining</span>
            <button className={styles.lockBtn} onClick={() => {
              clearInterval(countRef.current);
              setPinUnlocked(false); setPinInput(['', '', '', '']); setActivePIN('');
              stopListening(); setTimeout(() => startEar(null), 100);
            }}>Lock</button>
          </div>
        )}

        {/* Latest received */}
        {received && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Latest received</div>
            {renderPayload(received)}
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>History</div>
            <div className={styles.historyList}>
              {history.slice(1).map((item, i) => (
                <div key={i} className={styles.historyItem}>
                  <span>{item.type === 'hotspot' ? '📶' : item.type === 'url' ? '🔗' : '💬'}</span>
                  <span className={styles.historyData}>
                    {item.type === 'hotspot' ? item.ssid : item.data?.slice(0, 60)}
                  </span>
                  <button className={styles.copyBtn}
                    onClick={() => copy(item.type === 'hotspot' ? item.pw : item.data)}>
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!received && quietReady && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📡</span>
            <p>Waiting for a tone…</p>
            <small>
              {pinUnlocked
                ? 'Sender can now transmit — tap Send Tone on the sender page.'
                : 'Enter the PIN from the sender page first, then tap Unlock.'}
            </small>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReceiverPage() {
  return <ToastProvider><ReceiverInner /></ToastProvider>;
}
