import { Calendar, Check, CheckCircle2, CreditCard, FileText, List, Printer, Package, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { OrderResponse } from "../types";
import deliveryTruckImg from "@/assets/delivery_truck_success.png";
import { motion } from "framer-motion";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createdOrder: OrderResponse | null;
  onPrintInvoice: () => void;
  onCreateAnother: () => void;
}

const formatSuccessDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }); // e.g., "02 Jul 2026"
};

export function SuccessDialog({
  open,
  onOpenChange,
  createdOrder,
  onPrintInvoice,
  onCreateAnother,
}: SuccessDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center sm:max-w-md overflow-hidden p-5 rounded-2xl bg-white shadow-xl border border-slate-100">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="flex flex-col items-center gap-2 py-1.5 relative w-full"
        >
          {/* Confetti Mockup Shapes */}
          <div className="absolute top-0 left-4 text-violet-500/30 text-lg rotate-12 select-none pointer-events-none">✨</div>
          <div className="absolute top-2 right-12 text-amber-500/20 text-xl -rotate-12 select-none pointer-events-none">🎉</div>
          <div className="absolute top-10 left-16 text-blue-500/30 text-sm rotate-45 select-none pointer-events-none">⬤</div>
          <div className="absolute top-8 right-24 text-rose-500/20 text-lg -rotate-45 select-none pointer-events-none">✦</div>

          {/* Glowing Green Success Checkmark */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 shadow-xs mb-1 ring-8 ring-green-50/50">
            <Check className="h-7 w-7 text-green-600 stroke-[3.5]" />
          </div>

          <DialogTitle className="text-lg font-bold text-slate-900 leading-tight">
            Order Created Successfully!
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Your order has been placed and is pending approval.
          </DialogDescription>

          {/* Delivery Truck Image */}
          <img
            src={deliveryTruckImg}
            alt="Order placed successfully illustration"
            className="w-56 h-auto mx-auto object-contain my-1 select-none pointer-events-none"
          />

          {/* Details Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs w-full grid grid-cols-2 gap-2.5">
            {/* Order ID */}
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/20 p-2 text-left">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block leading-none">Order ID</span>
                <span className="text-[11px] font-bold text-emerald-600 block mt-1 truncate max-w-full">
                  {createdOrder?.order_number ?? "-"}
                </span>
              </div>
            </div>

            {/* Order Date */}
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/20 p-2 text-left">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-650">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block leading-none">Order Date</span>
                <span className="text-[11px] font-bold text-slate-800 block mt-1 truncate max-w-full">
                  {formatSuccessDate(createdOrder?.order_date)}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/20 p-2 text-left">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block leading-none">Items</span>
                <span className="text-[11px] font-bold text-blue-600 block mt-1 truncate max-w-full">
                  {createdOrder?.number_of_items ? `${createdOrder.number_of_items} Items` : "-"}
                </span>
              </div>
            </div>

            {/* Total Amount */}
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/20 p-2 text-left">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block leading-none">Total Amount</span>
                <span className="text-[11px] font-bold text-amber-600 block mt-1 truncate max-w-full">
                  {createdOrder?.items_total ? `${Number(createdOrder.items_total).toFixed(2)} AWG` : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Green Success Alert Banner */}
          <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50/20 px-3 py-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>You will be notified once this order is approved.</span>
          </div>

          {/* Buttons Row */}
          <div className="flex w-full gap-2 mt-2">
            <button
              type="button"
              onClick={onPrintInvoice}
              className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Invoice
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate("/orders");
              }}
              className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-blue-600 text-[10px] font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
            >
              <List className="h-3.5 w-3.5" />
              View Orders
            </button>
            <button
              type="button"
              onClick={onCreateAnother}
              className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-violet-600 text-[10px] font-bold text-white shadow-sm hover:bg-violet-750 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Another Order
            </button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
