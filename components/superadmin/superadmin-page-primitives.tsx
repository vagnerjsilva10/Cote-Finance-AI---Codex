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
    <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.92),rgba(9,17,30,.84))] px-6 py-6 shadow-[0_30px_90px_-52px_rgba(2,6,23,.95)] backdrop-blur-xl md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,.03),transparent_42%)]" />
      <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          {props.eyebrow ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-200">
              {props.eyebrow}
            </div>
          ) : null}
          <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.03em] text-white md:text-[2.45rem]">
            {props.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">{props.description}</p>
          {props.children ? <div className="mt-7">{props.children}</div> : null}
        </div>
        {props.actions ? <div className="flex flex-wrap items-center gap-3">{props.actions}</div> : null}
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
        'rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.78),rgba(15,23,42,.62))] p-5 shadow-[0_22px_80px_-52px_rgba(2,6,23,.92)] backdrop-blur-xl md:p-6',
        props.className
      )}
    >
      {props.title || props.description || props.action ? (
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {props.title ? <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">{props.title}</h2> : null}
            {props.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{props.description}</p> : null}
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
      ? 'border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,.16),rgba(16,185,129,.08))] text-emerald-50'
      : props.tone === 'info'
        ? 'border-sky-400/18 bg-[linear-gradient(180deg,rgba(14,165,233,.16),rgba(14,165,233,.08))] text-sky-50'
        : 'border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025))] text-slate-100';

  return (
    <div className={cn('rounded-[1.4rem] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]', toneClassName)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">{props.label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{props.value}</p>
    </div>
  );
}

export function SuperadminActionLink(props: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={props.href}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200',
        props.primary
          ? 'bg-emerald-500 text-slate-950 shadow-[0_12px_30px_-16px_rgba(16,185,129,.65)] hover:bg-emerald-400'
          : 'border border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/18 hover:bg-white/[0.05] hover:text-white'
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
        <div
          key={item.label}
          className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.42),rgba(2,6,23,.28))] p-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
