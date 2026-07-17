import {
  Edit,
  Trash2,
  Upload,
  FileText,
  Package,
  Edit3,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "../types";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getOrderItems } from "../api/ordersViewerApi";

interface OrderDetailsPanelProps {
  order: OrderListItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUploadPdf: () => void;
  onAddPayment: () => void;
  onPrintReceipt: () => void;
}

function getStatusBadge(order: OrderListItem) {
  if (order.is_completed) {
    return { label: "Completed", classes: "bg-emerald-55/10 text-emerald-700 border-emerald-200" };
  }
  if (order.is_in_myus) {
    return { label: "In MyUS", classes: "bg-blue-55/10 text-blue-750 border-blue-200" };
  }
  if (order.is_uploaded) {
    return { label: "Uploaded", classes: "bg-teal-55/10 text-teal-750 border-teal-200" };
  }
  if (order.is_az_ordered) {
    return { label: "AZ Ordered", classes: "bg-violet-55/10 text-violet-750 border-violet-200" };
  }
  const balance = parseFloat(order.remaining_balance);
  if (balance <= 0) {
    return { label: "Paid", classes: "bg-emerald-55/10 text-emerald-700 border-emerald-200" };
  }
  // No badge for unpaid orders — balance info is already in the panel body
  return null;
}

function formatCurrencyInt(value: number | string, currency = "AWG"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${Math.round(num).toLocaleString("en-US")} ${currency}`;
}

export function OrderDetailsPanel({
  order,
  onEdit,
  onDelete,
  onUploadPdf,
  onAddPayment,
  onPrintReceipt,
}: OrderDetailsPanelProps) {
  const navigate = useNavigate();

  if (!order) return null;

  // Fetch real order items dynamically
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["order-items", order.id],
    queryFn: () => getOrderItems(order.id),
    enabled: !!order.id,
  });

  const statusInfo = getStatusBadge(order);
  const balanceVal = parseFloat(order.remaining_balance);

  const notes = [order.internal_notes, order.client_notes]
    .filter(Boolean)
    .join("\n\n");

  // Compute partial payment state for the badge
  const isPartiallyPaid = balanceVal > 0 && parseFloat(order.paid_amount) > 0;
  
  let customStatus = statusInfo;
  if (!customStatus) {
    if (isPartiallyPaid) {
      customStatus = { label: "Partially Paid", classes: "bg-emerald-50 text-emerald-600" };
    } else {
      customStatus = { label: "Unpaid", classes: "bg-slate-100 text-slate-600" };
    }
  }

  return (
    <div className="flex flex-col w-full bg-white rounded-b-xl">
      {/* 4-column Grid Layout */}
      <div className="grid grid-cols-4 gap-8 px-8 py-7">
        
        {/* Column 1: Order Summary */}
        <div className="space-y-5">
          <h4 className="flex items-center gap-2 font-bold text-slate-800 text-base border-b border-slate-100 pb-3">
            <Package className="h-5 w-5 text-slate-600" />
            Order Summary
          </h4>
          
          <div className="grid grid-cols-[130px_1fr] gap-y-4 text-sm items-center">
            <span className="text-slate-500 font-medium">Order Date</span>
            <span className="font-bold text-slate-800">
              {new Date(order.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            
            <span className="text-slate-500 font-medium">Order Number</span>
            <span className="font-bold text-slate-800">#{order.order_number}</span>
            
            <span className="text-slate-500 font-medium">Items Count</span>
            <span className="font-bold text-slate-800">{order.number_of_items} {order.number_of_items === 1 ? 'item' : 'items'}</span>
            
            <span className="text-slate-500 font-medium">Payment Status</span>
            <div>
               <span className={cn("inline-flex items-center rounded-md px-3 py-1.5 text-xs font-bold", customStatus.classes)}>
                  {customStatus.label}
               </span>
            </div>

            <span className="text-slate-500 font-medium">Payment Method</span>
            <span className="font-bold text-slate-800">{order.payment_type === "two" ? "Two Payments" : "Full Payment"}</span>

            <span className="text-slate-500 font-medium">Placed By</span>
            <span className="font-bold text-slate-800">{order.placed_by?.full_name || "-"}</span>
          </div>
        </div>

        {/* Column 2: Payment Details (AWG) */}
        <div className="space-y-5">
          <h4 className="flex items-center gap-2 font-bold text-slate-800 text-base border-b border-slate-100 pb-3">
            <FileText className="h-5 w-5 text-slate-600" />
            Payment Details (AWG)
          </h4>

          <div className="grid grid-cols-[140px_1fr] gap-y-4 text-sm items-center">
            <span className="text-slate-500 font-medium">Order Total</span>
            <span className="font-bold text-slate-800 text-base">{formatCurrencyInt(order.items_total, "AWG")}</span>

            <span className="text-slate-500 font-medium">Amount Paid</span>
            <span className="font-bold text-emerald-600 text-base">{formatCurrencyInt(order.paid_amount, "AWG")}</span>

            <span className="text-slate-500 font-medium">Amount Due</span>
            <span className="font-bold text-rose-600 text-base">{formatCurrencyInt(order.remaining_balance, "AWG")}</span>

            <span className="text-slate-500 font-medium">Payment Type</span>
            <span className="font-bold text-slate-800">{order.payment_type === "two" ? "Two Payments" : "Full Payment"}</span>

            <span className="text-slate-500 font-medium">Payment Method</span>
            <span className="font-bold text-slate-800">By {order.payment_method_display || order.payment_method}</span>

            <span className="text-slate-500 font-medium">Installment Amount</span>
            <span className="font-bold text-slate-800">
              {order.payment_type === "two" ? formatCurrencyInt(order.payment_amount, "AWG") : "-"}
            </span>
          </div>
        </div>

        {/* Column 3: Items List */}
        <div className="space-y-5 border-l border-slate-100 pl-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="flex items-center gap-2 font-bold text-slate-800 text-base">
              <Package className="h-5 w-5 text-slate-600" />
              Items List
            </h4>
            <button
              onClick={() => navigate(`/orders/${order.id}/items`)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-white px-3.5 text-sm font-bold text-violet-700 hover:bg-violet-50 transition cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Items</span>
            </button>
          </div>

          <div className="text-sm text-slate-500">
             {itemsLoading ? (
                <div className="flex items-center gap-2 text-violet-600"><Loader2 className="h-5 w-5 animate-spin"/> Loading items...</div>
             ) : items.length === 0 ? (
                <div className="space-y-2 mt-2">
                  <p>No items found.</p>
                  <p className="text-slate-400">Upload a PDF invoice to extract items.</p>
                </div>
             ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin mt-2">
                   {items.map(item => {
                      const rawImg = item.product_image || item.image_url;
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          {rawImg ? (
                            <img
                              src={rawImg.startsWith("http") ? rawImg : `${import.meta.env.VITE_API_BASE_URL || ""}${rawImg}`}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover bg-slate-100 border border-slate-200"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                            <span className="truncate font-medium text-sm text-slate-700">{item.label} <span className="text-slate-400 text-xs">(x{item.quantity})</span></span>
                            <span className="font-bold text-slate-700 shrink-0 text-sm">{formatCurrencyInt(item.unit_price)}</span>
                          </div>
                        </div>
                      );
                   })}
                </div>
             )}
          </div>
        </div>

        {/* Column 4: Notes */}
        <div className="space-y-5 border-l border-slate-100 pl-8">
          <h4 className="flex items-center gap-2 font-bold text-slate-800 text-base border-b border-slate-100 pb-3">
            <FileText className="h-5 w-5 text-slate-600" />
            Notes
          </h4>
          <div className="text-sm text-slate-500 mt-2">
             {notes ? (
                <p className="whitespace-pre-wrap leading-relaxed">{notes}</p>
             ) : (
                <p className="italic text-slate-400">No notes available.</p>
             )}
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex justify-end gap-4 px-8 py-5 border-t border-slate-100 bg-slate-50/30">
        <button
          onClick={onEdit}
          className="flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition shadow-sm"
        >
          <Edit className="h-4.5 w-4.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm"
        >
          <Trash2 className="h-4.5 w-4.5" />
          Delete
        </button>
        <button
          onClick={onUploadPdf}
          className="flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
        >
          <Upload className="h-4.5 w-4.5" />
          Upload PDF
        </button>
        <button
          onClick={onPrintReceipt}
          className="flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
        >
          <FileText className="h-4.5 w-4.5" />
          Receipt
        </button>
        {/* Payment button */}
        {balanceVal > 0 && (
          <button
            onClick={onAddPayment}
            className="flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition shadow-sm"
          >
            <Package className="h-4.5 w-4.5" />
            Add Payment
          </button>
        )}
      </div>
    </div>
  );
}
