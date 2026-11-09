// Real-browser smoke test for http://localhost:4322/ (2facounter.com)
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321/';
const KEY1 = 'JBSWY3DPEHPK3PXPJBSW'; // valid base32, >16 chars
const KEY2 = 'GAXG243EMR2XQZUBIKTY';

const errors = [];
const browsers = await chromium.launch();
const page = await (await browsers.newContext({ permissions: [] })).newPage();
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

await page.goto(BASE, { waitUntil: 'networkidle' });

// 1. page loads
check('page loads', (await page.title()).includes('2FA'));

// 2. type a valid key → live code appears
const input = page.locator('#secret-key-input');
await input.click();
await input.fill(KEY1);
await page.waitForTimeout(600);
const digits = await page.locator('#token-value .digit').allTextContents();
check('live code digits appear', digits.filter((d) => /[0-9]/.test(d)).length === 6, digits.join(''));

// 3. recent keys list appears with 1 entry
await page.waitForTimeout(300);
const rows = await page.locator('#recent-keys > li').count();
check('recent keys entry added', rows === 1, `rows=${rows}`);

// 4. replace with second key → second entry added, total 2
await input.fill(KEY2);
await page.waitForTimeout(600);
const rows2 = await page.locator('#recent-keys > li').count();
check('second recent key cached', rows2 === 2, `rows=${rows2}`);

// 5. click the older entry → it loads again, becomes active
await page.locator('#recent-keys > li').nth(1).locator('button').first().click();
await page.waitForTimeout(400);
const valNow = await input.inputValue();
check('clicking recent row restores key', valNow === KEY1, valNow);

// 6. copy button enabled state
await page.locator('#btn-copy-code').click();
await page.waitForTimeout(200);
const copyText = await page.locator('#copy-btn-text').textContent();
check('copy button text', typeof copyText === 'string' && copyText.length > 0, copyText);

// 7. invalid input clears token & shows toast
await input.fill('12345GARBAGE!!!');
await page.waitForTimeout(500);
const digitsAfterInvalid = await page.locator('#token-value .digit').allTextContents();
check('invalid input clears code', digitsAfterInvalid.every((d) => d === '—'), digitsAfterInvalid.join(''));

// 8. reload → last key restored from LS
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const restoredKeys = await page.locator('#recent-keys > li').count();
check('recent keys survive reload', restoredKeys >= 1, `rows=${restoredKeys}`);
const restoredKey = await input.inputValue();
check('last key restored into input', restoredKey !== '', restoredKey);
const digitsReload = await page.locator('#token-value .digit').allTextContents();
check('code generates after reload', digitsReload.filter((d) => /[0-9]/.test(d)).length === 6, digitsReload.join(''));

// 9. clear all (two-step arm/confirm: first click arms, second click executes)
const clearBtn = page.locator('#btn-recent-clear');
if (await clearBtn.isVisible()) {
  await clearBtn.click();
  await page.waitForTimeout(150); // still inside the 3 s arm window
  await clearBtn.click();
  await page.waitForTimeout(300);
}
const rowsAfterClear = await page.locator('#recent-keys > li').count();
check('clear all empties list', rowsAfterClear === 0, `rows=${rowsAfterClear}`);

// 10. mobile viewport (375×667): menu, overflow, generator, camera denial
const mob = await browsers.newContext({ viewport: { width: 375, height: 667 }, permissions: [] });
const mp = await mob.newPage();
mp.on('pageerror', (e) => errors.push('MOBILE PAGEERROR: ' + e.message));
mp.on('console', (m) => {
  if (m.type() === 'error') errors.push('MOBILE CONSOLE: ' + m.text());
});
await mp.goto(BASE, { waitUntil: 'networkidle' });

const overflow = await mp.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
check('mobile: no horizontal overflow', overflow <= 0, `overflowPx=${overflow}`);

const mtoggle = mp.locator('#menu-toggle');
await mtoggle.click();
check('mobile: menu opens', await mp.locator('#mobile-menu').isVisible());
await mp.keyboard.press('Escape');
await mp.waitForTimeout(100);
check('mobile: Escape closes menu', !(await mp.locator('#mobile-menu').isVisible()));
check('mobile: menu toggle refocused', await mp.locator('#menu-toggle').evaluate((el) => el === document.activeElement));

const minput = mp.locator('#secret-key-input');
await minput.fill(KEY1);
await mp.waitForTimeout(600);
const mdigits = await mp.locator('#token-value .digit').allTextContents();
check('mobile: live code appears', mdigits.filter((d) => /[0-9]/.test(d)).length === 6, mdigits.join(''));

// Camera with permission denied/dead in headless: must not crash — toast instead
await mp.locator('#btn-qr-camera').click();
await mp.waitForTimeout(900);
const camStillOpen = await mp.locator('#cam-modal').isVisible();
if (camStillOpen) await mp.keyboard.press('Escape');
await mp.waitForTimeout(200);
const camToastVisible = await mp.locator('#toast').isVisible();
check('mobile: denied camera shows toast, no crash', camToastVisible || (await mp.locator('#cam-modal').evaluate((el) => el.classList.contains('hidden'))));

// Upload button opens the file picker (no crash), arbitrary-click disarm of "Clear all"
await mp.locator('#btn-qr-upload').click();
await mp.waitForTimeout(100);
const clearMob = mp.locator('#btn-recent-clear');
const mobRows = await mp.locator('#recent-keys > li').count();
if (mobRows > 0 && (await clearMob.isVisible())) {
  await clearMob.click();
  const labelArmed = await mp.locator('#btn-recent-clear-label').textContent();
  await mp.locator('#generator').click({ position: { x: 10, y: 10 } }); // outside click disarms
  await mp.waitForTimeout(150);
  const labelDisarmed = await mp.locator('#btn-recent-clear-label').textContent();
  const rowsStill = await mp.locator('#recent-keys > li').count();
  check(
    'mobile: outside click disarms clear-all without wiping',
    /clear/i.test(labelArmed ?? '') && /clear/i.test(labelDisarmed ?? '') && rowsStill === mobRows,
    `armed="${labelArmed}" disarmed="${labelDisarmed}" rows=${rowsStill}/${mobRows}`,
  );
}
await mob.close();

console.log('\n=== RESULTS ===');
for (const r of results) console.log(r);
console.log('\n=== ERRORS ===');
console.log(errors.length ? errors.join('\n') : '(none)');

const failed = results.some((r) => r.startsWith('FAIL')) || errors.length > 0;
console.log(failed ? '\n>>> ISSUES FOUND' : '\n>>> ALL GREEN');
await browsers.close();
process.exit(failed ? 1 : 0);
