import { customer, products } from "../data/catalogue";
import { orderLines, poReference, type OrderState } from "../features/rules";
import { quoteTotals } from "./money";

const cell = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`;
export function orderCsv(state: OrderState): string {
  if (state.stage !== "complete")
    throw new Error("Approve the sample draft before export.");
  const reference = poReference(state.scenario);
  const rows: (string | number)[][] = [
    [
      "Record type",
      "Sales order",
      "Customer PO",
      "Customer",
      "SKU",
      "Description",
      "Quantity",
      "Unit price INR",
      "Line subtotal INR",
      "Sample GST INR",
      "Total INR",
      "Delivery date",
      "Price decision",
    ],
  ];
  for (const line of orderLines(state)) {
    const product = products[line.productId];
    const totals = quoteTotals([line]);
    rows.push([
      "SAMPLE DRAFT",
      `SO-${reference.slice(-4)}`,
      reference,
      customer.name,
      product.sku,
      product.name,
      line.quantity,
      ((line.unitPrice ?? product.price) / 100).toFixed(2),
      (totals.subtotal / 100).toFixed(2),
      (totals.tax / 100).toFixed(2),
      (totals.total / 100).toFixed(2),
      "2026-10-03",
      state.resolution === "honour"
        ? "Sample manager approved PO price"
        : state.resolution === "correct"
          ? "Sample customer correction"
          : "Agreed catalogue price",
    ]);
  }
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
export function downloadOrder(state: OrderState) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", orderCsv(state)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `sample-SO-${poReference(state.scenario).slice(-4)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
