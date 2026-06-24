'use client';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Nav from '@/components/Nav';
import Waveform from '@/components/Waveform';
import { ToastProvider, useToast } from '@/components/Toast';
import { startListening, stopListening } from '@/lib/sound';
import styles from './page.module.css';

function ReceiverInner() {
  const toast = useToast();
  const [quietReady, setQuietReady]     = useState(false);
  const [listening, setListening]       = useState(false);
  const [pin, setPin]                   = useState('');
  const [pinInput, setPinInput]         = useState(['', '', '', '']);
  const [pinUnlocked, setPinUnlocked]   = useState(false);
  const [countdown, setCountdown]       = useState(0);
  const [waveState, setWaveState]       = useState('idle');
  const [received, setReceived]         = useState(null); // last decoded payload
  const [history, setHistory]           = useState([]);
  const countRef   = useRef(null);
  const inputRefs  = [useRef(), useRef(), useRef(), useRef()];

  // On quiet ready, auto-start passive listening
  useEffect(() => {
    if (quietReady && !listening) startEar();
    return () => { stopListening(); clearInterval(countRef.current); };
  }, [quietReady]);

  function startEar() {
    const activePin = pinUnlocked ? pinInput.join('') : '0000';
    setListening(true);
    setWaveState('idle');
    startListening({
      pin: activePin,
      onReceive: handleReceive,
      onError: (e) => {
        // restart on error - keep ear always on
        setTimeout(() => { if (quietReady) startEar(); }, 1000);
      },
    });
  }

  function handleReceive(payload) {
    setWaveState('receiving');
    setTimeout(() => setWaveState('idle'), 2000);

    const item = { ...payload, receivedAt: Date.now() };
    setReceived(item);
    setHistory(prev => [item, ...prev].slice(0, 20));
    toast('Received!', 'success');

    // If it's hotspot creds, show prominently
    if (payload.type === 'hotspot') {
      toast(`Hotspot: ${payload.ssid}`, 'info', 8000);
    }
  }

  function unlockPIN() {
    const entered = pinInput.join('');
    if (entered.length < 4) { toast('Enter all 4 digits', 'error'); return; }
    setPinUnlocked(true);
    setCountdown(60);
    toast('PIN accepted — ear unlocked for 60s', 'success');

    // restart listener with new PIN
    stopListening();
    setTimeout(() => startEar(), 100);

    // countdown
    clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countRef.current);
          setPinUnlocked(false);
          setPinInput(['', '', '', '']);
          // restart with default pin
          stopListening();
          setTimeout(() => startEar(), 100);
          toast('PIN expired — ear locked again', 'info');
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

  function handlePinBackspace(i, e) {
    if (e.key === 'Backspace' && !pinInput[i] && i > 0) inputRefs[i - 1].current?.focus();
    if (e.key === 'Enter') unlockPIN();
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!', 'success'));
  }

  function renderPayload(item) {
    if (item.type === 'hotspot') {
      return (
        <div className={styles.hotspotCard}>
          <div className={styles.hotspotLabel}>📶 Hotspot Credentials</div>
          <div className={styles.credRow}>
            <span className={styles.credKey}>SSID</span>
            <span className={styles.credVal}>{item.ssid}</span>
            <button className={styles.copyBtn} onClick={() => copyToClipboard(item.ssid)}>Copy</button>
          </div>
          <div className={styles.credRow}>
            <span className={styles.credKey}>Password</span>
            <span className={styles.credVal}>{item.pw}</span>
            <button className={styles.copyBtn} onClick={() => copyToClipboard(item.pw)}>Copy</button>
          </div>
          <div className={styles.credRow}>
            <span className={styles.credKey}>DropZone URL</span>
            <a className={styles.credLink} href={`https://${item.ip}:${item.port}/dropzone`} target="_blank" rel="noreferrer">
              https://{item.ip}:{item.port}/dropzone
            </a>
          </div>
          <p className={styles.hotspotHint}>Join the hotspot above, then open the DropZone URL to transfer files.</p>
        </div>
      );
    }

    const isURL  = item.type === 'url' || (item.data && item.data.startsWith('http'));
    return (
      <div className={styles.textCard}>
        <div className={styles.textLabel}>
          {item.type === 'url' ? '🔗 URL received' : '💬 Text received'}
        </div>
        <div className={styles.textContent}>{item.data}</div>
        <div className={styles.textActions}>
          <button className={styles.copyBtn} onClick={() => copyToClipboard(item.data)}>Copy</button>
          {isURL && (
            <a className={styles.openBtn} href={item.data} target="_blank" rel="noreferrer">Open →</a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Nav />
      <Script
        src="/quiet/quiet.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.Quiet?.init({ profilesPrefix: '/quiet/', memoryInitializerPrefix: '/quiet/' });
          setQuietReady(true);
        }}
      />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>👂 Receiver Ear</h1>
          <p>Always listening for ultrasonic tones. Only accepts tones signed with your PIN.</p>
        </div>

        {/* Status bar */}
        <div className={styles.statusCard}>
          <div className={styles.statusRow}>
            <span className={`${styles.dot} ${listening ? styles.dotGreen : styles.dotGray}`} />
            <span>{listening ? (pinUnlocked ? `Listening — PIN unlocked (${countdown}s)` : 'Listening — waiting for PIN') : 'Initialising…'}</span>
          </div>
          <Waveform state={waveState} />
        </div>

        {/* PIN entry */}
        {!pinUnlocked && (
          <div className={styles.card}>
            <div className={styles.cardLabel}>Enter PIN from sender</div>
            <div className={styles.pinRow}>
              {pinInput.map((d, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  className={styles.pinCell}
                  maxLength={1}
                  value={d}
                  inputMode="numeric"
                  onChange={e => handlePinKey(i, e.target.value)}
                  onKeyDown={e => handlePinBackspace(i, e)}
                />
              ))}
              <button className={styles.unlockBtn} onClick={unlockPIN}>Unlock</button>
            </div>
            <p className={styles.pinHint}>Without a PIN the ear only accepts tones from devices on the same WiFi network.</p>
          </div>
        )}

        {/* Unlocked indicator */}
        {pinUnlocked && (
          <div className={styles.unlockedCard}>
            <span>🔓 Ear unlocked — accepting signed tones for <strong>{countdown}s</strong></span>
            <button className={styles.lockBtn} onClick={() => {
              clearInterval(countRef.current);
              setPinUnlocked(false);
              setPinInput(['', '', '', '']);
              stopListening();
              setTimeout(() => startEar(), 100);
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
                  <span className={styles.historyType}>{item.type === 'hotspot' ? '📶' : item.type === 'url' ? '🔗' : '💬'}</span>
                  <span className={styles.historyData}>{item.type === 'hotspot' ? item.ssid : item.data?.slice(0, 60)}</span>
                  <button className={styles.copyBtn} onClick={() => copyToClipboard(item.type === 'hotspot' ? item.pw : item.data)}>Copy</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!received && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📡</span>
            <p>Waiting for a tone…</p>
            <small>Open /sender on another device, enter PIN <strong>{pinInput.join('') || '????'}</strong>, and send a tone.</small>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReceiverPage() {
  return <ToastProvider><ReceiverInner /></ToastProvider>;
}
