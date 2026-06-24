import styles from './Waveform.module.css';

// state: 'idle' | 'active' | 'receiving'
export default function Waveform({ state = 'idle', bars = 9 }) {
  return (
    <div className={`${styles.waveform} ${styles[state]}`} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className={styles.bar} style={{ '--i': i }} />
      ))}
    </div>
  );
}
