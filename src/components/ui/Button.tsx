import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white border-ink hover:bg-fit-600 hover:border-fit-600 active:bg-fit-700',
  secondary: 'bg-fit-500 text-white border-fit-500 hover:bg-fit-600 hover:border-fit-600',
  outline: 'bg-white text-ink border-ink/15 hover:border-ink/40 hover:bg-ink/[0.03]',
  ghost: 'bg-transparent text-ink/70 border-transparent hover:bg-ink/[0.05] hover:text-ink',
  danger: 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  /** If true and `to` is provided, render a React Router Link */
  to?: string;
  as?: 'button' | 'a' | typeof Link;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    icon,
    children,
    className = '',
    disabled,
    to,
    as,
    ...rest
  },
  ref,
) {
  const base = `inline-flex shrink-0 items-center justify-center border font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </>
  );

  if (to && as === Link) {
    return (
      <Link to={to} className={base}>
        {content}
      </Link>
    );
  }
  if (to && as === 'a') {
    return (
      <a href={to} className={base}>
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={base}
      {...rest}
    >
      {content}
    </button>
  );
});

/** Small square icon-only button, used for row actions and card headers. */
export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
