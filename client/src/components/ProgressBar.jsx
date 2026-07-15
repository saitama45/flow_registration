import { useCountUp } from '../hooks/useCountUp.js';

/** Animated horizontal bar showing a percentage (0–100), with a count-up label. */
export default function ProgressBar({ percentage = 0, color = '#7c3aed' }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const animated = useCountUp(clamped);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-slate-900">{animated.toFixed(1)}%</span>
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
