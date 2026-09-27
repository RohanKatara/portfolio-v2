import { products } from "../data/catalogue";
export type Line = { productId: string; quantity: number; unitPrice?: number };
export function quoteTotals(lines: Line[]) {
  return lines.reduce(
    (sum, line) => {
      const product = products[line.productId];
      const price = line.unitPrice ?? product?.price;
      if (
        !product ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0 ||
        price == null ||
        !Number.isSafeInteger(price) ||
        price < 0
      )
        throw new Error(
          "A valid product, whole quantity, and price are required.",
        );
      const net = price * line.quantity;
      if (!Number.isSafeInteger(net))
        throw new Error("Line amount is too large.");
      const tax = Math.round((net * product.taxBps) / 10000);
      const total = sum.total + net + tax;
      if (!Number.isSafeInteger(total))
        throw new Error("Quote amount is too large.");
      return { subtotal: sum.subtotal + net, tax: sum.tax + tax, total };
    },
    { subtotal: 0, tax: 0, total: 0 },
  );
}
export function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
export function compactMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
