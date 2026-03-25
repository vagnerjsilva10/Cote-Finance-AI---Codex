import { Sparkles } from 'lucide-react';
import { DASHBOARD_CARD_PANEL_CLASSNAME, DASHBOARD_CARD_SHELL_CLASSNAME } from '@/components/dashboard/dashboard-primitives';
import { cn } from '@/lib/utils';

export function DashboardAssistantMini() {
  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
      <div className="flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] text-[var(--primary)]">
          <Sparkles size={14} />
        </span>
        <h3 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Assistente Fin..</h3>
      </div>
      <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2.5 p-3')}>
        <p className="text-sm text-[var(--text-secondary)]">Como posso te ajudar hoje?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-white/20">
            Analise de Gastos
          </button>
          <button type="button" className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-white/20">
            Sugestões de Economia
          </button>
        </div>
      </div>
    </section>
  );
}
