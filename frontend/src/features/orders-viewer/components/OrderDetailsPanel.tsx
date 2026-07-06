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
import { useState } from "react";
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
    return { label: "Delivered", classes: "bg-emerald-55/10 text-emerald-700 border-emerald-200" };
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
  return { label: "Pending", classes: "bg-amber-55/10 text-amber-750 border-amber-200" };
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
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

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

  const getImageUrl = (item: any) => {
    if (item.product_image) {
      return item.product_image.startsWith("http")
        ? item.product_image
        : `${import.meta.env.VITE_API_BASE_URL || ""}${item.product_image}`;
    }
    return item.image_url;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_rgb(0,0,0,0.02)] overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-50 px-4.5 py-3 bg-slate-50/20">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h2 className="text-xs font-black text-slate-800 tracking-tight mr-0.5">
            Order #{order.order_number.split("-").pop()?.slice(-4)}
          </h2>
          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider leading-none",
            statusInfo.classes
          )}>
            {statusInfo.label}
          </span>
          {order.is_urgent && (
            <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider leading-none text-rose-600">
              Urgent
            </span>
          )}
          {order.is_new_client && (
            <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider leading-none text-violet-650">
              New Client
            </span>
          )}
        </div>
      </div>

      {/* Panel Content (Scrolls independently so buttons are always visible) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin">
        
        {/* Section: Items List (All items displayed, no internal scrolls) */}
        <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.005)]">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h4 className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-slate-500" />
              Items List
            </h4>
            <button
              onClick={() => navigate(`/orders/${order.id}/items`)}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 text-[9px] font-black uppercase tracking-wider text-violet-700 hover:bg-violet-50 transition cursor-pointer"
              title="Manage Items"
            >
              <Edit3 className="h-2.5 w-2.5" />
              <span>Edit Items</span>
            </button>
          </div>

          {itemsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4.5 w-4.5 animate-spin text-violet-600" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-[10px] text-slate-550 italic py-1">No items found. Upload a PDF invoice to extract items.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const hasError = imageErrors[item.id];
                const imgUrl = !hasError ? getImageUrl(item) : null;
                return (
                  <div key={item.id} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt="Product"
                          className="h-8.5 w-8.5 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0 shadow-inner"
                          onError={() => {
                            setImageErrors((prev) => ({ ...prev, [item.id]: true }));
                          }}
                        />
                      ) : (
                        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                          <Package className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate text-[11px] leading-tight" title={item.label}>
                          {item.label}
                        </p>
                        <p className="text-[9px] text-slate-500 font-semibold mt-0.5 leading-none">
                          Qty: x{item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-750 shrink-0 text-[11px]">
                      {formatCurrencyInt(item.unit_price)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: Order Details (Only Order metadata) */}
        <div className="rounded-xl border border-slate-100 p-3 space-y-2.5 bg-white text-xs shadow-[0_2px_10px_rgba(0,0,0,0.005)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-600">Order Date</span>
            <span className="font-bold text-slate-700">
              {new Date(order.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-600">Order Number</span>
            <span className="font-mono font-bold text-slate-755">#{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-600">Items Count</span>
            <span className="font-bold text-slate-700">{order.number_of_items} {order.number_of_items === 1 ? 'item' : 'items'}</span>
          </div>
        </div>

        {/* Section: Notes (Moved above Payment Details) */}
        <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-2 text-xs shadow-[0_2px_10px_rgba(0,0,0,0.005)]">
          <h4 className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-50 pb-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Notes
          </h4>
          {notes ? (
            <p className="text-slate-750 font-bold whitespace-pre-wrap leading-relaxed text-[11px]">{notes}</p>
          ) : (
            <p className="text-slate-500 italic text-[11px]">No notes available.</p>
          )}
        </div>

        {/* Section: Payment Details (Static, no collapse, holds all financial amounts) */}
        <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-2.5 text-xs shadow-[0_2px_10px_rgba(0,0,0,0.005)]">
          <h4 className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-50 pb-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Payment Details
          </h4>
          <div className="flex justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-600">Order Total</span>
            <span className="font-black text-slate-800">{formatCurrencyInt(order.items_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-600">Paid Amount</span>
            <span className="font-bold text-emerald-600">{formatCurrencyInt(order.paid_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-600">Balance</span>
            <span className={cn("font-black", balanceVal > 0 ? "text-rose-500" : "text-emerald-600")}>
              {formatCurrencyInt(order.remaining_balance)}
            </span>
          </div>
          <div className="h-px bg-slate-50 my-1" />
          <div className="flex justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-600">Payment Type</span>
            <span className="font-bold text-slate-700">By {order.payment_method_display || order.payment_method}</span>
          </div>
          {parseFloat(order.payment_amount) > 0 && (
            <div className="flex justify-between">
              <span className="text-[10px] font-semibold uppercase text-slate-600">Installment Amount</span>
              <span className="font-bold text-slate-700">{formatCurrencyInt(order.payment_amount)}</span>
            </div>
          )}
          <div className="pt-1">
            <button
              onClick={onAddPayment}
              className="text-[9px] font-black text-violet-650 hover:text-violet-750 transition-colors uppercase tracking-wider cursor-pointer"
            >
              View Payments History
            </button>
          </div>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div className="border-t border-slate-100 bg-slate-50/20 p-4">
        <div className="grid grid-cols-4 gap-2.5">
          {/* Edit */}
          <button
            onClick={onEdit}
            className="flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold text-violet-700 bg-gradient-to-b from-violet-50/80 to-violet-50/20 border border-violet-100/70 hover:border-violet-300 hover:from-violet-100/90 hover:to-violet-50/40 shadow-[0_4px_12px_rgba(124,58,237,0.04)] hover:shadow-[0_6px_18px_rgba(124,58,237,0.09)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <Edit className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black mt-1.5 uppercase tracking-wider">Edit</span>
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold text-rose-600 bg-gradient-to-b from-rose-50/80 to-rose-50/20 border border-rose-100/70 hover:border-rose-300 hover:from-rose-100/90 hover:to-rose-50/40 shadow-[0_4px_12px_rgba(225,29,72,0.04)] hover:shadow-[0_6px_18px_rgba(225,29,72,0.09)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <Trash2 className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black mt-1.5 uppercase tracking-wider">Delete</span>
          </button>

          {/* Upload */}
          <button
            onClick={onUploadPdf}
            className="flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold text-emerald-600 bg-gradient-to-b from-emerald-50/80 to-emerald-50/20 border border-emerald-100/70 hover:border-emerald-300 hover:from-emerald-100/90 hover:to-emerald-50/40 shadow-[0_4px_12px_rgba(5,150,105,0.04)] hover:shadow-[0_6px_18px_rgba(5,150,105,0.09)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <Upload className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black mt-1.5 uppercase tracking-wider">Upload</span>
          </button>

          {/* Receipt */}
          <button
            onClick={onPrintReceipt}
            className="flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold text-blue-600 bg-gradient-to-b from-blue-50/80 to-blue-50/20 border border-blue-100/70 hover:border-blue-300 hover:from-blue-100/90 hover:to-blue-50/40 shadow-[0_4px_12px_rgba(37,99,235,0.04)] hover:shadow-[0_6px_18px_rgba(37,99,235,0.09)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <FileText className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black mt-1.5 uppercase tracking-wider">Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
