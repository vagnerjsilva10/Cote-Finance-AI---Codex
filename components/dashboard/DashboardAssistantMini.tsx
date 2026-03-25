import { Sparkles } from 'lucide-react';
import { DASHBOARD_CARD_PANEL_CLASSNAME, DASHBOARD_CARD_SHELL_CLASSNAME } from '@/components/dashboard/dashboard-primitives';
import { cn } from '@/lib/utils';

type DashboardAssistantMiniProps = {
  headline: string;
  primarySuggestion: string;
  secondarySuggestion: string;
  onOpenAssistant: () => void;
  onSendPrompt: (prompt: string) => void;
};

export function DashboardAssistantMini({
  headline,
  primarySuggestion,
  secondarySuggestion,
  onOpenAssistant,
  onSendPrompt,
}: DashboardAssistantMiniProps) {
  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
      <button type="button" onClick={onOpenAssistant} className="flex items-center gap-2 text-left">
        <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] text-[var(--primary)]">
          <Sparkles size={14} />
        </span>
        <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Assistente de IA</h3>
      </button>

      <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2.5 p-3')}>
        <p className="text-sm text-[var(--text-secondary)]">{headline}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSendPrompt(primarySuggestion)}
            className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-white/20"
          >
            {primarySuggestion}
          </button>
          <button
            type="button"
            onClick={() => onSendPrompt(secondarySuggestion)}
            className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-white/20"
          >
            {secondarySuggestion}
          </button>
        </div>
        <button type="button" onClick={onOpenAssistant} className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
          Ver assistente
        </button>
      </div>
    </section>
  );
}
