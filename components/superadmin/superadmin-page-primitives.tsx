'use client';

import Link from 'next/link';
import * as React from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function SuperadminPageHeader(props: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/72 p-6 shadow-[0_28px_120px_-60px_rgba(15,23,42,.95)] backdrop-blur-xl md:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.18),transparent_52%),radial-gradient(circle_at_top_right,rgba(59,130,246,.14),transparent_44%)]" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          {props.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">{props.eyebrow}</p>
          ) : null}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">{props.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">{props.description}</p>
          {props.children ? <div className="mt-6">{props.children}</div> : null}
        </div>
        {props.actions ? <div className="flex flex-wrap gap-3">{props.actions}</div> : null}
      </div>
    </section>
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
    <section
      className={cn(
        'rounded-[1.75rem] border border-white/10 bg-slate-900/68 p-5 shadow-[0_24px_90px_-56px_rgba(15,23,42,.95)] backdrop-blur-xl md:p-6',
        props.className
      )}
    >
      {props.title || props.description || props.action ? (
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {props.title ? <h2 className="text-lg font-semibold text-white">{props.title}</h2> : null}
            {props.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{props.description}</p> : null}
          </div>
          {props.action ? <div className="shrink-0">{props.action}</div> : null}
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

export function SuperadminMetricChip(props: { label: string; value: string; tone?: 'default' | 'success' | 'info' }) {
  const toneClassName =
    props.tone === 'success'
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
      : props.tone === 'info'
        ? 'border-sky-400/20 bg-sky-500/10 text-sky-100'
        : 'border-white/10 bg-white/5 text-slate-200';

  return (
    <div className={cn('rounded-2xl border px-4 py-3', toneClassName)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-75">{props.label}</p>
      <p className="mt-2 text-lg font-semibold">{props.value}</p>
    </div>
  );
}

export function SuperadminActionLink(props: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={props.href}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition',
        props.primary
          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
          : 'border border-white/10 text-slate-200 hover:border-white/20 hover:bg-white/5'
      )}
    >
      {props.children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function SuperadminInfoList(props: { items: Array<{ label: string; value: string }>; columns?: 1 | 2 | 3 }) {
  return (
    <div
      className={cn(
        'grid gap-3',
        props.columns === 3 ? 'md:grid-cols-3' : props.columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1'
      )}
    >
      {props.items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
