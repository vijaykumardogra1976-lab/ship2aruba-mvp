import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import {
  addOrderPayment,
  deleteOrder,
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
      payment_date: new Date().toISOString().slice(0, 10),
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
        payment_date: new Date().toISOString().slice(0, 10),
        amount: "",
        payment_method: "cash",
      });
    }
    if (action === "upload") {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [action, order, editForm, paymentForm]);

  const invalidateOrders = () => {
    void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
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
      onClose();
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: (values: AddPaymentFormValues) =>
      addOrderPayment(order!.id, values),
    onSuccess: () => {
      invalidateOrders();
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
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <p className="mb-3 text-sm text-zinc-600">
                {selectedFile ? selectedFile.name : "Choose a PDF file to upload"}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
            </div>
            {uploadMutation.isError && (
              <p className="text-sm text-red-500">
                {getApiErrorMessage(uploadMutation.error, "Failed to upload PDF.")}
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
            <DialogDescription>
              {paymentInfo
                ? `${paymentInfo.customer_name} — Balance: ${formatCurrency(paymentInfo.current_balance)}`
                : order?.customer.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-900">{order?.customer.name}</p>
              <p className="text-zinc-600">
                Current Balance:{" "}
                <span className="font-semibold text-red-600">
                  {formatCurrency(order?.remaining_balance ?? "0")}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                {...paymentForm.register("payment_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (AWG)</Label>
              <Input id="amount" {...paymentForm.register("amount")} />
              {paymentForm.formState.errors.amount && (
                <p className="text-sm text-red-500">
                  {paymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                {...paymentForm.register("payment_method")}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

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
