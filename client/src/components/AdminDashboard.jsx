import { fetchStats } from '../api.js';
import { RISK_ALERT_THRESHOLD } from '../constants.js';
import { usePolling } from '../hooks/usePolling.js';
import { useCountUp } from '../hooks/useCountUp.js';
import GaugeChart from './GaugeChart.jsx';
import DonutRing from './DonutRing.jsx';
import ProgressBar from './ProgressBar.jsx';
import BarStat from './BarStat.jsx';
import LiveBadge from './LiveBadge.jsx';
import QrCodeCard from './QrCodeCard.jsx';

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
    notVulnerableEmployees: 0,
    notVulnerablePercentage: 0,
    askedEmployees: 0,
    askedPercentage: 0,
    contactEmployees: 0,
    contactPercentage: 0,
    birthdateEmployees: 0,
    birthdatePercentage: 0,
    addressEmployees: 0,
    addressPercentage: 0,
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
        {/* Exposure risk — full-width hero gauge */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-8 text-center ring-1 ring-slate-100">
          <GaugeChart value={stats.vulnerablePercentage} />
          <span className="text-sm font-medium text-slate-500">Data Exposure Risk</span>

          {/* Spell out the risk in words once it crosses the alert threshold,
              so the blinking number is never the only signal. */}
          {stats.vulnerablePercentage >= RISK_ALERT_THRESHOLD && (
            <p className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path
                  d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {stats.vulnerableEmployees} of {stats.totalEmployees} registrants exposed personal
              data
            </p>
          )}
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
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 px-4 py-8 text-center ring-1 ring-red-100">
            <DonutRing
              value={stats.vulnerableEmployees}
              total={stats.totalEmployees}
              color="#dc2626"
              centerLabel={`of ${stats.totalEmployees}`}
            />
            <span className="text-sm font-medium text-slate-500">Vulnerable employees</span>
          </div>
        </div>

        {/* Which optional details people chose to share — one bar per field.
            Same measure across three categories, so they share one colour. */}
        <div className="rounded-2xl bg-slate-50 px-6 py-6 ring-1 ring-red-100">
          <p className="text-sm font-semibold text-slate-700">Employees who shared their…</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Only whether each was provided is recorded — never the values.
          </p>
          <div className="mt-4 space-y-4">
            <BarStat
              label="Contact Number"
              value={stats.contactEmployees}
              total={stats.totalEmployees}
              percentage={stats.contactPercentage}
              color="#dc2626"
            />
            <BarStat
              label="Birthdate"
              value={stats.birthdateEmployees}
              total={stats.totalEmployees}
              percentage={stats.birthdatePercentage}
              color="#dc2626"
            />
            <BarStat
              label="Address (Home #, Brgy., City)"
              value={stats.addressEmployees}
              total={stats.totalEmployees}
              percentage={stats.addressPercentage}
              color="#dc2626"
            />
          </div>
        </div>

        {/* Not-vulnerable share — green, since sharing nothing is the good case. */}
        <div className="rounded-2xl bg-slate-50 px-6 py-6 ring-1 ring-green-100">
          <p className="text-sm font-semibold text-slate-700">Employees who are not vulnerable</p>
          <p className="mt-0.5 text-xs text-slate-400">Shared none of the three details above.</p>
          <div className="mt-4">
            <BarStat
              label="Not vulnerable"
              value={stats.notVulnerableEmployees}
              total={stats.totalEmployees}
              percentage={stats.notVulnerablePercentage}
              color="#43b04a"
            />
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

        {/* Shareable QR code for the public registration form */}
        <QrCodeCard />
      </div>
    </div>
  );
}
