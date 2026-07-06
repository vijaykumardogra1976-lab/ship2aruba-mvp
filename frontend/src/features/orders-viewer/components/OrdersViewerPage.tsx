import { useQuery } from "@tanstack/react-query";
import { Plus, Download, FileText, Printer } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { queryKeys } from "@/config/queryKeys";
import { listAllOrders } from "../api/ordersViewerApi";
import { getOrderInvoice } from "@/features/order-wizard/api/orderApi";
import { InvoicePreview } from "@/features/order-wizard/components/InvoicePreview";
import type { InvoiceData } from "@/features/order-wizard/types";
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
import { OrderDetailsPanel } from "./OrderDetailsPanel";
import type { OrderListItem } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function OrdersViewerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<OrdersFilterState>(defaultOrdersFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeAction, setActiveAction] = useState<OrderActionType>(null);
  const [activeOrder, setActiveOrder] = useState<OrderListItem | null>(null);
  
  // Right details panel selected order
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  
  // Receipt Preview
  const [receiptInvoice, setReceiptInvoice] = useState<InvoiceData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Status Filter Tab
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "pending" | "uploaded" | "az_ordered">("all");

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

  // Base list of orders matching Search, Customer & Date filters
  const filteredOrdersBase = useMemo(
    () => filterOrdersByDate(data?.results ?? [], filters.date),
    [data?.results, filters.date],
  );

  // Split calculations based on Tab Filters
  const tabFilteredOrders = useMemo(() => {
    return filteredOrdersBase.filter((order) => {
      const balance = parseFloat(order.remaining_balance);
      if (activeTab === "paid") return balance <= 0;
      if (activeTab === "pending") return balance > 0;
      if (activeTab === "uploaded") return order.is_uploaded;
      if (activeTab === "az_ordered") return order.is_az_ordered;
      return true;
    });
  }, [filteredOrdersBase, activeTab]);

  // Pagination on the tab filtered list
  const totalCount = tabFilteredOrders.length;
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tabFilteredOrders.slice(start, start + pageSize);
  }, [tabFilteredOrders, page, pageSize]);

  // Automatically select the first order when the filtered list loads or changes
  useEffect(() => {
    if (!isLoading && tabFilteredOrders.length > 0) {
      const isStillInList = tabFilteredOrders.some((o) => o.id === selectedOrder?.id);
      const forceSelectLatest = location.state?.selectLatest;

      if (!selectedOrder || !isStillInList || forceSelectLatest) {
        setSelectedOrder(tabFilteredOrders[0]);
        if (forceSelectLatest) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    } else if (!isLoading && tabFilteredOrders.length === 0) {
      setSelectedOrder(null);
    }
  }, [tabFilteredOrders, isLoading, selectedOrder, location.state, navigate, location.pathname]);

  // Tab counts based on all orders loaded matching search/date
  const tabCounts = useMemo(() => {
    return {
      all: filteredOrdersBase.length,
      paid: filteredOrdersBase.filter(o => parseFloat(o.remaining_balance) <= 0).length,
      pending: filteredOrdersBase.filter(o => parseFloat(o.remaining_balance) > 0).length,
      uploaded: filteredOrdersBase.filter(o => o.is_uploaded).length,
      az_ordered: filteredOrdersBase.filter(o => o.is_az_ordered).length,
    };
  }, [filteredOrdersBase]);

  const handleFilterChange = (next: OrdersFilterState) => {
    setFilters(next);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(defaultOrdersFilters);
    setActiveTab("all");
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
    // Refresh selected order details if edited or PDF was uploaded/deleted
    if (selectedOrder && (activeAction === "edit" || activeAction === "upload")) {
      refetch().then((res) => {
        const updated = res.data?.results.find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      });
    }
  };

  const handlePrintReceipt = async (order: OrderListItem) => {
    try {
      const invoiceData = await getOrderInvoice(order.id);
      setReceiptInvoice(invoiceData);
      setReceiptOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load invoice receipt. Make sure the order has items.");
    }
  };

  const handlePrintAction = () => {
    window.print();
  };

  // CSV Export feature
  const handleExport = () => {
    const headers = ["Order ID", "Customer", "Date", "Total (AWG)", "Paid (AWG)", "Balance (AWG)", "Status"];
    const rows = tabFilteredOrders.map(o => [
      o.order_number,
      o.customer.name,
      o.order_date,
      o.items_total,
      o.paid_amount,
      o.remaining_balance,
      o.is_completed ? "Delivered" : o.is_in_myus ? "In MyUS" : o.is_uploaded ? "Uploaded" : o.is_az_ordered ? "AZ Ordered" : "Pending"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showTableLoading = isLoading || (isFetching && tabFilteredOrders.length === 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1750px] xl:max-w-[95%] w-full space-y-6 p-6 lg:p-8">
          
          {/* Header Section */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-800">
                  Orders
                </h1>
                {!isLoading && (
                  <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-black text-violet-700">
                    {tabCounts.all}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Track and manage all customer orders in one place.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer shadow-xs"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <Link
                to="/orders/new"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-violet-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                New Order
              </Link>
            </div>
          </header>

          {/* Metrics Summary Cards */}
          {!isLoading && filteredOrdersBase.length > 0 && (
            <OrdersStatsCards orders={filteredOrdersBase} />
          )}

          {/* Filters and Inputs */}
          <OrdersFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />

          {isError && (
            <div
              role="alert"
              className="rounded-2xl border border-red-150 bg-red-50/50 px-4 py-3.5 text-xs font-semibold text-red-800"
            >
              Failed to load orders.{" "}
              <button
                type="button"
                onClick={() => void refetch()}
                className="font-bold underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {/* Status Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-6" aria-label="Tabs">
              {[
                { id: "all", label: "All Orders", count: tabCounts.all },
                { id: "paid", label: "Paid", count: tabCounts.paid },
                { id: "pending", label: "Pending", count: tabCounts.pending },
                { id: "uploaded", label: "Uploaded", count: tabCounts.uploaded },
                { id: "az_ordered", label: "AZ Ordered", count: tabCounts.az_ordered },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setPage(1);
                    }}
                    className={`py-3.5 px-1 border-b-2 font-bold text-xs transition-all uppercase tracking-wider cursor-pointer ${
                      isActive
                        ? "border-violet-600 text-violet-700 font-black"
                        : "border-transparent text-slate-550 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {tab.label} <span className={`ml-1 text-[10px] ${isActive ? 'text-violet-700 font-extrabold' : 'text-slate-500 font-semibold'}`}>({tab.count})</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Split Screen Layout Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left side: Orders Table */}
            <div className={selectedOrder ? "lg:col-span-8 space-y-4" : "lg:col-span-12 space-y-4"}>
              <OrdersTable
                orders={paginatedOrders}
                isLoading={showTableLoading}
                isRefreshing={isFetching && !isLoading}
                selectedOrderId={selectedOrder?.id}
                onSelectOrder={setSelectedOrder}
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

            {/* Right side: Detail Panel (Active only when order is selected) */}
            {selectedOrder && (
              <div className="lg:col-span-4 sticky top-6">
                <OrderDetailsPanel
                  order={selectedOrder}
                  onClose={() => setSelectedOrder(null)}
                  onEdit={() => openAction("edit", selectedOrder)}
                  onDelete={() => openAction("delete", selectedOrder)}
                  onUploadPdf={() => openAction("upload", selectedOrder)}
                  onAddPayment={() => openAction("payment", selectedOrder)}
                  onPrintReceipt={() => handlePrintReceipt(selectedOrder)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit/Delete/Upload action modals */}
      <OrderActionModals
        order={activeOrder}
        action={activeAction}
        onClose={closeAction}
      />

      {/* Printable Receipt Modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-3xl bg-white p-6 md:p-8 overflow-y-auto max-h-[85vh]">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-600" />
              Invoice Receipt
            </DialogTitle>
          </DialogHeader>
          
          {receiptInvoice && (
            <div className="py-4">
              <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/20 shadow-xs mb-6">
                <InvoicePreview invoice={receiptInvoice} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setReceiptOpen(false)} className="rounded-xl font-bold text-xs uppercase tracking-wider">
                  Close
                </Button>
                <Button onClick={handlePrintAction} className="bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Global CSS for hiding non-invoice elements during window.print() */}
      {receiptOpen && receiptInvoice && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:static, .print\\:static * {
              visibility: visible;
            }
            .print\\:static {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}} />
      )}
    </div>
  );
}
