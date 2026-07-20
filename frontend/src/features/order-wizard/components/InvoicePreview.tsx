import type { InvoiceData } from "../types";

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const getFormattedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month} ,${year}`;
  };

  const formatInt = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === "") return "0.00";
    const num = Number(val);
    return Number.isNaN(num) ? String(val) : num.toFixed(2);
  };

  const issuedDate = getFormattedDate(invoice.issued_at);

  return (
    <div className="invoice-print mx-auto bg-white p-4 text-slate-900 text-xs">
      <table className="mb-3 w-full border-b border-slate-200 pb-2 border-collapse border-none">
        <tbody>
          <tr>
            <td className="align-top border-none p-0 text-left">
              <div className="text-xl font-bold">Ship2Aruba</div>
            </td>
            <td className="text-right align-top border-none p-0 text-xs">
              <p>
                <strong>Invoice #{invoice.invoice_number}</strong>
              </p>
              <p>Order # {invoice.order_number}</p>
              <p>Date of Invoice: {issuedDate}</p>
              <p>
                <strong>Amount Due: {formatInt(invoice.amount_due)} AWG</strong>
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mb-3 w-full border-collapse border-none">
        <tbody>
          <tr>
            <td className="w-1/2 align-top border-none p-0 text-left text-xs">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                Invoice To:
              </p>
              <p>{invoice.customer_name}</p>
              <p>{invoice.customer_phone}</p>
              {invoice.customer_email && <p>{invoice.customer_email}</p>}
            </td>
            <td className="w-1/2 align-top text-right border-none p-0 text-xs">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                Invoice From:
              </p>
              <p>{invoice.company.name}</p>
              <p>{invoice.company.address}</p>
              <p>{invoice.company.phone}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mb-1 font-semibold text-xs">Your Invoice</p>
      <table className="mb-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500">
            <th className="py-1 text-left">Items</th>
            <th className="py-1 text-center">Quantity</th>
            <th className="py-1 text-right">Price (AWG)</th>
            <th className="py-1 text-right">Amount (AWG)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((item) => (
            <tr key={item.label} className="border-b border-slate-100">
              <td className="py-1">{item.label}</td>
              <td className="py-1 text-center">{item.quantity}</td>
              <td className="py-1 text-right">{formatInt(item.price)}</td>
              <td className="py-1 text-right">{formatInt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="w-full space-y-1 text-xs mt-3">
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>{formatInt(invoice.total)} AWG</span>
        </div>
        {invoice.payments && invoice.payments.length > 0 ? (
          invoice.payments.map((p) => {
            const pDate = getFormattedDate(p.paid_at);
            return (
              <div key={p.paid_at + p.payment_method + p.amount} className="flex justify-between text-slate-700 font-normal">
                <span>
                  Payment on {pDate} using {p.payment_method}
                </span>
                <span>{formatInt(p.amount)} AWG</span>
              </div>
            );
          })
        ) : (
          <div className="flex justify-between text-slate-700 font-normal">
            <span>
              Payment using {invoice.payment_method}
            </span>
            <span>{formatInt(invoice.paid)} AWG</span>
          </div>
        )}
        <div className="border-t border-slate-200 mt-1 pt-1">
          <div className="flex justify-between font-bold text-slate-900">
            <span>AMOUNT DUE:</span>
            <span>{formatInt(invoice.remaining_balance)} AWG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
