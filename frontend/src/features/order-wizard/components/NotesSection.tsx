import { Banknote, Calendar, Check, CreditCard, Info, Landmark, ShoppingBag, ShoppingCart, Sparkles, UserPlus } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { OrderFormData } from "../types";
import { cn } from "@/lib/utils";

interface NotesSectionProps {
  form: UseFormReturn<OrderFormData>;
}

const websiteIcons = {
  amazon: ShoppingBag,
  ebay: ShoppingBag,
  other: ShoppingCart,
  "": ShoppingBag
};

const methodIcons = {
  cash: Banknote,
  pin: CreditCard,
  transfer: Landmark,
  "": Banknote
};

const methodLabels = {
  cash: "Cash",
  pin: "PIN",
  transfer: "Transfer",
  "": "-"
};

export function NotesSection({ form }: NotesSectionProps) {
  const { register, setValue, watch } = form;
  const isNewClient = watch("is_new_client");
  const isUrgent = watch("is_urgent");
  const selectedCustomer = watch("customer");
  // Smart hint: existing customer with no prior orders
  const hasNoPriorOrders = selectedCustomer
    && typeof selectedCustomer === "object"
    && "orders_count" in selectedCustomer
    && (selectedCustomer as any).orders_count === 0;
  const internalNotes = watch("internal_notes") || "";
  const clientNotes = watch("client_notes") || "";

  const itemsTotal = watch("items_total") || 0;
  const paidAmount = watch("paid_amount") || 0;
  const paymentAmount = watch("payment_amount") || 0;
  const paymentType = watch("payment_type");
  const website = watch("website") || "";
  const websiteType = watch("website_type") || "";
  const paymentMethod = watch("payment_method") || "";
  const orderDate = watch("order_date");

  const balanceDue = Math.max(0, Number(itemsTotal) - Number(paidAmount));

  const handleNewClientClick = () => {
    setValue("is_new_client", !isNewClient, { shouldDirty: true });
  };

  const handleUrgentClick = () => {
    setValue("is_urgent", !isUrgent, { shouldDirty: true });
  };

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

  const WebIcon = websiteIcons[websiteType as keyof typeof websiteIcons] || ShoppingBag;
  const MethodIcon = methodIcons[paymentMethod as keyof typeof methodIcons] || Banknote;

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-stretch">
      {/* Left Panel: Options buttons & Notes */}
      <div className="flex-1 space-y-4">
        {/* Title */}
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-none">Order Options, Notes and Client Notes</h2>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
            Add optional information for better order management.
          </p>
        </div>

        {/* Selection Cards Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* New Client Card */}
          <button
            type="button"
            onClick={handleNewClientClick}
            className={cn(
              "flex h-20 items-center justify-between rounded-xl border px-4 transition relative cursor-pointer text-left w-full",
              isNewClient
                ? "border-violet-500 bg-violet-50/20 font-bold ring-1 ring-violet-200"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            )}
          >
            {isNewClient && (
              <span className="absolute top-2 right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-violet-600 text-white shadow-xs">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-650">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-extrabold text-slate-900 leading-tight">New Client</p>
                  {isNewClient && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700 leading-none">
                      First Order!
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-550 mt-0.5 leading-none font-semibold">
                  {isNewClient ? "Toggle off if not a new client" : "Mark as a new client"}
                </p>
                {/* Smart hint for existing customer with no prior orders */}
                {!isNewClient && hasNoPriorOrders && (
                  <p className="text-[9px] text-amber-600 font-bold mt-0.5 leading-none">
                    ⚡ No previous orders found
                  </p>
                )}
              </div>
            </div>
          </button>

          {/* Urgent Order Card */}
          <button
            type="button"
            onClick={handleUrgentClick}
            className={cn(
              "flex h-20 items-center justify-between rounded-xl border px-4 transition relative cursor-pointer text-left w-full",
              isUrgent
                ? "border-violet-500 bg-violet-50/20 font-bold ring-1 ring-violet-200"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-350"
            )}
          >
            {isUrgent && (
              <span className="absolute top-2 right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-violet-600 text-white shadow-xs">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-650">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 leading-tight">Urgent Order</p>
                <p className="text-[10px] text-slate-550 mt-0.5 leading-none font-semibold">
                  Mark this order as urgent
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Internal Notes Textarea */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="internal_notes">
                Internal Notes
              </label>
              <Info className="h-3 w-3 text-slate-450 cursor-pointer" />
            </div>
            <span className="text-[9px] text-slate-500 font-bold">{internalNotes.length} / 500</span>
          </div>
          <textarea
            id="internal_notes"
            maxLength={500}
            placeholder="Add internal notes for your team (not visible to customer)"
            {...register("internal_notes")}
            className="w-full min-h-[70px] rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100"
          />
        </div>

        {/* Client Notes Textarea */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="client_notes">
                Client Notes
              </label>
              <Info className="h-3 w-3 text-slate-450 cursor-pointer" />
            </div>
            <span className="text-[9px] text-slate-500 font-bold">{clientNotes.length} / 500</span>
          </div>
          <textarea
            id="client_notes"
            maxLength={500}
            placeholder="Add notes for the customer (will be visible to customer)"
            {...register("client_notes")}
            className="w-full min-h-[70px] rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100"
          />
        </div>
      </div>

      {/* Right Panel: Order Summary */}
      <div className="w-80 shrink-0 border-l border-slate-100 pl-5 flex flex-col justify-center space-y-3.5">
        {/* Order Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Order Summary</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700 font-semibold">
            {/* Invoice Total */}
            <div className="flex items-center justify-between">
              <span>Invoice Total</span>
              <span className="text-slate-900 font-bold">{formatCurrency(itemsTotal)}</span>
            </div>
            {/* Per Installment — only for Two Payments */}
            {paymentType === "two" && (
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px]">Per Installment</span>
                <span className="text-slate-700 font-bold text-[10px]">{formatCurrency(paymentAmount)}</span>
              </div>
            )}
            {/* Paid Amount */}
            <div className="flex items-center justify-between">
              <span>Paid Amount</span>
              <span className="text-slate-900 font-bold">{formatCurrency(paidAmount)}</span>
            </div>
            {/* Balance Due */}
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-violet-750">
              <span>Balance Due</span>
              <span className="text-violet-700 font-extrabold text-sm">{formatCurrency(balanceDue)}</span>
            </div>
            {/* Divider: Payment Type & Method */}
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
                  {paymentMethod ? methodLabels[paymentMethod as keyof typeof methodLabels] : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected options block */}
        <div className="space-y-2">
          {/* Website */}
          {website && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/20 px-3.5 py-2.5 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <WebIcon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Website</p>
                <p className="text-xs font-extrabold text-slate-900 mt-1 leading-none">
                  {website}
                </p>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {paymentMethod && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/20 px-3.5 py-2.5 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <MethodIcon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Payment Method</p>
                <p className="text-xs font-extrabold text-slate-900 mt-1 leading-none">
                  {methodLabels[paymentMethod as keyof typeof methodLabels]}
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
