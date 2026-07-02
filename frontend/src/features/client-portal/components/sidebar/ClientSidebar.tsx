import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/client/dashboard" },
  { label: "Orders", path: "/client/orders" },
  { label: "Payments", path: "/client/payments" },
];

export function ClientSidebar({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-full w-56 flex-col bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
        <span className="text-2xl">🚢</span>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Ship2Aruba</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? "bg-violet-50 text-violet-700 font-semibold"
                  : "text-slate-700 font-normal hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
