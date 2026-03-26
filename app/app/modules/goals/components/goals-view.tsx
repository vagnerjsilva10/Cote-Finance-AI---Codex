import { Plus, Pencil, Trash2 } from 'lucide-react';

import { useGoalsSummary } from '@/app/app/modules/goals/hooks/use-goals-summary';
import { Badge, EmptyState, PrimaryButton, SecondaryButton, StatCard } from '@/design-system/components';

type GoalItem = {
  id: string | number;
  name: string;
  target: number;
  current: number;
  category: string;
  deadline?: string | null;
};

type GoalsViewProps = {
  goals: GoalItem[];
  onAddGoal: () => void;
  onEditGoal: (id: string | number) => void;
  onDeleteGoal: (id: string | number) => void;
  formatCurrency: (value: number) => string;
};

export const GoalsView = ({
  goals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  formatCurrency,
}: GoalsViewProps) => {
  const { totalGoals, targetTotal, accumulatedTotal } = useGoalsSummary(goals);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="page-title-premium text-[var(--text-primary)]">Metas</h3>
        <PrimaryButton onClick={onAddGoal} className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold sm:w-auto">
          <Plus size={18} /> Nova Meta
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total de metas" value={totalGoals} semantic="neutral" />
        <StatCard label="Meta total" value={formatCurrency(targetTotal)} semantic="goal" />
        <StatCard label="Valor acumulado" value={formatCurrency(accumulatedTotal)} semantic="accent" />
      </div>

      <div className="space-y-4">
        {goals.length === 0 && (
          <EmptyState
            title="Nenhuma meta cadastrada"
            description="Crie sua primeira meta para acompanhar evolução de forma visual e objetiva."
            ctaLabel="Criar meta"
            onCtaClick={onAddGoal}
          />
        )}

        {goals.map((goal) => {
          const progress = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
          const remaining = Math.max(0, goal.target - goal.current);

          return (
            <div key={goal.id} className="app-surface-card card-goal rounded-2xl p-5">
              <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[var(--text-primary)]">{goal.name}</h4>
                    <Badge tone="goal">{goal.category}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {goal.deadline ? `Prazo: ${new Date(goal.deadline).toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <SecondaryButton onClick={() => onEditGoal(goal.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs">
                    <Pencil size={12} /> Editar
                  </SecondaryButton>
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="ds-button-base ds-button-danger inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                  <div className="h-full rounded-full bg-[var(--goal)] transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-secondary)]">{formatCurrency(goal.current)} acumulado</span>
                  <span className="text-[var(--text-muted)]">Meta: {formatCurrency(goal.target)}</span>
                  <span className="font-bold text-[var(--goal)]">{progress.toFixed(1)}%</span>
                </div>

                <p className="text-xs text-[var(--text-muted)]">Faltam {formatCurrency(remaining)} para concluir.</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};