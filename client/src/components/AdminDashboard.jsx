import { fetchStats } from '../api.js';
import { usePolling } from '../hooks/usePolling.js';
import { useCountUp } from '../hooks/useCountUp.js';
import GaugeChart from './GaugeChart.jsx';
import DonutRing from './DonutRing.jsx';
import ProgressBar from './ProgressBar.jsx';
import LiveBadge from './LiveBadge.jsx';

/**
 * Realtime dashboard. Polls /api/stats every few seconds (no manual refresh)
 * and renders animated charts: a count-up total, a donut for vulnerable
 * employees, a speedometer gauge for the vulnerable percentage, and a
 * progress bar for the "asked if fields are required" percentage.
 */
export default function AdminDashboard() {
  const { data, error } = usePolling(async () => {
    const { ok, data } = await fetchStats();
    if (!ok) throw new Error('stats failed');
    return data;
  }, 4000);

  const stats = data || {
    totalEmployees: 0,
    vulnerableEmployees: 0,
    vulnerablePercentage: 0,
    askedEmployees: 0,
    askedPercentage: 0,
  };

  const animatedTotal = useCountUp(stats.totalEmployees);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Updating automatically in realtime.</p>
        </div>
        <LiveBadge />
      </div>

      {error && !data && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error} Is the API running?
        </p>
      )}

      <div className="mt-6 space-y-5">
        {/* Vulnerable percentage — full-width hero gauge */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-8 text-center ring-1 ring-slate-100">
          <GaugeChart value={stats.vulnerablePercentage} />
          <span className="text-sm font-medium text-slate-500">Vulnerable Percentages</span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Total employees — hero count-up */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 py-8 text-center ring-1 ring-slate-100">
            <span className="text-6xl font-semibold text-blue-600">
              {Math.round(animatedTotal)}
            </span>
            <span className="mt-2 text-sm font-medium text-slate-500">Total employees</span>
          </div>

          {/* Vulnerable employees — donut */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 px-4 py-8 text-center ring-1 ring-amber-100">
            <DonutRing
              value={stats.vulnerableEmployees}
              total={stats.totalEmployees}
              color="#d97706"
              centerLabel={`of ${stats.totalEmployees}`}
            />
            <span className="text-sm font-medium text-slate-500">Vulnerable employees</span>
          </div>
        </div>

        {/* Asked-about-fields percentage — progress bar */}
        <div className="flex flex-col justify-center gap-4 rounded-2xl bg-slate-50 px-6 py-8 ring-1 ring-violet-100">
          <ProgressBar percentage={stats.askedPercentage} color="#7c3aed" />
          <div>
            <p className="text-sm font-medium text-slate-700">Asked if fields are required</p>
            <p className="text-xs text-slate-400">
              {stats.askedEmployees} of {stats.totalEmployees} employees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
