import { Box, CreditCard, Clock, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "../types";

function formatCurrencyDisplay(value: number) {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} AWG`;
}

export function computeOrderStats(orders: OrderListItem[]) {
  const totalOrders = orders.length;
  
  const totalRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.items_total || "0"),
    0,
  );
  
  const paidAmount = orders.reduce(
    (sum, o) => sum + parseFloat(o.paid_amount || "0"),
    0,
  );
  
  const pendingAmount = orders.reduce(
    (sum, o) => sum + parseFloat(o.remaining_balance || "0"),
    0,
  );

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const paidPercent = totalRevenue > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0;
  const pendingPercent = totalRevenue > 0 ? Math.round((pendingAmount / totalRevenue) * 100) : 0;

  return {
    totalOrders,
    totalRevenue,
    paidAmount,
    pendingAmount,
    avgOrderValue,
    paidPercent,
    pendingPercent,
  };
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
}: StatCardProps) {
  return (
    <div className={cn(
      "flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4.5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:-translate-y-0.5",
      borderColor
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-550">{label}</p>
          <p className="text-[19px] font-black text-slate-800 tracking-tight leading-none pt-1">
            {value}
          </p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shadow-inner shrink-0", iconBg, iconColor)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-3 text-[10px] font-medium text-slate-550 uppercase tracking-wide">
        {subtitle}
      </p>
    </div>
  );
}

interface OrdersStatsCardsProps {
  orders: OrderListItem[];
}

export function OrdersStatsCards({ orders }: OrdersStatsCardsProps) {
  const stats = computeOrderStats(orders);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Total Orders"
        value={String(stats.totalOrders)}
        subtitle="All time orders"
        icon={Box}
        iconBg="bg-violet-50"
        iconColor="text-violet-500"
        borderColor="hover:border-violet-100"
      />
      <StatCard
        label="Total Revenue"
        value={formatCurrencyDisplay(stats.totalRevenue)}
        subtitle="All orders revenue"
        icon={DollarSign}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-500"
        borderColor="hover:border-emerald-100"
      />
      <StatCard
        label="Paid Amount"
        value={formatCurrencyDisplay(stats.paidAmount)}
        subtitle={`${stats.paidPercent}% of total`}
        icon={CreditCard}
        iconBg="bg-blue-50"
        iconColor="text-blue-500"
        borderColor="hover:border-blue-100"
      />
      <StatCard
        label="Pending Amount"
        value={formatCurrencyDisplay(stats.pendingAmount)}
        subtitle={`${stats.pendingPercent}% of total`}
        icon={Clock}
        iconBg="bg-amber-50"
        iconColor="text-amber-500"
        borderColor="hover:border-amber-100"
      />
      <StatCard
        label="Avg. Order Value"
        value={formatCurrencyDisplay(stats.avgOrderValue)}
        subtitle="Per order average"
        icon={TrendingUp}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-500"
        borderColor="hover:border-indigo-100"
      />
    </div>
  );
}
