import { useEffect, useState } from "react";
import { fetchClientOrderDetail } from "../api/clientOrdersApi";
import type { ClientOrder } from "../types";
import { format } from "date-fns";

interface Props {
  orderId: number;
  onClose: () => void;
}

export function ClientOrderDetailModal({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClientOrderDetail(orderId)
      .then(setOrder)
      .finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
        <div className="rounded-xl bg-white p-8 shadow-xl">
          <div className="text-gray-500">Loading details...</div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Order {order.order_number}</h2>
            <p className="text-sm text-gray-500">
              Placed on {format(new Date(order.order_date), "MMMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Status Timeline */}
          <div className="mb-8 rounded-xl border border-violet-100 bg-violet-50 p-5">
            <h3 className="text-sm font-semibold text-violet-900 mb-4">Order Progress</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 h-full w-0.5 bg-violet-200"></div>
              <ul className="space-y-4">
                <TimelineStep
                  label="Order Placed"
                  isCompleted={true}
                />
                <TimelineStep
                  label="Ordered from Supplier"
                  isCompleted={order.progress.purchased}
                />
                <TimelineStep
                  label="Arrived at US Warehouse"
                  isCompleted={order.progress.arrived_warehouse}
                />
                <TimelineStep
                  label="Ready in Aruba"
                  isCompleted={order.progress.delivered}
                />
              </ul>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Details Card */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Order Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-medium text-gray-900">{order.status_label}</dd>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">Items</dt>
                  <dd className="font-medium text-gray-900">{order.number_of_items}</dd>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">Website</dt>
                  <dd className="font-medium text-gray-900">{order.website || "N/A"}</dd>
                </div>
                {order.client_notes && (
                  <div>
                    <dt className="text-gray-500 mb-1">Your Notes</dt>
                    <dd className="rounded-md bg-gray-50 p-3 text-gray-700 italic">"{order.client_notes}"</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Financials Card */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Payment Summary</h3>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Order Amount (USD)</dt>
                    <dd className="font-medium text-gray-900">${order.amount_usd}</dd>
                  </div>
                  <div className="flex justify-between pt-2">
                    <dt className="text-gray-500">Total (AWG)</dt>
                    <dd className="font-medium text-gray-900">{order.items_total}</dd>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <dt>Amount Paid</dt>
                    <dd>- {order.paid_amount}</dd>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 mt-2 pt-2 text-base font-bold text-gray-900">
                    <dt>Amount Due</dt>
                    <dd>{order.remaining_balance} AWG</dd>
                  </div>
                </dl>
              </div>

              {order.invoice_number && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-900">Invoice Available</div>
                      <div className="text-[10px] text-gray-500">{order.invoice_number}</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-violet-600">Sent to email</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ label, isCompleted }: { label: string; isCompleted: boolean }) {
  return (
    <li className="relative pl-10">
      <div
        className={`absolute left-2.5 -translate-x-1/2 top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-violet-50 ${
          isCompleted ? "bg-violet-600" : "bg-gray-300"
        }`}
      >
        {isCompleted && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
      </div>
      <p className={`text-sm font-medium ${isCompleted ? "text-violet-900" : "text-gray-500"}`}>
        {label}
      </p>
    </li>
  );
}
