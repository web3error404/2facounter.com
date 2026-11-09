// Verified deploy pipeline: build → real-browser tests → wrangler deploy.
//
// Nothing ships unless the freshly built site passes the functional suite
// against a local preview of the exact dist/ output:
//   - e2e-smoke.mjs   (generator functionality, mobile menu, memory-only keys)
//   - camera-race.mjs (camera lifecycle / orphan-stream regression)
// Set FULL_AUDIT=1 to also run full-audit.mjs + tablet-sweep.mjs (slow:
// every page at desktop+mobile). Set SKIP_DEPLOY=1 to build+test only.
import { spawn, spawnSync } from 'node:child_process';

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\n✗ ${cmd} ${args.join(' ')} failed — deploy aborted`);
    process.exit(r.status ?? 1);
  }
};

console.log('▶ astro build');
run('npx', ['astro', 'build']);

console.log('▶ starting preview server on :4322');
const server = spawn('npx', ['astro', 'preview', '--port', '4322'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
});

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await new Promise((r) => setTimeout(r, 500));
  up = await fetch('http://localhost:4322/').then((r) => r.ok).catch(() => false);
}
if (!up) {
  console.error('✗ preview server did not start — deploy aborted');
  server.kill();
  process.exit(1);
}

try {
  console.log('▶ e2e-smoke');
  run('node', ['e2e-smoke.mjs']);
  console.log('▶ camera-race');
  run('node', ['camera-race.mjs']);
  if (process.env.FULL_AUDIT === '1') {
    console.log('▶ full-audit');
    run('node', ['full-audit.mjs']);
    console.log('▶ tablet-sweep');
    run('node', ['tablet-sweep.mjs']);
  }
} finally {
  server.kill();
}

if (process.env.SKIP_DEPLOY === '1') {
  console.log('✓ build + tests green (SKIP_DEPLOY=1 — not shipping)');
} else {
  console.log('▶ wrangler deploy');
  run('npx', ['wrangler', 'deploy']);
  console.log('✓ tested and deployed');
}
