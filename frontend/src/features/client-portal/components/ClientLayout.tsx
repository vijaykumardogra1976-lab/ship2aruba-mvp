import { useState } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useClientAuth } from "@/features/client-auth/hooks/useClientAuth";
import { ClientSidebar } from "./sidebar/ClientSidebar";

export function ClientLayout() {
  const { isAuthenticated, isLoading, user, logout } = useClientAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">🚢</span>
          <div className="h-1 w-24 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-violet-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/client/login");
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col flex-shrink-0">
        <ClientSidebar />
      </aside>

      {/* Sidebar — mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-56 z-50">
            <ClientSidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-6">
          {/* Left: mobile menu */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2">
            <span className="text-xl">🚢</span>
            <span className="font-bold text-gray-900">Ship2Aruba</span>
          </div>

          {/* Right: Profile */}
          <div className="ml-auto relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                {user?.name?.charAt(0)?.toUpperCase() ?? "C"}
              </div>
              {/* Name — hidden on mobile */}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</span>
                <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">{user?.phone || user?.email}</span>
              </div>
              {/* Chevron */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <>
                {/* Backdrop to close */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.email}</p>
                  </div>
                  {/* Menu items */}
                  <div className="p-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
