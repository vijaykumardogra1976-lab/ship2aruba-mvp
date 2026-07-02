import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/client/dashboard" },
  { label: "Orders", path: "/client/orders" },
  { label: "Tracking", path: "/client/tracking", disabled: true },
  { label: "Payments", path: "/client/payments" },
  { label: "Invoices", path: "/client/invoices", disabled: true },
];

const BOTTOM_ITEMS = [
  { label: "Support", disabled: true },
  { label: "Settings", disabled: true },
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
        {NAV_ITEMS.map((item) =>
          item.disabled ? (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-300 cursor-not-allowed select-none"
            >
              {item.label}
              <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-4">
                Soon
              </span>
            </div>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-violet-50 text-violet-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
          )
        )}

        <div className="my-2 h-px bg-gray-100" />

        {BOTTOM_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-300 cursor-not-allowed select-none"
          >
            {item.label}
            <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-4">
              Soon
            </span>
          </div>
        ))}
      </nav>
    </div>
  );
}
