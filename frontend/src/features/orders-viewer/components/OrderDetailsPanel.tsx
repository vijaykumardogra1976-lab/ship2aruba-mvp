import {
  Edit,
  Trash2,
  Upload,
  FileText,
  Package,
  Edit3,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "../types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getOrderItems, updateOrderNotes } from "../api/ordersViewerApi";
import { useState, useEffect } from "react";

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
    return { label: "Uploaded", classes: "bg-amber-50 text-amber-700 border-amber-200" };
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
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
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
  const queryClient = useQueryClient();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  useEffect(() => {
    if (order) {
      setInternalNotes(order.internal_notes || "");
      setClientNotes(order.client_notes || "");
      setIsEditingNotes(false);
    }
  }, [order?.id, order?.internal_notes, order?.client_notes]);

  const notesMutation = useMutation({
    mutationFn: () => updateOrderNotes(order!.id, { internal_notes: internalNotes, client_notes: clientNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsEditingNotes(false);
    },
  });

  if (!order) return null;

  // Fetch real order items dynamically
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["order-items", order.id],
    queryFn: () => getOrderItems(order.id),
    enabled: !!order.id,
  });

  const statusInfo = getStatusBadge(order);
  const balanceVal = parseFloat(order.remaining_balance);



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
    <div className="flex flex-col w-full bg-white rounded-b-xl animate-order-details-open">
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
        <div className="border-l border-slate-100 pl-8 relative flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <h4 className="flex items-center gap-2 font-bold text-slate-800 text-base">
              <FileText className="h-5 w-5 text-slate-600" />
              Notes
            </h4>
            {!isEditingNotes ? (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-slate-400 hover:text-violet-600 transition"
                title="Edit Notes"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => notesMutation.mutate()}
                  disabled={notesMutation.isPending}
                  className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition disabled:opacity-50"
                  title="Save Notes"
                >
                  {notesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setInternalNotes(order.internal_notes || "");
                    setClientNotes(order.client_notes || "");
                    setIsEditingNotes(false);
                  }}
                  disabled={notesMutation.isPending}
                  className="text-rose-600 hover:bg-rose-50 p-1 rounded transition disabled:opacity-50"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {!isEditingNotes ? (
            <div 
              className="text-sm text-slate-500 mt-0 cursor-pointer group flex-1 flex flex-col"
              onClick={() => setIsEditingNotes(true)}
            >
              {order.client_notes || order.internal_notes ? (
                <div className="flex flex-col flex-1 gap-3">
                  <div className="flex-1 flex flex-col min-h-0">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 shrink-0">Client Notes</h5>
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                      <p className="whitespace-pre-wrap leading-relaxed group-hover:text-slate-700 transition text-slate-600">{order.client_notes}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 pt-3">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 shrink-0">Staff Notes</h5>
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                      <p className="whitespace-pre-wrap leading-relaxed group-hover:text-slate-700 transition text-slate-600">{order.internal_notes}</p>
                    </div>
                  </div>
                </div>
              ) : (
                  <p className="italic text-slate-400 group-hover:text-slate-500 transition">Click to add notes.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1 gap-3 mt-0">
              <div className="flex flex-col flex-1 min-h-[80px]">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Client Notes</label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full flex-1 text-sm border-slate-200 rounded-lg p-2 focus:border-violet-500 focus:ring-violet-500 resize-none shadow-sm min-h-0"
                  placeholder="Notes visible to client..."
                />
              </div>
              <div className="flex flex-col flex-1 min-h-[80px]">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Staff Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full flex-1 text-sm border-slate-200 rounded-lg p-2 focus:border-violet-500 focus:ring-violet-500 resize-none shadow-sm min-h-0"
                  placeholder="Private staff notes..."
                />
              </div>
            </div>
          )}
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
