// Product Hunt launch traffic watcher for 2facounter.com
//
// Tails the Cloudflare Worker in real time and tallies launch-day signals:
//   • Product Hunt click-throughs — the listing's "Visit website" button
//     appends ?ref=producthunt&utm_source=producthunt, so those params are
//     the reliable signal. (producthunt.com strips the Referer header, so
//     referer-based checks undercount.)
//   • HTTP status mix, 4xx/5xx with the offending path
//   • page views by path/country, ignoring static assets and known bots
//
// Read-only: it only observes traffic, it never deploys or changes anything.
//
// Usage:
//   node tools/ph-watch.mjs        // 5 minutes
//   node tools/ph-watch.mjs 15     // 15 minutes
//   node tools/ph-watch.mjs 0      // until Ctrl-C
//
// Requires an authenticated wrangler session (`npx wrangler whoami`).

import { spawn } from 'node:child_process';

const minutes = process.argv[2] === undefined ? 5 : Number(process.argv[2]);
if (!Number.isFinite(minutes) || minutes < 0) {
  console.error('usage: node tools/ph-watch.mjs [minutes]  (0 = until Ctrl-C)');
  process.exit(1);
}
const deadline = minutes > 0 ? Date.now() + minutes * 60_000 : Infinity;

const stats = {
  total: 0,
  ph: 0,
  paths: new Map(),
  statuses: new Map(),
  countries: new Map(),
  referers: new Map(),
  problems: [],
};

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const clock = () => new Date().toISOString().slice(11, 19);
const isAsset = (url) =>
  /\/_astro\/|favicon|site\.webmanifest|sw\.js|apple-touch-icon|\.(png|webp|jpg|svg|woff2?|css|js)$/i.test(url);
const isBot = (ua) => /bot|crawler|spider|preview|monitor|import|fetch|headless|curl|python/i.test(ua);

// Console output stays ASCII: the Windows terminal code page mangles "▲"/"→".
console.log(`[ph-watch] tailing 2facounter for ${minutes === 0 ? 'Ctrl-C' : minutes + ' min'} (PH hits marked "PH")`);

// Single command string: .cmd shims need a shell on Windows, and passing args
// alongside shell:true is deprecated (DEP0190). No user input reaches this.
const child = spawn('npx wrangler tail --format json --status ok', {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let buffer = '';
let heartbeat = setInterval(() => {
  console.log(
    `[ph-watch] ${stats.total} req · ${stats.ph} from PH · ${[...stats.statuses].map(([k, v]) => k + ':' + v).join(' ')}`,
  );
}, 60_000);

function onEvent(event) {
  stats.total++;

  const req = event.event?.request ?? {};
  const headers = req.headers ?? {};
  const url = req.url ?? '';
  const status = event.event?.response?.status ?? 0;
  const country = headers['cf-ipcountry'] ?? '??';
  const ua = headers['user-agent'] ?? '';
  const ref = headers.referer ?? '';
  const grade = req.cf?.botManagement?.score;

  bump(stats.statuses, String(status));
  bump(stats.countries, country);
  if (ref) bump(stats.referers, ref);

  const fromPH = /ref=producthunt|utm_source=producthunt/i.test(url);
  if (fromPH) stats.ph++;

  if (!isAsset(url)) {
    const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
    bump(stats.paths, path);
    if (fromPH || status >= 400 || (!isBot(ua) && country)) {
      const label = fromPH ? 'PH' : status >= 400 ? '!!' : '  ';
      console.log(`${label} ${clock()} ${status} ${country} ${path}${ref ? ' ← ' + ref.slice(0, 60) : ''}`);
    }
  }

  if (status >= 400) {
    stats.problems.push({ t: clock(), status, path: url.replace(/^https?:\/\/[^/]+/, ''), ua: ua.slice(0, 50) });
  }
}

child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  // Wrangler's JSON events are pretty-printed; top-level objects start at column 0.
  const parts = buffer.split(/\n(?=\{)/);
  buffer = parts.pop() ?? '';
  for (const part of parts) {
    const start = part.indexOf('{');
    if (start < 0) continue;
    try {
      onEvent(JSON.parse(part.slice(start)));
    } catch {
      /* partial or non-event line — keep streaming */
    }
  }

  if (Date.now() > deadline) stop();
});

child.stderr.setEncoding('utf8');
child.stderr.on('data', (chunk) => {
  const line = String(chunk).trim();
  if (line && !/npm notice|^$/.test(line)) console.error('[wrangler]', line.slice(0, 200));
});

function report() {
  const top = (map, n) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => `${v}x ${k}`)
      .join(', ') || '(none)';

  console.log('\n== summary =============================');
  console.log('requests seen:    ', stats.total);
  console.log('from Product Hunt:', stats.ph, stats.ph ? '(visitors are arriving)' : '(no click-throughs yet)');
  console.log('status mix:       ', top(stats.statuses, 8));
  console.log('countries:        ', top(stats.countries, 8));
  console.log('referers:         ', top(stats.referers, 6));
  console.log('paths:            ', top(stats.paths, 8));
  if (stats.problems.length) {
    console.log('4xx/5xx:');
    for (const p of stats.problems.slice(0, 10)) console.log(`  ${p.t} ${p.status} ${p.path} (${p.ua})`);
  }
  console.log('========================================');
}

let stopped = false;
function stop() {
  if (stopped) return;
  stopped = true;
  clearInterval(heartbeat);
  report();
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 250);
}

process.on('SIGINT', stop);
child.on('exit', () => {
  if (!stopped) {
    stopped = true;
    clearInterval(heartbeat);
    report();
    process.exit(0);
  }
});
