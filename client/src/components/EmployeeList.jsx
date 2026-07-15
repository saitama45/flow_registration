import { useEffect, useState } from 'react';
import { fetchEmployees, setEmployeeAsked } from '../api.js';
import { usePolling } from '../hooks/usePolling.js';
import LiveBadge from './LiveBadge.jsx';

/**
 * Realtime list of registered employees. Each row has a checkbox to flag
 * employees who asked whether the fields are required / necessary to fill.
 * The flag is persisted to the sheet and counted on the dashboard.
 */
export default function EmployeeList() {
  const { data, error } = usePolling(async () => {
    const { ok, data } = await fetchEmployees();
    if (!ok) throw new Error('employees failed');
    return data.employees || [];
  }, 4000);

  // Local optimistic overrides by row number, so a just-clicked checkbox
  // doesn't flip back on the next poll before the write lands.
  const [pending, setPending] = useState({});
  const [saveError, setSaveError] = useState(null);

  // Drop an override once the polled data agrees with it.
  useEffect(() => {
    if (!data) return;
    setPending((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const emp of data) {
        if (emp.row in next && next[emp.row] === emp.asked) {
          delete next[emp.row];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data]);

  async function toggleAsked(row, nextAsked) {
    setPending((prev) => ({ ...prev, [row]: nextAsked }));
    setSaveError(null);
    const { ok } = await setEmployeeAsked(row, nextAsked);
    if (!ok) {
      setPending((prev) => {
        const next = { ...prev };
        delete next[row];
        return next;
      });
      setSaveError('Could not save that change. Please try again.');
    }
  }

  const employees = data || [];
  const askedValue = (emp) => (emp.row in pending ? pending[emp.row] : emp.asked);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Registered employees</h2>
          <p className="mt-1 text-sm text-slate-500">
            {employees.length} registered · tick anyone who asked whether the fields are required.
          </p>
        </div>
        <LiveBadge />
      </div>

      {error && !data && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error} Is the API running?
        </p>
      )}

      {saveError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {saveError}
        </p>
      )}

      {data && employees.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          No registrations yet.
        </p>
      )}

      {employees.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 font-semibold">Employee ID</th>
                <th className="px-3 py-2 font-semibold">Full name</th>
                <th className="px-3 py-2 font-semibold">Nickname</th>
                <th className="px-3 py-2 font-semibold">Venue</th>
                <th className="px-3 py-2 text-center font-semibold">Vulnerable</th>
                <th className="px-3 py-2 text-center font-semibold">Asked if required</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.row} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{emp.employeeId}</td>
                  <td className="px-3 py-2.5 text-slate-700">{emp.fullName}</td>
                  <td className="px-3 py-2.5 text-slate-700">{emp.nickname}</td>
                  <td className="px-3 py-2.5 text-slate-500">{emp.venue}</td>
                  <td className="px-3 py-2.5 text-center">
                    {emp.vulnerable ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={askedValue(emp)}
                      onChange={(e) => toggleAsked(emp.row, e.target.checked)}
                      aria-label={`Mark ${emp.fullName} as having asked if fields are required`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
