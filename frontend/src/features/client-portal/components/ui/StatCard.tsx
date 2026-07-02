interface Props {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
  trend?: string;
  trendUp?: boolean;
  action?: { label: string; onClick: () => void };
}

export function StatCard({ title, value, icon, iconBg, trend, trendUp, action }: Props) {
  return (
    <div className="group flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_1px_10px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${iconBg}`}>
          {icon}
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-auto text-left text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}
