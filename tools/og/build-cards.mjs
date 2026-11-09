// Localized Open Graph cards.
// Generates tools/og/og-card.<lang>.html from og-card.html (text swaps below),
// then renders each to public/og-<lang>.png with Playwright.
// Run:  node tools/og/build-cards.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const SRC = resolve('tools/og/og-card.html');

// Text swaps applied per language. Everything else (ticket art, digits,
// code font, URL) stays identical to the English card.
const CARDS = {
  es: {
    htmlLang: 'es',
    h1: 'El autenticador 2FA que funciona <span class="accent">en tu navegador</span>',
    tagline:
      'Pega una clave secreta y recibe un código de 6 dígitos en vivo — gratis y privado, sin app y sin cuenta.',
    stamps: ['100% EN TU DISPOSITIVO', 'SIN SERVIDORES', 'RFC 6238 TOTP'],
    label: 'CLAVE SECRETA (SOLO LOCAL)',
    footStamp: 'CÓDIGO VÁLIDO — VENTANA DE 30 SEGUNDOS',
    worksOffline: 'FUNCIONA OFFLINE',
    note: 'Sin app · sin cuenta · la clave nunca sale de tu dispositivo',
  },
  ja: {
    htmlLang: 'ja',
    h1: '2FA認証アプリが<span class="accent">ブラウザで動く</span>',
    tagline:
      'シークレットキーを貼り付けると6桁のワンタイムコードが即座に更新。アプリもアカウントも不要、Google Authenticator の代替。',
    stamps: ['すべて端末内で処理', 'サーバーなし', 'RFC 6238 TOTP'],
    label: 'シークレットキー（端末内のみ）',
    footStamp: '有効 — 30秒の有効期限',
    worksOffline: 'オフライン対応',
    note: 'アプリ不要 · アカウント不要 · キーは端末から出ません',
    // CJK headline: reduce size so it fits the same line rhythm
    extraCss: 'html[lang="ja"] h1 { font-size: 44px; } html[lang="ja"] .stamp { font-size: 13px; }',
  },
  fr: {
    htmlLang: 'fr',
    h1: 'L’authentificateur 2FA qui tourne <span class="accent">dans votre navigateur</span>',
    tagline:
      'Collez une clé secrète, obtenez un code à 6 chiffres en direct — gratuit, privé, sans application ni compte.',
    stamps: ['100% CÔTÉ CLIENT', 'ZÉRO SERVEUR', 'RFC 6238 TOTP'],
    label: 'CLÉ SECRÈTE (LOCAL UNIQUEMENT)',
    footStamp: 'CODE VALABLE — FENÊTRE DE 30 SECONDES',
    worksOffline: 'FONCTIONNE HORS LIGNE',
    note: 'Sans app · sans compte · la clé ne quitte jamais votre appareil',
  },
  de: {
    htmlLang: 'de',
    h1: 'Der 2FA-Authenticator, der <span class="accent">im Browser läuft</span>',
    tagline:
      'Geheimen Schlüssel einfügen, 6-stelligen Live-Code erhalten — kostenlos, privat, ohne App und ohne Konto.',
    stamps: ['100% CLIENTSEITIG', 'KEINE SERVER', 'RFC 6238 TOTP'],
    label: 'GEHEIMER SCHLÜSSEL (NUR LOKAL)',
    footStamp: 'GÜLTIG — 30-SEKUNDEN-FENSTER',
    worksOffline: 'FUNKTIONIERT OFFLINE',
    note: 'Ohne App · ohne Konto · der Schlüssel verlässt Ihr Gerät nie',
  },
  pt: {
    htmlLang: 'pt',
    h1: 'O autenticador 2FA que roda <span class="accent">no seu navegador</span>',
    tagline:
      'Cole uma chave secreta e receba um código de 6 dígitos ao vivo — grátis, privado, sem app e sem conta.',
    stamps: ['100% NO NAVEGADOR', 'SEM SERVIDORES', 'RFC 6238 TOTP'],
    label: 'CHAVE SECRETA (SÓ LOCAL)',
    footStamp: 'CÓDIGO VÁLIDO — JANELA DE 30 SEGUNDOS',
    worksOffline: 'FUNCIONA OFFLINE',
    note: 'Sem app · sem conta · a chave nunca sai do seu dispositivo',
  },
  ko: {
    htmlLang: 'ko',
    h1: '<span class="accent">브라우저에서</span> 작동하는 2FA 인증기',
    tagline:
      '시크릿 키를 붙여넣으면 6자리 인증 코드가 실시간 갱신 — 앱도 계정도 없는 무료 대안, Google 인증기를 대체합니다.',
    stamps: ['100% 클라이언트 처리', '서버 없음', 'RFC 6238 TOTP'],
    label: '시크릿 키 (로컬 전용)',
    footStamp: '유효한 코드 — 30초 유효 기간',
    worksOffline: '오프라인 작동',
    note: '앱 불필요 · 계정 불필요 · 키는 기기를 벗어나지 않습니다',
    extraCss: 'html[lang="ko"] h1 { font-size: 44px; } html[lang="ko"] .stamp { font-size: 13px; }',
  },
  it: {
    htmlLang: 'it',
    h1: 'L’autenticatore 2FA che gira <span class="accent">nel tuo browser</span>',
    tagline:
      'Incolla la chiave segreta, ottieni un codice a 6 cifre in tempo reale — gratuito, privato, senza app e senza account.',
    stamps: ['100% LATO CLIENT', 'ZERO SERVER', 'RFC 6238 TOTP'],
    label: 'CHIAVE SEGRETA (SOLO LOCALE)',
    footStamp: 'CODICE VALIDO — FINESTRA DI 30 SECONDI',
    worksOffline: 'FUNZIONA OFFLINE',
    note: 'Senza app · senza account · la chiave non lascia mai il tuo dispositivo',
  },
};

const EN = {
  htmlLang: 'en',
  h1: 'The 2FA authenticator that runs <span class="accent">in your browser</span>',
  tagline:
    'Paste a secret key, get a live 6-digit code — a free, private alternative to\n          Google Authenticator with no app and no account.',
  stamps: ['100% CLIENT-SIDE', 'ZERO SERVERS', 'RFC 6238 TOTP'],
  label: 'SECRET KEY (LOCAL ONLY)',
};

const EN_HTML = readFileSync(SRC, 'utf8');

// The English text is templated by hand below; verify nothing drifted.
for (const text of [...Object.values(EN.stamps), EN.h1, EN.label]) {
  if (!EN_HTML.includes(text)) throw new Error(`English card drifted from template: "${text}"`);
}

function buildHtml(card) {
  let html = EN_HTML;
  // <html lang="…">
  html = html.replace('<html lang="en">', `<html lang="${card.htmlLang}">`);
  // h1 (single occurrence)
  html = html.replace(EN.h1, card.h1);
  // tagline: replace the whole <p class="tagline">…</p> block
  const taglineBlock = /<p class="tagline">[\s\S]*?<\/p>/;
  if (!taglineBlock.test(html)) throw new Error('tagline block not found');
  html = html.replace(taglineBlock, `<p class="tagline">${card.tagline}</p>`);
  // stamps
  for (let i = 0; i < 3; i++) {
    const enStamp = EN.stamps[i];
    const occ = html.indexOf(enStamp);
    if (occ === -1) throw new Error(`stamp not found: ${enStamp}`);
    // Replace text inside the span while keeping class attributes
    html =
      html.slice(0, occ) +
      html.slice(occ).replace(new RegExp(enStamp, 'm'), card.stamps[i]);
  }
  // label
  html = html.replace(EN.label, card.label);
  // ticket footer stamps
  html = html.replace('GENUINE — 30-SECOND WINDOW', card.footStamp);
  html = html.replace('>WORKS OFFLINE<', `>${card.worksOffline}<`);
  // bottom note
  html = html.replace('No app · no account · keys never leave your device', card.note);
  // optional per-language CSS
  if (card.extraCss) html = html.replace('</style>', `${card.extraCss}\n</style>`);
  return html;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });

for (const [lang, card] of Object.entries(CARDS)) {
  const cardFile = resolve(`tools/og/og-card.${lang}.html`);
  writeFileSync(cardFile, buildHtml(card), 'utf8');
  await page.goto(pathToFileURL(cardFile).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300); // let variable fonts settle
  const out = resolve(`public/og-${lang}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log(`og-${lang}.png written`);
}

await browser.close();
