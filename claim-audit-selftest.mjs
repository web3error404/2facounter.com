// Self-test for claim-audit.mjs.
//
// An audit that reports "0 problems" is worthless if it has quietly stopped
// looking. This builds a throwaway dist/ with one clean page and one page
// carrying the two errors this audit exists to catch — a promise of a feature
// the vendor does not document, and a dead URL in body text rather than in the
// Sources block — then asserts the clean page passes and the dirty page fails
// on both counts.
//
// Run: node claim-audit-selftest.mjs   (needs the network for one 404 probe)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'claim-audit-'));
const page = ({ body, sources = true }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>fixture</title></head><body>
<main>
  <h1>Fixture guide</h1>
  <p class="mt-3 font-mono text-[13px] text-ink/90" data-review-via="browser" data-review-date="2026-11-24">
    Fact-checked against PayPal's official documentation · last reviewed 24 November 2026
  </p>
  ${
    sources
      ? `<section id="guide-sources" class="section-label">
    <ul><li><a href="https://www.paypal.com/us/cshelp/article/what-is-2-step-verification-help167">PayPal Help</a> <span>official</span></li></ul>
  </section>`
      : ''
  }
  ${body}
</main></body></html>`;

const cases = {
  'clean': page({
    body: `<p>PayPal’s setup flow uses an authenticator app. PayPal documents no recovery-code list, so save the setup secret.</p>`,
  }),
  'regressed': page({
    body: `<p>PayPal issues recovery codes at setup — download them from the Security page.</p>
<p>Full instructions: <a href="https://2facounter.com/this-guide-was-removed-8f2c1a/">the archived guide</a>.</p>
<p>Or see <a href="/guides/this-page-was-deleted-8f2c1a/">the in-site guide</a>.</p>`,
  }),
};

for (const [name, html] of Object.entries(cases)) {
  mkdirSync(join(root, name), { recursive: true });
  writeFileSync(join(root, name, 'index.html'), html);
}

let out = '';
let code = 0;
try {
  out = execFileSync(process.execPath, ['claim-audit.mjs'], {
    env: { ...process.env, CLAIM_AUDIT_ROOT: root },
    encoding: 'utf8',
  });
} catch (e) {
  out = `${e.stdout || ''}${e.stderr || ''}`;
  code = e.status ?? 1;
}
rmSync(root, { recursive: true, force: true });

const lines = out.split('\n').filter(Boolean);
const failures = lines.filter((l) => l.startsWith('✗'));
const dirty = failures.filter((l) => l.includes('/regressed/'));
const clean = failures.filter((l) => l.includes('/clean/'));

const checks = [
  ['audit exits non-zero when a fixture fails', code !== 0],
  ['clean page produces no failure', clean.length === 0],
  ['invented recovery-code list is caught', dirty.some((l) => /recovery codes at setup/i.test(l) || /recovery-code/i.test(l))],
  ['dead body-text URL is caught as a dead link', dirty.some((l) => /dead link/i.test(l) && l.includes('this-guide-was-removed'))],
  ['dead internal body-text link is caught', dirty.some((l) => /internal link/i.test(l) && l.includes('/guides/this-page-was-deleted'))],
];

let bad = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) bad++;
}
if (bad) {
  console.log('\n--- audit output ---');
  console.log(out.trim() || '(no output)');
}
console.log(bad === 0 ? `selftest: ${checks.length} checks passed` : `selftest: ${bad} of ${checks.length} checks failed`);
process.exit(bad === 0 ? 0 : 1);
