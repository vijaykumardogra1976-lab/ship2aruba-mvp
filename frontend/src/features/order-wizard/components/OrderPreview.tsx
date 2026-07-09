import type { UseFormReturn } from "react-hook-form";
import type { OrderFormData } from "../types";
import {
  paymentMethodLabel,
  paymentTypeLabel,
} from "../utils/calculations";
import {
  Calendar,
  DollarSign,
  FileCheck2,
  FileText,
  Globe,
  Layers,
  ShoppingBag,
  User,
} from "lucide-react";

interface OrderPreviewProps {
  form: UseFormReturn<OrderFormData>;
}

function PreviewRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100/60 py-2.5 text-xs">
      <div className="flex items-center gap-2 text-slate-750 font-bold">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-500" />}
        <span>{label}</span>
      </div>
      <span className="font-extrabold text-slate-900 text-right">{value}</span>
    </div>
  );
}


export function OrderPreview({ form }: OrderPreviewProps) {
  const v = form.getValues();
  const remaining = Math.max(0, (v.items_total ? Number(v.items_total) : 0) - (v.payment_amount ? Number(v.payment_amount) : 0) - (v.paid_amount ? Number(v.paid_amount) : 0));

  const formatCurrency = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === "") return "0 AWG";
    const num = Number(val);
    return Number.isNaN(num) ? "0 AWG" : `${Math.round(num)} AWG`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    if (dateStr.includes("-")) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };


  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch">
      {/* Left Panel: Review details */}
      <div className="flex-1 space-y-3.5">
        {/* Title */}
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-none">Order Preview</h2>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
            Please review all details before submitting this order.
          </p>
        </div>

        {/* Section 1: Order Basics */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-0.5">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <ShoppingBag className="h-4 w-4 text-violet-600" />
            <span className="text-xs font-bold text-slate-900">Order Basics</span>
          </div>

          <PreviewRow icon={User} label="Customer" value={v.customer?.name ?? "-"} />
          <PreviewRow icon={Globe} label="Order Website" value={v.website || "-"} />
          <PreviewRow icon={Calendar} label="Order Date" value={formatDate(v.order_date) || "-"} />
          <PreviewRow
            icon={Layers}
            label="Number Of Items"
            value={v.number_of_items !== "" ? `${v.number_of_items} Items` : "-"}
          />
          <PreviewRow
            icon={DollarSign}
            label="Amount in USD"
            value={v.amount_usd !== "" ? `${Math.round(Number(v.amount_usd))}` : "-"}
          />
        </div>

        {/* Section 2: Options & Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <FileText className="h-4 w-4 text-violet-650" />
            <span className="text-xs font-bold text-slate-900">Options & Notes</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs font-bold text-slate-750">
            <div>
              <span className="text-slate-800 uppercase text-[9px] font-bold block">New Client?</span>
              <span className="text-slate-950 font-black block mt-0.5">{v.is_new_client ? "Yes" : "No"}</span>
            </div>
            <div>
              <span className="text-slate-800 uppercase text-[9px] font-bold block">Urgent Order?</span>
              <span className="text-slate-950 font-black block mt-0.5">{v.is_urgent ? "Yes" : "No"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-800 uppercase text-[9px] font-bold block">Internal Notes</span>
              <span className="text-slate-900 block mt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/60 leading-normal min-h-[40px] font-semibold">
                {v.internal_notes || "No internal notes."}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-800 uppercase text-[9px] font-bold block">Client Notes</span>
              <span className="text-slate-900 block mt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/60 leading-normal min-h-[40px] font-semibold">
                {v.client_notes || "No notes for the customer."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Payment Summary */}
      <div className="w-80 shrink-0 border-l border-slate-100 pl-4 flex flex-col justify-start space-y-3 lg:mt-[44px]">
        <div className="rounded-xl border border-slate-200 bg-violet-50/10 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4.5 w-4.5 text-violet-650" />
            <span className="text-xs font-bold text-slate-900">Payment Details</span>
          </div>

          <div className="space-y-2 text-xs text-slate-750 font-bold">
            <div className="flex items-center justify-between">
              <span>Payment Type</span>
              <span className="text-slate-950 font-black">
                {v.payment_type ? paymentTypeLabel(v.payment_type) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Payment Method</span>
              <span className="text-slate-950 font-black">
                {v.payment_method ? paymentMethodLabel(v.payment_method) : "-"}
              </span>
            </div>
            {v.payment_type === "two" && (
              <div className="flex items-center justify-between">
                <span>Items Total</span>
                <span className="text-slate-950 font-black">{formatCurrency(v.items_total)}</span>
              </div>
            )}
            {Number(v.paid_amount) > 0 && (
              <div className="flex items-center justify-between">
                <span>Paid Amount</span>
                <span className="text-slate-950 font-black">{formatCurrency(v.paid_amount)}</span>
              </div>
            )}
            {remaining > 0 && (
              <div className="flex items-center justify-between">
                <span>Remaining Balance</span>
                <span className="text-slate-950 font-black">{formatCurrency(remaining)}</span>
              </div>
            )}
            <div className="border-t border-slate-200/80 my-1.5" />
            <div className="flex items-center justify-between text-violet-650 font-bold">
              <span>Payment Amount</span>
              <span className="text-sm font-extrabold">{formatCurrency(v.payment_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
