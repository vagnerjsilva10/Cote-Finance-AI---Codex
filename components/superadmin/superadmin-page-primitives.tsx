'use client';

import Link from 'next/link';
import * as React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function SuperadminPageHeader(props: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,15,28,.98),rgba(8,15,28,.86))] px-6 py-7 shadow-[0_42px_120px_-70px_rgba(2,6,23,.95)] backdrop-blur-xl md:px-8 md:py-8 xl:px-10 xl:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,.18),transparent_24%),radial-gradient(circle_at_100%_0%,rgba(56,189,248,.12),transparent_18%),linear-gradient(180deg,rgba(255,255,255,.05),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[2.15rem] border border-white/[0.05]" />
      <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          {props.eyebrow ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
              {props.eyebrow}
            </div>
          ) : null}
          <h1 className="mt-5 max-w-3xl text-[2.35rem] font-semibold tracking-[-0.05em] text-white md:text-[2.9rem] xl:text-[3.15rem]">
            {props.title}
          </h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-300/95 xl:text-base">
            {props.description}
          </p>
          {props.children ? <div className="mt-8">{props.children}</div> : null}
        </div>
        {props.actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{props.actions}</div> : null}
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
        'relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,17,30,.9),rgba(10,17,30,.72))] p-5 shadow-[0_28px_90px_-62px_rgba(2,6,23,.95)] backdrop-blur-xl md:p-6 xl:p-7',
        props.className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.025),transparent_28%)]" />
      <div className="relative">
        {props.title || props.description || props.action ? (
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              {props.title ? <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white">{props.title}</h2> : null}
              {props.description ? <p className="mt-2 text-sm leading-7 text-slate-400">{props.description}</p> : null}
            </div>
            {props.action ? <div className="shrink-0">{props.action}</div> : null}
          </div>
        ) : null}
        {props.children}
      </div>
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
      ? 'border-emerald-400/14 bg-[linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,.06))]'
      : props.tone === 'info'
        ? 'border-sky-400/14 bg-[linear-gradient(180deg,rgba(56,189,248,.14),rgba(56,189,248,.06))]'
        : 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018))]';

  return (
    <div className={cn('rounded-[1.7rem] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] md:px-5 md:py-5', toneClassName)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{props.label}</p>
      <p className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-white md:text-[2.15rem]">{props.value}</p>
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
          ? 'bg-emerald-500 text-slate-950 shadow-[0_16px_36px_-18px_rgba(16,185,129,.55)] hover:bg-emerald-400'
          : 'border border-white/[0.1] bg-white/[0.04] text-slate-100 hover:border-white/[0.18] hover:bg-white/[0.06]'
      )}
    >
      {props.children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function SuperadminGhostAction(props: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={props.href}
      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-slate-950/35 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-white"
    >
      {props.children}
      <ArrowUpRight className="h-4 w-4" />
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
        <div key={item.label} className="rounded-[1.35rem] border border-white/[0.07] bg-slate-950/35 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{item.label}</p>
          <p className="mt-3 text-sm font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
