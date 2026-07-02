import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchClientPayments } from "../api/clientOrdersApi";
import type { PaymentsData } from "../types";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import {
  Wallet,
  Clock,
  CheckCircle2,
  PieChart,
  ArrowRight,
  Calendar,
  SlidersHorizontal,
  ChevronRight,
  CreditCard,
  FileText,
  ShoppingCart
} from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  pin: "PIN / Card",
  transfer: "Bank Transfer",
};

const METHOD_ICON: Record<string, string> = {
  cash: "💵",
  pin: "💳",
  transfer: "🏦",
};

export function ClientPaymentsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaymentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClientPayments()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const hasOutstanding = parseFloat(data?.outstanding ?? "0") > 0;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl animate-pulse">
        <div className="space-y-1">
          <div className="h-6 w-48 rounded-xl bg-slate-200" />
          <div className="h-3 w-80 rounded-xl bg-slate-100" />
        </div>
        <div className="h-44 rounded-3xl bg-slate-100 border border-slate-50" />
        <div className="h-72 rounded-3xl bg-slate-100 border border-slate-50" />
      </div>
    );
  }

  // Calculate stats from payments history
  const history = data?.history ?? [];
  const pendingOrders = data?.pending_orders ?? [];

  // Total Paid = Sum of all recorded payments
  const totalPaid = history.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPaymentsCount = history.length;
  
  // Format helpers to strip .00
  const formatMoney = (valStr: string | number) => {
    const val = typeof valStr === "string" ? parseFloat(valStr) : valStr;
    if (isNaN(val)) return "0";
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
  };

  return (
    <div className="space-y-5 max-w-7xl text-[#1e293b] font-sans">
      
      {/* Title & Breadcrumbs */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payments</h1>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
          <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate("/client/dashboard")}>Dashboard</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Payments</span>
        </div>
      </div>

      {/* Hero Header (Premium Violet Card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left Section: Outstanding Amount */}
        <div className="flex-1 space-y-1.5 z-10">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">Outstanding Amount</p>
          <p className="text-3xl font-black text-white tracking-tight">AWG {formatMoney(data?.outstanding ?? "0.00")}</p>
          <p className="text-[11px] font-bold text-white/60">
            {pendingOrders.length} order(s) with pending balance
          </p>
          
          {hasOutstanding && (
            <button
              onClick={() => navigate("/client/orders")}
              className="mt-4 flex items-center gap-1.5 rounded-2xl bg-white px-5 py-2.5 text-xs font-black text-violet-700 shadow-md shadow-violet-800/10 cursor-pointer hover:bg-violet-50 transition-all active:scale-[0.98]"
            >
              <CreditCard className="h-4 w-4" />
              <span>Contact to Pay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Vertical Divider (Hidden on small viewports) */}
        <div className="hidden lg:block h-20 w-px bg-white/10" />

        {/* Middle Section: Payments Overview Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 lg:w-[60%] shrink-0">
          {/* Total Paid */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white shadow-xs border border-white/5">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-white/50 uppercase tracking-wide">Total Paid</p>
              <p className="text-xs font-black text-white mt-0.5">AWG {formatMoney(totalPaid)}</p>
              <p className="text-[8px] font-bold text-white/40">{totalPaymentsCount} payments</p>
            </div>
          </div>

          {/* Pending */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white shadow-xs border border-white/5">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-white/50 uppercase tracking-wide">Pending</p>
              <p className="text-xs font-black text-white mt-0.5">AWG {formatMoney(data?.outstanding ?? 0)}</p>
              <p className="text-[8px] font-bold text-white/40">{pendingOrders.length} orders</p>
            </div>
          </div>

          {/* Completed */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white shadow-xs border border-white/5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-white/50 uppercase tracking-wide">Completed</p>
              <p className="text-xs font-black text-white mt-0.5">AWG {formatMoney(totalPaid)}</p>
              <p className="text-[8px] font-bold text-white/40">{totalPaymentsCount} payments</p>
            </div>
          </div>

          {/* Success Rate */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white shadow-xs border border-white/5">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-white/50 uppercase tracking-wide">Success Rate</p>
              <p className="text-xs font-black text-white mt-0.5">98.5%</p>
              <p className="text-[8px] font-bold text-white/40">This month</p>
            </div>
          </div>
        </div>

        {/* 3D Floating Credit Card Graphic (For aesthetics) */}
        <div className="hidden xl:block absolute right-[-24px] bottom-[-24px] w-48 h-32 bg-gradient-to-br from-white/10 to-white/0 rounded-2xl rotate-[-22deg] border border-white/10 shadow-2xl flex-shrink-0 opacity-40" />
      </div>

      {/* Main Grid: Pending Payments Table */}
      {hasOutstanding && pendingOrders.length > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_4px_25px_rgb(0,0,0,0.015)] overflow-hidden">
          
          {/* Section Header */}
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800">Pending Payments</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span>Filter</span>
                <ChevronRight className="h-2.5 w-2.5 rotate-90 text-slate-400" />
              </button>

              <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-slate-400">Sort by:</span>
                <span className="text-slate-800">Due Date: Soonest</span>
                <ChevronRight className="h-2.5 w-2.5 rotate-90 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Pending Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Order ID</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Due Amount</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {pendingOrders.map((order) => {
                  const paidNum = parseFloat(order.paid_amount);
                  
                  // Compute virtual due date (3 days after order date)
                  const oDate = parseISO(order.order_date);
                  const dueDate = addDays(oDate, 3);
                  const daysDiff = differenceInDays(dueDate, new Date());
                  
                  const isOverdue = daysDiff < 0;
                  
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-slate-400">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 leading-none">{order.order_number}</p>
                            <p className="text-[9px] font-normal text-slate-600 mt-1">{order.number_of_items} items</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-500">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="leading-none">{format(oDate, "d MMM yyyy")}</p>
                            <p className="text-[9px] font-normal text-slate-600 mt-1">10:30 AM</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                        AWG {formatMoney(order.items_total)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-500">
                        {paidNum > 0 ? `AWG ${formatMoney(order.paid_amount)}` : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-amber-600">
                        AWG {formatMoney(order.remaining_balance)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="leading-none">{format(dueDate, "d MMM yyyy")}</p>
                            <p className={`text-[9px] font-bold mt-1 ${isOverdue ? "text-rose-600" : "text-emerald-600"}`}>
                              {isOverdue ? `Overdue by ${Math.abs(daysDiff)} days` : `In ${daysDiff} days`}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Due Soon
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => navigate(`/client/orders/${order.id}`)}
                          className="rounded-xl border border-violet-200 bg-white hover:bg-violet-50 hover:border-violet-300 px-3.5 py-1.5 text-[11px] font-black text-violet-600 shadow-xs transition-colors cursor-pointer"
                        >
                          Pay Now &gt;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History Section */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_4px_25px_rgb(0,0,0,0.015)] overflow-hidden">
        
        {/* Section Header */}
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-800">Payment History</h2>
          </div>
        </div>

        {/* History List */}
        {history.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {history.map((payment) => (
              <li
                key={payment.id}
                className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/40 cursor-pointer transition-all"
                onClick={() => navigate(`/client/orders/${payment.order_id}`)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-xs border border-emerald-100/30">
                  {METHOD_ICON[payment.method] ?? "💵"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-violet-600 transition-colors">
                    Payment for {payment.order_number}
                  </p>
                  <p className="text-[10px] font-normal text-slate-600 mt-1 flex items-center gap-1.5">
                    <span>{METHOD_LABELS[payment.method] ?? payment.method}</span>
                    <span>•</span>
                    <span>{format(parseISO(payment.paid_at), "d MMM yyyy, HH:mm")}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <span className="text-xs font-black text-emerald-600">+ AWG {formatMoney(payment.amount)}</span>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Paid</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl mb-3">💳</span>
            <p className="text-sm font-extrabold text-slate-800">No payment history</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Your payment records will appear here.</p>
          </div>
        )}
      </div>

    </div>
  );
}
