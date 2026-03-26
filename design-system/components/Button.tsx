import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'ds-button-primary',
  secondary: 'ds-button-secondary',
  ghost: 'ds-button-ghost',
  danger: 'ds-button-danger',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, type = 'button', ...props },
  ref
) {
  return <button ref={ref} type={type} className={cn('ds-button-base', variantClassMap[variant], className)} {...props} />;
});

export const PrimaryButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function PrimaryButton(
  { className, ...props },
  ref
) {
  return <Button ref={ref} variant="primary" className={className} {...props} />;
});

export const SecondaryButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function SecondaryButton(
  { className, ...props },
  ref
) {
  return <Button ref={ref} variant="secondary" className={className} {...props} />;
});

export const GhostButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function GhostButton(
  { className, ...props },
  ref
) {
  return <Button ref={ref} variant="ghost" className={className} {...props} />;
});

export const DangerButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function DangerButton(
  { className, ...props },
  ref
) {
  return <Button ref={ref} variant="danger" className={className} {...props} />;
});