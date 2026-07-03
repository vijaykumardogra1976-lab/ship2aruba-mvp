import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchClientOrders } from "../api/clientOrdersApi";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import type { ClientOrder } from "../types";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowRight,
  MapPin,
  ClipboardList
} from "lucide-react";

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

const WEBSITE_LABEL: Record<string, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  other: "Website",
};

function formatAmount(amountStr: string, isUSD: boolean = true) {
  const parsed = parseFloat(amountStr);
  if (isNaN(parsed)) return "";
  if (parsed % 1 === 0) {
    return isUSD ? `$${parsed.toFixed(0)} USD` : `${parsed.toFixed(0)}`;
  }
  return isUSD ? `$${parsed.toFixed(2)} USD` : `${parsed.toFixed(2)}`;
}

function OrderCard({ order, onClick, navigate }: { order: ClientOrder; onClick: () => void; navigate: any }) {
  const hasDue = parseFloat(order.remaining_balance) > 0;
  const formattedDue = parseFloat(order.remaining_balance) % 1 === 0 
    ? parseFloat(order.remaining_balance).toFixed(0) 
    : parseFloat(order.remaining_balance).toFixed(2);

  return (
    <div
      onClick={onClick}
      className="group flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_25px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 relative cursor-pointer"
    >
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-base font-extrabold shadow-inner">
              {WEBSITE_ICON[order.website_type] ?? "🌐"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-black text-slate-800 truncate">{order.order_number}</p>
                {order.is_urgent && (
                  <span className="rounded-full bg-rose-50 px-1.5 py-0.2 text-[8px] font-black text-rose-600 uppercase tracking-wide">
                    Urgent
                  </span>
                )}
              </div>
              <p className="text-[10px] font-normal text-slate-600 mt-0.5">
                {WEBSITE_LABEL[order.website_type]} • {format(new Date(order.order_date), "d MMM yyyy")} • {order.number_of_items} items
              </p>
            </div>
          </div>
          <OrderStatusBadge color={order.status_color} label={order.status_label} size="sm" />
        </div>
        
        {/* Price info */}
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Amount</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-black text-slate-800">{formatAmount(order.amount_usd)}</p>
            {hasDue && (
              <p className="text-[10px] font-extrabold text-amber-600">
                AWG {formattedDue} due
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer rounded bar */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50/50 p-2.5 group-hover:bg-violet-55 hover:bg-violet-50/40 transition-all duration-300">
        <span
          className="flex items-center gap-1 text-[11px] font-extrabold text-violet-600 group-hover:text-violet-800 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="h-3 w-3" />
        </span>

        {/* Invoice action */}
        {order.invoice_number && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/client/orders/${order.id}`);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-violet-600 hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer border border-slate-100 shadow-xs"
            title={`Invoice ${order.invoice_number}`}
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
        )}
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
  
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const activeStatus = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const ordering = searchParams.get("ordering") ?? "-created_at";

  useEffect(() => {
    setIsLoading(true);
    fetchClientOrders({
      status: activeStatus,
      search,
      page,
      ordering,
    })
      .then((res) => {
        setOrders(res.results);
        setCount(res.count);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeStatus, search, page, ordering]);

  const setStatus = (s: string) => {
    const params = new URLSearchParams(searchParams);
    if (s === "all") params.delete("status");
    else params.set("status", s);
    params.delete("page");
    setSearchParams(params);
  };

  const handleSearchChange = (val: string) => {
    const params = new URLSearchParams(searchParams);
    if (val) params.set("search", val);
    else params.delete("search");
    params.delete("page");
    setSearchParams(params);
  };

  const handleSortChange = (sortVal: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("ordering", sortVal);
    params.delete("page");
    setSearchParams(params);
    setShowSortDropdown(false);
  };

  const getSortLabel = (val: string) => {
    switch (val) {
      case "-created_at":
        return "Newest First";
      case "created_at":
        return "Oldest First";
      case "-amount_usd":
        return "Price: High to Low";
      case "amount_usd":
        return "Price: Low to High";
      case "-order_date":
        return "Newest Order Date";
      default:
        return "Newest First";
    }
  };

  const pageCount = Math.ceil(count / 10);
  const itemsPerPage = 10;
  const startItemIdx = (page - 1) * itemsPerPage + 1;
  const endItemIdx = Math.min(page * itemsPerPage, count);

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-[#1e293b] font-sans">
      
      {/* Title & Breadcrumbs */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Orders</h1>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
          <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate("/client/dashboard")}>Dashboard</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Orders</span>
        </div>
      </div>

      {/* Promotional / Help Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-50/50 border border-slate-100 p-4.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 leading-tight">Track and manage all your shipments in one place</h4>
            <p className="text-[10px] font-normal text-slate-600 mt-0.5">Stay updated with real-time status and order information.</p>
          </div>
        </div>
        {/* Right illustration - map pin layout */}
        <div className="hidden md:block w-32 h-12 relative opacity-85">
          <svg className="absolute inset-0 w-full h-full text-violet-200" fill="none">
            <path d="M10,25 Q40,10 60,25 T110,15" stroke="currentColor" strokeWidth="2" strokeDasharray="3,3" />
          </svg>
          <div className="absolute top-2 right-8 flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500 text-white shadow-md shadow-violet-500/20">
            <MapPin className="h-3 w-3" />
          </div>
          <div className="absolute bottom-1 right-2 text-xs">📦</div>
        </div>
      </div>

      {/* Filter and Search bar Area (Compact, directly on page background) */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Search & Input tools */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID or website..."
              defaultValue={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 outline-none shadow-xs transition-all"
            />
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 cursor-pointer transition-all">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Select date range</span>
            <ChevronRight className="h-2.5 w-2.5 rotate-90 text-slate-400" />
          </div>

          {/* Filters toggle */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 cursor-pointer transition-all">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>Filters</span>
          </div>
        </div>

        {/* Row 2: Pills & Sort by */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                className={`flex-shrink-0 rounded-xl px-3.5 py-1.5 text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeStatus === tab.key
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/10"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort by */}
          <div className="relative shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 cursor-pointer transition-all"
            >
              <span className="text-slate-400">Sort by:</span>
              <span className="text-slate-800">{getSortLabel(ordering)}</span>
              <ChevronRight className="h-3 w-3 rotate-90 text-slate-400" />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 mt-2 z-20 w-44 rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden py-1.5 text-xs">
                  <button
                    onClick={() => handleSortChange("-created_at")}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold ${ordering === "-created_at" ? "text-violet-600 bg-violet-50/40" : "text-slate-600"}`}
                  >
                    Newest First
                  </button>
                  <button
                    onClick={() => handleSortChange("created_at")}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold ${ordering === "created_at" ? "text-violet-600 bg-violet-50/40" : "text-slate-600"}`}
                  >
                    Oldest First
                  </button>
                  <button
                    onClick={() => handleSortChange("-amount_usd")}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold ${ordering === "-amount_usd" ? "text-violet-600 bg-violet-50/40" : "text-slate-600"}`}
                  >
                    Price: High to Low
                  </button>
                  <button
                    onClick={() => handleSortChange("amount_usd")}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold ${ordering === "amount_usd" ? "text-violet-600 bg-violet-50/40" : "text-slate-600"}`}
                  >
                    Price: Low to High
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid Controls Header */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          {count} order{count !== 1 ? "s" : ""} found
        </p>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 border border-slate-200/50">
          <button
            onClick={() => setViewMode("card")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "card" ? "bg-white text-violet-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
            title="Card View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "list" ? "bg-white text-violet-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
            title="List View"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main orders output */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-3xl bg-slate-100 animate-pulse border border-slate-50" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-white border border-dashed border-slate-200">
          <span className="text-5xl mb-4">📦</span>
          <h3 className="text-sm font-extrabold text-slate-800">No orders found</h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {activeStatus !== "all" ? "Try selecting a different status filter." : "You don't have any orders yet."}
          </p>
        </div>
      ) : viewMode === "card" ? (
        
        /* CARD VIEW LAYOUT (3 columns grid matching mockup) */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/client/orders/${order.id}`)}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        
        /* LIST VIEW LAYOUT */
        <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total Price</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {orders.map((order) => {
                  const hasDue = parseFloat(order.remaining_balance) > 0;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{order.order_number}</span>
                          {order.is_urgent && (
                            <span className="rounded-full bg-rose-50 px-1 py-0.2 text-[7px] font-black text-rose-600 uppercase">
                              Urgent
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-500">
                        {format(new Date(order.order_date), "dd MMM yyyy")}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-655">
                        <span className="mr-1.5">{WEBSITE_ICON[order.website_type]}</span>
                        {WEBSITE_LABEL[order.website_type]}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {order.number_of_items}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-805">
                        {formatAmount(order.amount_usd)}
                      </td>
                      <td className={`py-3 px-4 font-extrabold ${hasDue ? "text-amber-600" : "text-emerald-600"}`}>
                        {hasDue ? `AWG ${parseFloat(order.remaining_balance) % 1 === 0 ? parseFloat(order.remaining_balance).toFixed(0) : parseFloat(order.remaining_balance).toFixed(2)}` : "Fully Paid"}
                      </td>
                      <td className="py-3 px-4">
                        <OrderStatusBadge color={order.status_color} label={order.status_label} size="sm" />
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/client/orders/${order.id}`)}
                            className="font-bold text-violet-600 hover:underline cursor-pointer"
                          >
                            Details
                          </button>
                          {order.invoice_number && (
                            <button
                              onClick={() => navigate(`/client/orders/${order.id}`)}
                              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              title={`Invoice ${order.invoice_number}`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar (Matching Mockup exactly) */}
      {count > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs text-slate-400 font-semibold">
          
          <span>
            Showing <span className="text-slate-700 font-extrabold">{startItemIdx}</span> to{" "}
            <span className="text-slate-700 font-extrabold">{endItemIdx}</span> of{" "}
            <span className="text-slate-700 font-extrabold">{count}</span> orders
          </span>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            
            {[...Array(pageCount)].map((_, i) => {
              const pIdx = i + 1;
              return (
                <button
                  key={pIdx}
                  onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(pIdx) })}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                    page === pIdx
                      ? "border-violet-600 bg-violet-600 text-white shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  {pIdx}
                </button>
              );
            })}

            <button
              disabled={page >= pageCount}
              onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Rows per page dropdown */}
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-slate-700 font-extrabold shadow-inner cursor-pointer hover:bg-slate-50">
              <span>10</span>
              <ChevronRight className="h-3 w-3 rotate-90 text-slate-400" />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
