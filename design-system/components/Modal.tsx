import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={cn('theme-modal-surface w-full max-w-2xl', className)} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}