# Cote Finance AI - Revisao Arquitetural e Plano de Evolucao

Data: 2026-03-22
Escopo: arquitetura de produto (nao UI)

## 1) Arquitetura ideal do sistema

### 1.1 Principio central
A arquitetura alvo deve adotar **Transaction como fonte unica de verdade** para fluxo financeiro. Tudo que for calendario, projecao, alerta e dashboard deve ser derivado de:

- transacoes confirmadas (historico real)
- transacoes previstas (futuro planejado)
- regras de recorrencia e parcelamento que geram previsao controlada
- metadados de metas e dividas para contexto e decisao

### 1.2 Camadas recomendadas

1. Camada de dominio (write model)
- Transaction
- RecurrenceRule
- DebtContract
- InstallmentPlan
- Goal
- Wallet

2. Camada de projecao (read model)
- DailyCashProjection
- CalendarEventView
- DashboardView
- AlertFeed

3. Camada de aplicacao
- Comandos (criar/editar/excluir/marcar status)
- Consultas (dashboard, calendario, insights, previsao)
- Motor de projeccao incremental

4. Camada de integracao
- API HTTP
- Jobs assincronos (recalculo, alertas, digest)
- Outbox de eventos de dominio

### 1.3 Regras arquiteturais obrigatorias

- Nao duplicar origem de dado entre modulos.
- Calendario e dashboard nunca gravam dado base.
- Recorrencia nao materializa infinitamente em banco.
- Toda previsao deve ter trilha de origem (`source_type`, `source_id`).
- Mudancas de status com impacto de saldo precisam ser atomicas.
- Modulos leem read-model; write-model so por comandos de dominio.

## 2) Modelo de dados sugerido

## 2.1 Modelo canonico (alvo)

### Tabelas nucleares

1. `wallet`
- `id`, `workspace_id`, `name`, `type`, `opening_balance`
- saldo atual deve ser derivado por projeccao/aggregate (ou snapshot controlado)

2. `transaction`
- `id`, `workspace_id`, `wallet_id`, `type` (`INCOME`,`EXPENSE`,`TRANSFER`)
- `amount`, `occurred_at`, `effective_at` (para previsao/vencimento)
- `status` (`PLANNED`,`CONFIRMED`,`CANCELED`)
- `origin_type` (`MANUAL`,`RECURRENCE`,`INSTALLMENT`,`DEBT`,`GOAL`,`SYSTEM`)
- `origin_id`
- `category_id`, `description`, `payment_method`

3. `recurrence_rule`
- `id`, `workspace_id`, `kind` (`INCOME`,`EXPENSE`)
- `title`, `amount`, `category_id`
- `frequency`, `interval`, `start_date`, `end_date`
- `anchor_day`, `timezone`, `status`

4. `debt_contract`
- `id`, `workspace_id`, `kind` (`ONE_TIME`,`INSTALLMENT`,`REVOLVING`)
- `principal_amount`, `interest_model`, `interest_rate`
- `start_date`, `due_policy`, `status`

5. `installment_plan`
- `id`, `workspace_id`, `debt_contract_id`
- `total_installments`, `installment_amount`, `first_due_date`, `status`

6. `goal`
- `id`, `workspace_id`, `name`, `target_amount`, `deadline`, `status`

7. `goal_contribution`
- `id`, `workspace_id`, `goal_id`, `transaction_id`, `amount`

8. `manual_reminder`
- apenas para alerta neutro (sem impacto financeiro)

### Read models

9. `daily_cash_projection` (materializado por dia)
- `workspace_id`, `date`, `opening_balance`, `inflow`, `outflow`, `closing_balance`

10. `calendar_event_view` (pode ser view SQL ou tabela materializada)
- eventos derivados de transacao planejada/confirmada, parcelas, metas e lembretes

## 2.2 Ajustes em cima do schema atual

- `Transaction` ja existe e deve virar centro do dominio ([schema.prisma](../../prisma/schema.prisma#L168)).
- `FinancialEvent` deve ficar apenas para lembrete manual (ou ser descontinuado para derivados) ([schema.prisma](../../prisma/schema.prisma#L266)).
- `Debt.status` hoje conflita com o uso real; padronizar enum ([schema.prisma](../../prisma/schema.prisma#L85), [lib/debts.ts](../../lib/debts.ts#L35), [lib/debts.ts](../../lib/debts.ts#L145)).
- `Investment` deve referenciar `wallet_id` por FK, nao `institution` string ([schema.prisma](../../prisma/schema.prisma#L122), [app/api/investments/route.ts](../../app/api/investments/route.ts#L128)).

## 2.3 Indices minimos recomendados

Adicionar no modelo de transacao:

- `@@index([workspace_id, effective_at])`
- `@@index([workspace_id, status, effective_at])`
- `@@index([workspace_id, origin_type, origin_id])`
- `@@index([workspace_id, wallet_id, effective_at])`

Adicionar em wallet:
- `@@unique([workspace_id, name])` (normalizado)

Adicionar em recorrencia:
- `@@index([workspace_id, status, start_date, end_date])`

## 3) Fluxo completo de dados

### 3.1 Escrita (comandos)

1. Usuario cria recorrencia.
2. Sistema grava `recurrence_rule`.
3. Motor de projeccao gera transacoes `PLANNED` no horizonte configurado (ex.: 120 dias).
4. Usuario confirma/paga item -> `transaction.status = CONFIRMED`.
5. Aggregate/snapshot atualiza `daily_cash_projection`.
6. Dashboard/calendario/alertas leem apenas read model.

### 3.2 Leitura (consultas)

1. Dashboard consulta `dashboard_view` (saldo atual, saldo previsto, alertas, proximos eventos).
2. Calendario consulta `calendar_event_view` por mes/semana/dia.
3. Projecao usa `daily_cash_projection` para responder "quando o dinheiro acaba".
4. Insights usam serie historica + previsao, nao lista truncada de ultimas N transacoes.

### 3.3 Status e impacto de saldo

Regra unica:
- `PLANNED -> CONFIRMED` aplica impacto real no caixa.
- `CONFIRMED -> CANCELED` exige estorno contabil explicito (transacao reversa).
- `CONFIRMED -> PLANNED` nao permitido por rota de conveniencia.

## 4) Como cada modulo se conecta

1. Transacoes (base)
- modulo central de escrita e conciliacao.
- exposto para todos os demais como origem financeira.

2. Recorrencia
- grava apenas regra.
- gera previsoes de transacao com origem rastreavel.

3. Calendario financeiro
- apenas leitura derivada.
- sem sincronizacao de escrita em GET.

4. Projecao de saldo
- processa carteira + transacoes planejadas/confirmadas + parcelas + metas.
- entrega curva diaria e data de ruptura de caixa.

5. Dividas e parcelas
- contrato de divida + plano de parcelas.
- cada parcela vira transacao planejada.

6. Metas
- progresso por contribuicao vinculada a transacao.
- prazo entra em calendario e alerta.

7. Insights e alertas
- motor sobre read-model diario e serie historica.
- alertas deterministas com severidade e justificativa.

8. Dashboard
- orquestra read-models prontos.
- sem recalculo pesado no request principal.

## 5) Problemas encontrados na arquitetura atual

### P0 - Fonte de verdade duplicada e escrita em rota de leitura

- O calendario sincroniza `FinancialEvent` a partir de `Goal`, `Debt`, `RecurringDebt` e `Transaction` em leitura ([lib/server/financial-calendar.ts](../../lib/server/financial-calendar.ts#L578), [lib/server/financial-calendar.ts](../../lib/server/financial-calendar.ts#L923)).
- Resultado: alto custo, risco de divergencia, comportamento nao deterministico sob concorrencia.

### P0 - Inconsistencia de saldo ao voltar transacao para PENDING

- Ao marcar evento de transacao para `PENDING`, status muda sem reverter efeito no saldo de carteira ([lib/server/financial-calendar.ts](../../lib/server/financial-calendar.ts#L1116)).
- Isso quebra confiabilidade do caixa.

### P0 - Base de projecao incorreta

- `openingBalance` usa soma de saldo atual e depois aplica todo fluxo do periodo ([lib/server/financial-calendar.ts](../../lib/server/financial-calendar.ts#L889), [lib/financial-calendar/utils.ts](../../lib/financial-calendar/utils.ts#L175)).
- Para meses em andamento, ha risco de dupla contagem do passado.

### P1 - Fluxo planejado de transacao incompleto

- Sync do calendario considera apenas `due_date != null` ou `status = PENDING` ([lib/server/financial-calendar.ts](../../lib/server/financial-calendar.ts#L437)).
- API de transacao nao recebe `dueDate` no payload e cria `CONFIRMED` por padrao ([app/api/transactions/route.ts](../../app/api/transactions/route.ts#L18), [app/api/transactions/route.ts](../../app/api/transactions/route.ts#L451)).
- Resultado: baixa cobertura de previsao real por transacoes.

### P1 - Semantica de divida inconsistente

- Schema comenta `ACTIVE/PAID`, mas app opera `OPEN/OVERDUE/INSTALLMENT` via mapeamentos ([prisma/schema.prisma](../../prisma/schema.prisma#L85), [lib/debts.ts](../../lib/debts.ts#L35), [lib/debts.ts](../../lib/debts.ts#L145)).
- A area de recorrencia ainda mistura legado por categoria ([lib/server/debts.ts](../../lib/server/debts.ts#L130)).

### P1 - Vinculo fraco investimento-carteira

- `Investment` persiste nome da carteira em `institution`, sem FK ([app/api/investments/route.ts](../../app/api/investments/route.ts#L128), [app/api/investments/route.ts](../../app/api/investments/route.ts#L203)).
- Renomear carteira quebra consistencia sem erro.

### P1 - Insights com base truncada

- Dashboard limita transacoes em 120 ([app/api/dashboard/route.ts](../../app/api/dashboard/route.ts#L18), [app/api/dashboard/route.ts](../../app/api/dashboard/route.ts#L37)).
- Insights mensais/comparativos usam esse recorte parcial ([app/api/dashboard/route.ts](../../app/api/dashboard/route.ts#L376), [lib/server/financial-insights.ts](../../lib/server/financial-insights.ts#L26)).

### P1 - Refetch amplo e estado monolitico no frontend

- `app/app/page.tsx` concentra todo o produto em um componente gigante e multiplas states locais ([app/app/page.tsx](../../app/app/page.tsx#L7563), [app/app/page.tsx](../../app/app/page.tsx#L8082)).
- Varias mutacoes chamam recarga global do dashboard ([app/app/page.tsx](../../app/app/page.tsx#L9842), [app/app/page.tsx](../../app/app/page.tsx#L9981), [app/app/page.tsx](../../app/app/page.tsx#L10085)).

### P2 - Agenda paralela ao calendario

- Agenda derivada no cliente a partir de `debts/recurringDebts/goals`, duplicando logica que tambem existe no calendario ([app/app/page.tsx](../../app/app/page.tsx#L8483)).

### P2 - Ausencia de indices criticos em transacao

- `Transaction` nao possui indices compostos para consultas de periodo/status/origem ([prisma/schema.prisma](../../prisma/schema.prisma#L168)).

## 6) Melhorias propostas

### 6.1 Dominio e consistencia

- Tornar `transaction` unico fato financeiro (confirmado e previsto).
- Converter recorrencia/divida/parcela em geradores de transacoes previstas.
- Limitar `financial_event` a lembrete manual neutro, sem duplicar evento derivado.
- Padronizar enums de status e transicoes permitidas.

### 6.2 Performance backend

- Remover escrita em GET do calendario.
- Introduzir processador incremental por evento de dominio (outbox + worker).
- Materializar `daily_cash_projection` por workspace e janela.
- Adicionar indices compostos e paginação por cursor.

### 6.3 Performance frontend

- Quebrar `app/app/page.tsx` por bounded context (dashboard, transactions, debts, goals, investments, calendar).
- Adotar cache declarativo (`TanStack Query` ou equivalente) com invalidacao por chave de recurso.
- Evitar refetch global apos mutacao de modulo isolado.

### 6.4 Observabilidade e confiabilidade

- Idempotency key para comandos sensiveis.
- Audit log de transicoes de status financeiro.
- Metricas: tempo de snapshot, custo de sync, divergencia de saldo, taxa de erro por comando.

## 7) Plano de evolucao sem quebrar o sistema

## Fase 0 - Preparacao (sem mudanca de comportamento)

- Adicionar metricas e logs de consistencia (saldo carteira x soma transacoes confirmadas).
- Criar feature flags para novo motor de projecao e novo dashboard view.

Criterio de saida:
- Telemetria confiavel de baseline por workspace.

## Fase 1 - Padronizacao de dominio

- Introduzir enums formais de status em `Debt`, `Transaction`, `RecurringDebt`.
- Corrigir transicao invalida `CONFIRMED -> PENDING` sem estorno.

Criterio de saida:
- Nenhum comando altera saldo sem trilha atomica.

## Fase 2 - Novo modelo de automacao

- Criar `recurrence_rule`, `debt_contract`, `installment_plan`.
- Backfill de recorrencias e dividas legadas para novo formato.

Criterio de saida:
- 100% das recorrencias novas via regra, sem dependencia de categoria legada.

## Fase 3 - Read models e projecao incremental

- Criar `daily_cash_projection` e `calendar_event_view`.
- Migrar calendario para leitura pura.
- Desativar `syncWorkspaceFinancialCalendarSources` no GET.

Criterio de saida:
- Tempo de resposta de calendario estavel e sem escrita em leitura.

## Fase 4 - Dashboard v2

- Dashboard consome view pronta (saldo atual, saldo previsto, proximos eventos, alertas).
- Insights passam a usar serie completa (ou agregados mensais), nao ultimas 120 transacoes.

Criterio de saida:
- Dashboard mostra presente + futuro consistente com calendario e projecao.

## Fase 5 - Frontend modular

- Extrair modulos de `app/app/page.tsx` para feature modules.
- Introduzir cache por recurso e invalidacao cirurgica.

Criterio de saida:
- Queda de refetch global e menor custo de re-render.

## Fase 6 - Decomissionamento legado

- Remover sincronizacao de eventos derivados antigos.
- Congelar caminhos legacy de recorrencia por categoria.
- Finalizar migracao de investimentos para FK real de carteira.

Criterio de saida:
- Um unico fluxo canonico de ponta a ponta.

## Riscos e mitigacao

1. Risco: divergencia durante dual-write.
Mitigacao: reconciliacao diaria automatica e flag por workspace.

2. Risco: regressao em saldo durante migracao.
Mitigacao: testes de propriedade contabil e snapshots comparativos antes/depois.

3. Risco: impacto de performance na primeira materializacao.
Mitigacao: backfill por lotes, janelas por workspace e limites de concorrencia.

## Resultado esperado apos evolucao

- Plataforma integrada com previsao confiavel de caixa.
- Calendario e dashboard convergentes (mesma base de dados).
- Menor custo de manutencao por regras unificadas.
- Comportamento premium: rapido, previsivel e explicavel para o usuario final.

