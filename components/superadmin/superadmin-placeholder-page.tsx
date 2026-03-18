import { Sparkles } from 'lucide-react';

import {
  SuperadminActionLink,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';

export function SuperadminPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        eyebrow="Super Admin"
        title={title}
        description={description}
        actions={<SuperadminActionLink href="/superadmin">Voltar para Visão Geral</SuperadminActionLink>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <SuperadminMetricChip label="Status" value="Base pronta" tone="success" />
          <SuperadminMetricChip label="Arquitetura" value="Proteção ativa" tone="info" />
          <SuperadminMetricChip label="Próximo passo" value="Adicionar dados reais" />
        </div>
      </SuperadminPageHeader>

      <SuperadminSectionCard
        title="Módulo preparado para expansão"
        description="A rota, a proteção server-side e a arquitetura visual já estão prontas. O próximo passo é conectar dados, filtros, ações operacionais e histórico administrativo."
      >
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] p-3 text-[var(--text-secondary)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Estrutura já conectada ao painel</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Quando este módulo evoluir, ele já herda o shell administrativo, o padrão visual, os estados de
                  carregamento e a governança de acesso da plataforma.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Checklist</p>
            <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
              <li>Layout administrativo ativo</li>
              <li>Rota protegida por superadmin</li>
              <li>Espaço pronto para métricas e ações</li>
              <li>Consistência com o restante do painel</li>
            </ul>
          </div>
        </div>
      </SuperadminSectionCard>
    </div>
  );
}

