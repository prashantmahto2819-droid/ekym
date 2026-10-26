import { useEffect, useRef, type ReactNode } from "react";

export function FormError({ message }: { message?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message]);
  if (!message) return null;
  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      className="surface-card border-destructive/50 bg-destructive/10 p-4 text-sm font-medium text-destructive"
    >
      {message}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

export function FormSuccess({ title, text }: { title: string; text: string }) {
  return (
    <div className="surface-card border-success/40 bg-success/10 p-6">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
