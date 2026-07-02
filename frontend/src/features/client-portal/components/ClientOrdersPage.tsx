import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchClientOrders } from "../api/clientOrdersApi";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import type { ClientOrder } from "../types";
import { format } from "date-fns";

const STATUS_TABS = [
  { key: "all", label: "All Orders" },
  { key: "pending_approval", label: "Order Received" },
  { key: "approved", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "ready_for_pickup", label: "Ready for Pickup" },
  { key: "completed", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const WEBSITE_ICON: Record<string, string> = {
  amazon: "🛒",
  ebay: "🏷️",
  other: "🌐",
};

function OrderCard({ order, onClick }: { order: ClientOrder; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col gap-0 rounded-2xl bg-white shadow-[0_1px_10px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer overflow-hidden border border-transparent hover:border-violet-100"
    >
      {/* Card header */}
      <div className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-2xl">
          {WEBSITE_ICON[order.website_type] ?? "🌐"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
            {order.is_urgent && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 uppercase">
                Urgent
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {order.website || order.website_type} · {format(new Date(order.order_date), "d MMM yyyy")}
          </p>
        </div>
        <OrderStatusBadge color={order.status_color} label={order.status_label} />
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gray-50" />

      {/* Card footer */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex gap-4 text-xs text-gray-500">
          <span><strong className="text-gray-900">{order.number_of_items}</strong> items</span>
          <span><strong className="text-gray-900">${order.amount_usd}</strong> USD</span>
          {parseFloat(order.remaining_balance) > 0 && (
            <span className="text-amber-600 font-medium">
              AWG {order.remaining_balance} due
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-violet-600 group-hover:text-violet-700 flex items-center gap-1">
          View Details <span>→</span>
        </span>
      </div>
    </div>
  );
}

export function ClientOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const activeStatus = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");

  useEffect(() => {
    setIsLoading(true);
    fetchClientOrders({
      status: activeStatus,
      search,
      page,
    })
      .then((res) => {
        setOrders(res.results);
        setCount(res.count);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeStatus, search, page]);

  const setStatus = (s: string) => {
    setSearchParams({ status: s });
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage all your shipments</p>
        </div>
      </div>

      {/* Search + filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by order ID or website..."
            defaultValue={search}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams);
              if (e.target.value) params.set("search", e.target.value);
              else params.delete("search");
              params.delete("page");
              setSearchParams(params);
            }}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeStatus === tab.key
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white border border-dashed border-gray-200">
          <span className="text-5xl mb-4">📦</span>
          <h3 className="text-sm font-semibold text-gray-900">No orders found</h3>
          <p className="mt-1 text-sm text-gray-400">
            {activeStatus !== "all" ? "Try selecting a different status filter." : "You don't have any orders yet."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400">{count} order{count !== 1 ? "s" : ""} found</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => navigate(`/client/orders/${order.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {count > 10 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page}</span>
              <button
                disabled={page * 10 >= count}
                onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
