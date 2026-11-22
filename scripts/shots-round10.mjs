// Real Chrome renders for review: desktop 1440px + phone 390px, light + dark.
// Run: node scripts/shots.mjs
// Writes screenshots/round9/*.png. Modelled on the KiranaVaani recipe for
// this VM: Hatch Chrome needs a WebGL domain-policy file just to start,
// and it blocks DevTools-initiated navigation to http://127.0.0.1, so
// pages load over file:// with --allow-file-access-from-files, launched
// with the first URL as a CLI argument. The app is a HashRouter build,
// so routes are file://.../dist/index.html#/leads etc. With no backend
// running these are the seeded demo renders; for live renders, build
// with VITE_API_URL=http://localhost:8000 and run the backend first
// (see README), then pass LIVE=1 to re-shoot the same routes live.
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const DIST = path.join(ROOT, 'frontend', 'dist');
const OUT = path.join(ROOT, 'screenshots', 'round10');
const CHROME = process.env.CHROME_BIN
  || ['/opt/meta-chromium/chrome', '/usr/bin/chromium-browser', 'google-chrome']
    .find((c) => c.startsWith('/') ? fs.existsSync(c) : true);

function chromeArgs(debugPort, firstUrl) {
  const policy = 'hatch-webgl-allowed-domains-v1\nexample.com\n';
  const file = path.join(os.tmpdir(), 'ai-sdr-webgl-policy.txt');
  fs.writeFileSync(file, policy);
  const sha = createHash('sha256').update(policy).digest('hex');
  return [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdr-chrome-'))}`,
    `--hatch-webgl-allowed-domains-file=${file}`,
    `--hatch-webgl-allowed-domains-sha256=${sha}`,
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1280,900',
    firstUrl,
  ];
}

const pageUrl = (route) => `file://${DIST}/index.html#${route}`;
const DEBUG_PORT = 9227;

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }

  async call(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const done = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return done;
  }

  async waitForEvent(method, timeoutMs = 30000) {
    const start = Date.now();
    for (;;) {
      const i = this.events.findIndex((e) => e.method === method);
      if (i >= 0) return this.events.splice(i, 1)[0];
      if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${method}`);
      await delay(100);
    }
  }

  close() { try { this.ws.close(); } catch (err) { /* already closed */ } }
}

// Demo renders (no backend): every route the sidebar offers, desktop +
// the two densest pages on a phone. The dashboard also gets a dark shot.
const SHOTS = [
  { name: 'dashboard.png', width: 1280, route: '/', waitMs: 4000 },
  { name: 'dashboard-mobile.png', width: 390, route: '/', waitMs: 4000 },
  { name: 'dashboard-dark.png', width: 1280, route: '/', waitMs: 4000, dark: true },
  { name: 'leads.png', width: 1280, route: '/leads', waitMs: 3500 },
  { name: 'leads-mobile.png', width: 390, route: '/leads', waitMs: 3500 },
  { name: 'campaigns.png', width: 1280, route: '/campaigns', waitMs: 3500 },
  { name: 'drafts.png', width: 1280, route: '/drafts', waitMs: 3500 },
  { name: 'replies.png', width: 1280, route: '/replies', waitMs: 3500 },
  { name: 'chat.png', width: 1280, route: '/chat', waitMs: 3500 },
  { name: 'discover.png', width: 1280, route: '/discover', waitMs: 3500 },
  { name: 'not-found.png', width: 1280, route: '/boards', waitMs: 3500 },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const first = SHOTS[0];
  const chrome = spawn(CHROME, chromeArgs(DEBUG_PORT, pageUrl(first.route)));
  try {
    let wsUrl = null;
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const targets = await res.json();
        const page = targets.find((t) => t.type === 'page');
        if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
      } catch (err) { /* not up yet */ }
      await delay(200);
    }
    if (!wsUrl) throw new Error('Chrome DevTools did not come up');
    const cdp = new Cdp(wsUrl);
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    for (const shot of SHOTS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', {
        width: shot.width, height: 900, deviceScaleFactor: 1, mobile: shot.width < 600,
      });
      await cdp.call('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: shot.dark ? 'dark' : 'light' }],
      });
      await cdp.call('Page.navigate', { url: pageUrl(shot.route) });
      try {
        // Hash-only navigation (same route, new viewport) fires no load
        // event — the page is already there, so don't stall on it.
        await cdp.waitForEvent('Page.loadEventFired', 6000);
      } catch (err) { /* already loaded */ }
      // A reload re-runs the inline theme script under the emulated
      // media, so a dark shot is actually dark instead of a copy of
      // the light one (same-URL navigation never reloads the page).
      // Clear the stored theme first: the app writes 'sdr-theme' on
      // mount, and a stored 'light' would beat the emulated dark.
      await cdp.call('Runtime.evaluate', { expression: `localStorage.removeItem('sdr-theme')` });
      await cdp.call('Page.reload', { ignoreCache: true });
      try {
        await cdp.waitForEvent('Page.loadEventFired', 6000);
      } catch (err) { /* already loaded */ }
      await delay(shot.waitMs);
      const { data } = await cdp.call('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
      });
      fs.writeFileSync(path.join(OUT, shot.name), Buffer.from(data, 'base64'));
      console.log('wrote', shot.name);
    }
    // Console errors, if any — a render with JS errors is not a pass.
    const pageErrors = cdp.events.filter(
      (e) => e.method === 'Runtime.exceptionThrown'
        || (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error'),
    ).map((e) => JSON.stringify(e.params).slice(0, 300))
    cdp.close();
    if (pageErrors.length) {
      console.log('PAGE ERRORS:');
      for (const err of pageErrors) console.log(' -', err);
    } else {
      console.log('no page errors');
    }
  } finally {
    chrome.kill('SIGTERM');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
