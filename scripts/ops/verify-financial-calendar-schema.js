const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const schemaPath = path.join(root, 'prisma', 'schema.prisma');
const migrationPath = path.join(root, 'prisma', 'migrations', '202603211520_financial_events_foundation', 'migration.sql');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

function check(condition, message, details) {
  return { ok: Boolean(condition), message, details: details || null };
}

const schema = read(schemaPath);
const migration = read(migrationPath);
const checks = [];

checks.push(check(/model\s+FinancialEvent\s+\{/.test(schema), 'Model FinancialEvent existe no schema.'));
checks.push(check(/model\s+FinancialEventOccurrence\s+\{/.test(schema), 'Model FinancialEventOccurrence existe no schema.'));
checks.push(check(/financial_events\s+FinancialEvent\[\]/.test(schema), 'Relacoes aditivas em User e Workspace permanecem compativeis.'));
checks.push(check(/@@unique\(\[financial_event_id, occurrence_date\]\)/.test(schema), 'Occurrence override tem chave unica por evento e data.'));
checks.push(check(/@@index\(\[workspace_id, source_type, source_id\]\)/.test(schema), 'Indice de origem existe para sincronizacao confiavel.'));
checks.push(check(/CREATE TABLE IF NOT EXISTS "FinancialEvent"/.test(migration), 'Migration cria FinancialEvent de forma aditiva.'));
checks.push(check(/CREATE TABLE IF NOT EXISTS "FinancialEventOccurrence"/.test(migration), 'Migration cria FinancialEventOccurrence de forma aditiva.'));
checks.push(check(/ON DELETE CASCADE ON UPDATE CASCADE/.test(migration), 'Override possui cascata segura para integridade referencial.'));
checks.push(check(/ON DELETE RESTRICT ON UPDATE CASCADE/.test(migration), 'Workspace vinculada preserva integridade em deploy.'));
checks.push(check(!/(DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|ALTER TABLE\s+"[^"]+"\s+DROP)/i.test(migration), 'Migration nao contem operacoes destrutivas.'));
checks.push(check(!/ALTER TABLE\s+"(User|Workspace|Debt|Goal|Transaction)"\s+ALTER COLUMN/i.test(migration), 'Migration nao altera colunas existentes de tabelas legadas.'));
checks.push(check(/"recurrence"\s+TEXT NOT NULL DEFAULT 'NONE'/.test(migration), 'Recorrencia possui default estavel.'));
checks.push(check(/"recurrence_interval"\s+INTEGER NOT NULL DEFAULT 1/.test(migration), 'Intervalo de recorrencia possui default valido.'));
checks.push(check(/"status"\s+TEXT NOT NULL DEFAULT 'PENDING'/.test(migration), 'Status possui default seguro para dados novos.'));

const prismaValidate = process.platform === 'win32'
  ? run('cmd.exe', ['/c', 'npx', 'prisma', 'validate', '--schema', 'prisma/schema.prisma'])
  : run('npx', ['prisma', 'validate', '--schema', 'prisma/schema.prisma']);
checks.push(
  check(
    prismaValidate.ok,
    'Prisma validate passou para o schema atual.',
    prismaValidate.ok ? prismaValidate.stdout.trim() : prismaValidate.stderr.trim()
  )
);

const failed = checks.filter((item) => !item.ok);
const lines = checks.map((item) => `${item.ok ? 'OK' : 'FAIL'} ${item.message}${item.details ? ` :: ${item.details}` : ''}`);
console.log(lines.join('\n'));

if (failed.length > 0) {
  process.exit(1);
}
