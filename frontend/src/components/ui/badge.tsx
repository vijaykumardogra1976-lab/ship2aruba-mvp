import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("border-slate-200", className)} {...props} />;
}
