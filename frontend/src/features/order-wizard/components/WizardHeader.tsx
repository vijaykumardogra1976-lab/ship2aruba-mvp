import { AtSign, Phone, User, X } from "lucide-react";
import type { Customer } from "@/features/customers/types";

interface WizardHeaderProps {
  customer: Customer | null;
  onClearCustomer?: () => void;
}

export function WizardHeader({ customer, onClearCustomer }: WizardHeaderProps) {
  if (!customer) return null;

  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <User className="h-5 w-5 text-slate-500" />
      </div>
      <div className="text-sm">
        <p className="font-semibold">{customer.name}</p>
        {customer.email && (
          <p className="flex items-center gap-1 text-slate-500">
            <AtSign className="h-3 w-3" />
            {customer.email}
          </p>
        )}
        <p className="flex items-center gap-1 text-slate-500">
          <Phone className="h-3 w-3" />
          {customer.phone}
        </p>
      </div>
      {onClearCustomer && (
        <button
          type="button"
          aria-label="Clear selected customer"
          onClick={onClearCustomer}
          className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
