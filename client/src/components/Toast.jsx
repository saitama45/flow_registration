import { useEffect } from 'react';

const AUTO_DISMISS_MS = 3500;

/** Fixed-position success toast that auto-dismisses itself. */
export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      className="fixed inset-x-4 top-4 z-50 sm:inset-x-auto sm:right-4 sm:w-96"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-white p-4 shadow-lg">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="flex-1 pt-0.5 text-sm font-medium text-slate-800">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 cursor-pointer text-slate-400 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
