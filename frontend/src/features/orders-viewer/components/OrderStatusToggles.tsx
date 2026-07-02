import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "../api/ordersViewerApi";
import type { OrderListItem, OrderStatusField } from "../types";

const STATUS_FIELDS: { field: OrderStatusField; label: string }[] = [
  { field: "is_az_ordered", label: "AZ Ordered" },
  { field: "is_uploaded", label: "Uploaded" },
  { field: "is_in_myus", label: "In MyUS" },
  { field: "is_completed", label: "Completed" },
];

interface OrderStatusTogglesProps {
  order: OrderListItem;
}

function CheckedBoxIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-blue-600 shadow-xs"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" className="fill-blue-50/40" />
      <path
        d="M9 11.5l2 2 4.5-4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  );
}

function UncheckedBoxIcon({ disabled }: { disabled?: boolean }) {
  return (
    <svg
      className={cn(
        "h-3.5 w-3.5 shrink-0 transition-colors",
        disabled ? "text-slate-200" : "text-slate-350 group-hover:text-slate-400"
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  );
}

export function OrderStatusToggles({ order }: OrderStatusTogglesProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: Partial<Record<OrderStatusField, boolean>>) =>
      updateOrderStatus(order.id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
    },
  });

  const handleToggle = (field: OrderStatusField, index: number, active: boolean) => {
    if (mutation.isPending) return;

    if (active) {
      // Uncheck this item and all subsequent items
      const payload: Partial<Record<OrderStatusField, boolean>> = { [field]: false };
      for (let j = index + 1; j < STATUS_FIELDS.length; j++) {
        payload[STATUS_FIELDS[j].field] = false;
      }
      mutation.mutate(payload);
    } else {
      // Check this item
      mutation.mutate({ [field]: true });
    }
  };

  return (
    <div
      className="flex flex-col items-start gap-1 w-full"
      role="group"
      aria-label={`Order statuses for ${order.order_number}`}
    >
      {STATUS_FIELDS.map(({ field, label }, index) => {
        const active = order[field];
        // Disabled if a previous step in the flow is not active
        const isDisabled = index > 0 && !order[STATUS_FIELDS[index - 1].field];

        return (
          <button
            key={field}
            type="button"
            disabled={isDisabled || mutation.isPending}
            onClick={() => handleToggle(field, index, active)}
            aria-pressed={active}
            aria-label={`${label} for order ${order.order_number}`}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-2 py-0.5 text-[11px] font-bold transition w-full text-left select-none",
              active
                ? "border-blue-200 bg-blue-50/50 text-blue-650 font-bold cursor-pointer"
                : isDisabled
                  ? "border-transparent bg-transparent text-slate-300 cursor-not-allowed"
                  : "border-transparent bg-transparent text-slate-500 hover:text-slate-700 cursor-pointer"
            )}
          >
            {active ? (
              <CheckedBoxIcon />
            ) : (
              <UncheckedBoxIcon disabled={isDisabled} />
            )}
            <span className="truncate leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
