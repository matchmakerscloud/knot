'use client';

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-base transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        fullWidth && 'w-full',
        variant === 'primary' && 'bg-accent text-bg hover:bg-accent/90',
        variant === 'ghost' && 'border border-border bg-transparent text-ink hover:border-accent',
        variant === 'danger' && 'border border-danger bg-transparent text-danger hover:bg-danger/10',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : null}
      {children}
    </button>
  );
});

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label htmlFor={inputId} className="block">
      {label ? <span className="mb-2 block font-sans text-sm text-mute">{label}</span> : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-card px-4 py-3 font-sans text-ink placeholder:text-mute focus:outline-none',
          error ? 'border-danger focus:border-danger' : 'border-border focus:border-accent',
          className,
        )}
        {...rest}
      />
      {error ? <span className="mt-2 block font-sans text-sm text-danger">{error}</span> : null}
      {!error && hint ? <span className="mt-2 block font-sans text-xs text-mute">{hint}</span> : null}
    </label>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label htmlFor={inputId} className="block">
      {label ? <span className="mb-2 block font-sans text-sm text-mute">{label}</span> : null}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-card px-4 py-3 font-sans text-ink placeholder:text-mute focus:outline-none',
          error ? 'border-danger focus:border-danger' : 'border-border focus:border-accent',
          className,
        )}
        {...rest}
      />
      {error ? <span className="mt-2 block font-sans text-sm text-danger">{error}</span> : null}
      {!error && hint ? <span className="mt-2 block font-sans text-xs text-mute">{hint}</span> : null}
    </label>
  );
});

export function Screen({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-6">{children}</main>;
}

export function ScreenHeader({ title, kicker, back }: { title: string; kicker?: string; back?: () => void }) {
  return (
    <header className="pt-8 pb-6">
      {back ? (
        <button
          onClick={back}
          className="mb-4 inline-flex items-center gap-1 font-sans text-sm text-mute transition hover:text-ink"
          type="button"
        >
          ← Atrás
        </button>
      ) : null}
      {kicker ? <div className="mb-2 font-sans text-xs uppercase tracking-wide2 text-mute">{kicker}</div> : null}
      <h1 className="text-3xl font-medium leading-tight">{title}</h1>
    </header>
  );
}

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 font-sans text-sm text-danger">
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 font-sans text-sm text-success">
      {message}
    </div>
  );
}
