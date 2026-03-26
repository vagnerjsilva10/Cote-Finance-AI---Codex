import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Container({
  className,
  children,
  as: Tag = 'div',
}: {
  className?: string;
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  return <Tag className={cn('ds-container', className)}>{children}</Tag>;
}

export function Section({
  className,
  children,
  as: Tag = 'section',
}: {
  className?: string;
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  return <Tag className={cn('ds-section', className)}>{children}</Tag>;
}

export function Card({
  className,
  children,
  as: Tag = 'article',
}: {
  className?: string;
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  return <Tag className={cn('ds-card-base', className)}>{children}</Tag>;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export const ButtonPrimary = React.forwardRef<HTMLButtonElement, ButtonProps>(function ButtonPrimary(
  { className, type = 'button', ...props },
  ref
) {
  return <button ref={ref} type={type} className={cn('ds-button-base ds-button-primary', className)} {...props} />;
});

export const ButtonSecondary = React.forwardRef<HTMLButtonElement, ButtonProps>(function ButtonSecondary(
  { className, type = 'button', ...props },
  ref
) {
  return <button ref={ref} type={type} className={cn('ds-button-base ds-button-secondary', className)} {...props} />;
});

export const ButtonGhost = React.forwardRef<HTMLButtonElement, ButtonProps>(function ButtonGhost(
  { className, type = 'button', ...props },
  ref
) {
  return <button ref={ref} type={type} className={cn('ds-button-base ds-button-ghost', className)} {...props} />;
});

export const ButtonDanger = React.forwardRef<HTMLButtonElement, ButtonProps>(function ButtonDanger(
  { className, type = 'button', ...props },
  ref
) {
  return <button ref={ref} type={type} className={cn('ds-button-base ds-button-danger', className)} {...props} />;
});

export const PrimaryButton = ButtonPrimary;
export const SecondaryButton = ButtonSecondary;
export const GhostButton = ButtonGhost;
export const DangerButton = ButtonDanger;

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn('ds-input', className)} {...props} />;
  }
);

type HeaderNavItem = {
  href?: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
};

export function Header({
  logo,
  navItems = [],
  actions,
  className,
  light = false,
}: {
  logo: React.ReactNode;
  navItems?: HeaderNavItem[];
  actions?: React.ReactNode;
  className?: string;
  light?: boolean;
}) {
  return (
    <header className={cn(light ? 'public-light-header' : 'ds-header', 'sticky top-0 z-40', className)}>
      <Container className="flex items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center">{logo}</div>
        <nav className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] md:flex">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-[var(--text-primary)]',
                  item.active && 'font-semibold text-[var(--text-primary)]'
                )}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={cn(
                  'transition-colors hover:text-[var(--text-primary)]',
                  item.active && 'font-semibold text-[var(--text-primary)]'
                )}
              >
                {item.label}
              </button>
            )
          )}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">{actions}</div>
      </Container>
    </header>
  );
}

type SidebarItem = {
  key: string;
  icon?: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export function Sidebar({
  items,
  footer,
  className,
}: {
  items: SidebarItem[];
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn('ds-sidebar flex w-64 flex-col', className)}>
      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-4">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'sidebar-item-premium flex items-center gap-3 px-3 py-2.5 text-sm',
                item.active && 'sidebar-item-premium-active'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ) : (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                'sidebar-item-premium flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm',
                item.active && 'sidebar-item-premium-active'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        )}
      </nav>
      {footer ? <div className="p-4">{footer}</div> : null}
    </aside>
  );
}