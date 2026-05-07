import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {children}
      {error ? (
        <span className="text-xs font-medium text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      {...props}
      className={cn(
        "h-12 w-full rounded-xl border-2 border-border bg-card px-4 text-base font-semibold transition-all placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
        props.className,
      )}
    />
  );
}

export function SelectInput(
  props: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode },
) {
  return (
    <select
      {...props}
      className={cn(
        "h-12 w-full rounded-xl border-2 border-border bg-card px-4 text-base font-medium transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
        props.className,
      )}
    />
  );
}
