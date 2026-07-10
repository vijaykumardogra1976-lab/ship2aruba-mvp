import { useEffect } from "react";
import { Banknote, CreditCard, FileCheck2, Landmark, Check, CheckCircle2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { PAYMENT_TYPE_OPTIONS, PAYMENT_METHOD_OPTIONS } from "../constants";
import type { OrderFormData, PaymentType, PaymentMethod } from "../types";
import { cn } from "@/lib/utils";

interface PaymentTypeSelectorProps {
  form: UseFormReturn<OrderFormData>;
}

export function PaymentTypeSelector({ form }: PaymentTypeSelectorProps) {
  const { register, setValue, watch, formState: { errors } } = form;
  const paymentType = watch("payment_type");
  const paymentAmount = watch("payment_amount");
  const paidAmount = watch("paid_amount");
  const paymentMethod = watch("payment_method");



  const itemsTotal = watch("items_total");

  // Auto-calculate payment_amount (installment) based on balance and payment_type
  useEffect(() => {
    const total = itemsTotal === "" ? 0 : Number(itemsTotal);
    const paid = paidAmount === "" ? 0 : Number(paidAmount);
    const balance = Math.max(0, total - paid);

    if (!Number.isNaN(balance)) {
      if (paymentType === "one") {
        setValue("payment_amount", balance === 0 ? "" : balance, { shouldValidate: true, shouldDirty: true });
      } else if (paymentType === "two") {
        setValue("payment_amount", balance === 0 ? "" : balance / 2, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [itemsTotal, paidAmount, paymentType, setValue]);

  // Called when user changes "Paid Amount" field — cap at max allowed (invoice total)
  const handlePaidAmountChange = (paidVal: string | number) => {
    const paid = paidVal === "" ? 0 : Number(paidVal);
    const maxAllowed = itemsTotal === "" ? 0 : Number(itemsTotal);

    if (paid > maxAllowed && maxAllowed > 0) {
      setValue("paid_amount", maxAllowed, { shouldValidate: true, shouldDirty: true });
    }
  };

  const selectType = (type: PaymentType) => {
    setValue("payment_type", type, { shouldValidate: true, shouldDirty: true });
    // paid_amount is preserved when switching payment types
  };

  const selectMethod = (method: PaymentMethod) => {
    setValue("payment_method", method, { shouldValidate: true, shouldDirty: true });
  };

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (Number.isNaN(num)) return "0.00 AWG";
    return Number.isInteger(num) ? `${num} AWG` : `${num.toFixed(2)} AWG`;
  };

  // Balance Amount and Balance Due calculation
  const computedItemsTotal = Number(itemsTotal || 0);
  const balanceAmount = Math.max(0, computedItemsTotal - Number(paidAmount || 0));
  const balanceDue = Math.max(0, balanceAmount - Number(paymentAmount || 0));

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
      {/* Left Panel: Payment form fields */}
      <div className="flex-1 space-y-5">
        {/* Title */}
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-none">Payment</h2>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
            Select payment details and method.
          </p>
        </div>

        {/* Payment Type Selection */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Select a payment type *
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENT_TYPE_OPTIONS.map((opt) => {
              const isSelected = paymentType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => selectType(opt.type)}
                  className={cn(
                    "flex h-20 items-center justify-between rounded-xl border px-4 transition relative cursor-pointer text-left w-full",
                    isSelected
                      ? "border-violet-500 bg-violet-50/20 font-bold ring-1 ring-violet-200"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      {opt.type === "one" ? (
                        <Banknote className="h-5 w-5" />
                      ) : (
                        <CreditCard className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 leading-tight">
                        {opt.type === "one" ? "One Payment" : "Two Payments"}
                      </p>
                      <p className="text-[10px] text-slate-700 mt-0.5 leading-none font-semibold">
                        {opt.type === "one"
                          ? "Pay the full amount at once"
                          : "Split into two equal payments"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isSelected ? (
                      <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-violet-650 bg-white">
                        <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                      </div>
                    ) : (
                      <div className="h-4.5 w-4.5 rounded-full border border-slate-200 bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.payment_type && (
            <p className="text-[10px] text-amber-600 font-semibold">{errors.payment_type.message}</p>
          )}
        </div>

        {/* Text Input Grid */}
        <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">

          {/* Payment Amount — always shown, user inputs invoice amount */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="payment_amount">
              Payment Amount (AWG) *
            </label>
            <div className="relative">
              <input
                id="payment_amount"
                type="text"
                readOnly
                tabIndex={-1}
                value={
                  paymentAmount === "" || paymentAmount === undefined
                    ? ""
                    : Number.isInteger(Number(paymentAmount))
                    ? `${Number(paymentAmount)}`
                    : `${Number(paymentAmount).toFixed(2)}`
                }
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-3 text-xs font-semibold text-slate-500 focus:outline-hidden pointer-events-none select-none"
              />
            </div>

            {errors.payment_amount && (
              <p className="text-[10px] text-amber-600 font-semibold">{errors.payment_amount.message}</p>
            )}
          </div>

          {/* Items Total — always shown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="items_total">
              Total Invoice Amount (AWG)
            </label>
            <div className="relative">
              <input
                id="items_total"
                type="number"
                readOnly
                tabIndex={-1}
                {...register("items_total")}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-3 text-xs font-semibold text-slate-500 focus:outline-hidden pointer-events-none select-none"
              />
            </div>
          </div>

          {/* Paid Amount — always shown, user inputs actual amount paid now */}
          <div className="space-y-1 sm:col-span-1">
            <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="paid_amount">
              Paid Amount (AWG) *
            </label>
            <div className="relative">
              <input
                id="paid_amount"
                type="number"
                min={0}
                step={1}
                onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                {...register("paid_amount", {
                  onChange: (event) => {
                    handlePaidAmountChange(event.target.value);
                  },
                })}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100"
              />
            </div>
            {Number(paidAmount) > computedItemsTotal && computedItemsTotal > 0 && (
              <p className="text-[10px] text-red-500 font-semibold">Paid amount cannot exceed invoice total ({computedItemsTotal} AWG)</p>
            )}
            {errors.paid_amount && (
              <p className="text-[10px] text-amber-600 font-semibold">{errors.paid_amount.message}</p>
            )}
          </div>

          {/* Balance Amount — calculated */}
          <div className="space-y-1 sm:col-span-1">
            <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider">
              Balance Amount (AWG)
            </label>
            <div className="relative">
              <input
                type="number"
                readOnly
                value={balanceAmount}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-3 text-xs font-semibold text-slate-500 focus:outline-hidden pointer-events-none select-none"
              />
            </div>
          </div>
        </div>

        {/* Payment Method Cards */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          {/* Payment Amount Highlight Banner */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-900">
                You are paying right now:
              </span>
            </div>
            <span className="text-sm font-black text-emerald-700">
              {formatCurrency(paymentAmount)}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Select the order payment method *
            </p>
            <div className="grid gap-3 grid-cols-3">
            {PAYMENT_METHOD_OPTIONS.map((opt) => {
              const methodIcons = { cash: Banknote, pin: CreditCard, transfer: Landmark };
              const methodColors = { cash: "text-violet-650", pin: "text-blue-500", transfer: "text-blue-600" };
              const Icon = methodIcons[opt.type];
              const isSelected = paymentMethod === opt.type;
              const iconColor = methodColors[opt.type];

              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => selectMethod(opt.type)}
                  className={cn(
                    "flex h-24 flex-col items-center justify-center gap-1.5 rounded-xl border transition relative cursor-pointer w-full",
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
                    <p className="text-[10px] text-slate-555 mt-0.5 leading-none font-semibold">
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
        </div>

        {/* Payment Alert Banner */}
        {paymentMethod && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>{getAlertText()}</span>
          </div>
        )}
      </div>

      {/* Right Panel: Order Summary Card */}
      <div className="w-80 shrink-0 border-l border-slate-100 pl-5 flex flex-col justify-center">
        <div className="rounded-xl border border-slate-200 bg-violet-50/10 p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4.5 w-4.5 text-violet-650" />
            <span className="text-xs font-bold text-slate-900">Order Summary</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700 font-semibold">
            {/* Invoice Total */}
            <div className="flex items-center justify-between">
              <span>Invoice Total</span>
              <span className="text-slate-900 font-bold">{formatCurrency(computedItemsTotal)}</span>
            </div>
            {/* Paid Amount */}
            <div className="flex items-center justify-between">
              <span>Paid Amount</span>
              <span className="text-slate-900 font-bold">{formatCurrency(paidAmount)}</span>
            </div>

            {/* Balance Amount — only for Two Payments */}
            {paymentType === "two" && (
              <div className="flex items-center justify-between border-y border-slate-200/60 py-2.5">
                <span>Balance Amount</span>
                <span className="text-slate-900 font-bold">{formatCurrency(balanceAmount)}</span>
              </div>
            )}
            {/* Payment Amount */}
            <div className={cn("flex items-center justify-between text-violet-750", paymentType === "one" ? "border-t border-slate-200/60 pt-2.5" : "")}>
              <span>Payment Amount</span>
              <span className="text-violet-700 font-extrabold text-sm">{formatCurrency(paymentAmount)}</span>
            </div>
            {/* Balance Due */}
            <div className="flex items-center justify-between">
              <span>Balance Due</span>
              <span className="text-slate-900 font-bold">{formatCurrency(balanceDue)}</span>
            </div>
            {/* Divider */}
            <div className="border-t border-slate-200/60 pt-2.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span>Payment Type</span>
                <span className="text-slate-900 font-extrabold uppercase text-[10px]">
                  {paymentType === "one" ? "One Payment" : paymentType === "two" ? "Two Payments" : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment Method</span>
                <span className="text-slate-900 font-extrabold uppercase text-[10px]">
                  {paymentMethod ? paymentMethod : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
