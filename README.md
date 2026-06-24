# 🔊 SoundDrop — Production Guide

## Prerequisites

- Git
- A [Railway](https://railway.app) account (free tier works)
- A GitHub account

---

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial"
gh repo create sounddrop --public --push --source=.
```

Or create the repo manually on GitHub and then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/sounddrop.git
git push -u origin main
```

---

## 2. Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → pick `sounddrop`
3. Railway detects `railway.json` and runs automatically:
   - Build: `pnpm install && node scripts/setup.js && pnpm build`
   - Start: `node server.js`

First deploy takes ~3 minutes. Subsequent deploys on `git push` take ~90 seconds.

---

## 3. Add a Volume (persistent stats)

Without a volume, stats reset on every redeploy.

1. Inside your Railway project → **+ Add** → **Volume**
2. Set mount path: `/data`
3. Go to **Variables** tab → **+ New Variable**:
   - `RAILWAY_VOLUME_MOUNT_PATH` = `/data`

---

## 4. Get your public URL

Railway → **Settings** → **Networking** → **Generate Domain**

You get a free `yourapp.railway.app` URL with real HTTPS — no cert warnings on any device.

To use a custom domain (e.g. `sounddrop.yourdomain.com`):

1. Railway → Settings → Networking → **Custom Domain** → enter your domain
2. At your DNS provider add a `CNAME` record:
   - Name: `sounddrop`
   - Value: the Railway-provided target (shown after adding the domain)
3. Railway provisions a Let's Encrypt cert automatically within ~60 seconds

---

## 5. Environment variables

Set these in Railway → **Variables**:

| Variable | Value | Required |
|---|---|---|
| `RAILWAY_VOLUME_MOUNT_PATH` | `/data` | Yes — for persistent stats |
| `NODE_ENV` | `production` | Auto-set by Railway |
| `PORT` | _(leave unset)_ | Auto-injected by Railway |

---

## 6. Redeploy

Every `git push origin main` triggers an automatic redeploy. To trigger manually:

Railway dashboard → **Deployments** → **Redeploy**

---

## 7. Updating Quiet.js

`scripts/setup.js` runs as part of every build so Quiet.js files are always downloaded fresh on Railway. You don't need to commit them to git.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Home |
| `/sender` | Send text, keys, URLs via ultrasonic tone |
| `/receiver` | Always-on ear — receives tones |
| `/dropzone` | Bidirectional file transfer |
| `/stats` | Transfer counter dashboard |

---

## Monitoring

Railway provides built-in logs:

- **Runtime logs:** Railway dashboard → your service → **Logs** tab
- **Deploy logs:** Railway dashboard → **Deployments** → click any deploy

Stats are at `https://yourapp.railway.app/stats` — shows total transfers, bytes moved, breakdown by type.

---

## Rollback

Railway dashboard → **Deployments** → click any previous deploy → **Rollback**

---

## Tear down

Railway dashboard → project settings → **Delete Project**

This deletes the service and the volume. Download your stats file first if you want to keep it:

```bash
# If you have Railway CLI installed
railway run cat /data/sounddrop-stats.json > stats-backup.json
```

---

## Railway CLI (optional but useful)

```bash
npm i -g @railway/cli
railway login
railway link          # link this folder to your Railway project
railway logs          # tail live logs
railway run node -e "console.log(process.env.PORT)"  # inspect env
railway up            # deploy from local without git push
```