import { useQuery } from "@tanstack/react-query";
import { Plus, Download, FileText, Printer, ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "pending" | "uploaded" | "az_ordered" | "in_myus" | "completed">("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

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
      const isCompleted = order.is_completed;
      const isInMyUs = order.is_in_myus && !isCompleted;
      const isUploaded = order.is_uploaded && !order.is_in_myus && !isCompleted;
      const isAzOrdered = !order.is_uploaded && !order.is_in_myus && !isCompleted;

      if (activeTab === "completed") return isCompleted;
      if (activeTab === "in_myus") return isInMyUs;
      if (activeTab === "uploaded") return isUploaded;
      if (activeTab === "az_ordered") return isAzOrdered;
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
        if (forceSelectLatest && !isFetching) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    } else if (!isLoading && tabFilteredOrders.length === 0) {
      setSelectedOrder(null);
    }
  }, [tabFilteredOrders, isLoading, isFetching, selectedOrder, location.state, navigate, location.pathname]);

  // Tab counts based on all orders loaded matching search/date
  const tabCounts = useMemo(() => {
    return {
      all: filteredOrdersBase.length,
      paid: filteredOrdersBase.filter(o => parseFloat(o.remaining_balance) <= 0).length,
      pending: filteredOrdersBase.filter(o => parseFloat(o.remaining_balance) > 0).length,
      completed: filteredOrdersBase.filter(o => o.is_completed).length,
      in_myus: filteredOrdersBase.filter(o => o.is_in_myus && !o.is_completed).length,
      uploaded: filteredOrdersBase.filter(o => o.is_uploaded && !o.is_in_myus && !o.is_completed).length,
      az_ordered: filteredOrdersBase.filter(o => !o.is_uploaded && !o.is_in_myus && !o.is_completed).length,
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
    if (!receiptInvoice) return;
    const inv = receiptInvoice;

    const getFormattedDate = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleDateString("en-US", { month: "long" });
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    };

    const issuedDate = getFormattedDate(inv.issued_at);

    const paymentsHtml = inv.payments && inv.payments.length > 0
      ? inv.payments.map(p => `
          <tr>
            <td style="padding:4px 0; color:#1e293b;">Payment on ${getFormattedDate(p.paid_at)} using ${p.payment_method}</td>
            <td style="padding:4px 0; text-align:right; color:#1e293b;">${p.amount} AWG</td>
          </tr>`).join("")
      : `<tr>
          <td style="padding:4px 0; color:#1e293b;">Payment using ${inv.payment_method}</td>
          <td style="padding:4px 0; text-align:right; color:#1e293b;">${inv.paid} AWG</td>
        </tr>`;

    const lineItemsHtml = inv.line_items.map(item => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 0;">${item.label}</td>
        <td style="padding:8px 0; text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0; text-align:right;">${item.price}</td>
        <td style="padding:8px 0; text-align:right;">${item.amount}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #0f172a; background: white; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: none; }
    p { margin: 2px 0; }
  </style>
</head>
<body>
  <table style="width:100%; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid #e2e8f0;">
    <tr>
      <td style="vertical-align:top; text-align:left;">
        <div style="font-size:24px; font-weight:700;">Ship2Aruba</div>
      </td>
      <td style="vertical-align:top; text-align:right; font-size:13px;">
        <p><strong>Invoice #${inv.invoice_number}</strong></p>
        <p>Order # ${inv.order_number}</p>
        <p>Date of Invoice: ${issuedDate}</p>
        <p><strong>Amount Due: ${inv.amount_due} AWG</strong></p>
      </td>
    </tr>
  </table>

  <table style="width:100%; margin-bottom:32px;">
    <tr>
      <td style="width:50%; vertical-align:top; text-align:left; font-size:13px;">
        <p style="font-size:11px; font-weight:600; text-transform:uppercase; color:#1e293b; margin-bottom:6px;">Invoice To:</p>
        <p>${inv.customer_name}</p>
        <p>${inv.customer_phone}</p>
        ${inv.customer_email ? `<p>${inv.customer_email}</p>` : ""}
      </td>
      <td style="width:50%; vertical-align:top; text-align:right; font-size:13px;">
        <p style="font-size:11px; font-weight:600; text-transform:uppercase; color:#1e293b; margin-bottom:6px;">Invoice From:</p>
        <p>${inv.company.name}</p>
        <p>${inv.company.address}</p>
        <p>${inv.company.phone}</p>
      </td>
    </tr>
  </table>

  <p style="font-weight:600; margin-bottom:8px;">Your Invoice</p>
  <table style="width:100%; margin-bottom:24px; font-size:13px;">
    <thead>
      <tr style="border-bottom:2px solid #e2e8f0;">
        <th style="padding:6px 0; text-align:left; font-size:11px; text-transform:uppercase; color:#1e293b;">Items</th>
        <th style="padding:6px 0; text-align:center; font-size:11px; text-transform:uppercase; color:#1e293b;">Quantity</th>
        <th style="padding:6px 0; text-align:right; font-size:11px; text-transform:uppercase; color:#1e293b;">Price (AWG)</th>
        <th style="padding:6px 0; text-align:right; font-size:11px; text-transform:uppercase; color:#1e293b;">Amount (AWG)</th>
      </tr>
    </thead>
    <tbody>${lineItemsHtml}</tbody>
  </table>

  <table style="width:100%; font-size:13px;">
    <tbody>
      <tr>
        <td style="padding:4px 0; font-weight:700;">TOTAL:</td>
        <td style="padding:4px 0; text-align:right; font-weight:700;">${inv.total} AWG</td>
      </tr>
      ${paymentsHtml}
      <tr>
        <td style="padding:8px 0 4px; font-weight:700; border-top:1px solid #e2e8f0;">AMOUNT DUE:</td>
        <td style="padding:8px 0 4px; text-align:right; font-weight:700; border-top:1px solid #e2e8f0;">${inv.remaining_balance} AWG</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank", "width=794,height=1123");
    if (!win) { alert("Please allow popups to print the invoice."); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); win.close(); };
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
      o.is_completed ? "Delivered" : o.is_in_myus ? "In MyUS" : o.is_uploaded ? "Uploaded" : "AZ Ordered"
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
          >
            {/* Status Filter Dropdown */}
            <div className="relative inline-block z-10 shrink-0">
              <button
                type="button"
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className="flex h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-350 focus:border-violet-500 shadow-[0_2px_8px_rgba(0,0,0,0.01)] min-w-[200px] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-wider">
                    {
                      [
                        { id: "all", label: "All Orders", count: tabCounts.all },
                        { id: "paid", label: "Paid", count: tabCounts.paid },
                        { id: "pending", label: "Unpaid", count: tabCounts.pending },
                        { id: "uploaded", label: "Uploaded", count: tabCounts.uploaded },
                        { id: "az_ordered", label: "AZ Ordered", count: tabCounts.az_ordered },
                        { id: "in_myus", label: "In MyUS", count: tabCounts.in_myus },
                        { id: "completed", label: "Delivered", count: tabCounts.completed },
                      ].find((t) => t.id === activeTab)?.label || "All Orders"
                    } 
                  </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", filterMenuOpen && "rotate-180")} />
              </button>

              {filterMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg shadow-slate-200/50 z-50 flex flex-col gap-0.5">
                    {[
                      { id: "all", label: "All Orders", count: tabCounts.all },
                      { id: "paid", label: "Paid", count: tabCounts.paid },
                      { id: "pending", label: "Unpaid", count: tabCounts.pending },
                      { id: "uploaded", label: "Uploaded", count: tabCounts.uploaded },
                      { id: "az_ordered", label: "AZ Ordered", count: tabCounts.az_ordered },
                      { id: "in_myus", label: "In MyUS", count: tabCounts.in_myus },
                      { id: "completed", label: "Delivered", count: tabCounts.completed },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id as any);
                            setPage(1);
                            setFilterMenuOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-left uppercase tracking-wider",
                            isActive
                              ? "bg-violet-50 text-violet-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <span>{tab.label}</span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-black",
                            isActive ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </OrdersFilters>

          {isError && (
            <div
              role="alert"
              className="rounded-2xl border border-red-150 bg-red-50/50 px-4 py-3.5 text-xs font-semibold text-red-800 mt-4"
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
        <DialogContent className="max-w-2xl bg-white p-4 md:p-5 overflow-y-auto max-h-[92vh]">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-2">
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-600" />
              Invoice Receipt
            </DialogTitle>
          </DialogHeader>
          
          {receiptInvoice && (
            <div className="py-2">
              <div className="mb-3">
                <InvoicePreview invoice={receiptInvoice} />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
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
    </div>
  );
}
