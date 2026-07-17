import { useCountUp } from '../hooks/useCountUp.js';

/**
 * One labelled horizontal bar: label on the left, animated fill, and the
 * percentage + raw count on the right. Used for the shared-details breakdown
 * and the not-vulnerable share on the dashboard.
 */
export default function BarStat({ label, value = 0, total = 0, percentage = 0, color = '#dc2626' }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const animated = useCountUp(clamped);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="shrink-0 text-sm font-semibold text-slate-900">
          {animated.toFixed(1)}%
          <span className="ml-1.5 text-xs font-normal text-slate-400">
            ({value} of {total})
          </span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
            transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </div>
  );
}
