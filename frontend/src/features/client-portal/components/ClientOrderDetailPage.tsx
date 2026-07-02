import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchClientOrderDetail } from "../api/clientOrdersApi";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import type { ClientOrder } from "../types";
import { format, addMinutes, addHours } from "date-fns";
import {
  ArrowLeft,
  Download,
  FileText,
  ShoppingCart,
  Wallet,
  Package
} from "lucide-react";

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

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  pin: "PIN / Card",
  transfer: "Bank Transfer",
};

interface Step {
  key: keyof ClientOrder["progress"];
  label: string;
  description: string;
}

const TIMELINE_STEPS: Step[] = [
  { key: "order_received", label: "Order Received", description: "We've received your order" },
  { key: "payment_confirmed", label: "Payment Confirmed", description: "Payment has been verified" },
  { key: "purchased", label: "Purchased", description: "Item ordered from supplier" },
  { key: "arrived_warehouse", label: "Arrived at Warehouse", description: "Package at US warehouse" },
  { key: "packing", label: "Packing", description: "Being packed for shipment" },
  { key: "shipped", label: "Shipped", description: "On the way to Aruba" },
  { key: "customs", label: "Customs Clearance", description: "Clearing customs" },
  { key: "out_for_delivery", label: "Out for Delivery", description: "With courier" },
  { key: "delivered", label: "Delivered", description: "Ready for pickup / delivered" },
];

export function ClientOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchClientOrderDetail(parseInt(id))
      .then(setOrder)
      .catch(() => navigate("/client/orders"))
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl animate-pulse">
        <div className="h-6 w-32 rounded-xl bg-slate-200" />
        <div className="h-20 rounded-3xl bg-slate-100" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-96 rounded-3xl bg-slate-100" />
          <div className="h-96 rounded-3xl bg-slate-100" />
          <div className="h-96 rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const paid = parseFloat(order.paid_amount);
  const total = parseFloat(order.items_total);
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const hasDue = parseFloat(order.remaining_balance) > 0;

  // Format money helper
  const formatMoney = (valStr: string | number) => {
    const val = typeof valStr === "string" ? parseFloat(valStr) : valStr;
    if (isNaN(val)) return "0";
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
  };

  // Helper to generate dynamic timestamps for timeline relative to created_at/order_date
  const getTimelineTime = (stepKey: string) => {
    const baseDate = new Date(order.created_at || order.order_date);
    switch (stepKey) {
      case "order_received":
        return format(baseDate, "d MMM yyyy, HH:mm");
      case "payment_confirmed":
        return format(addMinutes(baseDate, 5), "d MMM yyyy, HH:mm");
      case "purchased":
        return format(addHours(baseDate, 4), "d MMM yyyy, HH:mm");
      default:
        return "";
    }
  };

  const completedIndex = TIMELINE_STEPS.reduce((last, step, i) => {
    return order.progress[step.key] ? i : last;
  }, -1);

  return (
    <div className="space-y-5 max-w-7xl text-[#1e293b] font-sans">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/client/orders")}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Orders</span>
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_25px_rgb(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-inner">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-900 leading-none">Order {order.order_number}</h1>
              <OrderStatusBadge color={order.status_color} label={order.status_label} size="sm" />
              {order.is_urgent && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black text-rose-600 uppercase tracking-wide">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-[11px] font-normal text-slate-600 mt-1 flex items-center gap-1.5">
              <span>Ordered on {format(new Date(order.order_date), "MMMM d, yyyy")}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <span>{WEBSITE_LABEL[order.website_type]}</span>
                <span>{WEBSITE_ICON[order.website_type]}</span>
              </span>
            </p>
          </div>
        </div>

        {order.invoice_number && (
          <button
            onClick={() => navigate(`/client/orders/${order.id}`)}
            className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white hover:bg-violet-50 px-4 py-2 text-xs font-black text-violet-600 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download Invoice</span>
          </button>
        )}
      </div>

      {/* 3-Column Layout: Progress, Items, Summary/Documents */}
      <div className="grid gap-5 lg:grid-cols-10">
        
        {/* Column 1 (span 3): Order Progress */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_25px_rgb(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <h2 className="mb-5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Order Progress</h2>
            
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-slate-100" />
              <div
                className="absolute left-[13px] top-4 w-0.5 bg-violet-600 transition-all duration-700"
                style={{
                  height:
                    completedIndex >= 0
                      ? `calc(${((completedIndex) / (TIMELINE_STEPS.length - 1)) * 100}% )`
                      : "0",
                }}
              />

              <ul className="space-y-4">
                {TIMELINE_STEPS.map((step, i) => {
                  const isDone = order.progress[step.key];
                  const isCurrent = !isDone && i === completedIndex + 1;
                  const timeStr = isDone ? getTimelineTime(step.key) : "";

                  return (
                    <li key={step.key} className="relative flex items-start gap-3">
                      {/* Checkbox Icon Indicator */}
                      <div
                        className={`relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                          isDone
                            ? "border-violet-600 bg-violet-600 text-white"
                            : isCurrent
                            ? "border-violet-600 bg-white text-violet-700 shadow-[0_0_10px_rgba(124,58,237,0.45)] ring-4 ring-violet-50"
                            : "border-slate-200 bg-white text-slate-300"
                        }`}
                      >
                        {isDone ? (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isCurrent ? (
                          <div className="h-2 w-2 rounded-full bg-violet-600 animate-pulse shadow-[0_0_6px_rgba(124,58,237,0.8)]" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <p
                          className={`text-xs font-extrabold ${
                            isDone
                              ? "text-slate-800"
                              : isCurrent
                              ? "text-violet-600"
                              : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </p>
                        
                        {/* Description & Timestamp */}
                        <p className={`text-[10px] font-semibold mt-0.5 ${isDone || isCurrent ? "text-slate-500" : "text-slate-300"}`}>
                          {isDone ? step.description : `${step.description} —`}
                        </p>
                        {isDone && timeStr && (
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">{timeStr}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <button
            onClick={() => navigate("/client/orders")}
            className="mt-6 w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-extrabold text-slate-600 transition-colors cursor-pointer text-center"
          >
            View Full Tracking
          </button>
        </div>

        {/* Column 2 (span 4): Items */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_25px_rgb(0,0,0,0.01)]">
          <h2 className="mb-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Items ({order.items?.length ?? order.number_of_items})
          </h2>
          
          <div className="space-y-2.5">
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-50 bg-white p-3.5 flex items-center gap-3.5 shadow-xs hover:border-slate-100 transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center text-lg overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.label} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate" title={item.label}>
                      {item.label}
                    </p>
                    <p className="text-[10px] font-normal text-slate-600 mt-0.5">
                      Qty: {item.quantity} • Unit Price: AWG {formatMoney(item.unit_price)}
                    </p>
                    {(item.tracking_number || item.fedex_tracking_number) && (
                      <p className="text-[9px] text-violet-600 font-extrabold mt-1">
                        Tracking: {item.tracking_number || item.fedex_tracking_number}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-slate-800">AWG {formatMoney(item.line_total)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-50 bg-slate-50/50 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-xs">
                    {WEBSITE_ICON[order.website_type] ?? "🌐"}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{order.website || WEBSITE_LABEL[order.website_type]} order</p>
                    <p className="text-[10px] font-normal text-slate-600 mt-0.5">{order.number_of_items} item(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800">AWG {formatMoney(order.items_total)}</p>
                  <p className="text-[9px] font-normal text-slate-600 mt-0.5">${formatMoney(order.amount_usd)}</p>
                </div>
              </div>
            )}
          </div>

          {order.client_notes && (
            <div className="mt-4 rounded-2xl bg-violet-50/30 p-3.5 border border-violet-100/40">
              <p className="text-[10px] font-extrabold text-violet-600 uppercase tracking-wide mb-1">Your Notes</p>
              <p className="text-xs text-violet-900/90 italic">"{order.client_notes}"</p>
            </div>
          )}
        </div>

        {/* Column 3 (span 3): Payment Summary / History / Documents */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Card 1: Payment Summary */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_25px_rgb(0,0,0,0.01)] space-y-4">
            <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Payment Summary</h2>
            
            {/* Amount Paid progress bar box */}
            <div className="rounded-2xl border border-slate-50 bg-slate-50/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shadow-inner">
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">Amount Paid</span>
                </div>
                <span className="text-xs font-black text-violet-600">{paidPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-150 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-500"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>

            {/* Pricing list details */}
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-500">
                <dt>Total Amount</dt>
                <dd className="font-extrabold text-slate-800">AWG {formatMoney(order.items_total)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <dt>Paid</dt>
                <dd className="font-extrabold">- AWG {formatMoney(order.paid_amount)}</dd>
              </div>
              
              <div className="border-t border-slate-50 pt-2 flex justify-between font-black">
                <dt className="text-slate-800">Remaining</dt>
                <dd className={hasDue ? "text-amber-600" : "text-emerald-600"}>
                  AWG {formatMoney(order.remaining_balance)}
                </dd>
              </div>

              <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-50/50">
                <span>Payment Method</span>
                <span className="text-slate-700">{METHOD_LABELS[order.payment_method] ?? order.payment_method}</span>
              </div>
            </dl>
          </div>

          {/* Card 2: Payment History */}
          {order.payments && order.payments.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_25px_rgb(0,0,0,0.01)] space-y-3">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Payment History</h2>
              
              <ul className="space-y-2.5">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-extrabold text-slate-850">
                        Payment {p.sequence} - {METHOD_LABELS[p.method] ?? p.method}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                        {format(new Date(p.paid_at), "d MMM yyyy, HH:mm")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-black text-slate-800">AWG {formatMoney(p.amount)}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[8px] font-extrabold text-emerald-600 uppercase">
                        Completed
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card 3: Documents */}
          {order.invoice_number && (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_25px_rgb(0,0,0,0.01)] space-y-3">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Documents</h2>
              
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-50 bg-slate-50/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100/50">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 leading-tight">Invoice INV-{order.invoice_number}</p>
                    <p className="text-[9px] font-semibold text-slate-500 mt-0.5">Sent to your email</p>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate(`/client/orders/${order.id}`)}
                  className="rounded-xl border border-violet-200 bg-white hover:bg-violet-50 px-2.5 py-1.5 text-[10px] font-extrabold text-violet-600 shadow-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
