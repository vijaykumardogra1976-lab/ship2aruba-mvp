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
}

export function OrdersFilters({ filters, onChange, onReset }: OrdersFiltersProps) {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: queryKeys.customers.list,
    queryFn: listCustomers,
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center gap-2">
        {/* Customer Select Filter */}
        <div className="relative min-w-0 w-full sm:w-44 shrink-0">
          <Users
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <select
            id="customer-filter"
            aria-label="Filter by customers"
            value={filters.customer}
            onChange={(e) => onChange({ ...filters, customer: e.target.value })}
            disabled={isLoading}
            className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-8 pr-8 text-xs font-semibold text-slate-700 transition hover:border-slate-350 focus:border-violet-500 focus:outline-hidden disabled:opacity-50 cursor-pointer"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
        </div>

        {/* Search Input Filter */}
        <div className="relative min-w-0 flex-1 w-full">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="search-orders"
            aria-label="Search orders by order ID, customer details, or tracking number"
            placeholder="Search by name, email, phone or order number..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs focus-visible:border-violet-500 focus-visible:ring-violet-100 focus-visible:outline-hidden font-semibold"
          />
        </div>

        {/* Single Date Filter */}
        <div className="relative min-w-0 w-full sm:w-36 shrink-0">
          <Calendar
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            id="date-filter"
            type="date"
            aria-label="Filter by Date"
            value={filters.date}
            onChange={(e) => onChange({ ...filters, date: e.target.value })}
            className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-7.5 pr-1.5 text-[10px] font-semibold text-slate-750 focus:border-violet-500 focus:outline-hidden cursor-pointer"
          />
        </div>

        {/* Reset Icon Button (Circular) */}
        <button
          type="button"
          onClick={onReset}
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer shadow-xs transition hover:text-slate-750"
          title="Reset Filters"
        >
          <RefreshCw className="h-3.5 w-3.5" />
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
