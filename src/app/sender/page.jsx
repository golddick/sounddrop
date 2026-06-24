'use client';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Nav from '@/components/Nav';
import Waveform from '@/components/Waveform';
import { ToastProvider, useToast } from '@/components/Toast';
import { buildTextPayload, buildHotspotPayload, transmit, generatePIN, payloadWarning } from '@/lib/sound';
import styles from './page.module.css';

function SenderInner() {
  const toast = useToast();
  const [quietReady, setQuietReady]   = useState(false);
  const [mode, setMode]               = useState('text'); // 'text' | 'hotspot'
  const [text, setText]               = useState('');
  const [ssid, setSsid]               = useState('');
  const [pw, setPw]                   = useState('');
  const [hotspotIP, setHotspotIP]     = useState('192.168.43.1');
  const [pin, setPin]                 = useState('');
  const [waveState, setWaveState]     = useState('idle');
  const [status, setStatus]           = useState('');
  const [warning, setWarning]         = useState('');
  const [sending, setSending]         = useState(false);

  // generate PIN on mount
  useEffect(() => { setPin(generatePIN()); }, []);

  // update warning as text changes
  useEffect(() => {
    if (mode === 'text' && text) {
      setWarning(payloadWarning(text) || '');
    } else {
      setWarning('');
    }
  }, [text, mode]);

  async function handleSend() {
    if (!quietReady) { toast('Quiet.js still loading — wait a moment', 'error'); return; }
    if (mode === 'text' && !text.trim()) { toast('Enter something to send', 'error'); return; }
    if (mode === 'hotspot' && (!ssid || !pw)) { toast('Enter SSID and password', 'error'); return; }

    let payload;
    try {
      if (mode === 'text') {
        payload = await buildTextPayload(text.trim(), pin);
      } else {
        payload = await buildHotspotPayload({ ssid, pw, ip: hotspotIP, port: 3000 }, pin);
      }
    } catch (e) {
      toast('Failed to build payload: ' + e.message, 'error');
      return;
    }

    setSending(true);
    setWaveState('active');
    setStatus('Transmitting…');

    transmit(payload, {
      onStart: () => setStatus('Playing ultrasonic tone…'),
      onDone:  () => {
        setWaveState('idle');
        setSending(false);
        setStatus('✓ Tone sent. Receiver should have decoded it.');
        toast('Tone sent!', 'success');
      },
      onError: (e) => {
        setWaveState('idle');
        setSending(false);
        setStatus('');
        toast('Error: ' + e, 'error');
      },
    });
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
          <h1>📢 Send via Sound</h1>
          <p>Transmit text, keys, or hotspot credentials as an inaudible ultrasonic tone. No WiFi needed.</p>
        </div>

        {/* PIN display */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Your PIN — share this with the receiver</div>
          <div className={styles.pinRow}>
            {pin.split('').map((d, i) => (
              <div key={i} className={styles.pinDigit}>{d}</div>
            ))}
            <button className={styles.regenBtn} onClick={() => setPin(generatePIN())} title="New PIN">↻</button>
          </div>
          <p className={styles.pinHint}>The receiver enters this PIN before listening. Keeps strangers out.</p>
        </div>

        {/* Mode tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === 'text' ? styles.tabActive : ''}`} onClick={() => setMode('text')}>
            💬 Text / Key / URL
          </button>
          <button className={`${styles.tab} ${mode === 'hotspot' ? styles.tabActive : ''}`} onClick={() => setMode('hotspot')}>
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
              placeholder={'API key, password, URL, any text…\n\nsk-ant-api03-...\nhttps://example.com\nmy secret note'}
              rows={6}
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
              <label className={styles.label}>Phone IP (on hotspot)</label>
              <input className={styles.input} value={hotspotIP} onChange={e => setHotspotIP(e.target.value)} placeholder="192.168.43.1" />
              <small className={styles.hint}>Android default: 192.168.43.1 — iPhone default: 172.20.10.1</small>
            </div>
          </div>
        )}

        {/* Waveform + send */}
        <div className={styles.sendArea}>
          <Waveform state={waveState} />
          {status && <p className={styles.statusText}>{status}</p>}
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={sending || !quietReady}
          >
            {sending ? 'Transmitting…' : quietReady ? '📢 Send Tone' : 'Loading…'}
          </button>
        </div>

        <div className={styles.helpCard}>
          <strong>How to receive:</strong>
          <ol className={styles.helpList}>
            <li>Open <code>/receiver</code> on the other device.</li>
            <li>Enter your PIN: <strong>{pin}</strong></li>
            <li>Hit "Start Listening" — then press Send above.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}

export default function SenderPage() {
  return <ToastProvider><SenderInner /></ToastProvider>;
}
