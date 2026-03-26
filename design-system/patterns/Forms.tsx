import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FormsProps = {
  children: ReactNode;
  className?: string;
};

export function Forms({ children, className }: FormsProps) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}