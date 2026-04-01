# Cote Finance AI Design System

Fonte unica de tokens, componentes e padroes para toda a UI do produto.

## Estrutura

- `tokens`: cores, tipografia, espacamento, radius e sombras
- `components`: Card, StatCard, Badge, Button, Alert, Table, Input, Modal, EmptyState, SectionHeader
- `patterns`: DashboardLayout, FinanceCards, Lists, Forms, KPIBlocks
- `themes/dark`: tema dark oficial

## Regras globais

- Distribuicao visual: `80%` neutro, `15%` accent, `5%` semantica
- Nao usar hardcode de cor em componentes de modulo
- Nao pintar cards inteiros com semantica; usar apenas acento lateral, badge, icone, barra ou KPI
- Entradas usam `success`, saidas usam `danger`, saldo usa `accent`, metas usam `goal`, IA usa `info`, risco usa `warning`

## Cores de grafico obrigatorias

- entradas: `#34D399`
- saidas: `#F87171`
- saldo: `#3B82F6`
- metas: `#A78BFA`
- informacao/IA: `#22D3EE`
- projecoes/alertas: `#F59E0B`

## Modulos

- Dashboard: saldo `accent`, entrada `success`, saida `danger`, metas `goal`, IA `info`
- Dividas: vencida `danger`, risco `warning`, em dia `accent` ou `neutral`, quitada `success`
- Contas fixas: ativa `info` ou `accent`, proxima cobranca `warning`, paga/controlada `success`
- Metas: `goal` como semantica principal
- Assistente IA: `info` como semantica principal