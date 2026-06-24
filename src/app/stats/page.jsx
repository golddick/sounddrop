'use client';
import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';
import styles from './page.module.css';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.accent : ''}`}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.barRow}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.barVal}>{value.toLocaleString()}</div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function load() {
    try {
      const r = await fetch('/api/stats');
      const d = await r.json();
      setStats(d);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000); // auto-refresh every 10s
    return () => clearInterval(iv);
  }, []);

  function timeSince(iso) {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0)  return `${d}d ago`;
    if (h > 0)  return `${h}h ago`;
    if (m > 0)  return `${m}m ago`;
    return 'Just now';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const byType = stats?.byType || {};
  const maxType = Math.max(...Object.values(byType), 1);

  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>📊 Stats</h1>
            <p>Transfer activity since {formatDate(stats?.startedAt)}</p>
          </div>
          <button className={styles.refreshBtn} onClick={load}>
            ↻ Refresh
          </button>
        </div>

        {loading && <div className={styles.loading}>Loading stats…</div>}

        {!loading && stats && (
          <>
            {/* Top stats grid */}
            <div className={styles.grid}>
              <StatCard
                label="Total Transfers"
                value={stats.totalTransfers.toLocaleString()}
                sub="all modes combined"
                accent
              />
              <StatCard
                label="Sound Transfers"
                value={stats.soundTransfers.toLocaleString()}
                sub={stats.totalBytesSound > 0 ? stats.totalBytesSoundFmt + ' encoded' : 'Mode 1'}
              />
              <StatCard
                label="File Transfers"
                value={stats.fileTransfers.toLocaleString()}
                sub={stats.totalBytesFiles > 0 ? stats.totalBytesFilesFmt + ' moved' : 'Mode 2'}
              />
              <StatCard
                label="Hotspot Handshakes"
                value={stats.hotspotHandshakes.toLocaleString()}
                sub="DropZone sessions"
              />
            </div>

            {/* Total data */}
            <div className={styles.card}>
              <div className={styles.cardLabel}>Total Data Transferred</div>
              <div className={styles.bigNum}>{stats.totalBytesFmt}</div>
              <div className={styles.dataSplit}>
                <span>📢 Sound: <strong>{stats.totalBytesSoundFmt}</strong></span>
                <span>📁 Files: <strong>{stats.totalBytesFilesFmt}</strong></span>
              </div>
            </div>

            {/* By type breakdown */}
            <div className={styles.card}>
              <div className={styles.cardLabel}>Transfers by type</div>
              <div className={styles.bars}>
                <Bar label="📁 File"    value={byType.file    || 0} max={maxType} color="var(--blue)"  />
                <Bar label="💬 Text"    value={byType.text    || 0} max={maxType} color="var(--brand)" />
                <Bar label="🔗 URL"     value={byType.url     || 0} max={maxType} color="var(--green)" />
                <Bar label="📶 Hotspot" value={byType.hotspot || 0} max={maxType} color="var(--yellow)"/>
                <Bar label="📄 JSON"    value={byType.json    || 0} max={maxType} color="#a855f7"      />
              </div>
            </div>

            {/* Activity */}
            <div className={styles.card}>
              <div className={styles.cardLabel}>Activity</div>
              <div className={styles.activityRow}>
                <div className={styles.activityItem}>
                  <span className={styles.activityLabel}>Last transfer</span>
                  <span className={styles.activityVal}>{timeSince(stats.lastTransferAt)}</span>
                </div>
                <div className={styles.activityItem}>
                  <span className={styles.activityLabel}>Running since</span>
                  <span className={styles.activityVal}>{formatDate(stats.startedAt)}</span>
                </div>
                <div className={styles.activityItem}>
                  <span className={styles.activityLabel}>Last refreshed</span>
                  <span className={styles.activityVal}>{lastRefresh ? lastRefresh.toLocaleTimeString() : '—'}</span>
                </div>
              </div>
            </div>

            {/* Zero state hint */}
            {stats.totalTransfers === 0 && (
              <div className={styles.zeroState}>
                <span>📡</span>
                <p>No transfers yet. Start sending!</p>
                <small>Stats update in real time as you use SoundDrop.</small>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
