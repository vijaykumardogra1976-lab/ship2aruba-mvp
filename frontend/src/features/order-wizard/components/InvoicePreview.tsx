import type { InvoiceData } from "../types";

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const issuedDate = new Date(invoice.issued_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="invoice-print mx-auto max-w-3xl bg-white p-8 text-slate-900">
      <div className="mb-6 flex justify-between border-b border-slate-200 pb-4">
        <div className="text-2xl font-bold">Ship2Aruba</div>
        <div className="text-right text-sm">
          <p>
            <strong>Invoice #{invoice.invoice_number}</strong>
          </p>
          <p>Order # {invoice.order_number}</p>
          <p>Date of Invoice: {issuedDate}</p>
          <p>
            <strong>Amount Due: {invoice.amount_due} AWG</strong>
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Invoice To:
          </p>
          <p>{invoice.customer_name}</p>
          <p>{invoice.customer_phone}</p>
          {invoice.customer_email && <p>{invoice.customer_email}</p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Invoice From:
          </p>
          <p>{invoice.company.name}</p>
          <p>{invoice.company.address}</p>
          <p>{invoice.company.phone}</p>
        </div>
      </div>

      <p className="mb-2 font-semibold">Your Invoice</p>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500">
            <th className="py-2 text-left">Items</th>
            <th className="py-2 text-center">Quantity</th>
            <th className="py-2 text-right">Price (AWG)</th>
            <th className="py-2 text-right">Amount (AWG)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((item) => (
            <tr key={item.label} className="border-b border-slate-100">
              <td className="py-2">{item.label}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{item.price}</td>
              <td className="py-2 text-right">{item.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>{invoice.total} AWG</span>
        </div>
        <div className="flex justify-between">
          <span>
            Payment on {new Date(invoice.issued_at).toLocaleDateString("en-GB")} using{" "}
            {invoice.payment_method}
          </span>
          <span>{invoice.payment_amount} AWG</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>AMOUNT DUE:</span>
          <span>{invoice.remaining_balance} AWG</span>
        </div>
      </div>
    </div>
  );
}
