import {
  Box,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn, formatCurrency, formatOrderDateShort } from "@/lib/utils";
import {
  CustomerInfoDialog,
  OrderItemsDialog,
  OrderPaymentsDialog,
} from "./OrderDialogs";
import { NotesPreview, TableLink } from "./NotesPreview";
import { OrderStatusToggles } from "./OrderStatusToggles";
import type { OrderListItem } from "../types";
import { CUSTOMER_NAME_MAX_LENGTH } from "@/features/customers/schema/customerSchema";

const COLUMN_HEADERS = [
  "Order #",
  "Customer Info",
  "Order",
  "Order Total",
  "Items",
  "Payments",
  "Notes",
  "Placed By",
  "Status",
  "Action",
] as const;

const ROW_GRID =
  "grid w-full grid-cols-[4.5rem_minmax(9.5rem,1.1fr)_6.5rem_7rem_6.5rem_7.5rem_minmax(6rem,1fr)_6.5rem_8.5rem_5rem] gap-x-4";

interface OrdersTableProps {
  orders: OrderListItem[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onEdit?: (order: OrderListItem) => void;
  onDelete?: (order: OrderListItem) => void;
  onUploadPdf?: (order: OrderListItem) => void;
  onAddPayment?: (order: OrderListItem) => void;
}

function AvatarInitial({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-750"
      aria-hidden
    >
      {initial}
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className={cn(ROW_GRID, "px-4 py-4")}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface OrderRowProps {
  order: OrderListItem;
  onCustomerInfo: () => void;
  onItems: () => void;
  onPayments: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUploadPdf?: () => void;
  onAddPayment?: () => void;
}

function OrderRow({
  order,
  onCustomerInfo,
  onItems,
  onPayments,
  onEdit,
  onDelete,
  onUploadPdf,
  onAddPayment,
}: OrderRowProps) {
  const balance = parseFloat(order.remaining_balance);
  const notes = [order.internal_notes, order.client_notes]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={cn(
        ROW_GRID,
        "group items-start border-b border-slate-100 px-4 py-4.5 transition-colors last:border-b-0 hover:bg-slate-50/70",
      )}
      aria-label={`Order ${order.order_number}`}
    >
      {/* ORDER # */}
      <p className="pt-0.5 font-mono text-sm font-bold text-slate-900">
        {order.order_number.split("-").pop()}
      </p>

      {/* CUSTOMER INFO */}
      <div className="flex items-start gap-2.5 overflow-hidden">
        <AvatarInitial name={order.customer.name} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-bold text-slate-900 leading-tight",
              order.customer.name.length > CUSTOMER_NAME_MAX_LENGTH
                ? "truncate"
                : "whitespace-nowrap",
            )}
            title={
              order.customer.name.length > CUSTOMER_NAME_MAX_LENGTH
                ? order.customer.name
                : undefined
            }
          >
            {order.customer.name}
          </p>
          <p className="truncate text-xs tabular-nums text-slate-500 mt-0.5">
            {order.customer.phone}
          </p>
          <TableLink onClick={onCustomerInfo} className="!mt-0.5 text-xs text-blue-600 font-semibold">
            Customer Info
          </TableLink>
        </div>
      </div>

      {/* ORDER */}
      <div className="space-y-0.5">
        <p className="flex items-center gap-1 text-[11px] text-slate-400">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {formatOrderDateShort(order.order_date)}
        </p>
        <p className="text-sm font-bold tabular-nums text-slate-900 leading-none mt-1">
          ${parseFloat(order.amount_usd).toFixed(2)}
        </p>
        {order.has_pdf && order.pdf_url && (
          <a
            href={order.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex rounded-md bg-violet-650 px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-violet-755"
          >
            PDF
          </a>
        )}
      </div>

      {/* ORDER TOTAL */}
      <div className="space-y-0.5">
        <p className="text-sm font-bold tabular-nums text-slate-900">
          {formatCurrency(order.items_total)}
        </p>
        <p className="text-xs text-slate-400">
          Paid{" "}
          <span className="font-semibold text-slate-500">
            {formatCurrency(order.paid_amount)}
          </span>
        </p>
        <p className="text-xs">
          Balance{" "}
          <span
            className={cn(
              "font-bold tabular-nums",
              balance > 0 ? "text-red-500" : "text-slate-400",
            )}
          >
            {formatCurrency(order.remaining_balance)}
          </span>
        </p>
      </div>

      {/* ITEMS */}
      <div className="space-y-0.5">
        <p className="text-sm font-bold text-slate-900">
          {order.number_of_items} items
        </p>
        <p className="text-xs tabular-nums text-slate-400">
          {formatCurrency(order.items_total)}
        </p>
        <button
          type="button"
          onClick={onItems}
          className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-650 hover:underline cursor-pointer"
        >
          <Box className="h-3.5 w-3.5" aria-hidden />
          Order's Items
        </button>
      </div>

      {/* PAYMENTS */}
      <div className="space-y-0.5">
        <p className="text-sm font-bold tabular-nums text-slate-900">
          {formatCurrency(order.payment_amount)}{" "}
          <span className="font-normal text-[11px] text-slate-400">Per Payment</span>
        </p>
        <p className="text-xs text-slate-400">{order.payment_type_display}</p>
        <p className="text-xs text-slate-400">By {order.payment_method_display}</p>
        <button
          type="button"
          onClick={onPayments}
          className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-650 hover:underline cursor-pointer"
        >
          <CreditCard className="h-3.5 w-3.5" aria-hidden />
          Order Payments
        </button>
      </div>

      {/* NOTES */}
      <div className="min-w-0 pt-0.5">
        <NotesPreview notes={notes} compact />
      </div>

      {/* PLACED BY */}
      <div className="flex items-center gap-2 pt-0.5">
        {order.placed_by ? (
          <>
            <AvatarInitial name={order.placed_by.full_name} />
            <span className="text-xs font-bold text-slate-800">
              {order.placed_by.full_name.split(" ")[0]}
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </div>

      {/* STATUSES */}
      <OrderStatusToggles order={order} />

      {/* ACTION */}
      <div
        className="grid grid-cols-2 gap-1.5 self-start pt-0.5"
        role="group"
        aria-label={`Actions for order ${order.order_number}`}
      >
        <ActionButton
          label="Edit Record Details"
          onClick={() => onEdit?.()}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          label="Delete Record"
          onClick={() => onDelete?.()}
          className="bg-rose-50 text-rose-600 hover:bg-rose-100/80"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          label="Upload PDF"
          onClick={() => onUploadPdf?.()}
          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
        >
          <Upload className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          label="Add New Payment"
          onClick={() => onAddPayment?.()}
          className="bg-slate-100 text-slate-500 hover:bg-slate-200"
        >
          <FileText className="h-3.5 w-3.5" />
        </ActionButton>
      </div>
    </article>
  );
}

export function OrdersTable({
  orders,
  isLoading,
  isRefreshing,
  onEdit,
  onDelete,
  onUploadPdf,
  onAddPayment,
}: OrdersTableProps) {
  const navigate = useNavigate();
  const [customerDialog, setCustomerDialog] = useState<{
    open: boolean;
    customer: OrderListItem["customer"] | null;
  }>({ open: false, customer: null });
  const [itemsDialog, setItemsDialog] = useState<{
    open: boolean;
    order: OrderListItem | null;
  }>({ open: false, order: null });
  const [paymentsDialog, setPaymentsDialog] = useState<{
    open: boolean;
    order: OrderListItem | null;
  }>({ open: false, order: null });

  const showEmpty = !isLoading && orders.length === 0;

  return (
    <>
      <section
        aria-label="Orders list"
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
      >
        {isRefreshing && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            <span className="sr-only">Updating orders</span>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <div className="w-full min-w-[1240px]">
            {/* Headers row */}
            <div
              className={cn(
                ROW_GRID,
                "items-center border-b border-slate-100 bg-white px-4 py-3.5",
              )}
              role="row"
            >
              {COLUMN_HEADERS.map((heading) => (
                <div
                  key={heading}
                  role="columnheader"
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                  )}
                >
                  <span>{heading}</span>
                </div>
              ))}
            </div>

            {/* Body */}
            {isLoading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : showEmpty ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-6 py-16 text-center">
                <FileText className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-base font-semibold text-slate-900">
                  No orders found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try adjusting your filters or place a new order.
                </p>
              </div>
            ) : (
              <div role="rowgroup" className="divide-y divide-slate-100 bg-white">
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onCustomerInfo={() =>
                      setCustomerDialog({
                        open: true,
                        customer: order.customer,
                      })
                    }
                    onItems={() => navigate(`/orders/${order.id}/items`)}
                    onPayments={() =>
                      setPaymentsDialog({ open: true, order })
                    }
                    onEdit={() => onEdit?.(order)}
                    onDelete={() => onDelete?.(order)}
                    onUploadPdf={() => onUploadPdf?.(order)}
                    onAddPayment={() => onAddPayment?.(order)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <CustomerInfoDialog
        customer={customerDialog.customer}
        open={customerDialog.open}
        onOpenChange={(open) => setCustomerDialog((s) => ({ ...s, open }))}
      />
      <OrderItemsDialog
        order={itemsDialog.order}
        open={itemsDialog.open}
        onOpenChange={(open) => setItemsDialog((s) => ({ ...s, open }))}
      />
      <OrderPaymentsDialog
        order={paymentsDialog.order}
        open={paymentsDialog.open}
        onOpenChange={(open) => setPaymentsDialog((s) => ({ ...s, open }))}
      />
    </>
  );
}
