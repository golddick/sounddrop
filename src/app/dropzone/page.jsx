'use client';
import { useState, useEffect, useRef } from 'react';
import Nav from '@/components/Nav';
import { ToastProvider, useToast } from '@/components/Toast';
import styles from './page.module.css';

function formatBytes(b) {
  if (!b) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k,i)).toFixed(1)} ${s[i]}`;
}

function fileIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase();
  const map = { pdf:'📄',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',mp4:'🎬',mov:'🎬',mkv:'🎬',mp3:'🎵',wav:'🎵',zip:'📦',rar:'📦','7z':'📦',apk:'📱',exe:'💻',dmg:'💻',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',txt:'📃',json:'📃',js:'📃',ts:'📃' };
  return map[ext] || '📁';
}

// ── Upload tab ─────────────────────────────────────────────────────────────
function UploadTab() {
  const toast = useToast();
  const [files, setFiles]     = useState([]);
  const [uploads, setUploads] = useState({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const wsRef    = useRef();

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/api/ws`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'upload_complete') {
        msg.files.forEach(f => {
          setUploads(prev => ({ ...prev, [f.saved]: { pct: 100, done: true, name: f.name } }));
        });
        toast(`Received ${msg.files.length} file(s)`, 'success');
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  function addFiles(incoming) {
    setFiles(prev => [...prev, ...Array.from(incoming)]);
  }

  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      const key = `${Date.now()}-${file.name}`;
      setUploads(prev => ({ ...prev, [key]: { pct: 0, done: false, name: file.name } }));
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-stream');
      xhr.setRequestHeader('x-filename', file.name);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploads(prev => ({ ...prev, [key]: { pct: Math.round((e.loaded/e.total)*100), done: false, name: file.name } }));
        }
      };
      xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(xhr.statusText));
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(file);
    });
  }

  async function uploadAll() {
    if (!files.length) { toast('Pick files first', 'error'); return; }
    for (const file of files) {
      try { await uploadFile(file); }
      catch(e) { toast(`Failed: ${file.name}`, 'error'); }
    }
    setFiles([]);
  }

  return (
    <div className={styles.tabContent}>
      <div
        className={`${styles.dropZone} ${dragging ? styles.dragOver : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      >
        <span className={styles.dropIcon}>📂</span>
        <p>Tap to pick files or drag &amp; drop</p>
        <small>Any file type · Up to 4 GB</small>
        <input ref={inputRef} type="file" multiple hidden onChange={e => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          <div className={styles.fileListHeader}>
            <span>{files.length} file{files.length > 1 ? 's' : ''} queued</span>
            <button className={styles.clearBtn} onClick={() => setFiles([])}>Clear</button>
          </div>
          {files.map((f, i) => (
            <div key={i} className={styles.fileItem}>
              <span className={styles.fileIconEl}>{fileIcon(f.name)}</span>
              <div className={styles.fileMeta}>
                <div className={styles.fileName}>{f.name}</div>
                <div className={styles.fileSize}>{formatBytes(f.size)}</div>
              </div>
              <button className={styles.removeBtn} onClick={() => setFiles(p => p.filter((_,idx)=>idx!==i))}>✕</button>
            </div>
          ))}
          <button className={styles.uploadBtn} onClick={uploadAll}>
            ⬆️ Upload {files.length} file{files.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {Object.keys(uploads).length > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.sectionLabel}>Progress</div>
          {Object.entries(uploads).map(([key, u]) => (
            <div key={key} className={styles.progressItem}>
              <div className={styles.progressHeader}>
                <span className={styles.progressName}>{u.name}</span>
                <span className={styles.progressPct}>{u.done ? '✓' : `${u.pct}%`}</span>
              </div>
              <div className={styles.progressBarWrap}>
                <div className={`${styles.progressBarFill} ${u.done ? styles.done : ''}`} style={{ width: `${u.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Download tab ───────────────────────────────────────────────────────────
function DownloadTab() {
  const toast = useToast();
  const [shareFiles, setShareFiles] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/share');
      const d = await r.json();
      setShareFiles(d.files || []);
    } catch { toast('Could not load share folder', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;

  if (!shareFiles.length) return (
    <div className={styles.emptyShare}>
      <span>📭</span>
      <p>No files in share folder</p>
      <small>On your laptop drop files into <code>~/Downloads/SoundDrop/share/</code></small>
      <button className={styles.refreshBtn} onClick={load}>Refresh</button>
    </div>
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.fileListHeader}>
        <span>{shareFiles.length} file{shareFiles.length > 1 ? 's' : ''} available</span>
        <button className={styles.clearBtn} onClick={load}>Refresh</button>
      </div>
      <div className={styles.fileList}>
        {shareFiles.map((f, i) => (
          <div key={i} className={styles.fileItem}>
            <span className={styles.fileIconEl}>{fileIcon(f.name)}</span>
            <div className={styles.fileMeta}>
              <div className={styles.fileName}>{f.name}</div>
              <div className={styles.fileSize}>{formatBytes(f.size)}</div>
            </div>
            <a className={styles.downloadBtn} href={`/api/share/${f.name}`} download={f.name}>⬇️</a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main DropZone page ─────────────────────────────────────────────────────
function DropZoneInner() {
  const [tab, setTab]         = useState('upload');
  const [qr, setQr]           = useState(null);
  const [info, setInfo]       = useState(null);
  const [sameNetwork, setSameNetwork] = useState(null); // null=checking, true, false

  useEffect(() => {
    fetch('/api/qr').then(r => r.json()).then(setQr);
    fetch('/api/info').then(r => r.json()).then(d => {
      setInfo(d);
      detectNetwork(d);
    });
  }, []);

  // Detect if phone is already on same network as server
  async function detectNetwork(d) {
    try {
      // If we can reach /api/info it means we're already on the right network
      // Check if our host matches the server IP
      const currentHost = location.hostname;
      const serverIP    = d.ip;
      // If browser's host equals server IP → same network, no hotspot needed
      // If browser is on localhost → same machine
      // If on Railway (no IP match) → cloud mode
      if (currentHost === serverIP || currentHost === 'localhost' || d.isRailway) {
        setSameNetwork(true);
      } else {
        // Still reachable but via different IP — could be router NAT etc
        setSameNetwork(true); // reachable = same network
      }
    } catch {
      setSameNetwork(false);
    }
  }

  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>📁 DropZone</h1>
          <p>Transfer any file between devices. Bidirectional.</p>
        </div>

        {/* Network status banner */}
        {sameNetwork === true && (
          <div className={styles.networkBanner}>
            <span className={styles.networkDot} />
            <span>Same network detected — no hotspot needed. Transfer directly.</span>
          </div>
        )}
        {sameNetwork === false && (
          <div className={styles.networkBannerWarn}>
            <span>⚠️ Not on same network. Use <a href="/sender">📢 Sender</a> to beam hotspot credentials first.</span>
          </div>
        )}

        {/* QR */}
        {qr && (
          <div className={styles.qrCard}>
            <img src={qr.qr} alt="QR" className={styles.qrImg} />
            <div className={styles.qrInfo}>
              <div className={styles.qrLabel}>Scan to open on phone</div>
              <code className={styles.qrUrl}>{qr.url}</code>
              {info && <small className={styles.saveDir}>Saves to: {info.outputDir}</small>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab==='upload' ? styles.tabActive : ''}`} onClick={() => setTab('upload')}>
            ⬆️ Phone → Laptop
          </button>
          <button className={`${styles.tab} ${tab==='download' ? styles.tabActive : ''}`} onClick={() => setTab('download')}>
            ⬇️ Laptop → Phone
          </button>
        </div>

        {tab === 'upload'   && <UploadTab />}
        {tab === 'download' && <DownloadTab />}

        {/* Hotspot info — only show if needed */}
        {sameNetwork === false && (
          <div className={styles.hotspotHint}>
            <strong>Need to connect first?</strong>
            <ol>
              <li>Enable hotspot on your phone</li>
              <li>Open <a href="/sender">/sender</a> on your phone → Hotspot Creds tab</li>
              <li>Open <a href="/receiver">/receiver</a> on your laptop → enter PIN → Unlock</li>
              <li>Send the tone — laptop gets your hotspot credentials automatically</li>
              <li>Connect laptop to hotspot, come back here</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DropZonePage() {
  return <ToastProvider><DropZoneInner /></ToastProvider>;
}



// 'use client';
// import { useState, useEffect, useRef } from 'react';
// import Nav from '@/components/Nav';
// import { ToastProvider, useToast } from '@/components/Toast';
// import styles from './page.module.css';

// function formatBytes(b) {
//   if (!b) return '0 B';
//   const k = 1024, s = ['B','KB','MB','GB'];
//   const i = Math.floor(Math.log(b) / Math.log(k));
//   return `${(b / Math.pow(k,i)).toFixed(1)} ${s[i]}`;
// }

// function fileIcon(name) {
//   const ext = name?.split('.').pop()?.toLowerCase();
//   const map = { pdf:'📄', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', webp:'🖼️', mp4:'🎬', mov:'🎬', mkv:'🎬', mp3:'🎵', wav:'🎵', zip:'📦', rar:'📦', '7z':'📦', apk:'📱', exe:'💻', dmg:'💻', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊', ppt:'📊', pptx:'📊', txt:'📃', json:'📃', js:'📃', ts:'📃' };
//   return map[ext] || '📁';
// }

// function UploadTab() {
//   const toast = useToast();
//   const [files, setFiles]       = useState([]);
//   const [uploads, setUploads]   = useState({}); // filename → {pct, speed, done}
//   const [dragging, setDragging] = useState(false);
//   const inputRef = useRef();
//   const wsRef    = useRef();

//   useEffect(() => {
//     const proto = location.protocol === 'https:' ? 'wss' : 'ws';
//     const ws = new WebSocket(`${proto}://${location.host}/api/ws`);
//     ws.onmessage = (e) => {
//       const msg = JSON.parse(e.data);
//       if (msg.type === 'upload_progress') {
//         setUploads(prev => ({ ...prev, [msg.filename]: { pct: msg.pct, speed: msg.speed, done: false } }));
//       }
//       if (msg.type === 'upload_complete') {
//         msg.files.forEach(f => {
//           setUploads(prev => ({ ...prev, [f.saved]: { pct: 100, done: true } }));
//         });
//         toast(`Received ${msg.files.length} file(s)`, 'success');
//       }
//     };
//     wsRef.current = ws;
//     return () => ws.close();
//   }, []);

//   function addFiles(incoming) {
//     setFiles(prev => [...prev, ...Array.from(incoming)]);
//   }

//   function removeFile(i) {
//     setFiles(prev => prev.filter((_, idx) => idx !== i));
//   }

//   async function uploadAll() {
//     if (!files.length) { toast('Pick files first', 'error'); return; }
//     for (const file of files) {
//       const key = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._\-\s]/g,'_')}`;
//       setUploads(prev => ({ ...prev, [key]: { pct: 0, speed: 0, done: false } }));
//       try {
//         await uploadFile(file, key);
//       } catch(e) {
//         toast(`Failed: ${file.name}`, 'error');
//       }
//     }
//     setFiles([]);
//   }

//   function uploadFile(file, key) {
//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.open('POST', '/api/upload-stream');
//       xhr.setRequestHeader('x-filename', file.name);
//       xhr.upload.onprogress = (e) => {
//         if (e.lengthComputable) {
//           const pct = Math.round((e.loaded / e.total) * 100);
//           setUploads(prev => ({ ...prev, [key]: { pct, done: false } }));
//         }
//       };
//       xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(xhr.statusText));
//       xhr.onerror = () => reject(new Error('Network error'));
//       xhr.send(file);
//     });
//   }

//   return (
//     <div className={styles.tabContent}>
//       {/* Drop zone */}
//       <div
//         className={`${styles.dropZone} ${dragging ? styles.dragOver : ''}`}
//         onClick={() => inputRef.current?.click()}
//         onDragOver={e => { e.preventDefault(); setDragging(true); }}
//         onDragLeave={() => setDragging(false)}
//         onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
//       >
//         <span className={styles.dropIcon}>📂</span>
//         <p>Tap to pick files or drag &amp; drop</p>
//         <small>Any file type · Up to 4 GB</small>
//         <input ref={inputRef} type="file" multiple hidden onChange={e => addFiles(e.target.files)} />
//       </div>

//       {/* Queue */}
//       {files.length > 0 && (
//         <div className={styles.fileList}>
//           <div className={styles.fileListHeader}>
//             <span>{files.length} file{files.length > 1 ? 's' : ''} queued</span>
//             <button className={styles.clearBtn} onClick={() => setFiles([])}>Clear all</button>
//           </div>
//           {files.map((f, i) => (
//             <div key={i} className={styles.fileItem}>
//               <span className={styles.fileIconEl}>{fileIcon(f.name)}</span>
//               <div className={styles.fileMeta}>
//                 <div className={styles.fileName}>{f.name}</div>
//                 <div className={styles.fileSize}>{formatBytes(f.size)}</div>
//               </div>
//               <button className={styles.removeBtn} onClick={() => removeFile(i)}>✕</button>
//             </div>
//           ))}
//           <button className={styles.uploadBtn} onClick={uploadAll}>
//             ⬆️ Upload {files.length} file{files.length > 1 ? 's' : ''}
//           </button>
//         </div>
//       )}

//       {/* Progress */}
//       {Object.entries(uploads).length > 0 && (
//         <div className={styles.progressSection}>
//           <div className={styles.sectionLabel}>Transfer progress</div>
//           {Object.entries(uploads).map(([key, u]) => (
//             <div key={key} className={styles.progressItem}>
//               <div className={styles.progressHeader}>
//                 <span className={styles.progressName}>{key.replace(/^\d+-/, '')}</span>
//                 <span className={styles.progressPct}>{u.done ? '✓' : `${u.pct}%`}</span>
//               </div>
//               <div className={styles.progressBarWrap}>
//                 <div className={`${styles.progressBarFill} ${u.done ? styles.done : ''}`} style={{ width: `${u.pct}%` }} />
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function DownloadTab() {
//   const toast = useToast();
//   const [shareFiles, setShareFiles] = useState([]);
//   const [loading, setLoading]       = useState(true);

//   useEffect(() => { loadShare(); }, []);

//   async function loadShare() {
//     setLoading(true);
//     try {
//       const r = await fetch('/api/share');
//       const d = await r.json();
//       setShareFiles(d.files || []);
//     } catch { toast('Could not load share folder', 'error'); }
//     finally { setLoading(false); }
//   }

//   if (loading) return <div className={styles.loading}>Loading share folder…</div>;

//   if (!shareFiles.length) return (
//     <div className={styles.emptyShare}>
//       <span className={styles.emptyIcon}>📭</span>
//       <p>No files in share folder yet</p>
//       <small>On your laptop, drop files into <code>~/Downloads/SoundDrop/share/</code> — they appear here instantly.</small>
//       <button className={styles.refreshBtn} onClick={loadShare}>Refresh</button>
//     </div>
//   );

//   return (
//     <div className={styles.tabContent}>
//       <div className={styles.fileListHeader}>
//         <span>{shareFiles.length} file{shareFiles.length > 1 ? 's' : ''} available</span>
//         <button className={styles.clearBtn} onClick={loadShare}>Refresh</button>
//       </div>
//       <div className={styles.fileList}>
//         {shareFiles.map((f, i) => (
//           <div key={i} className={styles.fileItem}>
//             <span className={styles.fileIconEl}>{fileIcon(f.name)}</span>
//             <div className={styles.fileMeta}>
//               <div className={styles.fileName}>{f.name}</div>
//               <div className={styles.fileSize}>{formatBytes(f.size)}</div>
//             </div>
//             <a className={styles.downloadBtn} href={`/share/${f.name}`} download={f.name}>⬇️</a>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function DropZoneInner() {
//   const [tab, setTab]     = useState('upload');
//   const [qr, setQr]       = useState(null);
//   const [info, setInfo]   = useState(null);

//   useEffect(() => {
//     fetch('/api/qr').then(r => r.json()).then(d => setQr(d));
//     fetch('/api/info').then(r => r.json()).then(d => setInfo(d));
//   }, []);

//   return (
//     <div className={styles.page}>
//       <Nav />
//       <main className={styles.main}>
//         <div className={styles.header}>
//           <h1>📁 DropZone</h1>
//           <p>Transfer any file between phone and laptop over hotspot WiFi. Bidirectional.</p>
//         </div>

//         {/* QR + info */}
//         {qr && (
//           <div className={styles.qrCard}>
//             <img src={qr.qr} alt="QR code" className={styles.qrImg} />
//             <div className={styles.qrInfo}>
//               <div className={styles.qrLabel}>Scan to open on phone</div>
//               <code className={styles.qrUrl}>{qr.url}</code>
//               {info && <small className={styles.saveDir}>Files saved to: {info.outputDir}</small>}
//             </div>
//           </div>
//         )}

//         {/* Tabs */}
//         <div className={styles.tabs}>
//           <button className={`${styles.tab} ${tab === 'upload' ? styles.tabActive : ''}`} onClick={() => setTab('upload')}>
//             ⬆️ Phone → Laptop
//           </button>
//           <button className={`${styles.tab} ${tab === 'download' ? styles.tabActive : ''}`} onClick={() => setTab('download')}>
//             ⬇️ Laptop → Phone
//           </button>
//         </div>

//         {tab === 'upload'   && <UploadTab />}
//         {tab === 'download' && <DownloadTab />}
//       </main>
//     </div>
//   );
// }

// export default function DropZonePage() {
//   return <ToastProvider><DropZoneInner /></ToastProvider>;
// }
