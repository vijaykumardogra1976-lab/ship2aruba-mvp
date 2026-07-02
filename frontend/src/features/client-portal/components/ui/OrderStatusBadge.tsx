interface Props {
  color: string;
  label: string;
  size?: "sm" | "md";
}

const colorMap: Record<string, string> = {
  yellow: "bg-amber-100 text-amber-800 border border-amber-200",
  blue: "bg-blue-100 text-blue-800 border border-blue-200",
  violet: "bg-violet-100 text-violet-800 border border-violet-200",
  orange: "bg-orange-100 text-orange-800 border border-orange-200",
  green: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  red: "bg-red-100 text-red-800 border border-red-200",
  gray: "bg-gray-100 text-gray-700 border border-gray-200",
};

export function OrderStatusBadge({ color, label, size = "sm" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      } ${colorMap[color] ?? colorMap.gray}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          color === "green"
            ? "bg-emerald-500"
            : color === "yellow"
            ? "bg-amber-500"
            : color === "violet"
            ? "bg-violet-500"
            : color === "blue"
            ? "bg-blue-500"
            : color === "red"
            ? "bg-red-500"
            : color === "orange"
            ? "bg-orange-500"
            : "bg-gray-400"
        }`}
      />
      {label}
    </span>
  );
}
