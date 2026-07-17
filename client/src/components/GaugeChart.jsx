import { useCountUp } from '../hooks/useCountUp.js';
import { RISK_ALERT_THRESHOLD } from '../constants.js';

/**
 * Animated risk gauge (0–100% of registrants who exposed personal data).
 *
 * The bands are risk levels, not a report-card grade: the metric measures
 * privacy exposure, so it reads Minimal → Critical. Band edges are deliberate
 * (not five equal fifths) so that RISK_ALERT_THRESHOLD is exactly where the
 * wording turns to "Moderate" and the readout starts blinking — the label and
 * the alarm always agree.
 */

const CX = 100;
const CY = 100;
const R_OUTER = 92;
const R_INNER = 60;
const R_LABEL = 76;

const ZONES = [
  { label: 'Minimal', from: 0, to: 15, color: '#43b04a' },
  { label: 'Low', from: 15, to: RISK_ALERT_THRESHOLD, color: '#8bc34a' },
  { label: 'Moderate', from: RISK_ALERT_THRESHOLD, to: 50, color: '#f2c445' },
  { label: 'High', from: 50, to: 70, color: '#f0722f' },
  { label: 'Critical', from: 70, to: 100, color: '#e63329' },
];

// Gauge angle: 180° = left end (0%), 90° = top (50%), 0° = right end (100%).
const angleForPct = (pct) => 180 - pct * 1.8;

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

// Filled wedge for one band, between gauge angles a1 (larger) and a2 (smaller).
function zonePath(a1, a2) {
  const oStart = polar(a1, R_OUTER);
  const oEnd = polar(a2, R_OUTER);
  const iEnd = polar(a2, R_INNER);
  const iStart = polar(a1, R_INNER);
  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${oEnd.x} ${oEnd.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${iStart.x} ${iStart.y}`,
    'Z',
  ].join(' ');
}

export function riskLevelFor(pct) {
  const zone = ZONES.find((z) => pct >= z.from && pct < z.to);
  return (zone || ZONES[ZONES.length - 1]).label;
}

export default function GaugeChart({ value = 0 }) {
  const clamped = Math.max(0, Math.min(100, value));
  const animated = useCountUp(clamped);
  const isHigh = clamped >= RISK_ALERT_THRESHOLD;

  // Needle points up at 0° rotation; map 0%→-90° (left) … 100%→+90° (right).
  const needleRotation = clamped * 1.8 - 90;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 130" className="w-full max-w-sm" role="img" aria-label={`${clamped}%`}>
        {ZONES.map((zone) => {
          const a1 = angleForPct(zone.from);
          const a2 = angleForPct(zone.to);
          const mid = angleForPct((zone.from + zone.to) / 2);
          const pos = polar(mid, R_LABEL);
          // Labels sit upright at the middle of their band. Rotating them to
          // follow the arc mirrors the text across the top (one half reads
          // bottom-to-top, the other top-to-bottom), which reads as sloppy —
          // upright text is legible everywhere with no head-tilting.
          return (
            <g key={zone.label}>
              <path d={zonePath(a1, a2)} fill={zone.color} />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="6.5"
                fontWeight="700"
              >
                {zone.label}
              </text>
            </g>
          );
        })}

        {/* Needle (drawn pointing up, rotated to the value around the hub at
            100,100 via SVG's native rotate so the pivot is always the center) */}
        <g
          transform={`rotate(${needleRotation} 100 100)`}
          style={{ transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          <polygon points="100,22 95.5,100 104.5,100" fill="#3a3a3a" />
          <circle cx={CX} cy={CY} r="9" fill="#3a3a3a" />
          <circle cx={CX} cy={CY} r="4" fill="#ffffff" />
        </g>
      </svg>

      <div className="-mt-2 text-center">
        <div
          className={`text-3xl font-semibold ${isHigh ? 'animate-vuln-blink' : 'text-slate-900'}`}
        >
          {animated.toFixed(1)}%
        </div>
        <div
          className={`text-xs font-bold uppercase tracking-wide ${
            isHigh ? 'animate-vuln-blink' : 'text-slate-500'
          }`}
        >
          {riskLevelFor(clamped)}
        </div>
      </div>
    </div>
  );
}
