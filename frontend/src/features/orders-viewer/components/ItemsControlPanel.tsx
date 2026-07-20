import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Search,
  Upload,
  Package,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { queryKeys } from "@/config/queryKeys";
import {
  getOrderItems,
  createOrderItem,
  updateOrderItem,
  deleteOrderItem,
  uploadOrderPdf,
} from "../api/ordersViewerApi";
import { api } from "@/lib/axios";
import type { OrderItemRow } from "../types";
import { cn } from "@/lib/utils";

export function ItemsControlPanel() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  // States for Create/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"pdf" | "manual">("pdf");
  const [editingItem, setEditingItem] = useState<OrderItemRow | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [formFedexTracking, setFormFedexTracking] = useState("");
  const [formAzTracking, setFormAzTracking] = useState("");
  const [formAddress, setFormAddress] = useState("Sarasota");
  const [formNotes, setFormNotes] = useState("");
  const [formAccountUsed, setFormAccountUsed] = useState("");
  const [formEstDate, setFormEstDate] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  const id = Number(orderId);

  // Fetch Order metadata
  const { data: order } = useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}/`);
      return data;
    },
    enabled: !!id,
  });

  // Fetch items
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.orders.items(id),
    queryFn: () => getOrderItems(id),
    enabled: !!id,
  });

  // Mutate create/update
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingItem) {
        return updateOrderItem(editingItem.id, payload);
      } else {
        return createOrderItem(id, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(id) });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        Object.values(err?.response?.data ?? {}).flat().join(" ") ||
        "Failed to save item. Please check your inputs and try again.";
      setSaveMutationError(String(detail));
    },
  });

  // Mutate delete
  const deleteMutation = useMutation({
    mutationFn: deleteOrderItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(id) });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setDeletingItemId(null);
    },
  });

  // Mutate status toggle on row with Optimistic UI updates
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: number; payload: any }) => {
      return updateOrderItem(itemId, payload);
    },
    onMutate: async ({ itemId, payload }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.items(id) });

      // Snapshot the previous items list
      const previousItems = queryClient.getQueryData<OrderItemRow[]>(queryKeys.orders.items(id));

      // Optimistically update the item details in cache
      if (previousItems) {
        queryClient.setQueryData<OrderItemRow[]>(
          queryKeys.orders.items(id),
          previousItems.map((item) =>
            item.id === itemId ? { ...item, ...payload } : item
          )
        );
      }

      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.orders.items(id), context.previousItems);
      }
    },
    onSettled: () => {
      // Refetch in background to sync with database
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(id) });
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveMutationError, setSaveMutationError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingItem(null);
    setFormLabel("");
    setFormQuantity(1);
    setFormUnitPrice("");
    setFormFedexTracking("");
    setFormAzTracking("");
    setFormAddress("Sarasota");
    setFormNotes("");
    setFormAccountUsed("");
    setFormEstDate("");
    setFormImageUrl("");
    setFormErrors({});
    setSaveMutationError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalTab("manual");
    setModalOpen(true);
  };

  const handleOpenEdit = (item: OrderItemRow) => {
    setEditingItem(item);
    setFormLabel(item.label);
    setFormQuantity(item.quantity);
    setFormUnitPrice(item.unit_price);
    setFormFedexTracking(item.fedex_tracking_number);
    setFormAzTracking(item.tracking_number);
    setFormAddress(item.address || "Sarasota");
    setFormNotes(item.notes || "");
    setFormAccountUsed(item.account_used || "");
    setFormEstDate(item.est_date || "");
    setFormImageUrl(item.image_url || "");
    setFormErrors({});
    setSaveMutationError(null);
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formLabel.trim()) {
      errors.label = "Item description is required.";
    }
    if (!formQuantity || formQuantity < 1) {
      errors.quantity = "Quantity must be at least 1.";
    }
    if (formUnitPrice === "" || isNaN(Number(formUnitPrice)) || Number(formUnitPrice) < 0) {
      errors.unit_price = "A valid price is required (can be 0).";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMutationError(null);

    if (!validateForm()) return;

    const qty = Number(formQuantity);
    const price = Number(formUnitPrice);

    saveMutation.mutate({
      label: formLabel.trim(),
      quantity: qty,
      unit_price: price.toFixed(2),
      line_total: (qty * price).toFixed(2),
      fedex_tracking_number: formFedexTracking.trim(),
      tracking_number: formAzTracking.trim(),
      address: formAddress.trim(),
      notes: formNotes.trim(),
      account_used: formAccountUsed.trim(),
      est_date: formEstDate || null,
      image_url: formImageUrl.trim(),
    });
  };



  // Quick Inline change savers
  const handleInlineChange = (itemId: number, payload: any) => {
    toggleStatusMutation.mutate({ itemId, payload });
  };

  // Filter items and sort by ID ascending
  const filteredItems = items
    .filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      const matchSearch =
        item.label.toLowerCase().includes(searchLower) ||
        item.tracking_number.toLowerCase().includes(searchLower) ||
        item.fedex_tracking_number.toLowerCase().includes(searchLower) ||
        item.notes.toLowerCase().includes(searchLower) ||
        item.account_used.toLowerCase().includes(searchLower);

      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "myus"
          ? item.is_in_myus
          : statusFilter === "ready"
          ? item.is_ready_for_pickup
          : statusFilter === "delivered"
          ? item.is_delivered
          : true;

      return matchSearch && matchStatus;
    })
    .sort((a, b) => a.id - b.id);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
      {/* Top Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/orders")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-555 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-800">
                  Order Items
                </h1>
                {order && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-black text-violet-700">
                    Order #{order.order_number.split("-").pop()?.slice(-4)}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">List, create, update or remove items</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={handleOpenCreate}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-750 px-4 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 flex-shrink-0 flex flex-wrap items-center gap-3">
        {/* Customer Read Only info */}
        {order && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Customer:</span>
            <span className="text-xs font-bold text-slate-700">{order.customer.name}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative min-w-64 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items by FEDEX TR#, description, account used..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Status Dropdowns */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="all">All Items</option>
          <option value="myus">In MyUS</option>
          <option value="ready">Ready for Pickup</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Main Table Panel */}
      <div className="flex-grow overflow-auto p-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs min-w-max w-full overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-4 px-5 w-16 text-center">ID</th>
                <th className="py-4 px-5 w-96">Product Details</th>
                <th className="py-4 px-5 w-44 text-center">Status &amp; Actions</th>
                <th className="py-4 px-5 w-36">Est. Date</th>
                <th className="py-4 px-5 w-48">Tracking (FedEx / AZ)</th>
                <th className="py-4 px-5 w-36">Address</th>
                <th className="py-4 px-5 w-48">Notes</th>
                <th className="py-4 px-5 w-36">Account Used</th>
                <th className="py-4 px-5 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-semibold">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-350" />
                    Loading items list...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-700">No items found</p>
                    <p className="text-xs text-slate-555 mt-1">Add items manually or upload a PDF invoice</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const hasError = imageErrors[item.id];
                  const rawImg = item.product_image || item.image_url;
                  const imgUrl = !hasError && rawImg ? rawImg : null;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* ID */}
                      <td className="py-4 px-5 text-center font-mono text-slate-500 font-semibold text-sm">{item.id}</td>

                      {/* Merged Product Details (Image, Qty, Price, Order details) */}
                      <td className="py-4 px-5 max-w-sm">
                        <div className="flex items-start gap-4">
                          {imgUrl ? (
                            <img
                              src={imgUrl.startsWith("http") ? imgUrl : `${import.meta.env.VITE_API_BASE_URL || ""}${imgUrl}`}
                              alt=""
                              className="h-14 w-14 rounded-xl object-cover bg-slate-50 border border-slate-100 shrink-0 shadow-xs"
                              onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                              <Package className="h-6 w-6 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 break-words leading-snug text-sm" title={item.label}>
                              {item.label}
                            </p>
                            <div className="text-xs font-normal text-slate-600 mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 leading-none">
                              <span>Qty: <span className="font-bold text-slate-800">{item.quantity}</span></span>
                              <span>•</span>
                              <span>Price: <span className="font-bold text-slate-800">AWG {parseFloat(item.unit_price).toFixed(2)}</span></span>
                              <span>•</span>
                              <span>Total: <span className="font-black text-slate-800">AWG {parseFloat(item.line_total).toFixed(2)}</span></span>
                            </div>
                            {order && (
                              <p className="text-[10px] font-normal text-slate-500 mt-1.5 leading-none uppercase">
                                Order #{order.order_number.split("-").pop()?.slice(-4)} • Client: {order.customer.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Merged Status Actions */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1.5 w-full max-w-[150px] mx-auto">
                          <button
                            type="button"
                            onClick={() => handleInlineChange(item.id, { is_in_myus: !item.is_in_myus })}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider transition-all cursor-pointer leading-none",
                              item.is_in_myus
                                ? "bg-emerald-50 border-emerald-250 text-emerald-700 shadow-xs"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            In MyUS
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInlineChange(item.id, { is_ready_for_pickup: !item.is_ready_for_pickup })}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider transition-all cursor-pointer leading-none",
                              item.is_ready_for_pickup
                                ? "bg-emerald-50 border-emerald-250 text-emerald-700 shadow-xs"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            Ready to Pickup
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInlineChange(item.id, { is_delivered: !item.is_delivered })}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider transition-all cursor-pointer leading-none",
                              item.is_delivered
                                ? "bg-emerald-50 border-emerald-250 text-emerald-700 shadow-xs"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            Delivered
                          </button>
                        </div>
                      </td>

                      {/* Est Date */}
                      <td className="py-4 px-5">
                        <input
                          type="date"
                          value={item.est_date || ""}
                          onChange={(e) => handleInlineChange(item.id, { est_date: e.target.value || null })}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Combined FedEx & AZ tracking inputs */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1.5 w-32">
                          <input
                            type="text"
                            placeholder="FedEx TR#"
                            defaultValue={item.fedex_tracking_number || ""}
                            onBlur={(e) => handleInlineChange(item.id, { fedex_tracking_number: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-violet-500"
                          />
                          <input
                            type="text"
                            placeholder="AZ TR#"
                            defaultValue={item.tracking_number || ""}
                            onBlur={(e) => handleInlineChange(item.id, { tracking_number: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-violet-500"
                          />
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-4 px-5">
                        <input
                          type="text"
                          defaultValue={item.address || ""}
                          onBlur={(e) => handleInlineChange(item.id, { address: e.target.value })}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs w-28 outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Notes */}
                      <td className="py-4 px-5">
                        <input
                          type="text"
                          defaultValue={item.notes || ""}
                          onBlur={(e) => handleInlineChange(item.id, { notes: e.target.value })}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs w-40 outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Account Used */}
                      <td className="py-4 px-5">
                        <input
                          type="text"
                          defaultValue={item.account_used || ""}
                          onBlur={(e) => handleInlineChange(item.id, { account_used: e.target.value })}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs w-28 outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300 shadow-xs transition-all duration-300 hover:scale-[1.05] cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingItemId(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-150 hover:border-rose-300 shadow-xs transition-all duration-300 hover:scale-[1.05] cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingItem ? "Edit Order Item" : "Add New Item"}
            </h2>

            {/* Tab Toggles (Only show when creating a new item) */}
            {!editingItem && (
              <div className="flex border-b border-slate-100 mb-5">
                <button
                  type="button"
                  onClick={() => setModalTab("pdf")}
                  className={cn(
                    "flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                    modalTab === "pdf"
                      ? "border-violet-600 text-violet-750 font-black"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Upload PDF
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("manual")}
                  className={cn(
                    "flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                    modalTab === "manual"
                      ? "border-violet-600 text-violet-750 font-black"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Manual Entry
                </button>
              </div>
            )}

            {/* PDF Uploader Tab Content */}
            {!editingItem && modalTab === "pdf" ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-550 leading-relaxed text-center">
                  Upload your Item PDF. Our AI engine will automatically extract the product images, description, pricing, and quantity details instantly.
                </p>

                {uploading ? (
                  <div className="flex flex-col items-center justify-center border-2 border-slate-200 rounded-2xl p-8 bg-slate-50/50 min-h-[160px]">
                    <Loader2 className="h-10 w-10 animate-spin text-violet-600 mb-3" />
                    <p className="text-xs font-bold text-slate-800">Parsing and extracting items...</p>
                    <p className="text-[10px] text-slate-500 mt-1">Our AI is reading the PDF and generating details</p>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-2xl p-8 bg-slate-50/50 hover:bg-violet-50/20 transition-all cursor-pointer group">
                    <Upload className="h-8 w-8 text-slate-400 group-hover:text-violet-600 transition-colors mb-3" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-violet-700 text-center">
                      Upload your Item PDF
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-semibold">Supports PDF files</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          await uploadOrderPdf(id, file);
                          queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(id) });
                          queryClient.invalidateQueries({ queryKey: ["orders"] });
                          setModalOpen(false);
                          refetch();
                        } catch (err) {
                          console.error(err);
                          alert("Failed to parse invoice. Please make sure it's a valid PDF.");
                        } finally {
                          setUploading(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Manual Input Form Content */
              <form onSubmit={handleSaveSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

                {/* Mutation-level error banner */}
                {saveMutationError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>{saveMutationError}</span>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Item Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formLabel}
                    onChange={(e) => {
                      setFormLabel(e.target.value);
                      if (formErrors.label) setFormErrors(prev => ({ ...prev, label: "" }));
                    }}
                    placeholder="e.g. MacBook Air M3"
                    className={cn(
                      "w-full rounded-xl border p-2.5 text-xs outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20",
                      formErrors.label ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                    )}
                  />
                  {formErrors.label && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{formErrors.label}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">
                      Quantity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formQuantity}
                      onChange={(e) => {
                        setFormQuantity(Number(e.target.value));
                        if (formErrors.quantity) setFormErrors(prev => ({ ...prev, quantity: "" }));
                      }}
                      className={cn(
                        "w-full rounded-xl border p-2.5 text-xs outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20",
                        formErrors.quantity ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                      )}
                    />
                    {formErrors.quantity && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">{formErrors.quantity}</p>
                    )}
                  </div>
                  {/* Unit Price */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">
                      Unit Price (USD) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formUnitPrice}
                      onChange={(e) => {
                        setFormUnitPrice(e.target.value);
                        if (formErrors.unit_price) setFormErrors(prev => ({ ...prev, unit_price: "" }));
                      }}
                      placeholder="e.g. 19.50"
                      className={cn(
                        "w-full rounded-xl border p-2.5 text-xs outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20",
                        formErrors.unit_price ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                      )}
                    />
                    {formErrors.unit_price && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">{formErrors.unit_price}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* FedEx Tracking */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">FedEx Tracking</label>
                    <input
                      type="text"
                      value={formFedexTracking}
                      onChange={(e) => setFormFedexTracking(e.target.value)}
                      placeholder="FedEx tracking number"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                    />
                  </div>
                  {/* Amazon Tracking */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">AZ Tracking</label>
                    <input
                      type="text"
                      value={formAzTracking}
                      onChange={(e) => setFormAzTracking(e.target.value)}
                      placeholder="Amazon tracking number"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Est Date */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Est. Delivery Date</label>
                    <input
                      type="date"
                      value={formEstDate}
                      onChange={(e) => setFormEstDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500"
                    />
                  </div>
                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Ship-to Address</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {/* Account Used */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Account Used</label>
                  <input
                    type="text"
                    value={formAccountUsed}
                    onChange={(e) => setFormAccountUsed(e.target.value)}
                    placeholder="e.g. Randall"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500"
                  />
                </div>

                {/* Product Image URL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Product Image URL <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg  (direct image link only)"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Notes <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional notes about this item..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400"><span className="text-rose-400">*</span> Required fields</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setModalOpen(false); resetForm(); }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingItem ? "Update Item" : "Save Item"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM CENTERED DELETE CONFIRMATION DIALOG */}
      {deletingItemId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Order Item</h3>
              <p className="text-xs text-slate-555 mb-6 leading-relaxed">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingItemId(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.mutate(deletingItemId);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
