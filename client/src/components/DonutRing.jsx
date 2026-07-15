import { useCountUp } from '../hooks/useCountUp.js';

/**
 * Animated donut ring showing `value` out of `total`. The arc grows via a CSS
 * transition on stroke-dashoffset; the center number counts up.
 */
const SIZE = 120;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function DonutRing({ value = 0, total = 0, color = '#2563eb', centerLabel }) {
  const fraction = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const animatedValue = useCountUp(value);
  const offset = CIRCUMFERENCE * (1 - fraction);

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-slate-900">{Math.round(animatedValue)}</span>
        {centerLabel && <span className="text-[10px] font-medium text-slate-400">{centerLabel}</span>}
      </div>
    </div>
  );
}
