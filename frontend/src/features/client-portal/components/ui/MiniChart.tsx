import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyOrderData } from "../../types";

interface Props {
  data: MonthlyOrderData[];
}

export function MiniChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="cpGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            fontSize: "12px",
          }}
          formatter={(value) => [`${Number(value)} orders`, ""]}
          labelStyle={{ fontWeight: 600, color: "#111827" }}
        />
        <Area
          type="monotone"
          dataKey="orders"
          stroke="#7C3AED"
          strokeWidth={2.5}
          fill="url(#cpGradient)"
          dot={{ fill: "#7C3AED", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#7C3AED" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
