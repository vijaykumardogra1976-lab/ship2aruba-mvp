import { Box, Calendar, Check, ShoppingCart, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
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
  <svg
    viewBox="0 0 603 182"
    className="h-5.5 w-20 text-slate-900"
    fill="currentColor"
  >
    {/* Letter 'a' (first) */}
    <path
      id="path30"
      d="M 55.288261,59.75829 V 55.7209 c -13.475471,0 -27.711211,2.88385 -27.711211,18.77125 0,8.04857 4.16847,13.50169 11.32567,13.50169 5.24337,0 9.93618,-3.22467 12.8987,-8.46805 3.670341,-6.44935 3.486841,-12.50544 3.486841,-19.7675 m 18.79747,45.43378 c -1.23219,1.10111 -3.01495,1.17976 -4.40444,0.4457 -6.18716,-5.1385 -7.28828,-7.52423 -10.69647,-12.42678 -10.224571,10.4343 -17.460401,13.55409 -30.726141,13.55409 -15.67768,0 -27.89471,-9.67401 -27.89471,-29.04824 0,-15.12713 8.20587,-25.43035 19.87236,-30.46398 10.1197,-4.45688 24.25058,-5.24337 35.051931,-6.47556 v -2.41195 c 0,-4.43066 0.34082,-9.67403 -2.25465,-13.50167 -2.280881,-3.43442 -6.632861,-4.85013 -10.460531,-4.85013 -7.10475,0 -13.44924,3.64414 -14.99603,11.19459 -0.31461,1.67789 -1.5468,3.32955 -3.22467,3.4082 L 6.26276,32.67628 C 4.74218,32.33548 3.0643,31.10327 3.48377,28.76999 7.65225,6.85271 27.44596,0.24605 45.16856,0.24605 c 9.071011,0 20.921021,2.41195 28.078221,9.28076 9.07104,8.46804 8.20587,19.7675 8.20587,32.06321 v 29.04826 c 0,8.73022 3.61794,12.55786 7.02613,17.27691 1.20597,1.67786 1.46814,3.69656 -0.05244,4.95497 -3.80144,3.17225 -10.56538,9.07104 -14.28819,12.37436 l -0.05242,-0.0525"
    />
    {/* Letter 'm' */}
    <path d="m 124.99883,105.45424 h -18.64017 c -1.78273,-0.13107 -3.19845,-1.46813 -3.32954,-3.17224 V 6.61676 c 0,-1.91383 1.59923,-3.43442 3.59171,-3.43442 h 17.38176 c 1.80898,0.0786 3.25089,1.46814 3.38199,3.19845 v 12.50545 h 0.34082 c 4.53551,-12.08598 13.05597,-17.7226 24.53896,-17.7226 11.66649,0 18.95477,5.63662 24.19814,17.7226 4.5093,-12.08598 14.76008,-17.7226 25.74495,-17.7226 7.81262,0 16.35931,3.22467 21.57646,10.46052 5.89879,8.04857 4.69281,19.74128 4.69281,29.99208 l -0.0262,60.37739 c 0,1.91383 -1.59923,3.46061 -3.59171,3.46061 h -18.61397 c -1.86138,-0.13107 -3.35574,-1.62543 -3.35574,-3.46061 V 51.29025 c 0,-4.03739 0.36702,-14.10466 -0.52434,-17.93233 -1.38949,-6.42311 -5.55797,-8.23209 -10.95865,-8.23209 -4.5093,0 -9.22833,3.01494 -11.14216,7.83885 -1.91383,4.8239 -1.73031,12.89867 -1.73031,18.32557 v 50.70338 c 0,1.91383 -1.59923,3.46061 -3.59171,3.46061 h -18.61395 c -1.88761,-0.13107 -3.35576,-1.62543 -3.35576,-3.46061 L 152.946,51.29025 c 0,-10.67025 1.75651,-26.37415 -11.48298,-26.37415 -13.39682,0 -12.87248,15.31063 -12.87248,26.37415 v 50.70338 c 0,1.91383 -1.59923,3.46061 -3.59171,3.46061" />
    {/* Letter 'a' (second) */}
    <use xlinkHref="#path30" transform="translate(244.36719)" />
    {/* Letter 'z' */}
    <path d="M 348.49744,20.06598 V 6.38079 c 0,-2.07113 1.57301,-3.46062 3.46062,-3.46062 h 61.26875 c 1.96628,0 3.53929,1.41571 3.53929,3.46062 v 11.71893 c -0.0262,1.96626 -1.67788,4.53551 -4.61418,8.59912 l -31.74859,45.32893 c 11.79759,-0.28837 24.25059,1.46814 34.94706,7.49802 2.41195,1.36327 3.06737,3.35575 3.25089,5.32203 V 99.4506 c 0,1.99248 -2.20222,4.32576 -4.5093,3.1198 -18.84992,-9.88376 -43.887,-10.95865 -64.72939,0.10487 -2.12356,1.15354 -4.35199,-1.15354 -4.35199,-3.14602 V 85.66054 c 0,-2.22843 0.0262,-6.02989 2.25463,-9.41186 l 36.78224,-52.74829 h -32.01076 c -1.96626,0 -3.53927,-1.38948 -3.53927,-3.43441" />
    {/* Letter 'o' */}
    <path d="m 469.51439,1.16364 c 27.65877,0 42.62858,23.75246 42.62858,53.95427 0,29.17934 -16.54284,52.32881 -42.62858,52.32881 -27.16066,0 -41.94697,-23.75246 -41.94697,-53.35127 0,-29.78234 14.96983,-52.93181 41.94697,-52.93181 m 0.15729,19.53156 c -13.73761,0 -14.60278,18.71881 -14.60278,30.38532 0,11.69271 -0.18352,36.65114 14.44549,36.65114 14.44549,0 15.12712,-20.13452 15.12712,-32.40403 0,-8.07477 -0.34082,-17.72257 -2.779,-25.3779 -2.09735,-6.65906 -6.26581,-9.25453 -12.19083,-9.25453" />
    {/* Letter 'n' */}
    <path d="M 548.00762,105.45424 H 529.4461 c -1.86141,-0.13107 -3.35577,-1.62543 -3.35577,-3.46061 l -0.0262,-95.69149 c 0.1573,-1.75653 1.7041,-3.1198 3.59171,-3.1198 h 17.27691 c 1.62543,0.0786 2.96249,1.17976 3.32954,2.67412 v 14.62899 h 0.3408 c 5.21717,-13.0822 12.53165,-19.32181 25.40412,-19.32181 8.36317,0 16.51662,3.01494 21.75999,11.27324 4.87633,7.65532 4.87633,20.5278 4.87633,29.78233 v 60.22011 c -0.20973,1.67786 -1.75653,3.01492 -3.59169,3.01492 h -18.69262 c -1.70411,-0.13107 -3.11982,-1.38948 -3.30332,-3.01492 V 50.47753 c 0,-10.46052 1.20597,-25.77117 -11.66651,-25.77117 -4.5355,0 -8.70399,3.04117 -10.77512,7.65532 -2.62167,5.84637 -2.96249,11.66651 -2.96249,18.11585 v 51.5161 c -0.0262,1.91383 -1.65166,3.46061 -3.64414,3.46061" />
    {/* Orange Smile Arrow */}
    <path
      d="m 374.00642,142.18404 c -34.99948,25.79739 -85.72909,39.56123 -129.40634,39.56123 -61.24255,0 -116.37656,-22.65135 -158.08757,-60.32496 -3.2771,-2.96252 -0.34083,-6.9999 3.59171,-4.69283 45.01431,26.19064 100.67269,41.94697 158.16623,41.94697 38.774689,0 81.4295,-8.02237 120.6499,-24.67006 5.92501,-2.51683 10.87999,3.88009 5.08607,8.17965"
      fill="#ff9900"
    />
    <path
      d="m 388.55678,125.53635 c -4.45688,-5.71527 -29.57261,-2.70033 -40.84585,-1.36327 -3.43442,0.41947 -3.95874,-2.56925 -0.86517,-4.71905 20.00346,-14.07844 52.82696,-10.01483 56.65462,-5.2958 3.82764,4.74526 -0.99624,37.64741 -19.79373,53.35128 -2.88385,2.41195 -5.63662,1.12734 -4.35198,-2.07113 4.2209,-10.53917 13.68519,-34.16054 9.20211,-39.90203"
      fill="#ff9900"
    />
  </svg>
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

  // Auto-fill order date with today on mount (if not already set)
  useEffect(() => {
    const currentDate = form.getValues("order_date");
    if (!currentDate) {
      setValue("order_date", getTodayDateString(), { shouldValidate: true, shouldDirty: true });
    }
  }, [form, setValue]);

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
          {/* Order's Website — only show input for "Other"; Amazon/eBay set automatically from card */}
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
          ) : websiteType === "amazon" || websiteType === "ebay" ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="selected-website">
                Order's Website *
              </label>
              <Input
                id="selected-website"
                value={watch("website")}
                readOnly
                disabled
                className="h-8.5 text-xs border-slate-200 bg-slate-50 text-slate-800 font-bold cursor-not-allowed select-none"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider">
                Order's Website *
              </label>
              <div className="h-8.5 flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3">
                <span className="text-xs text-slate-400 font-medium">Select a website above first</span>
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
                readOnly
                tabIndex={-1}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8.5 pr-3 text-xs font-semibold text-slate-500 focus:outline-hidden pointer-events-none select-none"
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
              <input
                id="amount_usd"
                type="number"
                min={0.01}
                step="0.01"
                placeholder="Enter amount"
                {...register("amount_usd")}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-100"
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
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              Upload Document
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 border border-slate-200 uppercase tracking-wide">
                Optional
              </span>
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Upload PDF, screenshot, or photo of the order to auto-extract item details via AI. <span className="text-violet-600 font-bold block mt-0.5">You can skip this and click "Next" directly.</span>
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
              {pdfFile ? pdfFile.name : "Drag & drop file here"}
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5 font-bold">or</p>
            <label className="mt-2 inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition select-none">
              Choose File
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[9px] text-slate-500 text-center leading-none mt-1 font-bold">
            Max 20MB · PDF, PNG, JPG, JPEG, WEBP · AI-powered extraction
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
