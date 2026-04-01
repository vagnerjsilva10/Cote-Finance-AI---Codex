import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getComparisonDateRange,
  listDashboardBucketKeys,
  resolveDashboardDateRange,
} from '../../lib/dashboard/date-range';

const TZ = 'America/Sao_Paulo';

test('today resolve intervalo correto', () => {
  const now = new Date('2026-04-01T15:30:00.000Z');
  const range = resolveDashboardDateRange({
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
  const range = resolveDashboardDateRange({
    period: 'last_7_days',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-03-26');
  assert.equal(range.endDate, '2026-04-01');
  assert.equal(range.totalDays, 7);
  assert.equal(range.granularity, 'day');
});

test('this_month resolve intervalo correto', () => {
  const now = new Date('2026-04-20T16:00:00.000Z');
  const range = resolveDashboardDateRange({
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
  const range = resolveDashboardDateRange({
    period: 'last_month',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-03-01');
  assert.equal(range.endDate, '2026-03-31');
  assert.equal(range.totalDays, 31);
});

test('custom respeita start/end', () => {
  const now = new Date('2026-04-20T16:00:00.000Z');
  const range = resolveDashboardDateRange({
    period: 'custom',
    startDate: '2026-03-20',
    endDate: '2026-03-10',
    timeZone: TZ,
    now,
  });

  assert.equal(range.period, 'custom');
  assert.equal(range.startDate, '2026-03-10');
  assert.equal(range.endDate, '2026-03-20');
  assert.equal(range.totalDays, 11);
});

test('cards/comparativo usa periodo anterior equivalente para 7 dias', () => {
  const now = new Date('2026-04-01T15:30:00.000Z');
  const range = resolveDashboardDateRange({
    period: 'last_7_days',
    timeZone: TZ,
    now,
  });
  const comparison = getComparisonDateRange(range);

  assert.equal(comparison.startDate, '2026-03-19');
  assert.equal(comparison.endDate, '2026-03-25');
  assert.equal(comparison.totalDays, 7);
});

test('grafico respeita o intervalo pelo bucket correto', () => {
  const now = new Date('2026-04-15T16:00:00.000Z');
  const range = resolveDashboardDateRange({
    period: 'this_month',
    timeZone: TZ,
    now,
  });

  const buckets = listDashboardBucketKeys(range);
  assert.equal(buckets.length, 15);
  assert.equal(buckets[0], '2026-04-01');
  assert.equal(buckets[buckets.length - 1], '2026-04-15');
});

test('lista/transacoes no preset today usa apenas o dia atual', () => {
  const now = new Date('2026-04-01T15:30:00.000Z');
  const range = resolveDashboardDateRange({
    period: 'today',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, range.endDate);
  assert.equal(range.totalDays, 1);
});

test('mudanca de mes nao perde last_month', () => {
  const now = new Date('2026-04-01T03:15:00.000Z');
  const range = resolveDashboardDateRange({
    period: 'last_month',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-03-01');
  assert.equal(range.endDate, '2026-03-31');
});

test('timezone nao desloca o dia incorretamente', () => {
  const now = new Date('2026-04-01T02:30:00.000Z');
  const range = resolveDashboardDateRange({
    period: 'today',
    timeZone: TZ,
    now,
  });

  assert.equal(range.startDate, '2026-03-31');
  assert.equal(range.endDate, '2026-03-31');
});


