import { useQuery } from "@tanstack/react-query";
import {
  Building,
  ChevronRight,
  Mail,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/config/queryKeys";
import { searchCustomers, listCustomers } from "../api/customersApi";
import type { Customer } from "../types";
import type { OrderFormData } from "@/features/order-wizard/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CustomerSearchProps {
  form: UseFormReturn<OrderFormData>;
  selected: Customer | null;
  onSelect: (customer: Customer) => void;
}

const COUNTRY_CODES = [
  { code: "+297", flag: "🇦🇼", label: "AW (+297)" },
  { code: "+91", flag: "🇮🇳", label: "IN (+91)" },
  { code: "+1", flag: "🇺🇸", label: "US (+1)" },
  { code: "+31", flag: "🇳🇱", label: "NL (+31)" },
  { code: "+57", flag: "🇨🇴", label: "CO (+57)" },
  { code: "+58", flag: "🇻🇪", label: "VE (+58)" },
  { code: "+44", flag: "🇬🇧", label: "GB (+44)" },
  { code: "+55", flag: "🇧🇷", label: "BR (+55)" },
  { code: "+86", flag: "🇨🇳", label: "CN (+86)" },
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
  const [recentOffset, setRecentOffset] = useState(0);
  const [isAllOpen, setIsAllOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

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

  // Display horizontal cards: either search results if active, or recent customers from allCustomers
  const activeList = search.length >= 2 ? searchResults : allCustomers;
  const recentCustomers = activeList.slice(recentOffset, recentOffset + 4);

  const handleNextRecent = () => {
    if (recentOffset + 4 < activeList.length) {
      setRecentOffset((o) => o + 4);
    } else {
      setRecentOffset(0);
    }
  };

  const handleSelectCard = (customer: Customer) => {
    onSelect(customer);
    setIsAllOpen(false);
  };

  // Filter customers for modal search
  const filteredModalCustomers = allCustomers.filter((c) => {
    const query = modalSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      c.phone.includes(query)
    );
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
    e.target.value = val;
    form.setValue("new_customer_name", val, { shouldValidate: true });

    if (!val) {
      form.setError("new_customer_name", { message: "Full Name is required." });
    } else {
      form.clearErrors("new_customer_name");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\s/g, "");
    e.target.value = val;
    form.setValue("new_customer_email", val, { shouldValidate: true });

    if (!val) {
      form.setError("new_customer_email", { message: "Email is required." });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      form.setError("new_customer_email", { message: "Invalid email format (e.g. name@domain.com)." });
    } else {
      form.clearErrors("new_customer_email");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9\s-]/g, "");
    e.target.value = val;
    form.setValue("new_customer_phone", val, { shouldValidate: true });

    if (!val) {
      form.setError("new_customer_phone", { message: "Phone number is required." });
    } else if (val.replace(/[\s-]/g, "").length < 5) {
      form.setError("new_customer_phone", { message: "Phone number must be at least 5 digits." });
    } else {
      form.clearErrors("new_customer_phone");
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-none">Select a Customer</h2>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
            Search for an existing customer or create a new one.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            document.getElementById("create-customer-section")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-bold text-violet-650 hover:bg-violet-50 transition cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          New Customer
        </button>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setRecentOffset(0);
            }}
            className="h-8.5 w-full rounded-lg border-slate-200 bg-white pl-8.5 pr-4 text-xs focus-visible:border-violet-500 focus-visible:ring-violet-100 focus-visible:outline-hidden text-slate-900 font-semibold"
          />
        </div>
        <button
          type="button"
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer"
          title="Advanced Filter"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
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
            onClick={() => form.setValue("customer", null, { shouldValidate: true })}
            className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Recent Customers Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {search.length >= 2 ? "Search Results" : "Recent Customers"}
          </p>
          <button
            type="button"
            onClick={() => setIsAllOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-650 hover:underline cursor-pointer"
          >
            View All Customers
            <ChevronRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {isSearching || isListLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-100 bg-slate-50/50" />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-[11px] text-slate-500 font-bold">
            No customers found. Fill in the fields below to create one.
          </div>
        ) : (
          <div className="relative flex items-center">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 w-full">
              {recentCustomers.map((customer) => {
                const isSelected = selected?.id === customer.id;
                const avatar = getAvatarStyle(customer.id);
                const initials = customer.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCard(customer)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border py-2 px-3 text-left transition relative cursor-pointer w-full hover:shadow-xs",
                      isSelected
                        ? "border-violet-500 bg-violet-50/30 ring-1 ring-violet-200"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatar.bg)}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-slate-900 leading-tight">{customer.name}</p>
                        <p className="truncate text-[10px] text-slate-500 font-bold">{customer.phone}</p>
                      </div>
                    </div>
                    {customer.email && (
                      <p className="text-[9px] text-slate-500 mt-1 truncate w-full pl-0.5 font-bold">{customer.email}</p>
                    )}
                  </button>
                );
              })}
            </div>
            {activeList.length > 4 && (
              <button
                type="button"
                onClick={handleNextRecent}
                className="absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 cursor-pointer z-10"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Or Create New Customer Inline Form */}
      <div id="create-customer-section" className="space-y-2.5 pt-2.5 border-t border-slate-100">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Or Create New Customer
        </h3>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
                <select
                  {...form.register("new_customer_phone_code")}
                  aria-label="Country code"
                  className="h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden font-bold cursor-pointer"
                >
                  {COUNTRY_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.flag} {item.code}
                    </option>
                  ))}
                </select>
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
        </div> {/* Closes the grid */}

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
      </div>

      {form.formState.errors.customer && (
        <p className="text-[11px] text-red-500 font-bold pt-0.5">
          {form.formState.errors.customer.message}
        </p>
      )}

      {/* All Customers Modal Dialog */}
      <Dialog open={isAllOpen} onOpenChange={setIsAllOpen}>
        <DialogContent className="sm:max-w-lg p-5 rounded-2xl bg-white shadow-xl border border-slate-100">
          <div className="space-y-4">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-none">All Customers</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 font-bold mt-1">
                Select a customer from the database list.
              </DialogDescription>
            </div>

            {/* Modal Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search customers by name, phone or email..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="h-8.5 w-full rounded-lg border-slate-200 bg-white pl-8.5 pr-4 text-xs focus-visible:border-violet-500 focus-visible:ring-violet-100 text-slate-900 font-semibold"
              />
            </div>

            {/* Scrollable Customer List */}
            <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredModalCustomers.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-slate-500 font-bold border border-dashed border-slate-200 rounded-xl">
                  No customers found matching "{modalSearch}"
                </div>
              ) : (
                filteredModalCustomers.map((customer) => {
                  const isSelected = selected?.id === customer.id;
                  const avatar = getAvatarStyle(customer.id);
                  const initials = customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCard(customer)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition hover:shadow-xs",
                        isSelected
                          ? "border-violet-500 bg-violet-50/30 ring-1 ring-violet-200"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm", avatar.bg)}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-slate-900 leading-tight">
                            {customer.name}
                          </p>
                          <p className="truncate text-[10px] text-slate-500 font-semibold mt-0.5">
                            {customer.phone} {customer.email ? `· ${customer.email}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 border border-blue-100 rounded-lg px-2.5 py-1 bg-blue-50/30 hover:bg-blue-50">
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
