# Transaction Source Of Truth Migration

Data: 2026-03-24

## Objetivo

Consolidar `Transaction` como base canônica das leituras financeiras e retirar o endpoint legado de dashboard do caminho crítico do frontend principal.

## Mudanças aplicadas

- Criado `workspace-shell` como payload operacional do app:
  - rota: `/api/workspace-shell`
  - uso: workspaces, onboarding, wallets, eventos, limites, uso e coleções dos módulos
  - efeito: `app/app/page.tsx` não depende mais de `/api/dashboard` para carregar o shell da aplicação

- Criado `reports-overview` como leitura agregada oficial:
  - rota: `/api/reports/overview`
  - origem: agregações SQL/Prisma derivadas de `Transaction`
  - efeito: relatórios deixam de depender primariamente de cálculos críticos no cliente

- Dashboard overview permanece em `/api/dashboard/overview`:
  - continua como endpoint agregado da Visão Geral
  - deixa de coexistir com o endpoint legado no fluxo principal do frontend

- Introduzido contrato canônico de transação:
  - arquivo: `domain/transactions/transaction.ts`
  - status canônico: `PLANNED | CONFIRMED | CANCELED`
  - mapeamento de compatibilidade com storage atual: `PENDING | CONFIRMED | CANCELLED`

- Corrigido write path de transações:
  - `PATCH` e `DELETE` respeitam o status real antes de alterar saldo de carteira
  - evita efeito contábil indevido em registros não confirmados

## Read paths ativos após a migração

- Dashboard:
  - `/api/dashboard/overview`

- Relatórios:
  - `/api/reports/overview`

- Shell operacional do app:
  - `/api/workspace-shell`

## Legado retirado do caminho principal

- `/api/dashboard` deixa de ser a fonte ativa do shell do frontend principal
- refreshes de dashboard e relatórios passam a ser acionados por leitura especializada

## Legado ainda existente, mas não concluído

- sincronização financeira ainda depende de `financial-calendar`
- calendário ainda mantém projeção derivada por pipeline legado
- investimento ainda usa `institution` em vez de `wallet_id`
- `app/app/page.tsx` ainda precisa ser quebrado por bounded context

## Próximos passos

1. Migrar calendário/projeção para read models reconstruíveis a partir de `Transaction`
2. Remover uso residual do modelo legado de dívida recorrente
3. Migrar investimentos para FK real de carteira
4. Extrair relatórios, dashboard e transações de `app/app/page.tsx`
