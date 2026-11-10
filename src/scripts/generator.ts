/* ────────────────────────────────────────────────────────────
   2FA COUNTER — client-side TOTP/HOTP engine (single-key UI)
   RFC 6238 / RFC 4226 · Web Crypto (HMAC-SHA-1/256/512)
   ──────────────────────────────────────────────────────────── */

type Algo = 'SHA-1' | 'SHA-256' | 'SHA-512';
type Account = {
  label: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: Algo;
  type: 'totp' | 'hotp';
  counter: number;
};

/* ── UI strings ───────────────────────────────────────────────
   Every toast/label comes from the GeneratorStrings set for this
   page's language, embedded by Generator.astro as a JSON data island
   (#generator-i18n). The English set is the fallback for missing
   keys or a missing island, so the widget can never render blanks. */
import { GENERATOR_EN, type GeneratorStrings } from '../i18n/generator';

/* Bundled dependencies: `jsqr` (https://github.com/cozmo/jsQR) is
   distributed under the Apache License 2.0; the about page carries the
   user-facing credits. Fonts come from Fontsource under the SIL OFL. */

function loadStrings(): GeneratorStrings {
  const el = document.getElementById('generator-i18n');
  if (!el?.textContent) return GENERATOR_EN;
  try {
    return { ...GENERATOR_EN, ...(JSON.parse(el.textContent) as Partial<GeneratorStrings>) };
  } catch {
    return GENERATOR_EN;
  }
}
const T = loadStrings();

/* Fill {name} placeholders in translated templates. */
function fmt(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/* ── Key handling: in-memory only ─────────────────────────────
   The secret key never touches persistent storage — no
   localStorage, sessionStorage, cookies or IndexedDB. It lives in
   the input field and the in-memory account object, so every page
   refresh starts from a blank field (a deliberate privacy trade-
   off: an accidental refresh can no longer leave a live secret on
   a shared screen). Earlier versions cached the last key and a
   recents list in localStorage ('2fac.key.v2' / '2fac.recent.v1');
   those entries are never read again — wipeLegacyKeys() erases
   them from device storage on every boot. */

/* Keys once written by the previous persistent versions — wiped at
   boot, never read. */
const LS_LEGACY_KEY = '2fac.key.v2';
const LS_LEGACY_RECENT = '2fac.recent.v1';

/* ── Recent keys: session cache ───────────────────────────────
   Keys entered during this page visit are kept in memory only so
   the list and one-click switching still work — but the cache
   evaporates on refresh or tab close, exactly like the input
   field. Nothing reaches any persistent storage. */
type RecentEntry = { key: string; label: string; ts: number };
const RECENT_MAX = 8;

/* Erase secrets saved by the earlier persistent versions. Read-only
   access is never attempted — this is removal only. */
function wipeLegacyKeys(): void {
  try {
    localStorage.removeItem(LS_LEGACY_KEY);
    localStorage.removeItem(LS_LEGACY_RECENT);
  } catch {
    /* storage blocked — this version never writes anyway */
  }
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const keyInput = $<HTMLTextAreaElement>('secret-key-input');
const pasteBtn = $('btn-paste');
const fileInput = $<HTMLInputElement>('file-qr-input');

/* QR import: two halves of one split button — camera scan / image upload */
const qrCameraBtn = $('btn-qr-camera');
const qrUploadBtn = $('btn-qr-upload');

const badge = $('countdown-badge');
const badgeDot = $('badge-dot');
const badgeSeconds = $('timer-seconds');
const bar = $('segmented-bar');
const tokenBox = $('token-box');
const tokenValue = $('token-value');
const tokenAnnounce = $('token-announce');
const copyBtn = $('btn-copy-code');
const copyLabel = $('copy-btn-text');

const camModal = $('cam-modal');
const camClose = $('cam-close');
const camVideo = $<HTMLVideoElement>('cam-video');

const toastEl = $('toast');
const toastText = $('toast-text');

const recentWrap = $('recent-keys-wrap') || null;
const recentList = $('recent-keys') || null;
const recentClearBtn = $('btn-recent-clear') || null;

let account: Account | null = null;
let currentCode = '';
let lastStep: number | null = null;
let processTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let recents: RecentEntry[] = [];
/* Prevents the invalid-key toast from re-firing on every keystroke of one
   typing session — it clears on a valid parse or an emptied field. */
let invalidToastShown = false;

function init() {
  renderSkeleton(6);
  buildBar(30);
  paintBar(0);

  // One-time cleanup: erase secrets cached by the older persistent builds.
  wipeLegacyKeys();

  // Recent keys are session-only — the list always starts empty.
  renderRecents();
  recentClearBtn?.addEventListener('click', () => armOrExecuteClear());

  // Paste the key from the clipboard
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return toast(T.toastClipboardEmpty, false);
      keyInput.value = text;
      processInput();
    } catch {
      keyInput.focus();
      toast(T.toastClipboardBlocked, false);
    }
  });

  // Live processing as the user types (debounced — snappy but not thrashing)
  keyInput.addEventListener('input', () => {
    if (!keyInput.value.trim()) invalidToastShown = false;
    if (processTimer) clearTimeout(processTimer);
    processTimer = setTimeout(() => processInput('as-you-type'), 200);
  });
  keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      invalidToastShown = false;
      processInput();
    }
  });

  // Copy the live code
  copyBtn.addEventListener('click', async () => {
    if (!currentCode) return toast(T.toastNoCode, false);
    try {
      await navigator.clipboard.writeText(currentCode);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = currentCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copyLabel.textContent = T.copied;
    /* Announce via the toast (role="status" + aria-live) — a label swap
       alone is invisible to screen readers. */
    toast(T.toastCopied, true);
    setTimeout(() => (copyLabel.textContent = T.copyCode), 2000);
  });

  // QR import: camera half opens the scanner, upload half opens the picker
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (f) await scanFile(f);
    fileInput.value = '';
  });
  qrCameraBtn.addEventListener('click', () => openCamera());
  qrUploadBtn.addEventListener('click', () => fileInput.click());

  /* Prefetch the QR decoder on interaction intent, not on page load. A
     pointerdown/touchstart fires ~100–500 ms before the click completes,
     and a hover even earlier — enough for the ~40 KB gzipped chunk to
     arrive so the first scan starts decoding immediately. loadJsQR()
     caches its promise, so this is free and never double-fetches. */
  const prefetchJsQR = () => {
    loadJsQR();
    qrCameraBtn.removeEventListener('pointerdown', prefetchJsQR);
    qrCameraBtn.removeEventListener('pointerenter', prefetchJsQR);
    qrUploadBtn.removeEventListener('pointerdown', prefetchJsQR);
    qrUploadBtn.removeEventListener('pointerenter', prefetchJsQR);
    window.removeEventListener('touchstart', prefetchJsQR);
  };
  qrCameraBtn.addEventListener('pointerdown', prefetchJsQR);
  qrCameraBtn.addEventListener('pointerenter', prefetchJsQR);
  qrUploadBtn.addEventListener('pointerdown', prefetchJsQR);
  qrUploadBtn.addEventListener('pointerenter', prefetchJsQR);
  window.addEventListener('touchstart', prefetchJsQR, { passive: true });

  // Paste an image of the QR anywhere on the page
  document.addEventListener('paste', async (e) => {
    const items = (e as ClipboardEvent).clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          await scanFile(blob);
        }
        return;
      }
    }
  });

  // Camera modal controls
  camClose.addEventListener('click', closeCamera);
  // Disarm an armed "Clear all" when the user taps anywhere outside the button
  document.addEventListener('click', (e) => {
    if (clearArmed && e.target instanceof Node && !recentClearBtn?.contains(e.target)) {
      disarmClear();
    }
  });
  camModal.addEventListener('click', (e) => {
    if ((e as MouseEvent).target === camModal) closeCamera();
  });
  document.addEventListener('keydown', (e) => {
    if (camModal.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      closeCamera();
    } else if (e.key === 'Tab') {
      // Minimal focus trap: keep Tab cycling inside the dialog
      const focusables = camModal.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Drag & drop a QR image anywhere on the generator
  const section = document.getElementById('generator')!;
  section.addEventListener('dragover', (e) => e.preventDefault());
  section.addEventListener('drop', async (e) => {
    e.preventDefault();
    const f = (e as DragEvent).dataTransfer?.files?.[0];
    if (f?.type.startsWith('image/')) await scanFile(f);
  });

  if (window.matchMedia('(min-width: 1024px)').matches) keyInput.focus();

  /* Main tick — paused while the tab is hidden so buried PWAs/tabs burn no
     battery; on return, tick() runs immediately so the countdown badge and
     bar don't show stale seconds until the next interval beats. */
  let tickTimer: ReturnType<typeof setInterval> | undefined = setInterval(tick, 250);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(tickTimer);
      tickTimer = undefined;
    } else {
      tick();
      tickTimer = setInterval(tick, 250);
    }
  });
}

/* ── Key input handling ─────────────────────────────────────── */

function processInput(invalidToast: 'always' | 'as-you-type' = 'always') {
  // account still holds the previous state here — "editing a key that was
  // valid" is the case where a toast is informative.
  const hadValid = !!account;
  const parsed = parseKeyInput(keyInput.value);
  if (!parsed) {
    // Never leave a live code on screen that doesn't belong to the
    // current input — an invalid edit immediately clears the token.
    resetDisplay();
    if (keyInput.value.trim()) {
      // While typing a fresh key the string can't be valid until it is
      // long enough — toasting on every keystroke is pure noise. Toast
      // only for explicit submits (Enter/paste/QR import), an edit that
      // broke a working key, or input long enough to be an attempt.
      const plausible = hadValid || keyInput.value.trim().length >= 16;
      if (invalidToast === 'always' || (plausible && !invalidToastShown)) {
        invalidToastShown = true;
        toast(T.toastInvalid, false);
      }
    }
    return;
  }
  invalidToastShown = false;
  setAccount({
    label: parsed.issuer || parsed.label || T.liveKey,
    secret: parsed.secret,
    digits: parsed.digits ?? 6,
    period: parsed.period ?? 30,
    algorithm: parsed.algorithm ?? 'SHA-1',
    type: parsed.type,
    counter: parsed.counter ?? 0,
  });
  rememberRecent(keyInput.value.trim(), parsed);
}

function setAccount(acc: Account) {
  const changed =
    !account ||
    acc.secret !== account.secret ||
    acc.digits !== account.digits ||
    acc.period !== account.period ||
    acc.algorithm !== account.algorithm ||
    acc.type !== account.type ||
    acc.counter !== account.counter;
  account = acc;
  if (changed) {
    lastStep = null;
    currentCode = '';
    renderSkeleton(acc.digits);
    if (acc.type === 'hotp') {
      buildBar(30, 30);
      paintBarFull();
    } else {
      buildBar(Math.min(acc.period, 30), acc.period);
    }
    badge.classList.remove('hidden');
  }
}

/* ── Recent keys (local cache) ─────────────────────────────── */

/* Safest available display name: issuer/label from the otpauth URI,
   otherwise a masked tail so full secrets never show in the list. */
function describeKey(parsed: ParsedKey): string {
  return parsed.issuer || parsed.label || fmt(T.keyMask, { tail: parsed.secret.slice(-4) });
}

function secretOf(key: string): string | null {
  return parseKeyInput(key)?.secret ?? null;
}

/* Called after every successful parse. Skips when the top entry is the
   same secret, so re-rendering/churn never happens while typing. Memory
   only — the cache dies with the page, so a refresh starts empty. */
function rememberRecent(rawKey: string, parsed: ParsedKey): void {
  if (!rawKey) return;
  const entry: RecentEntry = { key: rawKey, label: describeKey(parsed), ts: Date.now() };
  const top = recents[0];
  if (top && (top.key === rawKey || secretOf(top.key) === parsed.secret)) return;
  // Dedupe by the decoded secret — the same key pasted as a URI and as a
  // bare Base32 string is one entry, moved to the front.
  recents = [entry, ...recents.filter((r) => secretOf(r.key) !== parsed.secret)].slice(
    0,
    RECENT_MAX,
  );
  renderRecents();
}

/* Rows are built via DOM APIs and textContent — labels coming from
   otpauth:// URIs are attacker-controllable and must never touch HTML.
   The × glyph is the only innerHTML here and it is a static constant. */
const X_SVG =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';

function renderRecents(): void {
  if (!recentWrap || !recentList) return;
  recentList.replaceChildren();
  recentWrap.classList.toggle('hidden', recents.length === 0);
  const activeKey = keyInput.value.trim();
  for (const entry of recents) {
    const li = document.createElement('li');
    li.className =
      'recent-row group flex items-center gap-1 rounded-md border border-transparent bg-surface-elevated px-3.5 py-2.5 transition-colors duration-150 hover:border-hairline-strong';
    // Highlight the entry currently loaded in the input
    li.classList.toggle('border-primary/50', entry.key === activeKey);

    const open = document.createElement('button');
    open.type = 'button';
    open.title = T.loadKeyTitle;
    open.className = 'flex min-w-0 flex-1 items-center justify-between gap-3 text-left';
    const nameEl = document.createElement('span');
    nameEl.className = 'truncate text-sm font-semibold text-body group-hover:text-ink';    nameEl.textContent = entry.label;
    const keyEl = document.createElement('span');
    keyEl.className = 'shrink-0 font-mono text-xs text-muted-soft';
    const s = secretOf(entry.key);
    keyEl.textContent = s ? `···· ${s.slice(-4)}` : '';
    open.append(nameEl, keyEl);
    open.addEventListener('click', () => {
      keyInput.value = entry.key;
      processInput();
      renderRecents();
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-icon h-8 w-8 shrink-0 text-muted-soft hover:text-danger';
    del.innerHTML = X_SVG;
    const desc = entry.label;
    del.setAttribute('aria-label', fmt(T.removeKeyAria, { desc }));
    del.addEventListener('click', () => {
      recents = recents.filter((r) => r.key !== entry.key);
      renderRecents();
    });

    li.append(open, del);
    recentList.append(li);
  }
}

function clearAllRecents(): void {
  const wasEmpty = recents.length === 0;
  recents = [];
  renderRecents();
  if (!wasEmpty) {
    toast(T.toastRecentsCleared, true);
  }
}

/* ── "Clear all": two-step arm/confirm ────────────────────────
   Destructive, so it must never fire on a single accidental tap.
   The first click arms the button ("Really clear?", filled red); a
   second click within 3 s executes. Idling or tapping elsewhere
   disarms it back to "Clear all" without wiping anything. */
const clearLabel = $('btn-recent-clear-label');
let clearArmed = false;
let clearArmTimer: ReturnType<typeof setTimeout> | undefined;

function disarmClear(): void {
  if (!clearArmed) return;
  clearArmed = false;
  if (clearArmTimer) clearTimeout(clearArmTimer);
  clearArmTimer = undefined;
  recentClearBtn?.classList.add('text-cream/70');
  recentClearBtn?.classList.remove('bg-danger', 'text-cream');
  if (clearLabel) clearLabel.textContent = T.clearAll;
}

function armOrExecuteClear(): void {
  if (!recentClearBtn) return;
  if (!clearArmed) {
    clearArmed = true;
    recentClearBtn.classList.remove('text-cream/70');
    recentClearBtn.classList.add('bg-danger', 'text-cream');
    if (clearLabel) clearLabel.textContent = T.reallyClear;
    clearArmTimer = setTimeout(disarmClear, 3000);
    return;
  }
  disarmClear();
  clearAllRecents();
}

/* ── Toast ──────────────────────────────────────────────────── */

function resetDisplay() {
  account = null;
  lastStep = null;
  currentCode = '';
  renderSkeleton(6);
  buildBar(30);
  paintBar(0);
  badge.classList.add('hidden');
}

function toast(msg: string, ok = true) {
  toastText.textContent = msg;
  toastEl.classList.remove('hidden');
  toastEl.classList.toggle('text-danger', !ok);
  toastEl.classList.toggle('text-ink', ok);
  toastEl.classList.remove('toast-in');
  void toastEl.offsetWidth; // force reflow to restart animation
  toastEl.classList.add('toast-in');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3200);
}

/* ── Base32 + otpauth parsing ───────────────────────────────── */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(raw: string): Uint8Array | null {
  const s = raw.toUpperCase().replace(/[\s\-_]/g, '').replace(/=+$/, '');
  if (s.length < 16) return null;
  const out: number[] = [];
  let bits = 0;
  let val = 0;
  for (const ch of s) {
    const i = B32.indexOf(ch);
    if (i < 0) return null;
    val = (val << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return out.length >= 8 ? new Uint8Array(out) : null;
}

type ParsedKey = {
  secret: string;
  label?: string;
  issuer?: string;
  digits?: number;
  period?: number;
  algorithm?: Algo;
  type: 'totp' | 'hotp';
  counter?: number;
};

function normalizeSecret(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s\-_]/g, '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B');
}

/* ── URI parameter helpers ─────────────────────────────────── */

/* Strict optional integer param: undefined when absent/out of range/NaN.
   Out-of-range values fall back to the standard defaults instead of
   producing NaN codes on screen. */
function parseOptInt(raw: string | null, min: number, max: number): number | undefined {
  if (raw === null) return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

/* Only RFC 6238 hash algorithms are honored — garbage values fall back
   to SHA-1 defaults instead of throwing inside Web Crypto. */
function parseAlgo(raw: string | null): Algo | undefined {
  if (raw === null) return undefined;
  const up = raw.trim().toUpperCase().replace(/-/g, '');
  if (up === 'SHA1') return 'SHA-1';
  if (up === 'SHA256') return 'SHA-256';
  if (up === 'SHA512') return 'SHA-512';
  return undefined;
}

function parseKeyInput(text: string): ParsedKey | null {
  const t = text.trim();
  if (!t) return null;

  // Full otpauth:// URI?
  const m = /^otpauth:\/\/(totp|hotp)\/?([^?]*)\??(.*)$/i.exec(t);
  if (m) {
    const params = new URLSearchParams(m[3]);
    const secret = normalizeSecret(params.get('secret') || '');
    if (!secret) return null;
    let label = decodeURIComponent(m[2] || '');
    let issuer = params.get('issuer') || undefined;
    if (label.includes(':')) {
      const [maybeIssuer, ...rest] = label.split(':');
      if (!issuer) issuer = maybeIssuer.trim();
      label = rest.join(':').trim() || label;
    }
    return {
      secret,
      label: label || undefined,
      issuer,
      digits: parseOptInt(params.get('digits'), 6, 8),
      period: parseOptInt(params.get('period'), 1, 240),
      algorithm: parseAlgo(params.get('algorithm')),
      type: /^hotp$/i.test(m[1]) ? 'hotp' : 'totp',
      counter: parseOptInt(params.get('counter'), 0, Number.MAX_SAFE_INTEGER),
    };
  }

  // Bare Base32 key
  const secret = normalizeSecret(t);
  return decodeBase32(secret) ? { secret, type: 'totp' } : null;
}

/* ── TOTP / HOTP core (RFC 6238 / RFC 4226) ────────────────── */

async function hmacCounter(acc: Account, counter: number): Promise<string | null> {
  const bytes = decodeBase32(acc.secret);
  if (!bytes) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    bytes as BufferSource,
    { name: 'HMAC', hash: acc.algorithm },
    false,
    ['sign'],
  );
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigUint64(0, BigInt(Math.floor(counter)), false);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const o = mac[mac.length - 1] & 0xf;
  const bin =
    (((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3]) >>> 0;
  return String(bin % 10 ** acc.digits).padStart(acc.digits, '0');
}

function floorNow(): number {
  return Math.floor(Date.now() / 1000);
}

function formatGroups(code: string): number[] {
  if (code.length === 8) return [4, 4];
  if (code.length === 7) return [3, 4];
  return [3, 3];
}

/* ── Token chamber rendering ────────────────────────────────── */

/* Digit-slot skeleton: 6 digits → [3,3], 7 → [3,4], 8 → [4,4].
   Empty slots render as em-dashes until a code arrives. */
function renderSkeleton(digits: number) {
  const groups = formatGroups(''.padEnd(digits, '0'));
  tokenValue.innerHTML = groups
    .map(
      (g) =>
        `<span class="flex gap-1.5">${'<span class="digit text-muted-soft transition-colors">—</span>'.repeat(g)}</span>`,
    )
    .join('<span class="digit-group-space" aria-hidden="true"></span>');
}

function fillCode(code: string) {
  const slots = tokenValue.querySelectorAll<HTMLElement>('.digit');
  let i = 0;
  for (const ch of code) {
    const s = slots[i];
    if (!s) break;
    if (s.textContent !== ch) {
      s.textContent = ch;
      s.classList.remove('text-muted-soft');
      s.classList.add('text-accent-red');
    }
    i++;
  }
}

/* ── Segmented buffer bar ───────────────────────────────────── */

/* One segment per second of the period, capped at 30: very long
   custom periods (up to 240 s per otpauth://) would otherwise
   collapse into sub-pixel slivers on narrow phones, and lighting
   "remaining" segments directly would over-light the bar. Seconds
   are mapped proportionally onto the fixed segment count. */
let barPeriod = 30;

function buildBar(count = 30, period = 30) {
  if (!bar) return;
  barPeriod = period;
  bar.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const t = document.createElement('span');
    t.className = 'min-w-0 flex-1 rounded-[2px] transition-colors duration-150';
    bar.appendChild(t);
  }
  /* Fresh segments carry no lit-state yet — invalidate the paint guard
     so the next tick is guaranteed to paint. */
  lastLit = -1;
  lastEnding = false;
}

/* Paint guard: the 250 ms tick only repaints the bar when the lit count
   or the urgency state actually changed — 3 of every 4 ticks become
   no-ops instead of 30×3 classList toggles. */
let lastLit = -1;
let lastEnding = false;

function paintBar(litSeconds: number) {
  if (!bar) return;
  const count = bar.children.length;
  const lit =
    barPeriod > count
      ? Math.round((litSeconds / barPeriod) * count)
      : Math.min(litSeconds, count);
  /* Last 5 seconds: the lit run flips from kiwi-green to stamp red
     — the same "ticket urgency" red as the countdown badge. */
  const ending = litSeconds <= 5;
  if (lit === lastLit && ending === lastEnding) return;
  lastLit = lit;
  lastEnding = ending;
  for (let i = 0; i < count; i++) {
    const t = bar.children[i] as HTMLElement;
    t.classList.toggle('bg-primary', i < lit && !ending);
    t.classList.toggle('bg-danger', i < lit && ending);
    t.classList.toggle('bg-cream/20', i >= lit);
  }
}

/* HOTP has no countdown — the bar sits fully lit (steady state).
   Without this the segments keep no background class at all and
   the bar renders as an invisible empty strip. */
function paintBarFull() {
  if (!bar) return;
  lastLit = bar.children.length;
  lastEnding = false;
  for (let i = 0; i < bar.children.length; i++) {
    const t = bar.children[i] as HTMLElement;
    t.classList.add('bg-primary');
    t.classList.remove('bg-danger', 'bg-cream/20');
  }
}

/* ── Live code rendering ───────────────────────────────────── */

async function renderCode(force = false) {
  if (!account) return;
  const acc = account;
  const now = floorNow();

  if (acc.type === 'hotp') {
    if (lastStep !== acc.counter || !currentCode || force) {
      const code = await hmacCounter(acc, acc.counter);
      if (code) showCode(code);
      lastStep = acc.counter;
    }
    if (badgeSeconds) {
      const txt = `#${acc.counter}`;
      if (badgeSeconds.textContent !== txt) badgeSeconds.textContent = txt;
    }
    return;
  }

  const step = Math.floor(now / acc.period);
  const remaining = acc.period - (now % acc.period);

  if (lastStep !== step || force) {
    const code = await hmacCounter(acc, step);
    if (code) showCode(code);
    lastStep = step;
  }

  if (badgeSeconds) {
    /* Write the badge text only when it actually changed — assigning the
       same string every tick still dirties the text node 4×/s. */
    const txt = `${remaining}${T.seconds}`;
    if (badgeSeconds.textContent !== txt) badgeSeconds.textContent = txt;
  }
  badge.classList.toggle('text-danger', remaining <= 5);
  badgeDot.classList.toggle('bg-ok', remaining > 5);
  badgeDot.classList.toggle('bg-danger', remaining <= 5);
  badgeDot.classList.toggle('dot-blink-fast', remaining <= 5);
  paintBar(remaining);
}

function showCode(code: string) {
  if (code === currentCode) return;
  currentCode = code;
  fillCode(code);
  tokenBox.classList.remove('code-tick');
  void tokenBox.offsetWidth;
  tokenBox.classList.add('code-tick');
  /* One announcement per rotation, into the single sr-only live region —
     the visual chamber is not a live region (see Generator.astro). */
  if (tokenAnnounce) tokenAnnounce.textContent = fmt(T.announceNewCode, { code });
}

/* ── QR scanning (file / paste / drop) ──────────────────────── */

async function scanFile(file: File | Blob) {
  toast(T.toastDecoding, true);
  const jsQR = await loadJsQR();
  if (!jsQR) {
    toast(T.toastDecoderFail, false);
    return;
  }
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const res = jsQR(data.data, w, h);
    if (res && res.data) {
      const parsed = parseKeyInput(res.data);
      if (!parsed) {
        toast(T.toastQrInvalidPayload, false);
        return;
      }
      keyInput.value = res.data;
      processInput();
      toast(T.toastQrImported, true);
    } else {
      toast(T.toastNoQr, false);
    }
  } catch {
    toast(T.toastFileUnreadable, false);
  }
}

/* The QR decoder is bundled from npm at build time and code-split into a
   first-party chunk that loads from this site — no CDN call, works offline,
   and no third party ever learns that a QR was scanned. */
type JsQR = (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
let jsQrPromise: Promise<JsQR | null> | null = null;
function loadJsQR() {
  jsQrPromise ??= import('jsqr')
    .then((m) => (m.default as unknown as JsQR) ?? null)
    .catch(() => null);
  return jsQrPromise;
}

/* ── Camera ─────────────────────────────────────────────────── */

let stream: MediaStream | null = null;
let camRaf = 0;
let camReturnFocus: HTMLElement | null = null;
/* Session token for camera opens. Each openCamera() call bumps it; if a
   getUserMedia() handshake resolves after the user closed the dialog (or
   after a newer open replaced this one), the stale session detects it and
   stops the tracks immediately — the camera must never stay live with the
   dialog gone. Without this guard a close-during-handshake leaves the
   camera hardware (and its privacy light) on until page reload. */
let camSession = 0;

async function openCamera() {
  const session = ++camSession;
  camReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  camModal.classList.remove('hidden');
  camModal.classList.add('flex');
  /* Keep the page still behind the dialog — scrolling the body under a
     fixed modal is jarring on mobile momentum scroll. */
  document.body.style.overflow = 'hidden';
  camClose.focus();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'environment', width: { ideal: 1280 } },
    });
    /* The user closed the dialog (or reopened the camera) while the
       handshake was pending — this stream arrived orphaned. Stop it
       right away instead of feeding a hidden video and leaving the
       camera hardware on. */
    if (session !== camSession || camModal.classList.contains('hidden')) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      return;
    }
    camVideo.srcObject = stream;
    await camVideo.play();
    /* play() also awaits — re-check after it resolves. */
    if (session !== camSession || camModal.classList.contains('hidden')) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      return;
    }
    camLoop(session);
  } catch (err) {
    closeCamera();
    if ((err as Error)?.name !== 'NotAllowedError') {
      toast(T.toastCamUnavailable, false);
      return;
    }
    /* Android Chrome refuses to pop the permission dialog when another app
       draws over the browser window (chat bubbles, screen dimmers, blue-
       light filters): getUserMedia fails with NotAllowedError while the
       camera permission is still in the 'prompt' state — the user never
       answered anything. The browser-side "This site can't ask for your
       permission" bubble is exactly this case. Sending these users into
       site settings would be a dead end, so ask them to close the
       app overlaying the screen instead. Desktop browsers and engines
       without a Permissions-API 'camera' descriptor fall back to the
       plain denied message. */
    let camState: string | null = null;
    try {
      camState = (await navigator.permissions.query({ name: 'camera' as PermissionName })).state;
    } catch {
      /* no 'camera' descriptor support — fall through to denied text */
    }
    const mobile = matchMedia('(pointer: coarse)').matches;
    toast(camState === 'prompt' && mobile ? T.toastCamOverlay : T.toastCamDenied, false);
  }
}

function closeCamera() {
  camSession++; // invalidate any pending handshake / scan loop for this dialog
  camRaf && cancelAnimationFrame(camRaf);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  camVideo.srcObject = null;
  camModal.classList.add('hidden');
  camModal.classList.remove('flex');
  document.body.style.overflow = '';
  camReturnFocus?.focus();
  camReturnFocus = null;
}

async function camLoop(session: number) {
  const jsQR = await loadJsQR();
  if (!jsQR || !stream || session !== camSession) return;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  /* Decode at ~10 fps, not per animation frame: jsQR on a 480 px frame
     is real CPU work, and at 60 Hz it heats a phone and drops UI frames
     while the camera is open. 100 ms cadence still feels instant. */
  const DECODE_EVERY_MS = 100;
  let lastDecode = 0;
  const scan = () => {
    if (!stream || session !== camSession) return;
    const nowTs = performance.now();
    if (camVideo.readyState >= 2 && camVideo.videoWidth && nowTs - lastDecode >= DECODE_EVERY_MS) {
      lastDecode = nowTs;
      const scale = 480 / camVideo.videoWidth;
      cv.width = 480;
      cv.height = Math.round(camVideo.videoHeight * scale);
      ctx.drawImage(camVideo, 0, 0, cv.width, cv.height);
      const res = jsQR(ctx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
      if (res && res.data) {
        const parsed = parseKeyInput(res.data);
        closeCamera();
        if (parsed) {
          keyInput.value = res.data;
          processInput();
          toast(T.toastQrImported, true);
        } else {
          toast(T.toastQrNotKey, false);
        }
        return;
      }
    }
    camRaf = requestAnimationFrame(scan);
  };
  camRaf = requestAnimationFrame(scan);
}

/* ── Main tick ─────────────────────────────────────────────── */

function tick() {
  if (!account) return;
  renderCode().catch(() => {});
}

/* ── Boot ─────────────────────────────────────────────────────
   init() MUST run after every module-level const is initialized.
   Calling it at the top of the module fired processInput →
   decodeBase32 → B32.indexOf while B32 was still undefined,
   crashing the whole generator on any reload that had a saved
   key (no restore, no listeners, empty display). */
if (!keyInput || !crypto?.subtle) {
  // Element or Web Crypto missing — nothing to do.
  console.warn('[2fa] generator disabled');
} else {
  init();
}

/* code-tick / scan-line / toast animations live in global.css */
