'use client';

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
    <div className="space-y-5 rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {props.eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{props.eyebrow}</p> : null}
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{props.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{props.description}</p>
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
    <section className={cn('rounded-2xl border border-slate-800 bg-slate-900/50 p-6', props.className)}>
      {props.title || props.description || props.action ? (
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {props.title ? <h2 className="text-xl font-black text-white">{props.title}</h2> : null}
            {props.description ? <p className="mt-2 text-sm leading-7 text-slate-400">{props.description}</p> : null}
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
      ? 'bg-emerald-500/10 text-emerald-500'
      : props.tone === 'info'
        ? 'bg-sky-500/10 text-sky-400'
        : 'bg-slate-800 text-slate-300';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-400">{props.label}</span>
        <div className={cn('rounded-lg p-2 text-sm font-bold', toneClassName)}>{props.value.split(' ')[0].slice(0, 2)}</div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-white">{props.value}</p>
    </div>
  );
}

export function SuperadminActionLink(props: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={props.href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all',
        props.primary
          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
          : 'border border-slate-800 bg-slate-900 text-slate-200 hover:border-emerald-500 hover:text-white'
      )}
    >
      {props.children}
      <ArrowUpRight size={14} />
    </Link>
  );
}

export function SuperadminGhostAction(props: { href: string; children: React.ReactNode }) {
  return (
    <Link href={props.href} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white">
      {props.children}
      <ArrowUpRight size={14} />
    </Link>
  );
}

export function SuperadminInfoList(props: { items: Array<{ label: string; value: string }>; columns?: 1 | 2 | 3 }) {
  return (
    <div className={cn('grid gap-4', props.columns === 3 ? 'md:grid-cols-3' : props.columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1')}>
      {props.items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

