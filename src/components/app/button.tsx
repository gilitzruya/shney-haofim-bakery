import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground border border-primary",
  secondary: "bg-card text-foreground border border-border",
  outline: "bg-transparent text-primary border border-primary",
  ghost: "bg-transparent text-primary border border-transparent",
  destructive: "bg-destructive text-destructive-foreground border border-destructive",
  accent: "bg-accent text-accent-foreground border border-accent",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-[5px] text-[11.5px]",
  md: "px-4 py-2.5 text-[13px]",
  lg: "px-[18px] py-[13px] text-[14px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant | undefined;
  size?: Size | undefined;
  pill?: boolean | undefined;
  loading?: boolean | undefined;
  children?: ReactNode | undefined;
}

export function Button({
  variant = "primary",
  size = "md",
  pill = false,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap transition-opacity",
        pill ? "rounded-full" : "rounded-xl",
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-60",
        className,
      )}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string | undefined }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-4 shrink-0 rounded-full border-2 border-white/40 border-t-white",
        "animate-[spin_0.7s_linear_infinite]",
        className,
      )}
    />
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={cn(
        "flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
