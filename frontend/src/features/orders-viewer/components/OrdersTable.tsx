import { Calendar, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
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
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr, time: "" };
    
    const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    
    return {
      date: d.toLocaleDateString("en-US", dateOpts),
      time: d.toLocaleTimeString("en-US", timeOpts),
    };
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
  const [openStatusOrderId, setOpenStatusOrderId] = useState<number | null>(null);

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload: Partial<Record<OrderStatusField, boolean>> }) =>
      updateOrderStatus(orderId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
    },
  });

  const getActiveStatusValue = (order: OrderListItem) => {
    if (order.is_completed) return "completed";
    if (order.is_in_myus) return "in_myus";
    if (order.is_uploaded) return "uploaded";
    if (order.is_az_ordered) return "az_ordered";
    return "pending";
  };

  const getStatusBadge = (statusVal: string) => {
    if (statusVal === "completed") {
      return { label: "Delivered", classes: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    if (statusVal === "in_myus") {
      return { label: "In MyUS", classes: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    if (statusVal === "uploaded") {
      return { label: "Uploaded", classes: "bg-teal-50 text-teal-700 border-teal-100" };
    }
    if (statusVal === "az_ordered") {
      return { label: "AZ Ordered", classes: "bg-violet-50 text-violet-700 border-violet-100" };
    }
    return { label: "Pending", classes: "bg-amber-50 text-amber-700 border-amber-100" };
  };

  const handleStatusChange = (orderId: number, statusVal: string) => {
    const payload: Partial<Record<OrderStatusField, boolean>> = {
      is_az_ordered: false,
      is_uploaded: false,
      is_in_myus: false,
      is_completed: false,
    };

    if (statusVal === "az_ordered") {
      payload.is_az_ordered = true;
    } else if (statusVal === "uploaded") {
      payload.is_az_ordered = true;
      payload.is_uploaded = true;
    } else if (statusVal === "in_myus") {
      payload.is_az_ordered = true;
      payload.is_uploaded = true;
      payload.is_in_myus = true;
    } else if (statusVal === "completed") {
      payload.is_az_ordered = true;
      payload.is_uploaded = true;
      payload.is_in_myus = true;
      payload.is_completed = true;
    }

    statusMutation.mutate({ orderId, payload });
  };

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
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Date & Time</th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Finances (AWG)</th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-550">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={5} className="px-5 py-6">
                    <div className="h-5 rounded bg-slate-100 w-full" />
                  </td>
                </tr>
              ))
            ) : showEmpty ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-550">
                  <p className="text-sm font-semibold">No orders found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search criteria.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const { date, time } = formatOrderDateAndTime(order.order_date);
                const balanceVal = parseFloat(order.remaining_balance);
                const currentStatus = getActiveStatusValue(order);
                const statusInfo = getStatusBadge(currentStatus);

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

                    {/* Date & Time */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-700 leading-tight">{date}</p>
                          <p className="text-[10px] font-normal text-slate-550 mt-0.5">{time}</p>
                        </div>
                      </div>
                    </td>

                    {/* Combined Finances Column (AWG) - Vertically Stacked */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                      <div className="flex flex-col gap-0.5">
                        <div>
                          <span className="text-[9px] text-slate-500 font-normal mr-1 uppercase">Total:</span>
                          <span className="font-bold text-slate-800">{formatCurrencyInt(order.items_total)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-normal mr-1 uppercase">Paid:</span>
                          <span className="font-bold text-emerald-600">{formatCurrencyInt(order.paid_amount)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-normal mr-1 uppercase">Balance:</span>
                          <span className={cn("font-bold", balanceVal > 0 ? "text-rose-500" : "text-emerald-600")}>
                            {formatCurrencyInt(order.remaining_balance)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Custom Styled Clickable Status Column Dropdown */}
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenStatusOrderId(openStatusOrderId === order.id ? null : order.id)}
                          disabled={statusMutation.isPending}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider leading-none cursor-pointer hover:opacity-90 transition-all",
                            currentStatus === "completed" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                            currentStatus === "in_myus" && "bg-blue-50 text-blue-700 border-blue-100",
                            currentStatus === "uploaded" && "bg-teal-50 text-teal-700 border-teal-100",
                            currentStatus === "az_ordered" && "bg-violet-50 text-violet-700 border-violet-100",
                            currentStatus === "pending" && "bg-amber-50 text-amber-700 border-amber-100"
                          )}
                        >
                          <span>{statusInfo.label}</span>
                          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                        </button>

                        {openStatusOrderId === order.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenStatusOrderId(null)} />
                            <div className="absolute left-0 mt-1 w-32 rounded-xl border border-slate-100 bg-white p-1 shadow-lg z-50 text-left">
                              {[
                                { val: "pending", label: "Pending", classes: "hover:bg-amber-50 hover:text-amber-700" },
                                { val: "az_ordered", label: "AZ Ordered", classes: "hover:bg-violet-50 hover:text-violet-700" },
                                { val: "uploaded", label: "Uploaded", classes: "hover:bg-teal-50 hover:text-teal-700" },
                                { val: "in_myus", label: "In MyUS", classes: "hover:bg-blue-50 hover:text-blue-700" },
                                { val: "completed", label: "Delivered", classes: "hover:bg-emerald-50 hover:text-emerald-700" },
                              ].map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    setOpenStatusOrderId(null);
                                    handleStatusChange(order.id, opt.val);
                                  }}
                                  className={cn(
                                    "w-full px-2.5 py-1.5 text-left text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer text-slate-700",
                                    opt.classes,
                                    currentStatus === opt.val && "bg-slate-50 font-extrabold text-violet-750"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
