const { spawnSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, '.tmp', 'period-tests');
const tscBin = path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');

const sourceFiles = [
  'tests/date/period-resolver.test.ts',
  'tests/dashboard/date-range.test.ts',
  'lib/date/period-resolver.ts',
  'lib/dashboard/date-range.ts',
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
}

try {
  rmSync(outDir, { recursive: true, force: true });

  run(process.execPath, [
    tscBin,
    '--module',
    'commonjs',
    '--target',
    'es2020',
    '--moduleResolution',
    'node',
    '--strict',
    '--esModuleInterop',
    '--skipLibCheck',
    '--types',
    'node',
    '--outDir',
    outDir,
    '--rootDir',
    '.',
    ...sourceFiles,
  ]);

  run(process.execPath, [
    '--test',
    path.join(outDir, 'tests', 'date', 'period-resolver.test.js'),
    path.join(outDir, 'tests', 'dashboard', 'date-range.test.js'),
  ]);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
