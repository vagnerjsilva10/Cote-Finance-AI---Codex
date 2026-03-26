import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FinanceCardsProps = {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
};

const columnsClassMap = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
} as const;

export function FinanceCards({ children, className, columns = 4 }: FinanceCardsProps) {
  return <div className={cn('grid gap-4', columnsClassMap[columns], className)}>{children}</div>;
}