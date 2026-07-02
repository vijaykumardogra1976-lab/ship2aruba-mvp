import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientAuth } from "@/features/client-auth/hooks/useClientAuth";
import { fetchClientDashboard } from "../api/clientOrdersApi";
import { MiniChart } from "./ui/MiniChart";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import type { DashboardData } from "../types";
import { format } from "date-fns";
import {
  ClipboardList,
  Truck,
  CheckCircle2,
  CreditCard,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  MapPin,
  FileText,
  Headphones,
  AlertTriangle
} from "lucide-react";

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
      <div className="space-y-4 max-w-7xl animate-pulse">
        <div className="space-y-1">
          <div className="h-6 w-48 rounded-xl bg-slate-200" />
          <div className="h-3 w-80 rounded-xl bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 h-64 rounded-2xl bg-slate-100" />
          <div className="lg:col-span-2 h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const hasDue = parseFloat(data?.payment_due ?? "0") > 0;

  const activeCount = stats?.active ?? 0;
  const inTransitCount = stats?.in_transit ?? 0;
  const deliveredCount = stats?.delivered ?? 0;
  const totalCount = stats?.total ?? (activeCount + inTransitCount + deliveredCount);
  const cancelledCount = stats?.cancelled ?? 0;

  return (
    <div className="space-y-4 max-w-7xl text-[#1e293b] font-sans h-full flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-[11px] font-normal text-slate-600 mt-1">
            Here's what's happening with your shipments today.
          </p>
        </div>
      </div>

      {/* Payment due alert banner (Highly Compact) */}
      {hasDue && (
        <div className="flex flex-row items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-2 gap-4 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 leading-tight">Payment Due</p>
              <p className="text-[10px] font-semibold text-amber-700/90 leading-tight mt-0.5">
                Outstanding balance: <span className="font-extrabold text-amber-800">AWG {data?.payment_due}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/client/payments")}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-[10px] font-extrabold text-white transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Active Orders */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Active Orders</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{activeCount}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 shadow-inner">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <button
            onClick={() => navigate("/client/orders")}
            className="mt-2.5 flex items-center gap-0.5 text-[10px] font-bold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer text-left"
          >
            <span>View all</span>
            <ChevronRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* In Transit */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">In Transit</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{inTransitCount}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500 shadow-inner">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <button
            onClick={() => navigate("/client/orders")}
            className="mt-2.5 flex items-center gap-0.5 text-[10px] font-bold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer text-left"
          >
            <span>View all</span>
            <ChevronRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Delivered */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Delivered</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{deliveredCount}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 shadow-inner">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <button
            onClick={() => navigate("/client/orders")}
            className="mt-2.5 flex items-center gap-0.5 text-[10px] font-bold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer text-left"
          >
            <span>View all</span>
            <ChevronRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Pending Payments */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Pending Payments</p>
              <p className="text-sm font-extrabold text-slate-800 tracking-tight leading-none mt-2">
                AWG {data?.payment_due ?? "0.00"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 shadow-inner">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <button
            onClick={() => navigate("/client/payments")}
            className="mt-2.5 flex items-center gap-0.5 text-[10px] font-bold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer text-left"
          >
            <span>Pay now</span>
            <ChevronRight className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Grid: Chart + Recent Orders */}
      <div className="grid gap-4 lg:grid-cols-5">
        
        {/* Left Column: Orders Overview Chart */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-4.5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-none">Orders Overview</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Monthly order volume</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-650 shadow-xs cursor-pointer hover:bg-slate-50 transition-all">
              <span>This Month</span>
              <ChevronRight className="h-2.5 w-2.5 rotate-90 text-slate-400" />
            </div>
          </div>

          <div className="h-28 w-full mt-1">
            {data?.monthly_orders && data.monthly_orders.length > 0 ? (
              <MiniChart data={data.monthly_orders} height={110} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                No orders data available
              </div>
            )}
          </div>

          {/* Metric cards under chart */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-slate-50 pt-3">
            {/* Total Orders */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase">Total</span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-slate-800">{totalCount}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1 py-0.2 text-[8px] font-bold text-emerald-600">
                  <TrendingUp className="h-1.5 w-1.5" />
                  +22%
                </span>
              </div>
            </div>

            {/* In Transit */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase">In Transit</span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-slate-800">{inTransitCount}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1 py-0.2 text-[8px] font-bold text-slate-500">
                  +0%
                </span>
              </div>
            </div>

            {/* Delivered */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase">Delivered</span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-slate-800">{deliveredCount}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1 py-0.2 text-[8px] font-bold text-emerald-600">
                  <TrendingUp className="h-1.5 w-1.5" />
                  +18%
                </span>
              </div>
            </div>

            {/* Cancelled */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase">Cancelled</span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-slate-800">{cancelledCount}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1 py-0.2 text-[8px] font-bold text-rose-600">
                  <TrendingDown className="h-1.5 w-1.5" />
                  -50%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Orders (Scroll internally) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4.5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-none">Recent Orders</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Your latest activity</p>
            </div>
            <button
              onClick={() => navigate("/client/orders")}
              className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="max-h-[195px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {data?.recent_orders && data.recent_orders.length > 0 ? (
              data.recent_orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/client/orders/${order.id}`)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-50/50 bg-white p-2.5 shadow-xs hover:border-slate-100 hover:bg-slate-50/40 transition-all cursor-pointer"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-xs font-extrabold group-hover:bg-white group-hover:shadow-xs transition-colors">
                    🚢
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-black text-slate-800 truncate">{order.order_number}</p>
                      {order.is_urgent && (
                        <span className="rounded-full bg-rose-50 px-1 py-0.2 text-[7px] font-black text-rose-600 uppercase tracking-wide">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-normal text-slate-600 mt-0.5">
                      {order.number_of_items} items • {format(new Date(order.order_date), "d MMM")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <p className="text-[11px] font-black text-slate-800">AWG {order.items_total}</p>
                    <OrderStatusBadge color={order.status_color} label={order.status_label} size="sm" />
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              ))
            ) : (
              <div className="flex h-36 items-center justify-center text-xs font-medium text-slate-400">
                No orders placed yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Actions (More Compact height) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Track Your Order */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between h-28">
          <div className="space-y-0.5 z-10">
            <h3 className="text-xs font-extrabold text-slate-800 leading-none">Track Your Order</h3>
            <p className="text-[10px] font-normal text-slate-600 leading-tight mt-0.5">
              Real-time shipment updates
            </p>
          </div>
          
          {/* Illustration Container */}
          <div className="absolute right-0 bottom-2 w-20 h-16 pointer-events-none opacity-90 scale-90">
            <div className="relative w-full h-full">
              <svg className="absolute inset-0 w-full h-full text-violet-100" fill="none">
                <path d="M5,40 Q25,25 40,40 T75,20" stroke="currentColor" strokeWidth="2" strokeDasharray="3,3" />
              </svg>
              <div className="absolute top-2 right-4 flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500 text-white shadow-md shadow-violet-500/20">
                <MapPin className="h-3 w-3" />
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/client/orders")}
            className="w-fit rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 text-[9px] font-extrabold text-white shadow-xs transition-all cursor-pointer active:scale-[0.98] z-10"
          >
            Track Now
          </button>
        </div>

        {/* Make a Payment */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between h-28">
          <div className="space-y-0.5 z-10">
            <h3 className="text-xs font-extrabold text-slate-800 leading-none">Make a Payment</h3>
            <p className="text-[10px] font-normal text-slate-600 leading-tight mt-0.5">
              Secure online payments
            </p>
          </div>

          {/* Card Illustration */}
          <div className="absolute right-1 bottom-1 w-20 h-14 pointer-events-none opacity-95 scale-80">
            <div className="relative w-full h-full">
              <div className="absolute top-1 right-1 w-16 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 rotate-[10deg] shadow-md flex items-center justify-between p-1.5 text-white">
                <div className="h-2 w-3 rounded-xs bg-amber-400/80" />
                <div className="h-1 w-6 rounded-full bg-white/40" />
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/client/payments")}
            className="w-fit rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 text-[9px] font-extrabold text-white shadow-xs transition-all cursor-pointer active:scale-[0.98] z-10"
          >
            Pay Now
          </button>
        </div>

        {/* Download Invoices */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between h-28">
          <div className="space-y-0.5 z-10">
            <h3 className="text-xs font-extrabold text-slate-800 leading-none">Download Invoices</h3>
            <p className="text-[10px] font-normal text-slate-600 leading-tight mt-0.5">
              View and download receipts
            </p>
          </div>

          {/* Invoices Illustration */}
          <div className="absolute right-2 bottom-2 w-16 h-14 pointer-events-none opacity-90 scale-75">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative w-10 h-13 rounded-lg bg-slate-50 border border-slate-100 shadow-xs flex flex-col gap-1 p-1">
                <div className="h-1.5 w-6 bg-slate-200 rounded-full" />
                <div className="h-1 w-7 bg-slate-100 rounded-full" />
                <div className="h-1 w-7 bg-slate-100 rounded-full" />
                
                <div className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-md bg-violet-600 text-white shadow-xs">
                  <FileText className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/client/orders")}
            className="w-fit rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 text-[9px] font-extrabold text-white shadow-xs transition-all cursor-pointer active:scale-[0.98] z-10"
          >
            View Invoices
          </button>
        </div>

        {/* Need Support? */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between h-28">
          <div className="space-y-0.5 z-10">
            <h3 className="text-xs font-extrabold text-slate-800 leading-none">Need Support?</h3>
            <p className="text-[10px] font-normal text-slate-600 leading-tight mt-0.5">
              Get assistance from our team
            </p>
          </div>

          {/* Support Illustration */}
          <div className="absolute right-2 bottom-2 w-16 h-14 pointer-events-none opacity-90 scale-80">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500 shadow-inner">
                <Headphones className="h-5 w-5" />
                <div className="absolute -top-1 -right-1.5 text-[8px]">💬</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-fit rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 text-[9px] font-extrabold text-white shadow-xs transition-all cursor-pointer active:scale-[0.98] z-10"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
