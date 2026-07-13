import { Calendar, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OrderListItem, OrderStatusField } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrderStatus } from "../api/ordersViewerApi";

interface OrdersTableProps {
  orders: OrderListItem[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  selectedOrderId?: number;
  onSelectOrder?: (order: OrderListItem) => void;
}

function AvatarInitial({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  
  const bgColors = [
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
  ];
  const index = initial.charCodeAt(0) % bgColors.length;
  
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-xs",
        bgColors[index]
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function formatOrderDateAndTime(dateStr: string) {
  try {
    // order_date is "YYYY-MM-DD" — parse parts directly to avoid UTC midnight
    // timezone shift (e.g. "2026-07-09" → 00:00 UTC → 05:30 IST)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      const localDate = new Date(year, month - 1, day);
      const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
      return { date: localDate.toLocaleDateString("en-US", dateOpts), time: "" };
    }
    // Fallback for full datetime strings
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr, time: "" };
    const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return { date: d.toLocaleDateString("en-US", dateOpts), time: "" };
  } catch {
    return { date: dateStr, time: "" };
  }
}

function formatCurrencyInt(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${Math.round(num).toLocaleString("en-US")}`;
}

export function OrdersTable({
  orders,
  isLoading,
  isRefreshing,
  selectedOrderId,
  onSelectOrder,
}: OrdersTableProps) {
  const showEmpty = !isLoading && orders.length === 0;
  const queryClient = useQueryClient();

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload: Partial<Record<OrderStatusField, boolean>> }) =>
      updateOrderStatus(orderId, payload),
    onSuccess: () => {
      // Invalidate all order queries (["orders"] prefix matches all variants with filter params)
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });



  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {isRefreshing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Order ID</th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Customer</th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Order</th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Finances (AWG)</th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Placed By</th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={6} className="px-5 py-6">
                    <div className="h-5 rounded bg-slate-100 w-full" />
                  </td>
                </tr>
              ))
            ) : showEmpty ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-550">
                  <p className="text-sm font-semibold">No orders found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search criteria.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const { date, time } = formatOrderDateAndTime(order.order_date);
                const balanceVal = parseFloat(order.remaining_balance);

                const idVal = order.order_number.split("-").pop() || "";
                const displayId = idVal.slice(-4);

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder?.(order)}
                    className={cn(
                      "group cursor-pointer border-l-4 transition-colors hover:bg-slate-50/50",
                      isSelected
                        ? "bg-violet-50/40 border-violet-600"
                        : "border-transparent"
                    )}
                  >
                    {/* Order ID (4-digit) */}
                    <td className="px-5 py-3.5 font-bold text-violet-600 text-xs">
                      #{displayId}
                    </td>

                    {/* Customer Info (Email first, then Phone) */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarInitial name={order.customer.name} />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-black text-slate-800 leading-tight">
                              {order.customer.name}
                            </p>
                            {order.is_urgent && (
                              <span className="rounded bg-rose-50 border border-rose-100 px-1.5 py-0.5 text-[8px] font-black text-rose-600 uppercase tracking-wider leading-none shrink-0 shadow-2xs">
                                Urgent
                              </span>
                            )}
                            {order.is_new_client && (
                              <span className="rounded bg-violet-50 border border-violet-100 px-1.5 py-0.5 text-[8px] font-black text-violet-600 uppercase tracking-wider leading-none shrink-0 shadow-2xs">
                                New Client
                              </span>
                            )}
                          </div>
                          {order.customer.email && (
                            <p className="text-[10px] font-normal text-slate-550 mt-0.5">
                              {order.customer.email}
                            </p>
                          )}
                          <p className="text-[10px] font-normal text-slate-550 mt-0.5">
                            {order.customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Order (Date & Cost) */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="text-xs font-bold text-slate-700 leading-tight">{date}</p>
                            {time && <p className="text-[10px] font-normal text-slate-550 mt-0.5">{time}</p>}
                          </div>
                        </div>
                        {order.amount_usd && parseFloat(order.amount_usd) > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 ml-5">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Cost:</span>
                            <span className="text-xs font-bold text-slate-700">${Math.round(parseFloat(order.amount_usd))}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Combined Finances Column (AWG) - Vertically Stacked */}
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <div>
                          <span className="text-[9px] text-slate-600 font-bold mr-1 uppercase">Total:</span>
                          <span className="font-black text-slate-950">{formatCurrencyInt(order.items_total)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-600 font-bold mr-1 uppercase">Paid:</span>
                          <span className="font-black text-emerald-700">{formatCurrencyInt(order.paid_amount)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-600 font-bold mr-1 uppercase">Balance:</span>
                          <span className={cn("font-black", balanceVal > 0 ? "text-rose-600" : "text-emerald-700")}>
                            {formatCurrencyInt(order.remaining_balance)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Placed By */}
                    <td className="px-5 py-3.5">
                      {order.placed_by?.full_name ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                            {order.placed_by.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-700">{order.placed_by.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">-</span>
                      )}
                    </td>

                    {/* Status Column — 4 independent checkbox lines */}
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        {([
                          { field: "is_az_ordered" as OrderStatusField, label: "AZ Ordered", color: "text-violet-600" },
                          { field: "is_uploaded" as OrderStatusField, label: "Uploaded", color: "text-teal-600" },
                          { field: "is_in_myus" as OrderStatusField, label: "In MyUS", color: "text-blue-600" },
                          { field: "is_completed" as OrderStatusField, label: "Completed", color: "text-emerald-600" },
                        ]).map(({ field, label, color }) => {
                          const checked = order[field];
                          return (
                            <button
                              key={field}
                              type="button"
                              disabled={statusMutation.isPending}
                              onClick={() => {
                                statusMutation.mutate({
                                  orderId: order.id,
                                  payload: { [field]: !checked },
                                });
                              }}
                              className={cn(
                                "flex items-center gap-1.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors w-full text-left cursor-pointer select-none",
                                checked
                                  ? `${color} bg-transparent`
                                  : "text-slate-350 hover:text-slate-500"
                              )}
                            >
                              {/* Checkbox icon */}
                              {checked ? (
                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <rect x="3" y="3" width="18" height="18" rx="4" className="fill-current opacity-10" />
                                  <path d="M9 11.5l2 2 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                                  <rect x="3" y="3" width="18" height="18" rx="4" />
                                </svg>
                              ) : (
                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <rect x="3" y="3" width="18" height="18" rx="4" />
                                </svg>
                              )}
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
