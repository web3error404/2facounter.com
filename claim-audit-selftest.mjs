// Self-test for claim-audit.mjs.
//
// An audit that reports "0 problems" is worthless if it has quietly stopped
// looking, and worse than useless if it fires on true sentences: people learn
// to ignore it. So this fixture holds three pages:
//
//   clean      — true sentences that sit one word away from the rule: denials,
//                comparisons, another vendor's recovery codes, a sentence that
//                never asserts anything. Must produce no failure at all.
//   regressed  — the errors this audit exists to catch: a promise of a feature
//                the vendor does not document, a dead external body-text URL,
//                and a dead internal body-text link.
//
// The clean page is the false-positive challenge. If a later refinement of the
// rule starts rejecting "Unlike PayPal, Discord issues recovery codes", this
// test fails before a reader ever sees the audit cry wolf.
//
// Run: node claim-audit-selftest.mjs   (needs the network for one 404 probe)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
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
  // Every sentence here mentions PayPal or recovery codes (often both) and is
  // true. None may be reported.
  'clean': page({
    body: `
<p>PayPal’s setup flow uses an authenticator app. PayPal documents no recovery-code list, so save the setup secret.</p>
<p>PayPal’s help centre does not mention recovery codes anywhere.</p>
<p>PayPal has never provided a recovery-code list.</p>
<p>Unlike PayPal, Discord and Zoom both issue recovery codes.</p>
<p>Discord issues recovery codes; PayPal does not.</p>
<p>PayPal’s recovery-code coverage is thinner than Discord’s.</p>
<p>Recovery codes are worth printing, whichever service issues them.</p>
<p>PayPal can deactivate 2-step verification at any time.</p>
<p>Zoom’s recovery codes are single-use.</p>`,
  }),
  'regressed': page({
    body: `<p>PayPal issues recovery codes at setup — download them from the Security page.</p>
<p>Recovery codes are provided by PayPal when you enable 2-step verification.</p>
<p>If PayPal offers recovery codes, download them now.</p>
<p>Full instructions: <a href="https://2facounter.com/this-guide-was-removed-8f2c1a/">the archived guide</a>.</p>
<p>Or see <a href="/guides/this-page-was-deleted-8f2c1a/">the in-site guide</a>.</p>`,
  }),
};

for (const [name, html] of Object.entries(cases)) {
  mkdirSync(join(root, name), { recursive: true });
  writeFileSync(join(root, name, 'index.html'), html);
}

// ---- run the real audit against the fixture
const run = (script, args = [], root_ = root) => {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      env: { ...process.env, CLAIM_AUDIT_ROOT: root_ },
      encoding: 'utf8',
    });
    return { out: stdout, code: 0 };
  } catch (e) {
    return { out: `${e.stdout || ''}${e.stderr || ''}`, code: e.status ?? 1 };
  }
};

const base = run('claim-audit.mjs');

const lines = base.out.split('\n').filter(Boolean);
const failures = lines.filter((l) => l.startsWith('✗'));
const dirty = failures.filter((l) => l.includes('/regressed/'));
const clean = failures.filter((l) => l.includes('/clean/'));

// ---- evidence mutation: the report must follow the table, not a copy of it
// copy the checker and its evidence base somewhere writable, change every
// evidence field, and re-run. If any part of the pipeline still prints the old
// values, the audit is reporting from memory rather than from the evidence.
const auditDir = join(root, '_mutation');
mkdirSync(auditDir, { recursive: true });
copyFileSync('claim-audit.mjs', join(auditDir, 'claim-audit.mjs'));

const OLD = {
  checked: "checked: '2026-11-23'",
  source: "source: 'https://www.paypal.com/us/cshelp/article/what-is-2-step-verification-help167'",
  proposition: "proposition: 'PayPal 2-step verification issues no recovery codes and documents no recovery-code list.'",
};
const NEW = {
  checked: "checked: '2027-01-15'",
  source: "source: 'https://example.com/mutated-evidence-base'",
  proposition: "proposition: 'MUTATED PROPOSITION: PayPal issues recovery codes after all.'",
};

const originalEvidence = readFileSync('claim-evidence.mjs', 'utf8');
let mutated = originalEvidence;
for (const key of Object.keys(OLD)) {
  if (!mutated.includes(OLD[key])) throw new Error(`selftest: could not find ${key} in claim-evidence.mjs`);
  mutated = mutated.split(OLD[key]).join(NEW[key]);
}
writeFileSync(join(auditDir, 'claim-evidence.mjs'), mutated);
const mutation = run(join(auditDir, 'claim-audit.mjs'), ['--no-links']);

// ---- evidence completeness: an entry with no source must be refused
const stripped = originalEvidence.replace(/^\s*source: '[^']*',\n/m, '');
if (stripped === originalEvidence) throw new Error('selftest: could not strip the source field');
writeFileSync(join(auditDir, 'claim-evidence.mjs'), stripped);
const incomplete = run(join(auditDir, 'claim-audit.mjs'), ['--no-links']);

rmSync(root, { recursive: true, force: true });

const checks = [
  ['audit exits non-zero when a fixture fails', base.code !== 0],
  ['true sentences produce no failure (false-positive challenge)', clean.length === 0],
  ['invented recovery-code list is caught', dirty.some((l) => /issues recovery codes at setup/i.test(l))],
  ['rephrased invented claim is caught', dirty.some((l) => /provided by PayPal/i.test(l))],
  ['conditional invented claim is caught', dirty.some((l) => /offers recovery codes, download them now/i.test(l))],
  ['dead external body-text URL is caught as a dead link', dirty.some((l) => /dead link/i.test(l) && l.includes('this-guide-was-removed'))],
  ['dead internal body-text link is caught', dirty.some((l) => /internal link/i.test(l) && l.includes('/guides/this-page-was-deleted'))],
  ['failure quotes the evidence from the table', dirty.every((l) => !/recovery codes|recovery-code/i.test(l) || /evidence: https:\/\/\S+, read 2026-11-23/.test(l))],

  ['mutated proposition is reported, not the old text', mutation.out.includes('MUTATED PROPOSITION: PayPal issues recovery codes after all.')],
  ['mutated source and date are reported', mutation.out.includes('https://example.com/mutated-evidence-base') && mutation.out.includes('read 2027-01-15')],
  ['stale evidence no longer appears anywhere in the report', !mutation.out.includes(OLD.source) && !mutation.out.includes('read 2026-11-23')],
  ['an entry with no source is refused', incomplete.code !== 0 && /claim-evidence: entry "PayPal" is missing source/.test(incomplete.out)],
];

let bad = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) bad++;
}
if (bad) {
  console.log('\n--- audit output ---');
  console.log(base.out.trim() || '(no output)');
  console.log('--- mutated evidence output ---');
  console.log(mutation.out.trim() || '(no output)');
  console.log('--- incomplete evidence output ---');
  console.log(incomplete.out.trim() || '(no output)');
}
console.log(bad === 0 ? `selftest: ${checks.length} checks passed` : `selftest: ${bad} of ${checks.length} checks failed`);
process.exit(bad === 0 ? 0 : 1);
