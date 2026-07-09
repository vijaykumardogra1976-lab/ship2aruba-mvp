import { Calendar, ChevronDown, RefreshCw, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/features/customers/api/customersApi";
import { queryKeys } from "@/config/queryKeys";
import { Input } from "@/components/ui/input";

export interface OrdersFilterState {
  customer: string;
  search: string;
  date: string;
}

export const defaultOrdersFilters: OrdersFilterState = {
  customer: "",
  search: "",
  date: "",
};

interface OrdersFiltersProps {
  filters: OrdersFilterState;
  onChange: (filters: OrdersFilterState) => void;
  onReset: () => void;
  children?: React.ReactNode;
}

export function OrdersFilters({ filters, onChange, onReset, children }: OrdersFiltersProps) {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: queryKeys.customers.list,
    queryFn: listCustomers,
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-3">
      {/* Customer Filter (On the left) */}
      <div className="relative min-w-0 w-full md:w-52 shrink-0">
        <Users
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <select
          id="customer-filter"
          value={filters.customer}
          onChange={(e) => onChange({ ...filters, customer: e.target.value })}
          disabled={isLoading}
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-1 pl-10 pr-9.5 text-xs font-bold text-slate-700 transition hover:border-slate-350 focus:border-violet-500 focus:outline-hidden disabled:opacity-50 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>

      {children}

      {/* Search Input Filter */}
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          id="search-orders"
          aria-label="Search orders"
          placeholder="Search by name, email, phone or order number..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10.5 pr-4 text-xs font-semibold text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all focus-visible:border-violet-500 focus-visible:ring-violet-100 placeholder:text-slate-400 placeholder:font-normal"
        />
      </div>

      {/* Date Filter */}
      <div className="relative min-w-0 w-full md:w-44 shrink-0">
        <Calendar
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="date-filter"
          type="date"
          aria-label="Filter by Date"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-xs font-semibold text-slate-650 shadow-[0_2px_8px_rgba(0,0,0,0.01)] focus:border-violet-500 focus:outline-hidden cursor-pointer"
        />
      </div>

      {/* Reset Button */}
      <div className="w-full md:w-auto shrink-0 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function filterOrdersByDate<
  T extends { order_date: string },
>(orders: T[], date: string): T[] {
  if (!date) return orders;
  return orders.filter((order) => order.order_date === date);
}
