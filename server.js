'use strict';

const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer  } = require('http');
const { parse }         = require('url');
const next              = require('next');
const { WebSocketServer } = require('ws');
const fs                = require('fs');
const path              = require('path');
const os                = require('os');

const dev        = process.env.NODE_ENV !== 'production';
const port       = parseInt(process.env.PORT || '3000', 10);
const isRailway  = !!process.env.RAILWAY_ENVIRONMENT;

// ── Helpers ───────────────────────────────────────────────────────────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// ── Self-signed cert (local only — Railway uses its own TLS proxy) ─────────
function getCert() {
  const CERT_DIR  = path.join(__dirname, '.certs');
  const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
  const KEY_FILE  = path.join(CERT_DIR, 'key.pem');

  // Always regenerate to guarantee 2048-bit key
  if (fs.existsSync(CERT_FILE)) fs.unlinkSync(CERT_FILE);
  if (fs.existsSync(KEY_FILE))  fs.unlinkSync(KEY_FILE);
  if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

  const selfsigned = require('selfsigned');
  const ip         = getLocalIP();
  const pems       = selfsigned.generate(
    [{ name: 'commonName', value: 'SoundDrop' }],
    {
      keySize:   2048,
      days:      825,
      algorithm: 'sha256',
      extensions: [{
        name: 'subjectAltName',
        altNames: [
          { type: 7, ip },
          { type: 7, ip: '127.0.0.1' },
          { type: 2, value: 'localhost' },
        ],
      }],
    }
  );

  fs.writeFileSync(CERT_FILE, pems.cert);
  fs.writeFileSync(KEY_FILE,  pems.private);
  return { cert: pems.cert, key: pems.private };
}

// ── WebSocket broadcast (used by upload progress) ─────────────────────────
let wss;
global.wsBroadcast = function (msg) {
  if (!wss) return;
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(data); });
};

// ── Boot ──────────────────────────────────────────────────────────────────
async function main() {
  const app    = next({ dev });
  const handle = app.getRequestHandler();
  await app.prepare();

  let server;

  if (isRailway) {
    // Railway terminates TLS at the edge — run plain HTTP internally
    server = createHttpServer((req, res) => handle(req, res, parse(req.url, true)));
    console.log('[SoundDrop] Running in HTTP mode (Railway handles TLS)');
  } else {
    // Local dev — self-signed HTTPS so browser allows mic access
    const tls = getCert();
    server = createHttpsServer(tls, (req, res) => handle(req, res, parse(req.url, true)));

    // HTTP → HTTPS redirect on port+1
    createHttpServer((req, res) => {
      res.writeHead(301, { Location: `https://${getLocalIP()}:${port}${req.url}` });
      res.end();
    }).listen(port + 1).on('error', () => {});
  }

  // WebSocket on /api/ws
  wss = new WebSocketServer({ server, path: '/api/ws' });
  wss.on('connection', ws => { ws.on('error', () => {}); });

  server.listen(port, '0.0.0.0', () => {
    if (isRailway) {
      console.log(`\n🔊 SoundDrop running on Railway — port ${port}\n`);
      return;
    }

    // Local startup banner
    try {
      const chalk      = require('chalk');
      const qrTerminal = require('qrcode-terminal');
      const ip         = getLocalIP();
      const url        = `https://${ip}:${port}`;

      console.log('\n' + chalk.bgRed.white.bold('  SOUNDDROP  ') + '\n');
      console.log(chalk.gray('──────────────────────────────────────'));
      console.log(chalk.white('  Running at: ') + chalk.red.bold(url));
      console.log(chalk.gray('──────────────────────────────────────'));
      console.log(chalk.white('  Scan on your phone:\n'));
      qrTerminal.generate(url, { small: true });
      console.log(chalk.gray('──────────────────────────────────────'));
      console.log(chalk.yellow(`  ⚠  Open ${url} and accept the cert first`));
      console.log(chalk.yellow('     Chrome: Advanced → Proceed'));
      console.log(chalk.yellow('     Firefox: Advanced → Accept the Risk'));
      console.log(chalk.gray('──────────────────────────────────────'));
      console.log(chalk.white('  Pages:'));
      console.log(chalk.gray(`  /           Home`));
      console.log(chalk.gray(`  /sender     Send via sound`));
      console.log(chalk.gray(`  /receiver   Always-on ear`));
      console.log(chalk.gray(`  /dropzone   File transfer`));
      console.log(chalk.gray(`  /stats      Transfer stats`));
      console.log(chalk.gray('──────────────────────────────────────\n'));
    } catch {
      console.log(`\n🔊 SoundDrop running at https://${getLocalIP()}:${port}\n`);
    }
  });
}

main().catch(err => { console.error(err); process.exit(1); });
