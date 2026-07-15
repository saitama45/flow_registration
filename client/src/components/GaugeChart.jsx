import { useCountUp } from '../hooks/useCountUp.js';

/**
 * Animated speedometer gauge (0–100%). Five colored zones from "Very Poor"
 * (left) to "Excellent" (right); the needle rotates smoothly to the value
 * via a CSS transition, and the center percentage counts up.
 */

const CX = 100;
const CY = 100;
const R_OUTER = 92;
const R_INNER = 60;
const R_LABEL = 76;

// Left→right: green → red. The needle is driven by the VULNERABLE percentage,
// so at 0% vulnerable it rests far-left on "Excellent" and swings right toward
// "Very Poor" as more vulnerable people register.
const ZONES = [
  { label: 'Excellent', color: '#43b04a' },
  { label: 'Good', color: '#8bc34a' },
  { label: 'Fair', color: '#f2c445' },
  { label: 'Poor', color: '#f0722f' },
  { label: 'Very Poor', color: '#e63329' },
];

// Gauge angle: 180° = left end (0%), 90° = top (50%), 0° = right end (100%).
function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

// Filled wedge for one zone, between gauge angles a1 (larger) and a2 (smaller).
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

function ratingFor(pct) {
  return ZONES[Math.min(ZONES.length - 1, Math.floor(pct / 20))].label;
}

// At/above this vulnerable share, the readout blinks as a warning.
const BLINK_THRESHOLD = 33.3;

export default function GaugeChart({ value = 0 }) {
  const clamped = Math.max(0, Math.min(100, value));
  const animated = useCountUp(clamped);
  const isHigh = clamped >= BLINK_THRESHOLD;

  // Needle points up at 0° rotation; map 0%→-90° (left) … 100%→+90° (right).
  const needleRotation = clamped * 1.8 - 90;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 130" className="w-full max-w-sm" role="img" aria-label={`${clamped}%`}>
        {ZONES.map((zone, i) => {
          const a1 = 180 - i * 36;
          const a2 = 180 - (i + 1) * 36;
          const mid = (a1 + a2) / 2;
          const pos = polar(mid, R_LABEL);
          // Curve the label along the band: near-horizontal at the ends,
          // near-vertical in the middle. Sign flips across the top.
          const magnitude = 90 - Math.abs(mid - 90);
          const rotation = (mid >= 90 ? -1 : 1) * magnitude;
          return (
            <g key={zone.label}>
              <path d={zonePath(a1, a2)} fill={zone.color} />
              <text
                x={pos.x}
                y={pos.y}
                transform={`rotate(${rotation} ${pos.x} ${pos.y})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize="7"
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
        <div className={`text-xs font-medium ${isHigh ? 'animate-vuln-blink' : 'text-slate-500'}`}>
          {ratingFor(clamped)}
        </div>
      </div>
    </div>
  );
}
