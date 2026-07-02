import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchClientOrderDetail } from "../api/clientOrdersApi";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import { OrderTimeline } from "./ui/OrderTimeline";
import type { ClientOrder } from "../types";
import { format } from "date-fns";

const WEBSITE_ICON: Record<string, string> = {
  amazon: "🛒",
  ebay: "🏷️",
  other: "🌐",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  pin: "PIN / Card",
  transfer: "Bank Transfer",
};

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
      <div className="max-w-6xl space-y-6">
        <div className="h-6 w-32 rounded-lg bg-gray-200 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="lg:col-span-2 h-96 rounded-2xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const paid = parseFloat(order.paid_amount);
  const total = parseFloat(order.items_total);
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const hasDue = parseFloat(order.remaining_balance) > 0;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate("/client/orders")}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">{order.order_number}</span>
      </div>

      {/* Hero header */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
              {WEBSITE_ICON[order.website_type] ?? "🌐"}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">Order {order.order_number}</h1>
                <OrderStatusBadge color={order.status_color} label={order.status_label} size="md" />
                {order.is_urgent && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 uppercase">
                    Urgent
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Ordered on {format(new Date(order.order_date), "MMMM d, yyyy")}
                {order.website && ` · ${order.website}`}
              </p>
            </div>
          </div>
          {hasDue && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
              <span className="text-sm font-semibold text-amber-900">AWG {order.remaining_balance} due</span>
              <button
                onClick={() => navigate("/client/payments")}
                className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
              >
                Pay Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Order Progress Timeline */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
          <h2 className="mb-6 text-sm font-bold uppercase tracking-wider text-gray-500">Order Progress</h2>
          <OrderTimeline progress={order.progress} />
        </div>

        {/* Center + Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
              Items ({order.items?.length ?? order.number_of_items})
            </h2>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-4 shadow-sm hover:border-gray-200 transition-colors"
                  >
                    <img
                      src={item.image_url}
                      alt={item.label}
                      className="h-12 w-12 rounded-xl object-cover bg-gray-50 border border-slate-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate" title={item.label}>
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Qty: {item.quantity} · Unit Price: AWG {item.unit_price}
                      </p>
                      {(item.tracking_number || item.fedex_tracking_number) && (
                        <p className="text-[10px] text-violet-600 font-semibold mt-1">
                          Tracking: {item.tracking_number || item.fedex_tracking_number}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">AWG {item.line_total}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-4 p-4 bg-gray-50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                      {WEBSITE_ICON[order.website_type] ?? "🌐"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {order.website || order.website_type} order
                      </p>
                      <p className="text-xs text-gray-400">{order.number_of_items} item(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">${order.amount_usd} USD</p>
                      <p className="text-xs text-gray-400">AWG {order.items_total}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {order.client_notes && (
              <div className="mt-4 rounded-xl bg-blue-50 p-4 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">Your Notes</p>
                <p className="text-sm text-blue-900 italic">"{order.client_notes}"</p>
              </div>
            )}
          </div>

          {/* Payment summary */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Payment</h2>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Amount Paid</span>
                <span className="font-semibold text-gray-900">{paidPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>

            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Total Amount</dt>
                <dd className="font-semibold text-gray-900">AWG {order.items_total}</dd>
              </div>
              <div className="flex justify-between text-sm text-emerald-600">
                <dt>Paid</dt>
                <dd className="font-semibold">- AWG {order.paid_amount}</dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-gray-100 pt-2">
                <dt className="text-sm font-bold text-gray-900">Remaining</dt>
                <dd className={`text-sm font-bold ${hasDue ? "text-amber-600" : "text-emerald-600"}`}>
                  AWG {order.remaining_balance}
                </dd>
              </div>
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>Payment Method</span>
                <span>{METHOD_LABELS[order.payment_method] ?? order.payment_method}</span>
              </div>
            </dl>

            {/* Payment history */}
            {order.payments && order.payments.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment History</p>
                <ul className="space-y-2">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Payment {p.sequence} · {METHOD_LABELS[p.method] ?? p.method}
                      </span>
                      <span className="font-semibold text-gray-900">AWG {p.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Invoice */}
          {order.invoice_number && (
            <div className="rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Documents</h2>
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  📄
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Invoice {order.invoice_number}</p>
                  <p className="text-xs text-gray-400">Sent to your email</p>
                </div>
                <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                  Available
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
