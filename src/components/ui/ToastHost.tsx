import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-fit-600" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-ink/60" />,
} as const;

const TONES = {
  success: 'border-fit-200 bg-white',
  error: 'border-red-200 bg-white',
  info: 'border-ink/12 bg-white',
} as const;

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${TONES[t.tone]}`}
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
          <p className="flex-1 text-[13px] leading-relaxed text-ink/85">{t.message}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
            className="-mr-1 shrink-0 rounded-md p-1 text-ink/40 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
