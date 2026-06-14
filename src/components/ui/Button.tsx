import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-pink-deep text-white hover:bg-brand-pink-dark focus:ring-brand-pink",
  secondary:
    "bg-brand-yellow text-yellow-900 hover:bg-brand-yellow-dark focus:ring-brand-yellow",
  danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400",
  ghost:
    "bg-transparent text-brand-pink-deep hover:bg-brand-pink/30 focus:ring-brand-pink",
};

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
