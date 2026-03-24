import * as React from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { useGoalsSummary } from '@/app/app/modules/goals/hooks/use-goals-summary';

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
        <button
          onClick={onAddGoal}
          className="app-button-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold sm:w-auto"
        >
          <Plus size={18} /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="app-surface-card rounded-2xl p-5">
          <p className="label-premium mb-2 text-[var(--text-muted)]">Total de metas</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{totalGoals}</p>
        </div>
        <div className="app-surface-card rounded-2xl p-5">
          <p className="label-premium mb-2 text-[var(--text-muted)]">Meta total</p>
          <p className="text-2xl font-black text-[var(--positive)]">{formatCurrency(targetTotal)}</p>
        </div>
        <div className="app-surface-card rounded-2xl p-5">
          <p className="label-premium mb-2 text-[var(--text-muted)]">Valor acumulado</p>
          <p className="text-2xl font-black text-[var(--text-secondary)]">{formatCurrency(accumulatedTotal)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {goals.length === 0 && (
          <div className="app-surface-card rounded-2xl p-6 text-center text-sm text-[var(--text-muted)]">
            Nenhuma meta cadastrada.
          </div>
        )}

        {goals.map((goal) => {
          const progress = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
          const remaining = Math.max(0, goal.target - goal.current);

          return (
            <div key={goal.id} className="app-surface-card rounded-2xl p-5">
              <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[var(--text-primary)]">{goal.name}</h4>
                    <span className="rounded-md bg-[var(--bg-surface-elevated)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                      {goal.category}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {goal.deadline ? `Prazo: ${new Date(goal.deadline).toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditGoal(goal.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-app)] px-3 py-1.5 text-xs text-[var(--danger)] transition-colors hover:bg-[var(--bg-surface)]"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-elevated)]">
                  <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-secondary)]">{formatCurrency(goal.current)} acumulado</span>
                  <span className="text-[var(--text-muted)]">Meta: {formatCurrency(goal.target)}</span>
                  <span className="font-bold text-[var(--positive)]">{progress.toFixed(1)}%</span>
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

