import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getComparisonRange,
  normalizeDateRange,
  resolveDateRange,
} from '../../lib/date/period-resolver';

const TZ = 'America/Sao_Paulo';

test('today resolve intervalo correto', () => {
  const now = new Date('2026-04-01T15:30:00.000Z');
  const range = resolveDateRange({
    period: 'today',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-04-01');
  assert.equal(range.endDate, '2026-04-01');
  assert.equal(range.totalDays, 1);
  assert.equal(range.granularity, 'hour');
});

test('last_7_days resolve intervalo correto', () => {
  const now = new Date('2026-04-01T15:30:00.000Z');
  const range = resolveDateRange({
    period: 'last_7_days',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-03-26');
  assert.equal(range.endDate, '2026-04-01');
  assert.equal(range.totalDays, 7);
});

test('last_30_days resolve intervalo correto', () => {
  const now = new Date('2026-04-01T15:30:00.000Z');
  const range = resolveDateRange({
    period: 'last_30_days',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-03-03');
  assert.equal(range.endDate, '2026-04-01');
  assert.equal(range.totalDays, 30);
});

test('this_month resolve intervalo correto', () => {
  const now = new Date('2026-04-20T16:00:00.000Z');
  const range = resolveDateRange({
    period: 'this_month',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-04-01');
  assert.equal(range.endDate, '2026-04-20');
  assert.equal(range.totalDays, 20);
});

test('last_month resolve intervalo correto', () => {
  const now = new Date('2026-04-20T16:00:00.000Z');
  const range = resolveDateRange({
    period: 'last_month',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-03-01');
  assert.equal(range.endDate, '2026-03-31');
  assert.equal(range.totalDays, 31);
});

test('last_90_days resolve intervalo correto', () => {
  const now = new Date('2026-04-20T16:00:00.000Z');
  const range = resolveDateRange({
    period: 'last_90_days',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-01-21');
  assert.equal(range.endDate, '2026-04-20');
  assert.equal(range.totalDays, 90);
});

test('custom respeita start/end com intervalo inclusivo', () => {
  const range = resolveDateRange({
    period: 'custom',
    startDate: '2026-03-20',
    endDate: '2026-03-10',
    timeZone: TZ,
    now: new Date('2026-04-20T16:00:00.000Z'),
  });

  assert.equal(range.period, 'custom');
  assert.equal(range.startDate, '2026-03-10');
  assert.equal(range.endDate, '2026-03-20');
  assert.equal(range.totalDays, 11);
});

test('comparativo usa periodo anterior equivalente para 7 dias', () => {
  const range = resolveDateRange({
    period: 'last_7_days',
    timeZone: TZ,
    now: new Date('2026-04-01T15:30:00.000Z'),
  });
  const comparison = getComparisonRange(range);

  assert.equal(comparison.startDate, '2026-03-19');
  assert.equal(comparison.endDate, '2026-03-25');
  assert.equal(comparison.totalDays, 7);
});

test('virada de mes preserva acesso ao mes passado', () => {
  const range = resolveDateRange({
    period: 'last_month',
    timeZone: TZ,
    now: new Date('2026-04-01T03:15:00.000Z'),
  });

  assert.equal(range.startDate, '2026-03-01');
  assert.equal(range.endDate, '2026-03-31');
});

test('timezone nao desloca o dia incorretamente', () => {
  const range = resolveDateRange({
    period: 'today',
    timeZone: TZ,
    now: new Date('2026-04-01T02:30:00.000Z'),
  });

  assert.equal(range.startDate, '2026-03-31');
  assert.equal(range.endDate, '2026-03-31');
});

test('normalizeDateRange aceita intervalo valido', () => {
  const normalized = normalizeDateRange('2026-01-01', '2026-01-31', TZ);
  assert.ok(normalized);
  assert.equal(normalized?.startDate, '2026-01-01');
  assert.equal(normalized?.endDate, '2026-01-31');
  assert.equal(normalized?.totalDays, 31);
});
