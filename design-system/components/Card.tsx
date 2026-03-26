import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const toneClassMap = {
  accent: 'card-accent',
  success: 'card-success',
  danger: 'card-danger',
  warning: 'card-warning',
  info: 'card-info',
  goal: 'card-goal',
  neutral: 'card-neutral',
} as const;

type CardTone = keyof typeof toneClassMap;

type CardProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  tone?: CardTone;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function Card<T extends ElementType = 'section'>({ as, children, className, tone, ...props }: CardProps<T>) {
  const Tag = (as ?? 'section') as ElementType;
  return (
    <Tag
      className={cn('ds-card-base', tone ? toneClassMap[tone] : null, className)}
      {...props}
    >
      {children}
    </Tag>
  );
}