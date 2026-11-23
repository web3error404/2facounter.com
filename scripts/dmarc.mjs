// DMARC TXT record for 2facounter.com, applied through the Cloudflare API.
//
// A domain whose whole pitch is authentication had no _dmarc record at all,
// which leaves receivers with no instruction for mail that claims to come from
// @2facounter.com, and no reports when someone tries. This starts at p=none:
// receivers send aggregate reports but never reject anything, so switching it
// on cannot break delivery. Move to p=quarantine once the reports are clean.
//
// Note the domain does not send mail today — Cloudflare Email Routing only
// receives and forwards — so the target state is quarantine/reject, not a
// loosened policy for an outbound sender that does not exist.
//
// Requires a Cloudflare API token scoped Zone.DNS:Edit for the zone. The
// wrangler OAuth token does not carry DNS scope, so `wrangler login` will not
// help here. Create one at:
//   Cloudflare dashboard -> My Profile -> API Tokens -> Create Token
//   Permissions: Zone / DNS / Edit   Zone Resources: 2facounter.com
//
// Usage:
//   CF_API_TOKEN=... node scripts/dmarc.mjs                    apply p=none
//   CF_API_TOKEN=... node scripts/dmarc.mjs --policy quarantine
//   CF_API_TOKEN=... node scripts/dmarc.mjs --dry-run          print, do not write
//   CF_API_TOKEN=... node scripts/dmarc.mjs --show             read the record back

const ZONE_NAME = '2facounter.com';
const RECORD_NAME = `_dmarc.${ZONE_NAME}`;
const REPORT_TO = `mailto:hello@${ZONE_NAME}`;
const API = 'https://api.cloudflare.com/client/v4';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const policy = option('policy', 'none');
const dryRun = flag('dry-run');
const showOnly = flag('show');
const token = process.env.CF_API_TOKEN;

if (!['none', 'quarantine', 'reject'].includes(policy)) {
  console.error(`✗ unknown policy "${policy}" — use none, quarantine or reject`);
  process.exit(1);
}
if (!token) {
  console.error('✗ CF_API_TOKEN is not set (needs Zone.DNS:Edit on 2facounter.com)');
  process.exit(1);
}

const content = `v=DMARC1; p=${policy}; rua=${REPORT_TO}; fo=1; adkim=r; aspf=r`;

async function call(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const detail = body.errors?.map((e) => e.message).join('; ') || res.statusText;
    throw new Error(`${init.method || 'GET'} ${path} failed (${res.status}): ${detail}`);
  }
  return body.result;
}

const zones = await call(`/zones?name=${ZONE_NAME}`);
const zone = zones?.[0];
if (!zone) {
  console.error(`✗ zone ${ZONE_NAME} not visible to this token`);
  process.exit(1);
}

const existing = await call(`/zones/${zone.id}/dns_records?type=TXT&name=${RECORD_NAME}`);
const current = existing?.[0];

if (showOnly) {
  console.log(current ? `${RECORD_NAME}  TXT  "${current.content}"  (ttl ${current.ttl})` : `${RECORD_NAME}  — no record`);
  process.exit(0);
}

console.log(`▶ ${RECORD_NAME} -> ${content}`);

if (dryRun) {
  console.log(`  ${current ? 'would UPDATE' : 'would CREATE'} (dry run, nothing written)`);
  process.exit(0);
}

const payload = { type: 'TXT', name: RECORD_NAME, content, ttl: 3600, comment: 'DMARC — added 2026-11-23' };
if (current) {
  await call(`/zones/${zone.id}/dns_records/${current.id}`, { method: 'PUT', body: JSON.stringify(payload) });
  console.log('✓ record updated');
} else {
  await call(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify(payload) });
  console.log('✓ record created');
}

const after = await call(`/zones/${zone.id}/dns_records?type=TXT&name=${RECORD_NAME}`);
console.log(`✓ live at Cloudflare: "${after?.[0]?.content}"`);
console.log('  Public DNS may take a minute to show it. Verify with:');
console.log(`    Resolve-DnsName ${RECORD_NAME} -Type TXT`);
