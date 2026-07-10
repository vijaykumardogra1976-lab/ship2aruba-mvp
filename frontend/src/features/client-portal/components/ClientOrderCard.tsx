import type { ClientOrder } from "../types";
import { format } from "date-fns";

interface Props {
  order: ClientOrder;
  onClick: () => void;
}

export function ClientOrderCard({ order, onClick }: Props) {
  const isCompleted = order.current_status === "delivered" || order.current_status === "cancelled";

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-violet-300 hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
            {order.is_urgent && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase tracking-wide">
                Urgent
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Placed on {format(new Date(order.order_date), "MMM d, yyyy")}
          </p>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">{order.amount_usd} AWG</div>
          <div className="text-xs text-gray-500">{order.number_of_items} items</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isCompleted
                ? "bg-gray-100 text-gray-800"
                : "bg-violet-100 text-violet-800"
            }`}
          >
            {order.status_label}
          </span>
        </div>
        <div className="text-sm font-medium text-violet-600 group-hover:text-violet-700 flex items-center gap-1">
          View Details <span aria-hidden="true">&rarr;</span>
        </div>
      </div>
    </div>
  );
}
