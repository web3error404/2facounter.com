// Camera lifecycle regression test (openCamera/closeCamera race).
// Proves that a getUserMedia() handshake resolving AFTER the user closed
// the camera modal is stopped immediately — the camera must never stay
// live with the dialog gone, and a normal open/close cycle must stop
// the stream cleanly. Run against the preview server (BASE env var
// overrides, default http://localhost:4322/).
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE ?? 'http://localhost:4322/';
const results = [];
const check = (name, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch({
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const page = await (await browser.newContext({ permissions: ['camera'] })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});

// Slow the handshake so a close can land while getUserMedia() is pending,
// and instrument track.stop() so we can prove the orphaned stream dies.
await page.addInitScript(() => {
  window.__events = [];
  window.__streams = [];
  const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (opts) => {
    window.__events.push('gum-called');
    await new Promise((r) => setTimeout(r, 500));
    const stream = await origGUM(opts);
    window.__events.push('gum-resolved');
    window.__streams.push(stream);
    stream.getTracks().forEach((t) => {
      const orig = t.stop.bind(t);
      t.stop = () => {
        window.__events.push('stop');
        orig();
      };
    });
    return stream;
  };
});

await page.goto(BASE, { waitUntil: 'networkidle' });

// ── Scenario 1: close while the handshake is pending ────────────────
await page.locator('#btn-qr-camera').click();
await page.waitForTimeout(100);
await page.locator('#cam-close').click();
await page.waitForTimeout(2000);
{
  const s = await page.evaluate(() => ({
    modalHidden: document.getElementById('cam-modal').classList.contains('hidden'),
    srcObjectSet: document.getElementById('cam-video').srcObject !== null,
    trackStates: window.__streams.map((st) => st.getTracks().map((t) => t.readyState).join(',')),
    stops: window.__events.filter((e) => e === 'stop').length,
  }));
  check(
    'close during handshake stops the orphan stream',
    s.modalHidden && !s.srcObjectSet && s.stops >= 1 && s.trackStates.every((x) => x === 'ended'),
    `stops=${s.stops} tracks=[${s.trackStates}]`,
  );
}

// ── Scenario 2: close, immediately reopen, stale resolve arrives ────
await page.evaluate(() => {
  window.__events.length = 0;
  window.__streams.length = 0;
});
await page.locator('#btn-qr-camera').click(); // open #1 — handshake pending
await page.waitForTimeout(50);
await page.locator('#cam-close').click(); // close while pending
await page.waitForTimeout(50);
await page.locator('#btn-qr-camera').click(); // open #2 — still pending
await page.waitForTimeout(2500);
{
  const s = await page.evaluate(() => ({
    modalOpen: !document.getElementById('cam-modal').classList.contains('hidden'),
    trackStates: window.__streams.map((st) => st.getTracks().map((t) => t.readyState).join(',')),
  }));
  // The FIRST stream must be ended (killed by the session guard); the
  // second may be live because the dialog is legitimately open again.
  check(
    'stale stream from a superseded open is stopped',
    s.modalOpen && s.trackStates[0] === 'ended',
    `tracks=[${s.trackStates}]`,
  );
}

// ── Scenario 3: normal open → working video → clean close ───────────
await page.locator('#cam-close').click();
await page.waitForTimeout(300);
await page.locator('#btn-qr-camera').click();
await page.waitForTimeout(1500);
{
  const open = await page.evaluate(() => ({
    modalOpen: !document.getElementById('cam-modal').classList.contains('hidden'),
    videoPlaying: (() => {
      const v = document.getElementById('cam-video');
      return !v.paused && v.readyState >= 2;
    })(),
  }));
  check('normal open shows a playing video', open.modalOpen && open.videoPlaying);
  await page.locator('#cam-close').click();
  await page.waitForTimeout(500);
  const closed = await page.evaluate(() => ({
    modalHidden: document.getElementById('cam-modal').classList.contains('hidden'),
    srcObjectSet: document.getElementById('cam-video').srcObject !== null,
    allStopped: window.__streams.every((st) =>
      st.getTracks().every((t) => t.readyState === 'ended'),
    ),
  }));
  check('normal close stops the stream cleanly', closed.modalHidden && !closed.srcObjectSet && closed.allStopped);
}

await browser.close();

console.log('\n=== RESULTS ===');
results.forEach((r) => console.log(r));
console.log('\n=== ERRORS ===');
errors.length ? errors.forEach((e) => console.log(e)) : console.log('(none)');
const ok = results.every((r) => r.startsWith('PASS')) && errors.length === 0;
console.log(ok ? '\n>>> ALL GREEN' : '\n>>> FAILURES PRESENT');
process.exit(ok ? 0 : 1);
