import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchClientPayments } from "../api/clientOrdersApi";
import { OrderStatusBadge } from "./ui/OrderStatusBadge";
import type { PaymentsData } from "../types";
import { format } from "date-fns";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  pin: "PIN / Card",
  transfer: "Bank Transfer",
};

const METHOD_ICON: Record<string, string> = {
  cash: "💵",
  pin: "💳",
  transfer: "🏦",
};

export function ClientPaymentsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaymentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClientPayments()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const hasOutstanding = parseFloat(data?.outstanding ?? "0") > 0;

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your payments and history</p>
      </div>

      {/* Outstanding balance hero */}
      <div
        className={`relative overflow-hidden rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${
          hasOutstanding
            ? "bg-gradient-to-br from-violet-600 to-violet-800 text-white"
            : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white"
        }`}
      >
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-10 bg-white" />
        <div className="absolute -right-4 -bottom-12 h-56 w-56 rounded-full opacity-5 bg-white" />

        <div className="relative">
          <p className="text-sm font-medium opacity-80">
            {hasOutstanding ? "Outstanding Amount" : "All Paid Up! 🎉"}
          </p>
          <p className="mt-1 text-4xl font-bold">AWG {data?.outstanding ?? "0.00"}</p>
          {hasOutstanding && (
            <p className="mt-1 text-sm opacity-70">
              {data?.pending_orders?.length ?? 0} order(s) with pending balance
            </p>
          )}

          {hasOutstanding && (
            <button
              onClick={() => {/* TODO: future payment gateway */}}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/30 backdrop-blur-sm transition-all border border-white/20"
            >
              💳 Contact to Pay →
            </button>
          )}
        </div>
      </div>

      {/* Pending orders */}
      {hasOutstanding && data?.pending_orders && data.pending_orders.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
            Pending Payments
          </h2>
          <div className="space-y-3">
            {data.pending_orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/client/orders/${order.id}`)}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total AWG {order.items_total}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-amber-600">
                    AWG {order.remaining_balance} due
                  </span>
                  <OrderStatusBadge color="yellow" label={order.status_label} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="rounded-2xl bg-white shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
        <div className="px-6 pt-6 pb-4 border-b border-gray-50">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Payment History</h2>
        </div>

        {data?.history && data.history.length > 0 ? (
          <ul className="divide-y divide-gray-50">
            {data.history.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/client/orders/${payment.order_id}`)}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                  {METHOD_ICON[payment.method] ?? "💰"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Payment for {payment.order_number}
                  </p>
                  <p className="text-xs text-gray-400">
                    {METHOD_LABELS[payment.method] ?? payment.method} ·{" "}
                    {format(new Date(payment.paid_at), "d MMM yyyy, HH:mm")}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-sm font-bold text-emerald-600">+ AWG {payment.amount}</span>
                  <p className="text-xs text-gray-400 mt-0.5">Paid</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl mb-3">💳</span>
            <p className="text-sm font-semibold text-gray-900">No payment history</p>
            <p className="text-xs text-gray-400 mt-1">Your payment records will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
