import { customer, products, supplier } from "../data/catalogue";
import { type Line, money, quoteTotals } from "../lib/money";
import Icon from "./Icon";
export function LineTable({
  lines,
  customerCode = false,
}: {
  lines: Line[];
  customerCode?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="line-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const p = products[l.productId];
            const price = l.unitPrice ?? p.price;
            return (
              <tr key={l.productId}>
                <td>
                  <strong>
                    {customerCode && p.id === "bearing"
                      ? "6204 bearing · seal not specified"
                      : p.name}
                  </strong>
                  <small>
                    {customerCode && p.id === "bearing"
                      ? "Customer code: AE-BRG04"
                      : p.sku}
                  </small>
                </td>
                <td>
                  {l.quantity}
                  <small>{p.unit}</small>
                </td>
                <td>{money(price)}</td>
                <td>{money(price * l.quantity)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function Totals({ lines }: { lines: Line[] }) {
  const t = quoteTotals(lines);
  return (
    <div className="totals">
      <div>
        <span>Subtotal</span>
        <span>{money(t.subtotal)}</span>
      </div>
      <div>
        <span>
          GST · 18% <small>(sample rate)</small>
        </span>
        <span>{money(t.tax)}</span>
      </div>
      <div className="grand-total">
        <span>Total amount</span>
        <strong data-testid="grand-total">{money(t.total)}</strong>
      </div>
    </div>
  );
}
export function QuoteDocument({ lines }: { lines: Line[] }) {
  return (
    <section
      className="paper quote-document"
      aria-label="Approved sample quotation"
    >
      <div className="paper-top">
        <span className="paper-logo">P.</span>
        <span className="paper-type">
          QUOTATION
          <br />
          <b>QT-2026-048</b>
        </span>
      </div>
      <div className="paper-company">
        <strong>{supplier.name}</strong>
        <small>
          {supplier.location} · {supplier.email}
        </small>
      </div>
      <div className="paper-meta">
        <div>
          <span>PREPARED FOR</span>
          <strong>{customer.name}</strong>
          <small>{customer.location}</small>
        </div>
        <div>
          <span>ISSUED</span>
          <strong>26 Sep 2026</strong>
          <small>Valid for 7 days</small>
        </div>
      </div>
      <LineTable lines={lines} />
      <Totals lines={lines} />
      <div className="paper-footer">
        <Icon name="check" size={16} />
        <span>
          Approved in the demo workspace.
          <br />
          <small>Fictional quotation · Not a tax invoice</small>
        </span>
      </div>
    </section>
  );
}
