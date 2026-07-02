import { Banknote, Calendar, Check, CheckCircle2, CreditCard, FileCheck2, Landmark } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { PAYMENT_METHOD_OPTIONS } from "../constants";
import type { OrderFormData, PaymentMethod } from "../types";
import { paymentTypeLabel } from "../utils/calculations";
import { cn } from "@/lib/utils";

const icons = { cash: Banknote, pin: CreditCard, transfer: Landmark };
const colors = { cash: "text-violet-600", pin: "text-blue-500", transfer: "text-blue-600" };

interface PaymentMethodSelectorProps {
  form: UseFormReturn<OrderFormData>;
}

export function PaymentMethodSelector({ form }: PaymentMethodSelectorProps) {
  const { setValue, watch } = form;
  const paymentMethod = watch("payment_method");
  const paymentType = watch("payment_type");
  const paymentAmount = watch("payment_amount");
  const itemsTotal = watch("items_total");
  const orderDate = watch("order_date");

  const selectMethod = (method: PaymentMethod) => {
    setValue("payment_method", method, { shouldValidate: true, shouldDirty: true });
  };

  const formatCurrency = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === "") return "0.00 AWG";
    const num = Number(val);
    return Number.isNaN(num) ? "0.00 AWG" : `${num.toFixed(2)} AWG`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    if (dateStr.includes("-")) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getAlertText = () => {
    switch (paymentMethod) {
      case "cash":
        return "This payment will be recorded as a cash transaction.";
      case "pin":
        return "This payment will be recorded as a PIN transaction.";
      case "transfer":
        return "This payment will be recorded as a bank transfer transaction.";
      default:
        return "Please select a payment method.";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-stretch">
      {/* Left Panel: Payment method selections */}
      <div className="flex-1 space-y-4">
        {/* Title */}
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-none">Payment Method</h2>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
            Select the order payment method.
          </p>
        </div>

        {/* Payment Method Cards */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Select the order payment method
          </p>
          <div className="grid gap-3 grid-cols-3">
            {PAYMENT_METHOD_OPTIONS.map((opt) => {
              const Icon = icons[opt.type];
              const isSelected = paymentMethod === opt.type;
              const iconColor = colors[opt.type];

              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => selectMethod(opt.type)}
                  className={cn(
                    "flex h-24 flex-col items-center justify-center gap-1.5 rounded-xl border transition relative cursor-pointer",
                    isSelected
                      ? "border-violet-500 bg-violet-50/20 font-bold ring-1 ring-violet-200"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-350"
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-violet-600 text-white shadow-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                  <Icon className={cn("h-6 w-6", isSelected ? "text-violet-650" : iconColor)} />
                  <div className="text-center">
                    <p className="text-xs font-extrabold text-slate-900 leading-tight">{opt.label}</p>
                    <p className="text-[10px] text-slate-550 mt-0.5 leading-none font-semibold">
                      {opt.type === "cash" && "Pay with cash"}
                      {opt.type === "pin" && "Pay with PIN"}
                      {opt.type === "transfer" && "Bank transfer"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Method Information */}
        <div className="rounded-xl border border-violet-100 bg-violet-50/10 p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-600" />
            <span className="text-xs font-bold text-violet-750">Payment Method Information</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700 font-semibold">
            <div className="flex items-center justify-between">
              <span>Payment Type</span>
              <span className="text-slate-900 font-bold">
                {paymentType ? paymentTypeLabel(paymentType) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Payment Amount (AWG)</span>
              <span className="text-slate-900 font-bold">{formatCurrency(paymentAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Amount (AWG)</span>
              <span className="text-slate-900 font-bold">{formatCurrency(itemsTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment Alert Banner */}
        {paymentMethod && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>{getAlertText()}</span>
          </div>
        )}
      </div>

      {/* Right Panel: Order Summary & Details */}
      <div className="w-80 shrink-0 border-l border-slate-100 pl-5 flex flex-col justify-center space-y-3.5">
        {/* Order Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
          <span className="text-xs font-bold text-slate-900 block">Order Summary</span>

          <div className="space-y-2.5 text-xs text-slate-700 font-semibold">
            <div className="flex items-center justify-between">
              <span>Items Total</span>
              <span className="text-slate-900 font-bold">{formatCurrency(itemsTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span className="text-slate-900 font-bold">0.00 AWG</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span className="text-slate-900 font-bold">0.00 AWG</span>
            </div>
            <div className="border-t border-slate-200 my-2" />
            <div className="flex items-center justify-between text-violet-650 font-bold">
              <span>Total Amount</span>
              <span className="text-sm font-extrabold">{formatCurrency(itemsTotal)}</span>
            </div>
          </div>
        </div>

        {/* Selected options block */}
        <div className="space-y-2">
          {/* Payment Type */}
          {paymentType && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/20 px-3.5 py-2.5 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <FileCheck2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Payment Type</p>
                <p className="text-xs font-extrabold text-slate-900 mt-1 leading-none">
                  {paymentTypeLabel(paymentType)}
                </p>
              </div>
            </div>
          )}

          {/* Order Date */}
          {orderDate && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/20 px-3.5 py-2.5 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Order Date</p>
                <p className="text-xs font-extrabold text-slate-900 mt-1 leading-none">
                  {formatDate(orderDate)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
