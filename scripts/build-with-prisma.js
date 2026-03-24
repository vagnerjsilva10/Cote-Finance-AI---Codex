const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DATABASE_ENV_KEYS = ['DATABASE_URL', 'DIRECT_DATABASE_URL', 'SHADOW_DATABASE_URL'];
const DATABASE_URL_PROTOCOL_REGEX = /^(postgresql|postgres):\/\//i;

const ENV_FILES = ['.env', '.env.local', '.env.production'];

function sanitizeValue(value) {
  if (typeof value !== 'string') return value;

  let normalized = value.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function loadEnvFiles() {
  for (const fileName of ENV_FILES) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || typeof process.env[key] === 'string') continue;

      const rawValue = line.slice(separatorIndex + 1).trim();
      process.env[key] = sanitizeValue(rawValue);
    }
  }
}

loadEnvFiles();

for (const key of DATABASE_ENV_KEYS) {
  if (typeof process.env[key] === 'string') {
    process.env[key] = sanitizeValue(process.env[key]);
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[build] DATABASE_URL ausente. Configure a conexao PostgreSQL no Vercel antes do deploy.');
  process.exit(1);
}

if (!DATABASE_URL_PROTOCOL_REGEX.test(databaseUrl)) {
  console.error(
    '[build] DATABASE_URL invalida. Use postgresql:// ou postgres:// sem aspas extras no painel do Vercel.'
  );
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (process.env.PRISMA_SKIP_MIGRATE_DEPLOY !== '1') {
  run('npx', ['prisma', 'migrate', 'deploy']);
}
run('npx', ['prisma', 'generate']);
run('npx', ['next', 'build']);
