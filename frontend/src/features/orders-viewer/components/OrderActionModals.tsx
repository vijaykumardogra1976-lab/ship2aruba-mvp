import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { CheckCircle2, Loader2, FileText, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/config/queryKeys";
import { formatCurrency, cn } from "@/lib/utils";
import {
  addOrderPayment,
  deleteOrder,
  deleteOrderPdf,
  editOrder,
  getOrderPayments,
  uploadOrderPdf,
} from "../api/ordersViewerApi";
import type { OrderListItem } from "../types";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "pin", label: "PIN" },
] as const;

const editOrderSchema = z.object({
  items_total: z.string().min(1, "Items total is required"),
  amount_usd: z.string().min(1, "Amazon cost is required"),
  order_date: z.string().min(1, "Order date is required"),
  authorization_password: z.string().min(1, "Authorization password is required"),
});

const addPaymentSchema = z.object({
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.string().min(1, "Amount is required"),
  payment_method: z.enum(["cash", "transfer", "pin"]),
});

type EditOrderFormValues = z.infer<typeof editOrderSchema>;
type AddPaymentFormValues = z.infer<typeof addPaymentSchema>;

export type OrderActionType = "edit" | "delete" | "upload" | "payment" | null;

interface OrderActionModalsProps {
  order: OrderListItem | null;
  action: OrderActionType;
  onClose: () => void;
}

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalDisplayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export function OrderActionModals({
  order,
  action,
  onClose,
}: OrderActionModalsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);

  const editForm = useForm<EditOrderFormValues>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      items_total: "",
      amount_usd: "",
      order_date: "",
      authorization_password: "",
    },
  });

  const paymentForm = useForm<AddPaymentFormValues>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: {
      payment_date: getLocalDateString(),
      amount: "",
      payment_method: "cash",
    },
  });

  const { data: paymentInfo } = useQuery({
    queryKey: order ? queryKeys.orders.payments(order.id) : ["orders", "payments", "none"],
    queryFn: () => getOrderPayments(order!.id),
    enabled: action === "payment" && !!order,
  });

  useEffect(() => {
    if (action === "edit" && order) {
      editForm.reset({
        items_total: order.items_total,
        amount_usd: order.amount_usd,
        order_date: order.order_date,
        authorization_password: "",
      });
    }
    if (action === "payment" && order) {
      paymentForm.reset({
        payment_date: getLocalDateString(),
        amount: Math.round(parseFloat(order.remaining_balance)).toString(),
        payment_method: "cash",
      });
    }
    if (action === "upload") {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [action, order, editForm, paymentForm]);

  const invalidateOrders = () => {
    // Use broad ["orders"] prefix to invalidate all order query variants (including those with filter params)
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const editMutation = useMutation({
    mutationFn: (values: EditOrderFormValues) =>
      editOrder(order!.id, values),
    onSuccess: () => {
      invalidateOrders();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder(order!.id),
    onSuccess: () => {
      invalidateOrders();
      onClose();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadOrderPdf(order!.id, file),
    onSuccess: () => {
      invalidateOrders();
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(order!.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order!.id) });
      onClose();
    },
  });

  const deletePdfMutation = useMutation({
    mutationFn: () => deleteOrderPdf(order!.id),
    onSuccess: () => {
      invalidateOrders();
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.items(order!.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order!.id) });
      onClose();
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: (values: AddPaymentFormValues) =>
      addOrderPayment(order!.id, values),
    onSuccess: () => {
      invalidateOrders();
      // Invalidate payments so the balance updates immediately
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.payments(order!.id) });
      onClose();
      setPaymentSuccessOpen(true);
    },
  });

  const handleEditSubmit = editForm.handleSubmit((values) => {
    editMutation.mutate(values);
  });

  const handlePaymentSubmit = paymentForm.handleSubmit((values) => {
    addPaymentMutation.mutate(values);
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  return (
    <>
      <Dialog open={action === "edit" && !!order} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Record Details</DialogTitle>
            <DialogDescription>
              Order #{order?.order_number.split("-").pop()}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="items_total">Items Total (AWG)</Label>
              <Input id="items_total" {...editForm.register("items_total")} />
              {editForm.formState.errors.items_total && (
                <p className="text-sm text-red-500">
                  {editForm.formState.errors.items_total.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_usd">Amazon Cost ($)</Label>
              <Input id="amount_usd" {...editForm.register("amount_usd")} />
              {editForm.formState.errors.amount_usd && (
                <p className="text-sm text-red-500">
                  {editForm.formState.errors.amount_usd.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_date">Order Placed On</Label>
              <Input id="order_date" type="date" {...editForm.register("order_date")} />
              {editForm.formState.errors.order_date && (
                <p className="text-sm text-red-500">
                  {editForm.formState.errors.order_date.message}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              To perform this action, you should first enter the authorization
              password.
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorization_password">Authorization Password</Label>
              <Input
                id="authorization_password"
                type="password"
                {...editForm.register("authorization_password")}
              />
              {editForm.formState.errors.authorization_password && (
                <p className="text-sm text-red-500">
                  {editForm.formState.errors.authorization_password.message}
                </p>
              )}
            </div>

            {editMutation.isError && (
              <p className="text-sm text-red-500">
                {getApiErrorMessage(editMutation.error, "Failed to update record.")}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Updating..." : "Update Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={action === "delete" && !!order} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order #
              {order?.order_number.split("-").pop()}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-red-500">
              {getApiErrorMessage(deleteMutation.error, "Failed to delete order.")}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === "upload" && !!order} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload PDF</DialogTitle>
            <DialogDescription>
              Upload a PDF document for order #{order?.order_number.split("-").pop()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {order?.has_pdf && order.pdf_url && (
              <div className="rounded-lg border border-violet-100 bg-violet-50/20 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <FileText className="h-4 w-4 text-violet-650 shrink-0" />
                  <a
                    href={order.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-violet-700 hover:underline truncate"
                    title="Click to view uploaded PDF"
                  >
                    {order.pdf_url.split("/").pop() || "view_invoice.pdf"}
                  </a>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-7 px-2.5 text-[9px] font-black uppercase tracking-wider shrink-0 cursor-pointer"
                  disabled={deletePdfMutation.isPending}
                  onClick={() => deletePdfMutation.mutate()}
                >
                  {deletePdfMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "rounded-lg border border-dashed p-6 text-center transition-all duration-200 cursor-pointer",
                selectedFile
                  ? "border-emerald-500 bg-emerald-50/10 hover:bg-emerald-50/20"
                  : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100/70"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              {selectedFile ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-emerald-700 truncate max-w-[280px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold leading-none">
                    Ready to upload ({(selectedFile.size / 1024).toFixed(1)} KB) — Click to change
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-zinc-600">
                    {order?.has_pdf ? "Choose a new PDF file to replace current one" : "Choose a PDF file to upload"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Choose File
                  </Button>
                </>
              )}
            </div>
            {uploadMutation.isError && (
              <p className="text-sm text-red-500">
                {getApiErrorMessage(uploadMutation.error, "Failed to upload PDF.")}
              </p>
            )}
            {deletePdfMutation.isError && (
              <p className="text-sm text-red-500">
                {getApiErrorMessage(deletePdfMutation.error, "Failed to delete PDF.")}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                disabled={!selectedFile || uploadMutation.isPending}
                onClick={handleUpload}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={action === "payment" && !!order} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-medium text-slate-900 uppercase tracking-wider">Order ID</p>
                <p className="font-mono font-medium text-slate-900 mt-0.5">#{order?.order_number}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-900">{order?.customer.name}</p>
                {order?.customer.email && (
                  <p className="text-[10px] text-slate-900 font-medium mt-0.5">{order.customer.email}</p>
                )}
                <p className="text-[10px] text-slate-900 font-medium mt-0.5">{order?.customer.phone}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date_display" className="text-[10px] font-medium text-slate-900 uppercase tracking-wider">Payment Date</Label>
              <Input
                id="payment_date_display"
                type="text"
                value={getLocalDisplayDateString()}
                readOnly
                className="h-9 text-xs border-slate-200 bg-slate-50 text-slate-900 cursor-not-allowed font-medium"
              />
              <input
                type="hidden"
                value={getLocalDateString()}
                {...paymentForm.register("payment_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-[10px] font-medium text-slate-900 uppercase tracking-wider">Amount (AWG)</Label>
              <Input
                id="amount"
                value={Math.round(parseFloat(order?.remaining_balance ?? "0"))}
                readOnly
                className="h-9 text-xs border-slate-200 bg-slate-50 text-slate-900 cursor-not-allowed font-medium"
              />
              <input
                type="hidden"
                value={Math.round(parseFloat(order?.remaining_balance ?? "0"))}
                {...paymentForm.register("amount")}
              />
              {paymentForm.formState.errors.amount && (
                <p className="text-sm text-red-500">
                  {paymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="payment_method" className="text-[10px] font-medium text-slate-900 uppercase tracking-wider">Payment Method</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPaymentMethodOpen(!paymentMethodOpen)}
                  className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white py-1 pl-3 pr-3.5 text-xs font-bold text-slate-700 transition hover:border-slate-350 focus:border-violet-500 focus:outline-hidden cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                >
                  {PAYMENT_METHODS.find(m => m.value === paymentForm.watch("payment_method"))?.label || "Select Method"}
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", paymentMethodOpen && "rotate-180")} />
                </button>
                
                {paymentMethodOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setPaymentMethodOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg shadow-slate-200/50 z-50 flex flex-col gap-0.5">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => {
                            paymentForm.setValue("payment_method", m.value as "cash" | "transfer" | "pin");
                            setPaymentMethodOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center px-3 py-2.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-left",
                            paymentForm.watch("payment_method") === m.value 
                              ? "bg-violet-50 text-violet-700" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <input type="hidden" {...paymentForm.register("payment_method")} />
              </div>
            </div>

            {/* Payments History List */}
            {paymentInfo?.payments && paymentInfo.payments.length > 0 && (
              <div className="pt-3.5 border-t border-zinc-100 space-y-2.5 max-h-40 overflow-y-auto pr-1">
                <p className="text-[10px] font-medium text-slate-900 uppercase tracking-wider">Payment History</p>
                <div className="space-y-1.5">
                  {paymentInfo.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-xs p-2 rounded-xl bg-zinc-50/50 border border-zinc-100">
                      <div>
                        <p className="font-bold text-slate-900 uppercase text-[9px]">{p.payment_method_display || p.payment_method}</p>
                        <p className="text-[9px] text-slate-900 font-medium">
                          {new Date(p.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <span className="font-extrabold text-emerald-600">
                        +{Math.round(parseFloat(p.amount))} AWG
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {addPaymentMutation.isError && (
              <p className="text-sm text-red-500">
                {getApiErrorMessage(addPaymentMutation.error, "Failed to save payment.")}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={addPaymentMutation.isPending}>
                {addPaymentMutation.isPending ? "Saving..." : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentSuccessOpen} onOpenChange={setPaymentSuccessOpen}>
        <DialogContent className="text-center sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">Payment added successfully!</DialogTitle>
            <DialogDescription className="text-base text-zinc-600">
              Payment has been recorded.
            </DialogDescription>
            <Button className="w-full" onClick={() => setPaymentSuccessOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
