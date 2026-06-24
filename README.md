# 🔊 SoundDrop

**Dual-mode wireless file and data transfer. No cables. No installs. No accounts. No internet.**

SoundDrop uses **ultrasonic sound waves** (18–22 kHz, inaudible to humans) to send small data like text, keys, URLs, and passwords directly between devices. For larger files, it bootstraps a **phone hotspot connection** via the same sound channel and transfers files at full WiFi speed through a browser-based DropZone.

Everything runs locally. Your data never leaves the room.

---

## How it works

### Mode 1 — Sound Transfer (No WiFi needed)
Send text, API keys, passwords, URLs, and small payloads directly as an ultrasonic tone.

```
Phone plays inaudible tone → Laptop mic decodes it → Content appears instantly
```

- Zero network required
- Bidirectional — either device can send or receive
- Secured by a 4-digit PIN (HMAC-SHA256 signed payloads)
- Receiver ear is always-on — no manual "start listening" needed
- Strangers in the same room cannot inject data (trust model rejects unsigned tones)

### Mode 2 — DropZone (Hotspot WiFi)
Transfer any file (photos, videos, APKs, ZIPs, documents) up to 4 GB.

```
Sound tone sends hotspot credentials → Laptop joins hotspot → Browser uploads at full WiFi speed
```

- Bidirectional — phone → laptop OR laptop → phone
- No file type restrictions
- Real-time progress bar
- Files saved to `~/Downloads/SoundDrop/` automatically

---

## Requirements

| Requirement | Details |
|---|---|
| **Node.js** | v18 or higher |
| **pnpm** | Any recent version (`npm i -g pnpm`) |
| **Browser (laptop)** | Chrome 90+ or Firefox 85+ |
| **Browser (phone)** | Chrome for Android / Chrome for iOS / Safari 15+ |
| **Microphone** | Both devices need a working mic for receive |

---

## Local Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Download Quiet.js (required for sound transfer)
```bash
node scripts/setup.js
```
Downloads 3 files into `public/quiet/` from jsDelivr CDN. Only needed once.

### 3. Start the dev server
```bash
pnpm dev
```

### 4. Accept the self-signed certificate

Open `https://localhost:3000` in your **laptop browser**. You will see a security warning — this is expected because SoundDrop generates a local self-signed cert (required for microphone access over HTTPS).

- **Chrome:** Advanced → Proceed to localhost (unsafe)
- **Firefox:** Advanced → Accept the Risk and Continue
- **Safari:** Show Details → visit this website

### 5. Open on your phone

Your phone must be on the **same WiFi network** as your laptop.

**If your phone can't reach the server:**

Run this in PowerShell as Administrator to open the firewall:
```powershell
New-NetFirewallRule -DisplayName "SoundDrop" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

Then find your laptop IP:
```bash
ipconfig   # Windows — look for IPv4 under your WiFi adapter
ifconfig   # Mac/Linux
```

Open `https://YOUR_LAPTOP_IP:3000` on your phone, or scan the QR code printed in the terminal. Accept the cert on your phone too (same steps as above).

---

## Usage

### Sending text / keys / URLs (Mode 1 — no WiFi needed)
1. Open `/sender` on the sending device
2. Note the 4-digit PIN shown on screen
3. Open `/receiver` on the receiving device, enter the PIN → tap **Unlock**
4. Back on sender: paste your content and tap **📢 Send Tone**
5. Content appears on receiver instantly

### Sending hotspot credentials (Mode 2 bootstrap)
1. Enable **mobile hotspot** on your phone
2. Open `/sender` → switch to **📶 Hotspot Creds** tab
3. Enter your hotspot SSID and password
4. Share PIN with receiver, unlock receiver ear
5. Tap **Send Tone** — laptop decodes credentials and displays them
6. Connect to the hotspot manually on laptop using the shown credentials
7. Receiver auto-redirects to DropZone once connected

### Transferring files — Phone → Laptop
1. Open `/dropzone` on your phone
2. Tap **⬆️ Phone → Laptop**
3. Pick files and tap Upload
4. Files appear in `~/Downloads/SoundDrop/`

### Transferring files — Laptop → Phone
1. Drop files into `~/Downloads/SoundDrop/share/`
2. Open `/dropzone` on your phone
3. Tap **⬇️ Laptop → Phone**
4. Tap any file to download

### Stats
Open `/stats` to see total transfers, bytes moved, breakdown by type, and last activity. Updates every 10 seconds automatically.

---

## Deploy to Railway (production)

Railway handles TLS at the edge so no self-signed cert warnings on any device — phones, laptops, everything just works over a real `https://` domain.

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/sounddrop.git
git push -u origin main
```

### 2. Create Railway project
- Go to [railway.app](https://railway.app)
- New Project → Deploy from GitHub repo → select `sounddrop`
- Railway reads `railway.json` automatically and runs the right build + start commands

### 3. Add a Volume (persistent stats)
- Inside your Railway project → **Add** → **Volume**
- Mount path: `/data`
- Go to **Variables** → add: `RAILWAY_VOLUME_MOUNT_PATH` = `/data`

Without the volume, stats reset on every redeploy. With it, they persist forever.

### 4. Get your public URL
- Railway → Settings → Networking → **Generate Domain**
- You get a free `yourapp.railway.app` URL
- Optionally add a custom domain in the same panel

### 5. Environment variables on Railway
Set these in Railway → Variables:

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Set automatically by Railway |
| `RAILWAY_VOLUME_MOUNT_PATH` | `/data` | Where stats file is saved |
| `PORT` | _(leave unset)_ | Railway injects this automatically |

### That's it
Railway auto-deploys on every `git push`. Build takes ~2 minutes. Your app is live at your `.railway.app` domain.

---

## Security model

| Context | Trust mechanism |
|---|---|
| Same WiFi / hotspot | Sender IP embedded in payload, subnet validated |
| No WiFi (offline) | 4-digit PIN used as HMAC-SHA256 signing key |
| Invalid / unsigned tone | Silently discarded — no notification shown |

The PIN is **never transmitted in the tone**. It is an out-of-band shared secret shown on screen and shared verbally. A malicious tone in a public space is silently ignored by all devices because it cannot be correctly signed without the active PIN.

---

## Project structure

```
sounddrop/
├── server.js                      # Custom HTTPS (local) / HTTP (Railway) + WebSocket server
├── next.config.js
├── railway.json                   # Railway build + start config
├── nixpacks.toml                  # Node 20 build config for Railway
├── jsconfig.json                  # @ alias → src/
├── scripts/
│   └── setup.js                   # Downloads Quiet.js assets into public/quiet/
├── public/
│   └── quiet/                     # Quiet.js files (downloaded by setup.js)
└── src/
    ├── app/
    │   ├── layout.jsx
    │   ├── page.jsx               # Home
    │   ├── globals.css
    │   ├── sender/                # Mode 1 — send tone
    │   ├── receiver/              # Always-on ear + PIN unlock
    │   ├── dropzone/              # Bidirectional file transfer
    │   ├── stats/                 # Transfer stats dashboard
    │   └── api/
    │       ├── info/              # Server IP + paths
    │       ├── qr/                # QR code PNG
    │       ├── upload/            # File upload (formData)
    │       ├── upload-stream/     # Streaming upload (XHR progress)
    │       ├── share/             # List + download share folder
    │       ├── received/          # List received files
    │       └── stats/             # GET stats / POST record transfer
    ├── components/
    │   ├── Nav.jsx
    │   ├── Waveform.jsx
    │   └── Toast.jsx
    └── lib/
        ├── sound.js               # Quiet.js encode/decode, PIN signing
        ├── stats.js               # JSON file stats — read/write/increment
        └── utils.js               # IP detection, paths, formatting
```

---

## Configuration

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `SOUNDDROP_OUTPUT` | `~/Downloads/SoundDrop` | Where received files are saved locally |
| `RAILWAY_VOLUME_MOUNT_PATH` | — | Set to `/data` on Railway for persistent stats |

---

## Troubleshooting

**"Quiet.js not loaded yet" when sending**
→ Run `node scripts/setup.js` to download Quiet.js files into `public/quiet/`.

**Microphone permission denied**
→ Must be on `https://` — the browser blocks mic on plain HTTP. Accept the self-signed cert first.

**Phone can't reach the server**
→ Phone must be on the same WiFi as your laptop. Open the Windows firewall port (`New-NetFirewallRule` command above). Navigate to `https://LAPTOP_IP:3000` directly — not localhost.

**Tone plays but receiver doesn't decode**
→ Devices must be within 1–3 metres. Check browser console for Quiet.js errors. The default profile is audible-7k (for dev visibility) — swap to `ultrasound` in `src/lib/sound.js` for production silent mode.

**iOS Safari doesn't decode tones**
→ iOS Safari has limited Web Audio API mic support. Use Chrome for iOS on the receiver side.

**Self-signed cert warning on phone**
→ Android Chrome: Advanced → Proceed. iOS Safari: Show Details → visit this website → confirm.

**Stats not persisting on Railway**
→ Make sure you added a Volume mounted at `/data` and set `RAILWAY_VOLUME_MOUNT_PATH=/data` in Railway Variables.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Sound encoding | Quiet.js (FSK/OFDM, browser-native) |
| Payload signing | Web Crypto API — HMAC-SHA256 |
| Audio capture | Web Audio API — getUserMedia |
| Transport | HTTPS locally / HTTP on Railway (TLS at edge) |
| WebSocket | ws — real-time upload progress |
| Stats | JSON file on filesystem / Railway Volume |
| QR code | qrcode npm package |
| Styling | CSS Modules + CSS variables |

---

## Roadmap

- [ ] True ultrasonic profile (18–22 kHz) — needs hardware testing across device models
- [ ] Auto WiFi join via OS bridge
- [ ] Broadcast mode — one tone, multiple receivers simultaneously
- [ ] Binary file encoding in Mode 1 for tiny files
- [ ] Passive FFT scan in Web Worker
- [ ] PWA install support

---

## License

MIT — build freely, send silently.