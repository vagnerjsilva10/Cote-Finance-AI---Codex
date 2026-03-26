import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ListsProps = {
  children: ReactNode;
  className?: string;
};

export function Lists({ children, className }: ListsProps) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}