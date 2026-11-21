import { spawnSync } from 'node:child_process';

const TEST_BRANCH = 'develop';

const wrangler = (...args) => {
  const { status } = spawnSync('npx', ['wrangler', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (status !== 0) process.exit(status ?? 1);
};

if (process.env.WORKERS_CI_BRANCH === TEST_BRANCH) {
  wrangler('d1', 'migrations', 'apply', 'DB', '--remote', '-c', 'wrangler.test.jsonc');
}

wrangler('preview');
