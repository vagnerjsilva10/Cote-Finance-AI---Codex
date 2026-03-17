import Link from 'next/link';
import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function SuperadminPageHeader(props: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="card-premium space-y-5 rounded-[1.9rem] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {props.eyebrow ? <p className="label-premium">{props.eyebrow}</p> : null}
          <div>
            <h1 className="page-title-premium md:text-4xl">{props.title}</h1>
            <p className="text-secondary-premium mt-3 max-w-3xl">{props.description}</p>
          </div>
        </div>
        {props.actions ? <div className="flex flex-wrap gap-3">{props.actions}</div> : null}
      </div>
      {props.children ? <div>{props.children}</div> : null}
    </div>
  );
}

export function SuperadminSectionCard(props: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card-premium rounded-2xl p-6', props.className)}>
      {props.title || props.description || props.action ? (
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {props.title ? <h2 className="card-title-premium">{props.title}</h2> : null}
            {props.description ? <p className="text-secondary-premium mt-2">{props.description}</p> : null}
          </div>
          {props.action ? <div className="shrink-0">{props.action}</div> : null}
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

export function SuperadminMetricChip(props: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'info';
}) {
  const toneClassName =
    props.tone === 'success'
      ? 'badge-premium badge-premium-success'
      : props.tone === 'info'
        ? 'badge-premium badge-premium-info'
        : 'badge-premium';

  return (
    <div className="stat-card-premium rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{props.label}</span>
        <div className={cn(toneClassName, 'min-w-[42px] justify-center px-2')}>{props.value.split(' ')[0].slice(0, 2)}</div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{props.value}</p>
    </div>
  );
}

export function SuperadminActionLink(props: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={props.href}
      className={cn(
        'px-4 py-2 text-sm font-semibold',
        props.primary ? 'button-primary' : 'button-secondary'
      )}
    >
      {props.children}
      <ArrowUpRight size={14} />
    </Link>
  );
}

export function SuperadminGhostAction(props: { href: string; children: React.ReactNode }) {
  return (
    <Link href={props.href} className="button-secondary px-4 py-2 text-sm font-semibold">
      {props.children}
      <ArrowUpRight size={14} />
    </Link>
  );
}

export function SuperadminInfoList(props: { items: Array<{ label: string; value: string }>; columns?: 1 | 2 | 3 }) {
  return (
    <div className={cn('grid gap-4', props.columns === 3 ? 'md:grid-cols-3' : props.columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1')}>
      {props.items.map((item) => (
        <div key={item.label} className="card-premium rounded-2xl p-4">
          <p className="label-premium">{item.label}</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
