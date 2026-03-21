const { test, expect } = require('@playwright/test');

const FIXED_NOW_ISO = '2026-03-21T12:00:00-03:00';
const OPENING_BALANCE = 5000;

function toIsoDate(dateKey) {
  return `${dateKey}T12:00:00.000Z`;
}

function toDateKey(value) {
  return String(value).slice(0, 10);
}

function toMonthKey(value) {
  return toDateKey(value).slice(0, 7);
}

function parseDateKey(value) {
  const [year, month, day] = toDateKey(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
}

function shiftMonths(dateKey, amount) {
  const date = parseDateKey(dateKey);
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + amount;
  const day = date.getUTCDate();
  const shifted = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  const maxDay = lastDayOfMonth(shifted.getUTCFullYear(), shifted.getUTCMonth());
  shifted.setUTCDate(Math.min(day, maxDay));
  return toDateKey(shifted.toISOString());
}

function makeOccurrenceId(eventId, dateKey) {
  return `occ-${eventId}-${dateKey}`;
}

function buildEvent(partial) {
  const dateKey = partial.date;
  return {
    eventId: partial.eventId,
    title: partial.title,
    description: partial.description || null,
    type: partial.type,
    amount: partial.amount ?? null,
    category: partial.category || null,
    date: dateKey,
    endDate: partial.endDate || null,
    recurrence: partial.recurrence || 'NONE',
    recurrenceInterval: partial.recurrenceInterval || 1,
    isRecurring: Boolean(partial.isRecurring),
    status: partial.status || 'PENDING',
    flow: partial.flow,
    sourceType: partial.sourceType || 'MANUAL',
    sourceId: partial.sourceId || null,
    reminderEnabled: partial.reminderEnabled ?? true,
    reminderDaysBefore: partial.reminderDaysBefore ?? 3,
    colorToken: partial.colorToken || null,
    isManual: partial.isManual ?? true,
    isDerived: partial.isDerived ?? false,
    createdAt: partial.createdAt || toIsoDate(dateKey),
    updatedAt: partial.updatedAt || toIsoDate(dateKey),
    overrides: partial.overrides ? { ...partial.overrides } : {},
  };
}

function createMockState() {
  return {
    events: [
      buildEvent({
        eventId: 'manual-rent',
        title: 'Aluguel',
        description: 'Conta principal do escritorio',
        type: 'FIXED_BILL',
        amount: 1800,
        category: 'Moradia',
        date: '2026-03-10',
        flow: 'out',
        colorToken: 'calendar-bill',
      }),
      buildEvent({
        eventId: 'manual-income',
        title: 'Recebimento de cliente',
        description: 'Entrada prevista do contrato mensal',
        type: 'EXPECTED_INCOME',
        amount: 3200,
        category: 'Receita',
        date: '2026-03-12',
        flow: 'in',
        colorToken: 'calendar-income',
      }),
      buildEvent({
        eventId: 'manual-subscription',
        title: 'Assinatura premium',
        description: 'Ferramenta recorrente do time',
        type: 'SUBSCRIPTION',
        amount: 89.9,
        category: 'Software',
        date: '2026-03-20',
        recurrence: 'MONTHLY',
        recurrenceInterval: 1,
        isRecurring: true,
        flow: 'out',
        colorToken: 'calendar-subscription',
      }),
      buildEvent({
        eventId: 'manual-april-income',
        title: 'Salario abril',
        description: 'Entrada projetada para o proximo mes',
        type: 'EXPECTED_INCOME',
        amount: 4100,
        category: 'Receita',
        date: '2026-04-05',
        flow: 'in',
        colorToken: 'calendar-income',
      }),
    ],
    nextManualSequence: 1,
  };
}

function monthDelta(fromMonth, toMonth) {
  const [fromYear, fromM] = fromMonth.split('-').map(Number);
  const [toYear, toM] = toMonth.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toM - fromM);
}

function resolveOccurrenceStatus(event, dateKey) {
  return event.overrides?.[dateKey]?.status || event.status;
}

function shouldIncludeOccurrence(event, dateKey) {
  return resolveOccurrenceStatus(event, dateKey) !== 'CANCELED';
}

function buildOccurrence(event, dateKey) {
  const override = event.overrides?.[dateKey] || null;
  const status = override?.status || event.status;
  return {
    id: makeOccurrenceId(event.eventId, dateKey),
    eventId: event.eventId,
    occurrenceKey: dateKey,
    seriesDate: toIsoDate(event.date),
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    title: override?.title || event.title,
    description: override?.description ?? event.description,
    type: event.type,
    amount: override?.amount ?? event.amount,
    category: event.category,
    date: toIsoDate(dateKey),
    endDate: event.endDate ? toIsoDate(event.endDate) : null,
    recurrence: event.recurrence,
    recurrenceInterval: event.recurrenceInterval,
    isRecurring: event.isRecurring,
    status,
    flow: event.flow,
    reminderEnabled: event.reminderEnabled,
    reminderDaysBefore: event.reminderDaysBefore,
    colorToken: event.colorToken,
    isManual: event.isManual,
    isOverdue: status === 'OVERDUE',
    isDerived: event.isDerived,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function expandEventForMonth(event, monthKey) {
  const occurrences = [];
  const startMonth = toMonthKey(event.date);

  if (event.recurrence === 'NONE' || !event.isRecurring) {
    if (startMonth === monthKey && shouldIncludeOccurrence(event, event.date)) {
      occurrences.push(buildOccurrence(event, event.date));
    }
    return occurrences;
  }

  if (event.recurrence === 'MONTHLY') {
    const delta = monthDelta(startMonth, monthKey);
    if (delta >= 0) {
      const dateKey = shiftMonths(event.date, delta);
      if (toMonthKey(dateKey) === monthKey && shouldIncludeOccurrence(event, dateKey)) {
        occurrences.push(buildOccurrence(event, dateKey));
      }
    }
    return occurrences;
  }

  if (event.recurrence === 'WEEKLY') {
    const monthStart = parseDateKey(`${monthKey}-01`);
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0, 12, 0, 0));
    const step = 7 * Math.max(1, event.recurrenceInterval || 1);
    for (let cursor = parseDateKey(event.date); cursor <= monthEnd; cursor = new Date(cursor.getTime() + step * 86400000)) {
      const dateKey = toDateKey(cursor.toISOString());
      if (dateKey < event.date || toMonthKey(dateKey) !== monthKey) continue;
      if (shouldIncludeOccurrence(event, dateKey)) {
        occurrences.push(buildOccurrence(event, dateKey));
      }
    }
    return occurrences;
  }

  if (event.recurrence === 'YEARLY') {
    const dateKey = `${monthKey}-${event.date.slice(8, 10)}`;
    if (toMonthKey(dateKey) === monthKey && shouldIncludeOccurrence(event, dateKey)) {
      occurrences.push(buildOccurrence(event, dateKey));
    }
  }

  return occurrences;
}

function buildSnapshot(state, monthKey) {
  const events = state.events
    .flatMap((event) => expandEventForMonth(event, monthKey))
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));

  const groupedMap = new Map();
  let runningBalance = OPENING_BALANCE;

  for (const event of events) {
    const dayKey = toDateKey(event.date);
    if (!groupedMap.has(dayKey)) {
      groupedMap.set(dayKey, {
        date: dayKey,
        events: [],
        inflow: 0,
        outflow: 0,
        net: 0,
        pendingCount: 0,
        overdueCount: 0,
        pressureScore: 0,
        pressureLevel: 'low',
        projectedBalance: null,
        reasons: [],
      });
    }

    const group = groupedMap.get(dayKey);
    group.events.push(event);
    if (event.flow === 'in') group.inflow += Number(event.amount || 0);
    if (event.flow === 'out') group.outflow += Number(event.amount || 0);
    if (event.status === 'PENDING' || event.status === 'OVERDUE') group.pendingCount += 1;
    if (event.status === 'OVERDUE') group.overdueCount += 1;
  }

  const groupedByDay = Array.from(groupedMap.values())
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((group) => {
      group.net = Number((group.inflow - group.outflow).toFixed(2));
      runningBalance = Number((runningBalance + group.net).toFixed(2));
      group.projectedBalance = runningBalance;
      group.pressureScore = Number((group.outflow + group.pendingCount * 250 + group.overdueCount * 500).toFixed(2));
      group.pressureLevel =
        group.overdueCount > 0 || group.outflow >= 1500 || group.pendingCount >= 3
          ? 'high'
          : group.outflow >= 700 || group.pendingCount >= 2
            ? 'medium'
            : 'low';
      if (group.outflow > group.inflow) group.reasons.push('Saidas acima das entradas no dia');
      if (group.pendingCount >= 3) group.reasons.push('Muitas obrigacoes financeiras no mesmo dia');
      if ((group.projectedBalance || 0) < 1000) group.reasons.push('Folga de caixa reduzida apos este ponto');
      return group;
    });

  const totalExpectedInflow = Number(
    events.filter((event) => event.flow === 'in').reduce((sum, event) => sum + Number(event.amount || 0), 0).toFixed(2)
  );
  const totalExpectedOutflow = Number(
    events.filter((event) => event.flow === 'out').reduce((sum, event) => sum + Number(event.amount || 0), 0).toFixed(2)
  );
  const projectedBalance = Number((OPENING_BALANCE + totalExpectedInflow - totalExpectedOutflow).toFixed(2));
  const criticalDays = groupedByDay.filter((day) => day.pressureLevel === 'high');
  const overdueEvents = events.filter((event) => event.status === 'OVERDUE');

  return {
    period: {
      view: 'month',
      focusDate: toIsoDate(`${monthKey}-01`),
      startDate: toIsoDate(`${monthKey}-01`),
      endDate: toIsoDate(`${monthKey}-28`),
    },
    summary: {
      totalExpectedInflow,
      totalExpectedOutflow,
      projectedBalance,
      overdueCount: overdueEvents.length,
      nextDue: events.filter((event) => event.status === 'PENDING' || event.status === 'OVERDUE').slice(0, 5),
    },
    events,
    groupedByDay,
    criticalDays,
    overdueEvents,
    alerts: [],
    openingBalance: OPENING_BALANCE,
  };
}

async function installCalendarMocks(page) {
  const state = createMockState();

  await page.route(/\/api\/financial-calendar(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    const json = (status, body) =>
      route.fulfill({
        status,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(body),
      });

    if (method === 'GET' && path === '/api/financial-calendar/month') {
      const monthKey = (url.searchParams.get('date') || '2026-03').slice(0, 7);
      return json(200, buildSnapshot(state, monthKey));
    }

    if (method === 'POST' && path === '/api/financial-calendar') {
      const payload = JSON.parse(request.postData() || '{}');
      const eventId = `manual-created-${state.nextManualSequence++}`;
      state.events.push(
        buildEvent({
          eventId,
          title: payload.title,
          description: payload.description || null,
          type: payload.type,
          amount: payload.amount ?? null,
          category: payload.category || null,
          date: payload.date,
          recurrence: payload.recurrence || 'NONE',
          recurrenceInterval: payload.recurrenceInterval || 1,
          isRecurring: Boolean(payload.isRecurring || payload.recurrence !== 'NONE'),
          status: payload.status || 'PENDING',
          flow:
            payload.type === 'EXPECTED_INCOME'
              ? 'in'
              : payload.type === 'GOAL_DEADLINE' || payload.type === 'FINANCIAL_REMINDER' || payload.type === 'MANUAL_ALERT'
                ? 'neutral'
                : 'out',
          reminderEnabled: payload.reminderEnabled ?? true,
          reminderDaysBefore: payload.reminderDaysBefore ?? 0,
          colorToken: payload.colorToken || null,
        })
      );
      return json(201, { id: eventId });
    }

    const eventMatch = path.match(/^\/api\/financial-calendar\/([^/]+)$/);
    if (eventMatch && method === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}');
      const event = state.events.find((item) => item.eventId === eventMatch[1]);
      if (!event) return json(404, { error: 'Evento nao encontrado.' });

      Object.assign(event, {
        title: payload.title ?? event.title,
        description: payload.description !== undefined ? payload.description : event.description,
        type: payload.type ?? event.type,
        amount: payload.amount !== undefined ? payload.amount : event.amount,
        category: payload.category !== undefined ? payload.category : event.category,
        date: payload.date ?? event.date,
        recurrence: payload.recurrence ?? event.recurrence,
        status: payload.status ?? event.status,
        reminderEnabled: payload.reminderEnabled !== undefined ? payload.reminderEnabled : event.reminderEnabled,
        reminderDaysBefore: payload.reminderDaysBefore !== undefined ? payload.reminderDaysBefore : event.reminderDaysBefore,
        isRecurring: payload.isRecurring !== undefined ? payload.isRecurring : event.isRecurring,
        updatedAt: toIsoDate(payload.date || event.date),
      });

      return json(200, { id: event.eventId });
    }

    if (eventMatch && method === 'DELETE') {
      const index = state.events.findIndex((item) => item.eventId === eventMatch[1]);
      if (index === -1) return json(404, { error: 'Evento nao encontrado.' });
      state.events.splice(index, 1);
      return json(200, { success: true });
    }

    const actionMatch = path.match(/^\/api\/financial-calendar\/([^/]+)\/(paid|received|cancel)$/);
    if (actionMatch && method === 'POST') {
      const [, eventId, action] = actionMatch;
      const payload = JSON.parse(request.postData() || '{}');
      const occurrenceDate = toDateKey(payload.occurrenceDate || FIXED_NOW_ISO);
      const event = state.events.find((item) => item.eventId === eventId);
      if (!event) return json(404, { error: 'Evento nao encontrado.' });

      event.overrides = event.overrides || {};
      event.overrides[occurrenceDate] = {
        ...(event.overrides[occurrenceDate] || {}),
        status: action === 'paid' ? 'PAID' : action === 'received' ? 'RECEIVED' : 'CANCELED',
      };

      if (!event.isRecurring) {
        event.status = event.overrides[occurrenceDate].status;
      }

      return json(200, { success: true });
    }

    return route.continue();
  });

  return state;
}

async function freezeNow(page) {
  await page.addInitScript((fixedNowIso) => {
    const fixed = new Date(fixedNowIso).valueOf();
    const NativeDate = Date;

    class MockDate extends NativeDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixed);
          return;
        }
        super(...args);
      }

      static now() {
        return fixed;
      }
    }

    MockDate.UTC = NativeDate.UTC;
    MockDate.parse = NativeDate.parse;
    window.Date = MockDate;
  }, FIXED_NOW_ISO);
}

async function mountCalendar(page) {
  await freezeNow(page);
  await installCalendarMocks(page);
  await page.goto('/qa/financial-calendar');
  await expect(page.getByTestId('financial-calendar-month-label')).toContainText(/mar/i);
}

test('cria evento manual e atualiza calendario e resumo do mes', async ({ page }) => {
  await mountCalendar(page);

  await page.getByTestId('financial-calendar-new-event').click();
  await expect(page.getByTestId('financial-calendar-composer')).toBeVisible();
  await expect(page.getByTestId('financial-calendar-title')).toBeFocused();

  await page.getByTestId('financial-calendar-title').fill('Seguro empresarial');
  await page.getByTestId('financial-calendar-type').selectOption('FIXED_BILL');
  await page.getByLabel('Valor').fill('450');
  await page.getByLabel('Categoria').fill('Operacao');
  await page.getByTestId('financial-calendar-date').fill('2026-03-27');
  await page.getByTestId('financial-calendar-submit').click();

  await expect(page.getByTestId('financial-calendar-feedback')).toContainText(/Evento manual adicionado ao m.s financeiro./i);
  await expect(page.getByTestId('financial-calendar-day-sheet')).toBeVisible();
  await expect(page.getByText('Seguro empresarial')).toBeVisible();
  await expect(page.getByTestId('financial-calendar-day-sheet')).toContainText('R$ 450,00');
});

test('edita evento manual existente', async ({ page }) => {
  await mountCalendar(page);

  await page.getByTestId('financial-calendar-day-2026-03-10').click();
  await expect(page.getByTestId('financial-calendar-day-sheet')).toBeVisible();
  await page.getByTestId('financial-calendar-event-occ-manual-rent-2026-03-10-edit').click();

  await expect(page.getByTestId('financial-calendar-composer')).toBeVisible();
  await page.getByTestId('financial-calendar-title').fill('Aluguel revisado');
  await page.getByLabel('Valor').fill('1950');
  await page.getByTestId('financial-calendar-submit').click();

  await expect(page.getByTestId('financial-calendar-feedback')).toContainText(/Evento manual atualizado no calend.rio./i);
  await expect(page.getByTestId('financial-calendar-day-sheet')).toContainText('Aluguel revisado');
  await expect(page.getByTestId('financial-calendar-day-sheet')).toContainText('R$ 1.950,00');
});

test('marca saida como paga', async ({ page }) => {
  await mountCalendar(page);

  await page.getByTestId('financial-calendar-day-2026-03-10').click();
  await page.getByTestId('financial-calendar-event-occ-manual-rent-2026-03-10-paid').click();

  await expect(page.getByTestId('financial-calendar-feedback')).toContainText('Evento marcado como pago.');
  await expect(page.getByTestId('financial-calendar-day-sheet').getByText('Pago', { exact: true })).toBeVisible();
});

test('marca entrada como recebida', async ({ page }) => {
  await mountCalendar(page);

  await page.getByTestId('financial-calendar-day-2026-03-12').click();
  await page.getByTestId('financial-calendar-event-occ-manual-income-2026-03-12-received').click();

  await expect(page.getByTestId('financial-calendar-feedback')).toContainText('Evento marcado como recebido.');
  await expect(page.getByTestId('financial-calendar-day-sheet').getByText('Recebido', { exact: true })).toBeVisible();
});

test('cancela ocorrencia recorrente sem remover a serie inteira', async ({ page }) => {
  await mountCalendar(page);

  await page.getByTestId('financial-calendar-day-2026-03-20').click();
  await page.getByTestId('financial-calendar-event-occ-manual-subscription-2026-03-20-delete').click();

  await expect(page.getByTestId('financial-calendar-feedback')).toContainText(/Ocorr.ncia cancelada neste dia./i);
  await expect(page.getByText('Nenhum evento financeiro neste dia')).toBeVisible();

  await page.getByRole('button', { name: 'Fechar painel do dia' }).click();
  await page.getByRole('button', { name: /Pr.+ximo m.+s/i }).click();
  await page.getByTestId('financial-calendar-day-2026-04-20').click();
  await expect(page.getByText('Assinatura premium')).toBeVisible();
});

test('navega entre meses sem perder a leitura financeira', async ({ page }) => {
  await mountCalendar(page);

  await expect(page.getByTestId('financial-calendar-month-label')).toContainText(/mar/i);
  await page.getByRole('button', { name: /Pr.+ximo m.+s/i }).click();
  await expect(page.getByTestId('financial-calendar-month-label')).toContainText(/abr/i);
  await page.getByTestId('financial-calendar-day-2026-04-05').click();
  await expect(page.getByText('Salario abril')).toBeVisible();

  await page.getByRole('button', { name: 'Fechar painel do dia' }).click();
  await page.getByRole('button', { name: /M.+s anterior/i }).click();
  await expect(page.getByTestId('financial-calendar-month-label')).toContainText(/mar/i);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mantem scroll horizontal, foco e acoes rapidas utilizaveis em tela pequena', async ({ page }) => {
    await mountCalendar(page);

    const metrics = await page.getByTestId('financial-calendar-grid-scroll').evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    await page.getByTestId('financial-calendar-day-2026-03-10').click();
    await expect(page.getByTestId('financial-calendar-day-sheet')).toBeVisible();
    await expect(page.getByTestId('financial-calendar-event-occ-manual-rent-2026-03-10-paid')).toBeVisible();

    await page.getByRole('button', { name: 'Fechar painel do dia' }).click();
    await page.getByTestId('financial-calendar-new-event').click();
    await expect(page.getByTestId('financial-calendar-composer')).toBeVisible();
    await expect(page.getByTestId('financial-calendar-title')).toBeFocused();
  });
});

