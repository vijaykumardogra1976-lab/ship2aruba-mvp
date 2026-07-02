import { Box, Calendar, Check, ChevronDown, ShoppingCart, UploadCloud, Info } from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { WEBSITE_OPTIONS } from "../constants";
import type { OrderFormData, WebsiteType } from "../types";
import { getTodayDateString } from "../utils/calculations";
import { cn } from "@/lib/utils";

interface WebsiteSelectorProps {
  form: UseFormReturn<OrderFormData>;
  pdfFile: File | null;
  onPdfFileChange: (file: File | null) => void;
}

const AmazonLogo = () => (
  <span className="flex flex-col items-center justify-center font-extrabold text-slate-900 italic tracking-tight">
    <span className="text-2xl leading-none">a<span className="text-base font-bold">mazon</span></span>
    <svg className="h-2 w-12 text-amber-500 -mt-0.5" viewBox="0 0 100 15" fill="currentColor">
      <path d="M10 2 C 30 11, 70 11, 90 2 L 87 0 C 69 9, 31 9, 13 0 Z" />
    </svg>
  </span>
);

const EBayLogo = () => (
  <span className="text-2xl font-black tracking-tight select-none">
    <span className="text-red-500">e</span>
    <span className="text-blue-500">b</span>
    <span className="text-yellow-500">a</span>
    <span className="text-green-500">y</span>
  </span>
);

export function WebsiteSelector({ form, pdfFile, onPdfFileChange }: WebsiteSelectorProps) {
  const { register, setValue, watch, formState: { errors } } = form;
  const websiteType = watch("website_type");
  const [dragActive, setDragActive] = useState(false);

  const selectWebsite = (type: WebsiteType, website: string) => {
    setValue("website_type", type, { shouldValidate: true, shouldDirty: true });
    setValue("website", type === "other" ? "" : website, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("order_date", getTodayDateString(), { shouldValidate: true });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onPdfFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onPdfFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-stretch">
      {/* Left panel: Info & Form Inputs */}
      <div className="flex-1 space-y-4">
        {/* Title */}
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-none">Order Info</h2>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
            Enter the customer's order information.
          </p>
        </div>

        {/* Website Card Grid */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            From which website this order was ordered?
          </p>
          <div className="grid gap-3 grid-cols-3">
            {WEBSITE_OPTIONS.map((opt) => {
              const isSelected = websiteType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => selectWebsite(opt.type, opt.website)}
                  className={cn(
                    "flex h-20 items-center justify-center rounded-xl border transition relative cursor-pointer",
                    isSelected
                      ? "border-violet-500 bg-violet-50/20 text-violet-750 font-bold ring-1 ring-violet-200"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-350"
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-violet-600 text-white shadow-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                  {opt.type === "amazon" && <AmazonLogo />}
                  {opt.type === "ebay" && <EBayLogo />}
                  {opt.type === "other" && (
                    <span className="flex flex-col items-center justify-center gap-1.5 text-xs font-bold text-slate-650">
                      <ShoppingCart className="h-5 w-5 text-slate-500" />
                      <span>Other</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Input Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Order's Website */}
          {websiteType === "other" ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="custom-website">
                Order's Website *
              </label>
              <Input
                id="custom-website"
                placeholder="Enter custom website name"
                {...register("website")}
                className="h-8.5 text-xs border-slate-200 text-slate-900"
              />
              {errors.website && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.website.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="select-website">
                Order's Website *
              </label>
              <div className="relative">
                <select
                  id="select-website"
                  value={watch("website")}
                  onChange={(e) => setValue("website", e.target.value, { shouldValidate: true })}
                  className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden"
                >
                  <option value="Amazon">Amazon</option>
                  <option value="eBay">eBay</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          {/* Order Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="order_date">
              Order Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="order_date"
                type="date"
                {...register("order_date")}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100"
              />
            </div>
            {errors.order_date && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.order_date.message}</p>
            )}
          </div>

          {/* Number of Items */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="number_of_items">
              Number of Items *
            </label>
            <div className="relative">
              <Box className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="number_of_items"
                type="number"
                min={1}
                placeholder="Enter number of items"
                {...register("number_of_items")}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100"
              />
            </div>
            {errors.number_of_items && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.number_of_items.message}</p>
            )}
          </div>

          {/* Amount in USD */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="amount_usd">
              Amount in USD *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-550 pointer-events-none">
                $
              </span>
              <input
                id="amount_usd"
                type="number"
                min={0.01}
                step="0.01"
                placeholder="Enter amount"
                {...register("amount_usd")}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-7.5 pr-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100"
              />
            </div>
            {errors.amount_usd && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.amount_usd.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Right panel: PDF Dropzone Upload Box */}
      <div className="w-80 shrink-0 border-l border-slate-100 pl-5 flex flex-col justify-center">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Upload Items PDF (Optional)</span>
            <Info className="h-3.5 w-3.5 text-violet-500 cursor-pointer" />
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Upload PDF invoice or items list to get items details automatically.
          </p>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-dashed border-violet-200/80 p-4.5 text-center transition bg-slate-50/20",
              dragActive && "border-violet-600 bg-violet-50/10"
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 mb-1.5">
              <UploadCloud className="h-4.5 w-4.5" />
            </div>
            <p className="text-[10px] font-bold text-slate-900 truncate max-w-full px-1">
              {pdfFile ? pdfFile.name : "Drag & drop PDF here"}
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5 font-bold">or</p>
            <label className="mt-2 inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition select-none">
              Choose PDF File
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[9px] text-slate-500 text-center leading-none mt-1 font-bold">
            Max file size: 10MB | PDF only
          </p>
          {pdfFile && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] border border-slate-200">
              <span className="truncate text-slate-900 font-bold max-w-[180px]">{pdfFile.name}</span>
              <button
                type="button"
                onClick={() => onPdfFileChange(null)}
                className="text-rose-600 hover:underline font-bold shrink-0 cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
