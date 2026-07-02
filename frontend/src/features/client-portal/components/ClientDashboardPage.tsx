import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientAuth } from "@/features/client-auth/hooks/useClientAuth";
import { fetchClientDashboard } from "../api/clientOrdersApi";
import { StatCard } from "./ui/StatCard";
import { MiniChart } from "./ui/MiniChart";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import type { DashboardData } from "../types";
import { format } from "date-fns";

const WEBSITE_ICON: Record<string, string> = {
  amazon: "🛒",
  ebay: "🏷️",
  other: "🌐",
};

export function ClientDashboardPage() {
  const { user } = useClientAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClientDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const hasDue = parseFloat(data?.payment_due ?? "0") > 0;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your orders today.
          </p>
        </div>
      </div>

      {/* Payment due alert */}
      {hasDue && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Payment Due</p>
              <p className="text-xs text-amber-700">You have an outstanding balance of AWG {data?.payment_due}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/client/payments")}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Active Orders"
          value={stats?.active ?? 0}
          icon="📋"
          iconBg="bg-blue-50"
          action={{ label: "View all", onClick: () => navigate("/client/orders") }}
        />
        <StatCard
          title="In Transit"
          value={stats?.in_transit ?? 0}
          icon="🚚"
          iconBg="bg-violet-50"
          action={{ label: "View all", onClick: () => navigate("/client/orders?status=ready_for_pickup") }}
        />
        <StatCard
          title="Delivered"
          value={stats?.delivered ?? 0}
          icon="✅"
          iconBg="bg-emerald-50"
          action={{ label: "View all", onClick: () => navigate("/client/orders?status=completed") }}
        />
        <StatCard
          title="Pending Payments"
          value={`AWG ${data?.payment_due ?? "0.00"}`}
          icon="💳"
          iconBg="bg-amber-50"
          action={{ label: "Pay now", onClick: () => navigate("/client/payments") }}
        />
      </div>

      {/* Chart + Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart card */}
        <div className="lg:col-span-3 rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Orders This Month</h2>
              <p className="text-sm text-gray-500">Monthly order volume</p>
            </div>
          </div>
          {data?.monthly_orders && data.monthly_orders.length > 0 ? (
            <MiniChart data={data.monthly_orders} />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>

        {/* Recent orders card */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            <button
              onClick={() => navigate("/client/orders")}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              View all →
            </button>
          </div>

          {data?.recent_orders && data.recent_orders.length > 0 ? (
            <ul className="divide-y divide-gray-50 space-y-1">
              {data.recent_orders.map((order) => (
                <li
                  key={order.id}
                  onClick={() => navigate(`/client/orders/${order.id}`)}
                  className="flex items-center gap-3 py-3 cursor-pointer rounded-xl -mx-2 px-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg">
                    {WEBSITE_ICON[order.website_type] ?? "🌐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{order.order_number}</p>
                    <p className="text-xs text-gray-400">
                      {order.number_of_items} items · {format(new Date(order.order_date), "d MMM")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <OrderStatusBadge color={order.status_color} label={order.status_label} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">No orders yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
