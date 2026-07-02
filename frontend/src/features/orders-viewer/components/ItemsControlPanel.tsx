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

export function ItemsControlPanel() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploading, setUploading] = useState(false);

  // States for Create/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
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
  });

  // Mutate delete
  const deleteMutation = useMutation({
    mutationFn: deleteOrderItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(id) });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  // Mutate status toggle on row
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: number; payload: any }) => {
      return updateOrderItem(itemId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(id) });
    },
  });

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
  };

  const handleOpenCreate = () => {
    resetForm();
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
    setModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) return;

    saveMutation.mutate({
      label: formLabel.trim(),
      quantity: Number(formQuantity),
      unit_price: formUnitPrice ? String(Number(formUnitPrice)) : "0.00",
      fedex_tracking_number: formFedexTracking.trim(),
      tracking_number: formAzTracking.trim(),
      address: formAddress.trim(),
      notes: formNotes.trim(),
      account_used: formAccountUsed.trim(),
      est_date: formEstDate || null,
      image_url: formImageUrl.trim(),
    });
  };

  // PDF Import triggering
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadOrderPdf(id, file);
      // Invalidate queries to get newly parsed items!
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(id) });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      refetch();
    } catch (err) {
      console.error(err);
      alert("Failed to parse invoice. Please make sure it's a valid PDF.");
    } finally {
      setUploading(false);
    }
  };

  // Quick Inline change savers
  const handleInlineChange = (itemId: number, payload: any) => {
    toggleStatusMutation.mutate({ itemId, payload });
  };

  // Filter items
  const filteredItems = items.filter((item) => {
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
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
      {/* Top Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/orders")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Order Items
                </h1>
                {order && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                    Order #{order.order_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">List, create, update or remove items</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* PDF parsing button */}
            <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 px-4 text-xs font-bold text-teal-700 cursor-pointer shadow-xs transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? "Importing..." : "Import Items (PDF)"}</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

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
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Customer:</span>
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
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 w-16 text-center">ID</th>
                <th className="py-3 px-4 w-20 text-center">Actions</th>
                <th className="py-3 px-4 w-32">Item Info</th>
                <th className="py-3 px-4 w-20 text-center">Image</th>
                <th className="py-3 px-4 w-72">Description</th>
                <th className="py-3 px-4 w-24 text-center">Status</th>
                <th className="py-3 px-4 w-60">Status Actions</th>
                <th className="py-3 px-4 w-24">Est. Date</th>
                <th className="py-3 px-4 w-36">FEDEX TR #</th>
                <th className="py-3 px-4 w-36">AZ Tracking #</th>
                <th className="py-3 px-4 w-28">Address</th>
                <th className="py-3 px-4 w-44">Notes</th>
                <th className="py-3 px-4 w-28">Account Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-350" />
                    Loading items list...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-700">No items found</p>
                    <p className="text-xs text-slate-400 mt-1">Add items manually or upload a PDF invoice</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* ID */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">{item.id}</td>

                      {/* Action buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this item?")) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-650 hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Item Info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold leading-tight text-slate-900">
                          {item.quantity} Unit(s)
                        </div>
                        {order && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Order #{order.order_number}
                          </div>
                        )}
                        {order && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {order.customer.name}
                          </div>
                        )}
                      </td>

                      {/* Image */}
                      <td className="py-3 px-4 text-center">
                        <img
                          src={item.image_url || "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=200"}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover bg-slate-50 border border-slate-100 mx-auto"
                        />
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 break-words leading-snug" title={item.label}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                          Price: AWG {item.unit_price} (Total: AWG {item.line_total})
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4 text-center">
                        {item.is_delivered ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700 border border-emerald-100">
                            Delivered
                          </span>
                        ) : item.is_ready_for_pickup ? (
                          <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-orange-700 border border-orange-100">
                            Ready
                          </span>
                        ) : item.is_in_myus ? (
                          <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-violet-700 border border-violet-100">
                            In MyUS
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-500 border border-slate-100">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Status toggle actions */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 w-fit bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                          {/* In MyUS */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 select-none">
                            <input
                              type="checkbox"
                              checked={item.is_in_myus}
                              onChange={(e) => handleInlineChange(item.id, { is_in_myus: e.target.checked })}
                              className="h-3 w-3 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                            />
                            <span>In MyUS</span>
                          </label>
                          {/* Ready for Pickup */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 select-none">
                            <input
                              type="checkbox"
                              checked={item.is_ready_for_pickup}
                              onChange={(e) => handleInlineChange(item.id, { is_ready_for_pickup: e.target.checked })}
                              className="h-3 w-3 rounded text-orange-600 focus:ring-orange-550 border-slate-300"
                            />
                            <span>Ready for Pickup</span>
                          </label>
                          {/* Delivered */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 select-none">
                            <input
                              type="checkbox"
                              checked={item.is_delivered}
                              onChange={(e) => handleInlineChange(item.id, { is_delivered: e.target.checked })}
                              className="h-3 w-3 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                            />
                            <span>Delivered</span>
                          </label>
                        </div>
                      </td>

                      {/* Est Date */}
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={item.est_date || ""}
                          onChange={(e) => handleInlineChange(item.id, { est_date: e.target.value || null })}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[10px] outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* FEDEX TR # */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          defaultValue={item.fedex_tracking_number || ""}
                          onBlur={(e) => handleInlineChange(item.id, { fedex_tracking_number: e.target.value })}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] w-28 outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* AZ Tracking # */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          defaultValue={item.tracking_number || ""}
                          onBlur={(e) => handleInlineChange(item.id, { tracking_number: e.target.value })}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] w-28 outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4">
                        <select
                          value={item.address || "Sarasota"}
                          onChange={(e) => handleInlineChange(item.id, { address: e.target.value })}
                          className="rounded-md border border-slate-200 px-1.5 py-1 text-[10px] outline-none"
                        >
                          <option value="Sarasota">Sarasota</option>
                          <option value="Aruba">Aruba</option>
                          <option value="Miami">Miami</option>
                        </select>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          defaultValue={item.notes || ""}
                          onBlur={(e) => handleInlineChange(item.id, { notes: e.target.value })}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] w-36 outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Account Used */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          defaultValue={item.account_used || ""}
                          onBlur={(e) => handleInlineChange(item.id, { account_used: e.target.value })}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] w-24 outline-none focus:border-violet-500"
                        />
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
              {editingItem ? "Edit Order Item" : "Create New Item"}
            </h2>
            <form onSubmit={handleSaveSubmit} className="space-y-4">
              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Item Description *</label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. MacBook Air M3"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500"
                  />
                </div>
                {/* Unit Price */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Unit Price (AWG) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(e.target.value)}
                    placeholder="e.g. 19.50"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-violet-500"
                  />
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
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
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
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Est Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Est. Date</label>
                  <input
                    type="date"
                    value={formEstDate}
                    onChange={(e) => setFormEstDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                  />
                </div>
                {/* Address */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Address Location</label>
                  <select
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white outline-none"
                  >
                    <option value="Sarasota">Sarasota</option>
                    <option value="Aruba">Aruba</option>
                    <option value="Miami">Miami</option>
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Product Image URL</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="Optional image url link"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              {/* Account Used */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Account Used</label>
                <input
                  type="text"
                  value={formAccountUsed}
                  onChange={(e) => setFormAccountUsed(e.target.value)}
                  placeholder="e.g. Randall"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-750 transition-colors cursor-pointer"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
