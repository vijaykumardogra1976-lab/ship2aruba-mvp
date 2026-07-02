import type { ClientOrderProgress } from "../../types";

interface Step {
  key: keyof ClientOrderProgress;
  label: string;
  description?: string;
}

const STEPS: Step[] = [
  { key: "order_received", label: "Order Received", description: "We've received your order" },
  { key: "payment_confirmed", label: "Payment Confirmed", description: "Payment has been verified" },
  { key: "purchased", label: "Purchased", description: "Item ordered from supplier" },
  { key: "arrived_warehouse", label: "Arrived at Warehouse", description: "Package at US warehouse" },
  { key: "packing", label: "Packing", description: "Being packed for shipment" },
  { key: "shipped", label: "Shipped", description: "On the way to Aruba" },
  { key: "customs", label: "Customs Clearance", description: "Clearing customs" },
  { key: "out_for_delivery", label: "Out for Delivery", description: "With courier" },
  { key: "delivered", label: "Delivered", description: "Ready for pickup / delivered" },
];

interface Props {
  progress: ClientOrderProgress;
  compact?: boolean;
}

export function OrderTimeline({ progress, compact = false }: Props) {
  const completedIndex = STEPS.reduce((last, step, i) => {
    return progress[step.key] ? i : last;
  }, -1);

  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gray-100" />
      <div
        className="absolute left-[19px] top-6 w-0.5 bg-violet-500 transition-all duration-700"
        style={{
          height:
            completedIndex >= 0
              ? `calc(${((completedIndex) / (STEPS.length - 1)) * 100}% )`
              : "0",
        }}
      />

      <ul className="space-y-5">
        {STEPS.map((step, i) => {
          const isDone = progress[step.key];
          const isCurrent =
            !isDone && i === completedIndex + 1;

          return (
            <li key={step.key} className={`relative flex items-start gap-4 ${compact ? "gap-3" : ""}`}>
              {/* Dot */}
              <div
                className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isDone
                    ? "border-violet-500 bg-violet-500"
                    : isCurrent
                    ? "border-violet-400 bg-white"
                    : "border-gray-200 bg-white"
                }`}
              >
                {isDone ? (
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-violet-400 animate-pulse" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </div>

              {/* Label */}
              <div className="pt-1.5">
                <p
                  className={`text-sm font-semibold ${
                    isDone
                      ? "text-violet-700"
                      : isCurrent
                      ? "text-violet-600"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {!compact && step.description && (
                  <p className={`mt-0.5 text-xs ${isDone || isCurrent ? "text-gray-500" : "text-gray-300"}`}>
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
