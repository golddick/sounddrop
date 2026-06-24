import Link from 'next/link';
import Nav from '@/components/Nav';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.heroIcon}>🔊</div>
          <h1 className={styles.heroTitle}>SoundDrop</h1>
          <p className={styles.heroSub}>
            Zero-setup wireless transfer. Ultrasonic sound for text &amp; keys.
            Hotspot DropZone for files. No installs. No accounts. No internet.
          </p>
        </div>

        <div className={styles.modeGrid}>
          <Link href="/sender" className={styles.modeCard}>
            <span className={styles.modeIcon}>📢</span>
            <h2 className={styles.modeName}>Send via Sound</h2>
            <p className={styles.modeDesc}>
              Text, keys, URLs, passwords. No WiFi needed. Inaudible ultrasonic tone.
            </p>
            <span className={styles.modeBadge}>Mode 1 — No WiFi</span>
          </Link>

          <Link href="/dropzone" className={styles.modeCard}>
            <span className={styles.modeIcon}>📁</span>
            <h2 className={styles.modeName}>DropZone</h2>
            <p className={styles.modeDesc}>
              Any file up to 4 GB. Phone hotspot + browser upload. Full WiFi speed.
            </p>
            <span className={`${styles.modeBadge} ${styles.blue}`}>Mode 2 — Hotspot</span>
          </Link>
        </div>

        <div className={styles.howCard}>
          <h3 className={styles.howTitle}>How it works</h3>
          <ol className={styles.steps}>
            <li><strong>Open this page on both devices</strong> — phone and laptop, same URL.</li>
            <li><strong>Sender</strong> picks a mode, enters content or picks a file.</li>
            <li><strong>Sound mode:</strong> phone plays an inaudible tone → laptop decodes it instantly.</li>
            <li><strong>DropZone mode:</strong> ultrasonic handshake passes hotspot creds → laptop joins → full speed transfer.</li>
            <li><strong>Done.</strong> No account. No cable. No app.</li>
          </ol>
        </div>

        <div className={styles.trustCard}>
          <span className={styles.trustIcon}>🔒</span>
          <div>
            <h3>PIN-secured ear</h3>
            <p>The receiver listens always-on but only accepts tones signed with a shared PIN. Strangers in the same room cannot inject data into your device.</p>
          </div>
        </div>

        <div className={styles.links}>
          <Link href="/receiver" className={styles.linkBtn}>
            👂 Open Receiver Ear
          </Link>
        </div>
      </main>
    </div>
  );
}
