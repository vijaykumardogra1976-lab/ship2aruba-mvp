import { useQuery } from "@tanstack/react-query";
import {
  Building,
  ChevronDown,
  Mail,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/config/queryKeys";
import { searchCustomers, listCustomers, createCustomer } from "../api/customersApi";
import type { Customer } from "../types";
import type { OrderFormData } from "@/features/order-wizard/types";
import { cn } from "@/lib/utils";

interface CustomerSearchProps {
  form: UseFormReturn<OrderFormData>;
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

const COUNTRY_CODES = [
  { code: "+297", flag: "🇦🇼", label: "AW (+297)" },
  { code: "+31", flag: "🇳🇱", label: "NL (+31)" },
];

const getAvatarStyle = (id: number) => {
  const styles = [
    { bg: "bg-blue-100 text-blue-600" },
    { bg: "bg-emerald-100 text-emerald-600" },
    { bg: "bg-violet-100 text-violet-600" },
    { bg: "bg-orange-100 text-orange-600" },
  ];
  return styles[id % styles.length];
};

export function CustomerSearch({ form, selected, onSelect }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);

  const selectedPhoneCode = form.watch("new_customer_phone_code") || "+297";
  const selectedCodeItem = COUNTRY_CODES.find(item => item.code === selectedPhoneCode) || COUNTRY_CODES[0];

  // Search query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: queryKeys.customers.search(search),
    queryFn: () => searchCustomers(search),
    enabled: search.length >= 2,
  });

  // Recent/All customers query
  const { data: allCustomers = [], isLoading: isListLoading } = useQuery({
    queryKey: queryKeys.customers.list,
    queryFn: listCustomers,
  });

  // Display list: either search results if active, or all customers
  const activeList = search.length >= 2 ? searchResults : allCustomers;

  const handleSelectCard = (customer: Customer) => {
    onSelect(customer);
    setShowCreateForm(false); // Close create form when customer is selected
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only letters, spaces, hyphens, and apostrophes
    let val = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
    // Replace multiple spaces with a single space
    val = val.replace(/\s{2,}/g, " ");
    e.target.value = val;
    form.setValue("new_customer_name", val, { shouldValidate: true });

    if (!val.trim()) {
      form.setError("new_customer_name", { message: "Full Name is required." });
    } else if (!/^[a-zA-Z'-]+(\s[a-zA-Z'-]+)*$/.test(val.trim())) {
      form.setError("new_customer_name", { message: "Only letters, single spaces, hyphens, and apostrophes are allowed." });
    } else {
      form.clearErrors("new_customer_name");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip any characters that are not letters, digits, dot, or @
    const val = e.target.value.replace(/[^a-zA-Z0-9.@]/g, "");
    e.target.value = val;
    form.setValue("new_customer_email", val, { shouldValidate: true });

    if (!val) {
      form.setError("new_customer_email", { message: "Email is required." });
    } else if (!/^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/.test(val)) {
      form.setError("new_customer_email", { message: "Invalid email format (no special signs like +, - allowed)." });
    } else {
      form.clearErrors("new_customer_email");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits
    const val = e.target.value.replace(/[^0-9]/g, "");
    e.target.value = val;
    form.setValue("new_customer_phone", val, { shouldValidate: true });

    const phoneCode = form.getValues("new_customer_phone_code") || "+297";
    const isAruba = phoneCode === "+297";
    const isValidLength = isAruba ? val.length === 7 : (val.length === 9 || val.length === 10);

    if (!val) {
      form.setError("new_customer_phone", { message: "Phone number is required." });
    } else if (!isValidLength) {
      const msg = isAruba 
        ? "Aruba phone number must be exactly 7 digits." 
        : "Netherlands phone number must be 9 or 10 digits.";
      form.setError("new_customer_phone", { message: msg });
    } else {
      form.clearErrors("new_customer_phone");
    }
  };

  const handleSaveCustomer = async () => {
    const newName = form.getValues("new_customer_name")?.trim();
    const newPhone = form.getValues("new_customer_phone")?.trim();
    const newEmail = form.getValues("new_customer_email")?.trim();
    const phoneCode = form.getValues("new_customer_phone_code") || "+297";

    let hasError = false;
    form.clearErrors();

    if (!newName) {
      form.setError("new_customer_name", { message: "Full Name is required." });
      hasError = true;
    } else if (!/^[a-zA-Z'-]+(\s[a-zA-Z'-]+)*$/.test(newName)) {
      form.setError("new_customer_name", { message: "Only letters, single spaces, hyphens, and apostrophes are allowed." });
      hasError = true;
    }

    if (!newEmail) {
      form.setError("new_customer_email", { message: "Email is required." });
      hasError = true;
    } else if (!/^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/.test(newEmail)) {
      form.setError("new_customer_email", { message: "Invalid email format (no special signs like +, - allowed)." });
      hasError = true;
    }

    const isAruba = phoneCode === "+297";
    const isValidLength = isAruba ? (newPhone?.length === 7) : (newPhone?.length === 9 || newPhone?.length === 10);

    if (!newPhone) {
      form.setError("new_customer_phone", { message: "Phone number is required." });
      hasError = true;
    } else if (!isValidLength) {
      const msg = isAruba 
        ? "Aruba phone number must be exactly 7 digits." 
        : "Netherlands phone number must be 9 or 10 digits.";
      form.setError("new_customer_phone", { message: msg });
      hasError = true;
    }

    if (hasError) return;

    setIsSaving(true);
    try {
      const created = await createCustomer({
        name: newName || "",
        phone: `${phoneCode} ${newPhone || ""}`,
        email: newEmail || undefined,
      });
      onSelect(created);
      form.setValue("is_new_client", true, { shouldDirty: true });
      
      // Clear fields
      form.setValue("new_customer_name", "");
      form.setValue("new_customer_phone", "");
      form.setValue("new_customer_email", "");
      
      setShowCreateForm(false);
    } catch (err) {
      form.setError("customer", { message: "Failed to save new customer." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className={cn("grid gap-6", showCreateForm ? "grid-cols-1 md:grid-cols-12" : "grid-cols-1")}>
        
        {/* Left Column: Customer Selection */}
        <div className={cn(showCreateForm ? "md:col-span-7 space-y-4" : "w-full space-y-4")}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">Select a Customer</h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                Search for an existing customer or create a new one.
              </p>
            </div>
            {!showCreateForm && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  onSelect(null); // Clear selected customer selection
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-bold text-violet-650 hover:bg-violet-50 transition cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                New Customer
              </button>
            )}
          </div>

          {form.formState.errors.customer && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-bold text-red-700">
              {form.formState.errors.customer.message}
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex gap-2">
            <div className="relative min-w-0 flex-1">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <Input
                placeholder="Search by customer name, email or phone number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-full rounded-lg border-slate-200 bg-white pl-8.5 pr-4 text-xs focus-visible:border-violet-500 focus-visible:ring-violet-100 focus-visible:outline-hidden text-slate-900 font-semibold"
              />
            </div>
          </div>

          {/* Selected Customer Banner */}
          {selected && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-650">
                  {selected.name.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Selected Customer: {selected.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{selected.phone} · {selected.email || "No email"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Recent/Search Results List - VERTICAL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {search.length >= 2 ? "Search Results" : "Recent Customers"}
              </p>
            </div>

            {isSearching || isListLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl border border-slate-100 bg-slate-50/50" />
                ))}
              </div>
            ) : activeList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-[11px] text-slate-500 font-bold">
                No customers found. Click "New Customer" to create one.
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {activeList.slice(0, 8).map((customer) => {
                  const isSelected = selected?.id === customer.id;
                  const avatar = getAvatarStyle(customer.id);
                  const initials = customer.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCard(customer)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl border p-2.5 text-left transition hover:shadow-xs cursor-pointer",
                        isSelected
                          ? "border-violet-500 bg-violet-50/30 ring-1 ring-violet-200"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatar.bg)}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-slate-900 leading-tight">{customer.name}</p>
                          <p className="truncate text-[10px] text-slate-500 font-medium mt-0.5">
                            {customer.phone} {customer.email ? `· ${customer.email}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-650 border border-blue-100 rounded-lg px-2 py-0.5 bg-blue-50/30">
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Create New Customer Form */}
        {showCreateForm && (
          <div className="md:col-span-5 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3.5 relative">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                Create New Customer
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                }}
                className="inline-flex h-6 items-center justify-center rounded-md border border-slate-250 bg-white px-2.5 text-[10px] font-bold text-slate-650 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              {/* Full Name */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-750" htmlFor="new_customer_name">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="new_customer_name"
                    placeholder="Enter full name"
                    {...form.register("new_customer_name", { onChange: handleNameChange })}
                    className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100 font-semibold"
                  />
                </div>
                {form.formState.errors.new_customer_name && (
                  <p className="text-[10px] text-red-500 font-bold mt-0.5">
                    {form.formState.errors.new_customer_name.message}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-750" htmlFor="new_customer_email">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="new_customer_email"
                    type="email"
                    placeholder="Enter email address"
                    {...form.register("new_customer_email", { onChange: handleEmailChange })}
                    className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100 font-semibold"
                  />
                </div>
                {form.formState.errors.new_customer_email && (
                  <p className="text-[10px] text-red-500 font-bold mt-0.5">
                    {form.formState.errors.new_customer_email.message}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-750" htmlFor="new_customer_phone">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCodeOpen(!isCodeOpen)}
                      className={cn(
                        "flex h-8.5 items-center justify-between gap-1 rounded-lg border bg-white px-2.5 text-xs text-slate-900 font-bold cursor-pointer hover:bg-slate-50 w-[85px] transition-all",
                        isCodeOpen ? "border-violet-500 ring-1 ring-violet-200" : "border-slate-200"
                      )}
                    >
                      <span>{selectedCodeItem.flag} {selectedCodeItem.code}</span>
                      <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                    </button>

                    {isCodeOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsCodeOpen(false)} 
                        />
                        <div className="absolute left-0 right-0 mt-1 z-50 rounded-lg border border-slate-200 bg-white py-0.5 shadow-md overflow-hidden">
                          {COUNTRY_CODES.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                form.setValue("new_customer_phone_code", item.code, { shouldValidate: true });
                                setIsCodeOpen(false);

                                // Trigger validation
                                const phone = form.getValues("new_customer_phone") || "";
                                if (phone) {
                                  const isAruba = item.code === "+297";
                                  const isValidLength = isAruba ? phone.length === 7 : (phone.length === 9 || phone.length === 10);
                                  if (!isValidLength) {
                                    const msg = isAruba 
                                      ? "Aruba phone number must be exactly 7 digits." 
                                      : "Netherlands phone number must be 9 or 10 digits.";
                                    form.setError("new_customer_phone", { message: msg });
                                  } else {
                                    form.clearErrors("new_customer_phone");
                                  }
                                }
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-bold hover:bg-slate-50 cursor-pointer",
                                item.code === selectedPhoneCode ? "text-violet-650 bg-violet-50/40" : "text-slate-800"
                              )}
                            >
                              <span>{item.flag} {item.code}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <input
                      id="new_customer_phone"
                      placeholder="Enter phone number"
                      {...form.register("new_customer_phone", { onChange: handlePhoneChange })}
                      className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100 font-semibold"
                    />
                  </div>
                </div>
                {form.formState.errors.new_customer_phone && (
                  <p className="text-[10px] text-red-500 font-bold mt-0.5">
                    {form.formState.errors.new_customer_phone.message}
                  </p>
                )}
              </div>

              {/* Company (Mock) */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-750" htmlFor="mock_company">
                  Company (Optional)
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="mock_company"
                    placeholder="Enter company name"
                    className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden font-semibold"
                  />
                </div>
              </div>

              {/* Address (Mock) */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-750" htmlFor="mock_address">
                  Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="mock_address"
                    placeholder="Enter address"
                    className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden font-semibold"
                  />
                </div>
              </div>

              {/* City (Mock) */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-750" htmlFor="mock_city">
                  City (Optional)
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="mock_city"
                    placeholder="Enter city"
                    className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden font-semibold"
                  />
                </div>
              </div>

              {/* Checkbox Save */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="save_as_new_customer"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded-xs border-slate-350 text-violet-650 focus:ring-violet-500"
                />
                <label htmlFor="save_as_new_customer" className="text-[11px] font-bold text-slate-750 cursor-pointer">
                  Save as new customer for future use
                </label>
              </div>

              {/* Save Button for creating customer */}
              <button
                type="button"
                onClick={handleSaveCustomer}
                disabled={isSaving}
                className="w-full h-8.5 mt-2 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        )}
      </div>

      {form.formState.errors.customer && (
        <p className="text-[11px] text-red-500 font-bold pt-0.5">
          {form.formState.errors.customer.message}
        </p>
      )}
    </div>
  );
}
