import { CheckCircle2, Clock, ShoppingBag, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "../types";

function Sparkline({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 80 32"
      className="h-8 w-20 shrink-0"
      aria-hidden
    >
      <path
        d="M0 24 L12 18 L24 22 L36 10 L48 14 L60 6 L72 12 L80 4"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M0 24 L12 18 L24 22 L36 10 L48 14 L60 6 L72 12 L80 4 L80 32 L0 32 Z"
        fill={color}
        opacity="0.08"
      />
    </svg>
  );
}

function formatCurrencyDisplay(value: number) {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} AWG`;
}

export function computeOrderStats(orders: OrderListItem[]) {
  const totalValue = orders.reduce(
    (sum, o) => sum + parseFloat(o.items_total || "0"),
    0,
  );
  const pending = orders.filter((o) => !o.is_completed).length;
  const completed = orders.filter((o) => o.is_completed).length;
  const uniqueCustomers = new Set(orders.map((o) => o.customer.id)).size;

  return {
    totalOrders: orders.length,
    totalValue,
    pending,
    completed,
    uniqueCustomers,
  };
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  sparkColor,
}: StatCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 leading-tight">{value}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-400/80">{subtitle}</p>
        </div>
      </div>
      <Sparkline color={sparkColor} />
    </div>
  );
}

interface OrdersStatsCardsProps {
  orders: OrderListItem[];
}

export function OrdersStatsCards({ orders }: OrdersStatsCardsProps) {
  const stats = computeOrderStats(orders);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Total Orders"
        value={String(stats.totalOrders)}
        subtitle="All time orders"
        icon={ShoppingBag}
        iconBg="bg-violet-100/70"
        iconColor="text-violet-600"
        sparkColor="#7c3aed"
      />
      <StatCard
        label="Total Order Value"
        value={formatCurrencyDisplay(stats.totalValue)}
        subtitle="All orders value"
        icon={Wallet}
        iconBg="bg-emerald-100/70"
        iconColor="text-emerald-600"
        sparkColor="#059669"
      />
      <StatCard
        label="Pending Orders"
        value={String(stats.pending)}
        subtitle="Awaiting processing"
        icon={Clock}
        iconBg="bg-blue-100/70"
        iconColor="text-blue-600"
        sparkColor="#2563eb"
      />
      <StatCard
        label="Completed Orders"
        value={String(stats.completed)}
        subtitle="Successfully delivered"
        icon={CheckCircle2}
        iconBg="bg-orange-100/70"
        iconColor="text-orange-600"
        sparkColor="#ea580c"
      />
      <StatCard
        label="Total Customers"
        value={String(stats.uniqueCustomers)}
        subtitle="Active customers"
        icon={Users}
        iconBg="bg-red-100/70"
        iconColor="text-red-600"
        sparkColor="#dc2626"
      />
    </div>
  );
}
