import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { queryKeys } from "@/config/queryKeys";
import { listAllOrders } from "../api/ordersViewerApi";
import {
  OrderActionModals,
  type OrderActionType,
} from "./OrderActionModals";
import {
  defaultOrdersFilters,
  filterOrdersByDate,
  OrdersFilters,
  useDebouncedValue,
  type OrdersFilterState,
} from "./OrdersFilters";
import { OrdersPagination } from "./OrdersPagination";
import { OrdersStatsCards } from "./OrdersStatsCards";
import { OrdersTable } from "./OrdersTable";
import type { OrderListItem } from "../types";

export function OrdersViewerPage() {
  const [filters, setFilters] = useState<OrdersFilterState>(defaultOrdersFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeAction, setActiveAction] = useState<OrderActionType>(null);
  const [activeOrder, setActiveOrder] = useState<OrderListItem | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search.trim());

  const queryFilters = useMemo(
    () => ({
      customer: filters.customer ? Number(filters.customer) : undefined,
      search: debouncedSearch || undefined,
    }),
    [filters.customer, debouncedSearch],
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.list({ ...queryFilters, all: true }),
    queryFn: () => listAllOrders(queryFilters),
  });

  const allOrders = useMemo(
    () => filterOrdersByDate(data?.results ?? [], filters.date),
    [data?.results, filters.date],
  );

  const totalCount = allOrders.length;

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allOrders.slice(start, start + pageSize);
  }, [allOrders, page, pageSize]);

  const handleFilterChange = (next: OrdersFilterState) => {
    setFilters(next);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(defaultOrdersFilters);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const openAction = (action: OrderActionType, order: OrderListItem) => {
    setActiveOrder(order);
    setActiveAction(action);
  };

  const closeAction = () => {
    setActiveAction(null);
    setActiveOrder(null);
  };

  const showTableLoading = isLoading || (isFetching && allOrders.length === 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] space-y-5 p-5 lg:p-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Orders Viewer
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Control and manage customer orders with ease.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                to="/orders/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                Create New Order
              </Link>
              {totalCount > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {totalCount} Orders
                </div>
              )}
            </div>
          </header>

          {!isLoading && allOrders.length > 0 && (
            <OrdersStatsCards orders={allOrders} />
          )}

          <OrdersFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />

          {isError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              Failed to load orders.{" "}
              <button
                type="button"
                onClick={() => void refetch()}
                className="font-semibold underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <OrdersTable
              orders={paginatedOrders}
              isLoading={showTableLoading}
              isRefreshing={isFetching && !isLoading}
              onEdit={(order) => openAction("edit", order)}
              onDelete={(order) => openAction("delete", order)}
              onUploadPdf={(order) => openAction("upload", order)}
              onAddPayment={(order) => openAction("payment", order)}
            />

            {!showTableLoading && totalCount > 0 && (
              <OrdersPagination
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        </div>
      </div>

      <OrderActionModals
        order={activeOrder}
        action={activeAction}
        onClose={closeAction}
      />
    </div>
  );
}
