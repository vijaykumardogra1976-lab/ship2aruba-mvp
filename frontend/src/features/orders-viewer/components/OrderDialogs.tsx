import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryKeys } from "@/config/queryKeys";
import { getOrderItems, getOrderPayments } from "../api/ordersViewerApi";
import type { Customer } from "@/features/customers/types";
import type { OrderListItem } from "../types";
import { formatCurrency } from "@/lib/utils";

interface CustomerInfoDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerInfoDialog({
  customer,
  open,
  onOpenChange,
}: CustomerInfoDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-zinc-200/80 shadow-xl">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Customer Info</DialogTitle>
          <DialogDescription>Customer details for this order.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-zinc-50/50 text-sm">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="font-medium text-zinc-500">Name</dt>
            <dd className="text-right text-zinc-900">{customer.name}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="font-medium text-zinc-500">Phone</dt>
            <dd className="text-right tabular-nums text-zinc-900">{customer.phone}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="font-medium text-zinc-500">Email</dt>
            <dd className="text-right text-zinc-900">{customer.email || "-"}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

interface OrderItemsDialogProps {
  order: OrderListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderItemsDialog({
  order,
  open,
  onOpenChange,
}: OrderItemsDialogProps) {
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: order ? queryKeys.orders.items(order.id) : ["orders", "items", "none"],
    queryFn: () => getOrderItems(order!.id),
    enabled: open && !!order,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-zinc-200/80 shadow-xl">
        <DialogHeader>
          <DialogTitle>Order&apos;s Items</DialogTitle>
          <DialogDescription>
            {order
              ? `Order #${order.order_number} — ${order.number_of_items} items`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading items...</p>}
        {isError && (
          <p className="text-sm text-red-500">Failed to load items.</p>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <p className="text-sm text-slate-500">No items found.</p>
        )}
        <ul className="max-h-80 space-y-3 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3 text-sm"
            >
              <p className="font-medium">{item.label}</p>
              <p className="text-slate-600">
                Qty: {item.quantity} · {formatCurrency(item.line_total)}
              </p>
              {item.tracking_number && (
                <p className="text-slate-500">Tracking: {item.tracking_number}</p>
              )}
              {item.fedex_tracking_number && (
                <p className="text-slate-500">
                  FedEx: {item.fedex_tracking_number}
                </p>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

interface OrderPaymentsDialogProps {
  order: OrderListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderPaymentsDialog({
  order,
  open,
  onOpenChange,
}: OrderPaymentsDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: order ? queryKeys.orders.payments(order.id) : ["orders", "payments", "none"],
    queryFn: () => getOrderPayments(order!.id),
    enabled: open && !!order,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-zinc-200/80 shadow-xl">
        <DialogHeader>
          <DialogTitle>Order Payments</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.customer_name} — Balance: ${formatCurrency(data.current_balance)}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-slate-500">Loading payments...</p>}
        {isError && (
          <p className="text-sm text-red-500">Failed to load payments.</p>
        )}
        {data && (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {data.payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3 text-sm"
              >
                <p className="font-medium">
                  {formatCurrency(payment.amount)} — {payment.payment_method_display}
                </p>
                <p className="text-slate-500">
                  Payment #{payment.sequence} ·{" "}
                  {new Date(payment.paid_at).toLocaleDateString("en-GB")}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
