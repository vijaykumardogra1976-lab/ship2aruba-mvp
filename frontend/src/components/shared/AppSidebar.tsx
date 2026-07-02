import {
  BarChart3,
  FileText,
  Headphones,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  PlusSquare,
  Settings,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/features/orders-viewer/api/ordersViewerApi";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavItemDef {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  badge?: number;
  enabled?: boolean;
}

function NavItem({
  item,
  active,
}: {
  item: NavItemDef;
  active?: boolean;
}) {
  const Icon = item.icon;
  const baseClass = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-violet-50 text-violet-700 font-semibold border-l-[3px] border-violet-600 rounded-l-none"
      : item.enabled
        ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        : "cursor-default text-slate-400/80",
  );

  const content = (
    <>
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-violet-600" : "text-slate-400")} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            active ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700",
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  if (item.enabled && item.to) {
    return (
      <Link to={item.to} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <span className={baseClass} aria-disabled="true">
      {content}
    </span>
  );
}

function NavSection({
  title,
  items,
  activePath,
}: {
  title: string;
  items: NavItemDef[];
  activePath: string;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
        {title}
      </p>
      {items.map((item) => (
        <NavItem
          key={item.label}
          item={item}
          active={!!item.to && activePath === item.to}
        />
      ))}
    </div>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Fetch only the count of all orders (first page, size 1)
  const { data } = useQuery({
    queryKey: ["orders", "total-count"],
    queryFn: () => listOrders({ page: 1, page_size: 1 }),
    refetchInterval: 15000, // keep it relatively fresh
  });

  const orderCount = data?.count ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const orderItems: NavItemDef[] = [
    {
      label: "Orders Viewer",
      icon: LayoutGrid,
      to: "/orders",
      badge: orderCount,
      enabled: true,
    },
    {
      label: "Create Order",
      icon: PlusSquare,
      to: "/orders/new",
      enabled: true,
    },
    { label: "Bulk Upload", icon: Upload, enabled: false },
    { label: "My Orders", icon: Users, enabled: false },
  ];

  const customerItems: NavItemDef[] = [
    { label: "All Customers", icon: Users, enabled: false },
    { label: "New Customer", icon: UserPlus, enabled: false },
    { label: "Customer Groups", icon: Users, enabled: false },
  ];

  const toolItems: NavItemDef[] = [
    { label: "Reports", icon: BarChart3, enabled: false },
    { label: "Invoices", icon: FileText, enabled: false },
    { label: "Tracking", icon: MapPin, enabled: false },
    { label: "Settings", icon: Settings, enabled: false },
  ];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Sidebar Navigation Items */}
      <div className="flex-grow overflow-y-auto px-3 py-6 space-y-6">
        <NavItem
          item={{ label: "Dashboard", icon: Home, enabled: false }}
          active={false}
        />

        <NavSection title="Orders" items={orderItems} activePath={pathname} />
        <NavSection title="Customers" items={customerItems} activePath={pathname} />
        <NavSection title="Tools" items={toolItems} activePath={pathname} />
      </div>

      {/* Help & Contact Support */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <Headphones className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-xs font-bold text-slate-800">Need Help?</p>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            We're here to assist you
          </p>
          <button
            type="button"
            className="w-full rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white shadow-xs hover:bg-violet-700 transition"
          >
            Contact Support
          </button>
        </div>
      </div>

      {/* User Info & Logout Section */}
      {user && (
        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
            {(user.full_name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800" title={user.email}>
              {user.full_name || user.email.split("@")[0]}
            </p>
            <p className="truncate text-[10px] text-slate-400">
              Staff Portal
            </p>
          </div>
          <button
            type="button"
            title="Log Out"
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
