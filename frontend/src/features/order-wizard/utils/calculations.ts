export function calculateRemainingBalance(
  itemsTotal: number | string | "",
  paidAmount: number | string | "",
): number {
  const total = itemsTotal === "" ? 0 : Number(itemsTotal);
  const paid = paidAmount === "" ? 0 : Number(paidAmount);
  return Math.max(0, (isNaN(total) ? 0 : total) - (isNaN(paid) ? 0 : paid));
}

export function getTodayDateString(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export function toApiDate(displayDate: string): string {
  if (displayDate.includes("-")) {
    return displayDate;
  }
  const [day, month, year] = displayDate.split("/");
  return `${year}-${month}-${day}`;
}

export function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    pin: "Pin",
    transfer: "Transfer",
  };
  return map[method] ?? method;
}

export function paymentTypeLabel(type: string): string {
  return type === "two" ? "Two Payments" : "One Payment";
}
