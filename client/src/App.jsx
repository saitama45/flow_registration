import { useCallback, useEffect, useState } from 'react';
import RegistrationForm from './components/RegistrationForm.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import EmployeeList from './components/EmployeeList.jsx';
import headerBanner from './images/registration_header.png';

/**
 * Minimal client-side router for three paths: "/" (registration),
 * "/dashboard", and "/employee_list". A full router library isn't worth the
 * dependency here. Handles direct URL navigation, refresh, and back/forward.
 */
function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, '', to);
    setPath(to);
  }, []);

  return [path, navigate];
}

function NavLink({ to, current, navigate, children }) {
  const active = current === to;
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </a>
  );
}

export default function App() {
  const [path, navigate] = useRoute();

  let view;
  if (path === '/dashboard') view = <AdminDashboard />;
  else if (path === '/employee_list') view = <EmployeeList />;
  else view = <RegistrationForm />;

  const isAdmin = path === '/dashboard' || path === '/employee_list';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-8">
        <img
          src={headerBanner}
          alt="Registration Flow — Table Group"
          className="w-full rounded-xl shadow-sm"
        />
        <p className="mt-3 text-center text-xs font-medium text-slate-500">
          TGI FLOW &middot; Mon, Jul 20, 2026 &middot; 1:00&ndash;5:00 PM (PST)
        </p>

        {isAdmin && (
          <nav className="mt-4 flex items-center justify-center gap-1" aria-label="Admin navigation">
            <NavLink to="/" current={path} navigate={navigate}>
              &larr; Registration
            </NavLink>
            <NavLink to="/dashboard" current={path} navigate={navigate}>
              Dashboard
            </NavLink>
            <NavLink to="/employee_list" current={path} navigate={navigate}>
              Employee list
            </NavLink>
          </nav>
        )}
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-10 sm:px-6 sm:py-8 lg:px-8">{view}</main>
    </div>
  );
}
