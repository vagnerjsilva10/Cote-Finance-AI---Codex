import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type KPIBlocksProps = {
  children: ReactNode;
  className?: string;
};

export function KPIBlocks({ children, className }: KPIBlocksProps) {
  return <section className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>{children}</section>;
}