import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerSearch } from "@/features/customers/components/CustomerSearch";
import { createCustomer } from "@/features/customers/api/customersApi";
import type { Customer } from "@/features/customers/types";
import { createOrder, getInvoice, uploadOrderPdf } from "../api/orderApi";
import { useOrderWizard } from "../hooks/useOrderWizard";
import { useWizardPersistence } from "../hooks/useWizardPersistence";
import { orderSchema } from "../schema/orderSchema";
import type { InvoiceData, OrderFormData, OrderResponse } from "../types";
import { toApiDate } from "../utils/calculations";
import { InvoicePreview } from "./InvoicePreview";
import { NotesSection } from "./NotesSection";
import { OrderPreview } from "./OrderPreview";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { PaymentTypeSelector } from "./PaymentTypeSelector";
import { SuccessDialog } from "./SuccessDialog";
import { WebsiteSelector } from "./WebsiteSelector";
import { WizardSidebar } from "./WizardSidebar";

const defaultValues: OrderFormData = {
  customer: null,
  new_customer_name: "",
  new_customer_phone: "",
  new_customer_email: "",
  new_customer_phone_code: "+297",
  website_type: "",
  website: "",
  order_date: "",
  number_of_items: "",
  amount_usd: "",
  payment_type: "",
  payment_amount: "",
  items_total: "",
  paid_amount: "",
  payment_method: "",
  is_new_client: false,
  is_urgent: false,
  internal_notes: "",
  client_notes: "",
};

export function OrderWizard() {
  const form = useForm<OrderFormData>({
    defaultValues,
    mode: "onChange",
  });

  const { step, goNext, goPrev, goToStep, resetWizard, validateStep } = useOrderWizard(form);
  const { save, clear } = useWizardPersistence(form, form.formState.isDirty);

  const [successOpen, setSuccessOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);

  const customer = form.watch("customer");

  useEffect(() => {
    const sub = form.watch((data) => {
      save(data as OrderFormData);
    });
    return () => sub.unsubscribe();
  }, [form, save]);

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async (order) => {
      // If there is a PDF file, upload it!
      if (selectedPdf) {
        try {
          await uploadOrderPdf(order.id, selectedPdf);
        } catch (err) {
          console.error("Failed to upload PDF", err);
        }
      }
      const invoice = await getInvoice(order.invoice.id);
      setInvoiceData(invoice);
      setCreatedOrder(order);
      clear();
      resetWizard();
      form.reset(defaultValues);
      setSelectedPdf(null);
      setSuccessOpen(true);
    },
  });

  const handleSelectCustomer = (c: Customer) => {
    form.setValue("customer", c, { shouldValidate: true, shouldDirty: true });
    form.setValue("new_customer_name", "");
    form.setValue("new_customer_phone", "");
    form.setValue("new_customer_email", "");
  };

  const handleSubmit = async () => {
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) return;
    }
    const parsed = orderSchema.safeParse(form.getValues());
    if (!parsed.success) return;

    const v = parsed.data;
    if (!v.customer) return;

    mutation.mutate({
      customer_id: v.customer.id,
      website_type: v.website_type,
      website: v.website,
      order_date: toApiDate(v.order_date),
      number_of_items: Number(v.number_of_items),
      amount_usd: Number(v.amount_usd),
      payment_type: v.payment_type,
      payment_amount: Number(v.payment_amount),
      items_total: Number(v.items_total),
      paid_amount: Number(v.paid_amount),
      payment_method: v.payment_method,
      is_new_client: v.is_new_client,
      is_urgent: v.is_urgent,
      internal_notes: v.internal_notes,
      client_notes: v.client_notes,
    });
  };

  const handleNext = async () => {
    if (step === 1) {
      const selectedCustomer = form.getValues("customer");
      if (!selectedCustomer) {
        const newName = form.getValues("new_customer_name")?.trim();
        const newPhone = form.getValues("new_customer_phone")?.trim();
        const newEmail = form.getValues("new_customer_email")?.trim();
        const phoneCode = form.getValues("new_customer_phone_code") || "+297";

        let hasError = false;
        form.clearErrors();

        // 1. Validate Full Name
        if (!newName) {
          form.setError("new_customer_name", { message: "Full Name is required." });
          hasError = true;
        } else if (!/^[a-zA-Z\s'-]+$/.test(newName)) {
          form.setError("new_customer_name", { message: "Only letters, spaces, hyphens, and apostrophes are allowed." });
          hasError = true;
        }

        // 2. Validate Email Address
        if (!newEmail) {
          form.setError("new_customer_email", { message: "Email is required." });
          hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          form.setError("new_customer_email", { message: "Invalid email format (e.g. name@domain.com)." });
          hasError = true;
        }

        // 3. Validate Phone Number
        if (!newPhone) {
          form.setError("new_customer_phone", { message: "Phone number is required." });
          hasError = true;
        } else if (!/^[0-9\s-]+$/.test(newPhone)) {
          form.setError("new_customer_phone", { message: "Only digits, spaces, and hyphens are allowed." });
          hasError = true;
        } else if (newPhone.replace(/[\s-]/g, "").length < 5) {
          form.setError("new_customer_phone", { message: "Phone number must be at least 5 digits." });
          hasError = true;
        }

        if (hasError) {
          return;
        }

        setIsCreatingCustomer(true);
        try {
          const created = await createCustomer({
            name: newName || "",
            phone: `${phoneCode} ${newPhone || ""}`,
            email: newEmail || undefined,
          });
          form.setValue("customer", created, { shouldValidate: true });
          // Clear inline fields
          form.setValue("new_customer_name", "");
          form.setValue("new_customer_phone", "");
          form.setValue("new_customer_email", "");
        } catch (err) {
          form.setError("customer", { message: "Failed to create new customer inline." });
          setIsCreatingCustomer(false);
          return;
        } finally {
          setIsCreatingCustomer(false);
        }
      }
    }
    goNext();
  };

  const handleCreateAnother = () => {
    setSuccessOpen(false);
    setInvoiceData(null);
    setCreatedOrder(null);
    setShowPrint(false);
  };

  const handleSuccessOpenChange = (open: boolean) => {
    setSuccessOpen(open);
    if (!open) {
      setInvoiceData(null);
      setCreatedOrder(null);
      setShowPrint(false);
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
      {/* Header section (above Card) */}
      <div className="mx-auto w-full max-w-[1400px] px-5 lg:px-6 py-2 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
          Place New Order
        </h1>

        {/* Selected Customer Banner (For Step > 1) */}
        {step > 1 && customer && (
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1 shadow-xs">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow-xs">
              {customer.name.trim().split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-800 leading-tight">{customer.name}</p>
              <p className="text-[9px] text-slate-500 font-bold leading-none mt-0.5">{customer.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="ml-1.5 inline-flex h-6 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <Pencil className="h-3 w-3" />
              Change Customer
            </button>
          </div>
        )}
      </div>

      {/* Main card wrapper */}
      <div className="mx-auto w-full max-w-[1400px] px-5 lg:px-6 pb-4 flex-1 flex flex-col min-h-0">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-xs">
          <CardContent className="min-h-0 flex-1 overflow-hidden p-4 lg:p-5">
            <div className="flex h-full min-h-0 gap-4">
              <WizardSidebar currentStep={step} onStepClick={goToStep} />

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                    >
                      {step === 1 && (
                        <CustomerSearch
                          form={form}
                          selected={customer}
                          onSelect={handleSelectCustomer}
                        />
                      )}
                      {step === 2 && (
                        <WebsiteSelector
                          form={form}
                          pdfFile={selectedPdf}
                          onPdfFileChange={setSelectedPdf}
                        />
                      )}
                      {step === 3 && <PaymentTypeSelector form={form} />}
                      {step === 4 && <PaymentMethodSelector form={form} />}
                      {step === 5 && <NotesSection form={form} />}
                      {step === 6 && <OrderPreview form={form} />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-3 flex shrink-0 justify-between border-t border-slate-100 pt-3 bg-white">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goPrev}
                    disabled={step === 1}
                    className="h-9 px-4 text-xs font-semibold text-slate-650 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  {step < 6 ? (
                    <Button
                      type="button"
                      onClick={() => void handleNext()}
                      disabled={isCreatingCustomer}
                      className="h-9 bg-violet-600 hover:bg-violet-750 px-5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
                    >
                      {isCreatingCustomer ? "Creating Customer..." : "Next"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => void handleSubmit()}
                      disabled={mutation.isPending}
                      className="h-9 px-5 text-xs font-semibold cursor-pointer"
                    >
                      {mutation.isPending ? "Submitting..." : "Submit"}
                    </Button>
                  )}
                </div>

                {mutation.isError && (
                  <p className="mt-4 text-sm text-red-500 font-medium">
                    Failed to create order. Please try again.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SuccessDialog
        open={successOpen}
        onOpenChange={handleSuccessOpenChange}
        createdOrder={createdOrder}
        onPrintInvoice={handlePrint}
        onCreateAnother={handleCreateAnother}
      />

      {showPrint && invoiceData && (
        <div className="fixed inset-0 z-50 overflow-auto bg-white p-8 print:static">
          <InvoicePreview invoice={invoiceData} />
        </div>
      )}
    </div>
  );
}
