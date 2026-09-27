import { describe, expect, it } from "vitest";
import {
  applyReply,
  approveOrder,
  approveQuote,
  balance,
  canApproveOrder,
  canApproveQuote,
  confirmPayment,
  duplicateOrder,
  eligible,
  initialOrder,
  initialQuote,
  initialReceivables,
  orderLines,
  quoteLines,
} from "./rules";
import { quoteTotals } from "../lib/money";
describe("Quotation decisions and money", () => {
  it("calculates the shown sample total in integer paise", () => {
    expect(quoteTotals(quoteLines(initialQuote()))).toEqual({
      subtotal: 1218000,
      tax: 219240,
      total: 1437240,
    });
  });
  it("handles an empty list", () => expect(quoteTotals([]).total).toBe(0));
  it.each([0, -1, 1.5, undefined, NaN])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(() =>
        quoteTotals([{ productId: "bearing", quantity: quantity as number }]),
      ).toThrow();
    },
  );
  it("rejects missing products and invalid prices", () => {
    expect(() =>
      quoteTotals([{ productId: "missing", quantity: 1 }]),
    ).toThrow();
    expect(() =>
      quoteTotals([{ productId: "bearing", quantity: 1, unitPrice: -1 }]),
    ).toThrow();
    expect(() =>
      quoteTotals([
        { productId: "bearing", quantity: Number.MAX_SAFE_INTEGER },
      ]),
    ).toThrow();
  });
  it("blocks an unresolved motor choice, then uses the selected price", () => {
    const state = {
      ...initialQuote(),
      scenario: "ambiguous" as const,
      stage: "review" as const,
    };
    expect(canApproveQuote(state)).toBe(false);
    expect(approveQuote(state)).toBe(state);
    expect(
      quoteTotals(quoteLines({ ...state, clarification: "motor3" })).total,
    ).toBe(1746400);
    expect(approveQuote({ ...state, clarification: "motor3" }).stage).toBe(
      "complete",
    );
  });
  it("requires a quantity clarification and derives a new total", () => {
    const state = {
      ...initialQuote(),
      scenario: "quantity" as const,
      stage: "review" as const,
    };
    expect(canApproveQuote(state)).toBe(false);
    expect(
      quoteTotals(quoteLines({ ...state, clarification: "20" })).total,
    ).toBe(1062000);
  });
  it("does not approve before processing or approve twice", () => {
    expect(approveQuote(initialQuote()).stage).toBe("input");
    const completed = approveQuote({ ...initialQuote(), stage: "review" });
    expect(approveQuote(completed)).toBe(completed);
  });
});
describe("Order validation and idempotency", () => {
  it("creates once and blocks a rechecked reference", () => {
    const completed = approveOrder({ ...initialOrder(), stage: "review" });
    expect(completed.created).toEqual(["apex:AEW-2048"]);
    expect(approveOrder(completed)).toBe(completed);
    expect(duplicateOrder({ ...completed, stage: "review" })).toBe(true);
    expect(canApproveOrder({ ...completed, stage: "review" })).toBe(false);
  });
  it("always blocks the seeded duplicate scenario", () => {
    const state = {
      ...initialOrder(),
      scenario: "duplicate" as const,
      stage: "review" as const,
    };
    expect(canApproveOrder(state)).toBe(false);
    expect(approveOrder(state).created).toHaveLength(0);
  });
  it("requires a resolution and applies the selected price", () => {
    const state = {
      ...initialOrder(),
      scenario: "mismatch" as const,
      stage: "review" as const,
    };
    expect(canApproveOrder(state)).toBe(false);
    expect(
      quoteTotals(orderLines({ ...state, resolution: "honour" })).total,
    ).toBe(1380600);
    expect(
      quoteTotals(orderLines({ ...state, resolution: "correct" })).total,
    ).toBe(1437240);
    expect(canApproveOrder({ ...state, resolution: "invented" })).toBe(false);
  });
});
describe("Receivables decisions", () => {
  it("does not apply a customer reply before review", () => {
    const state = initialReceivables();
    expect(applyReply(state)).toBe(state);
  });
  it.each(["promise", "dispute", "paid"] as const)(
    "pauses reminders for %s without clearing the balance",
    (reply) => {
      const state = applyReply({
        ...initialReceivables(),
        stage: "review",
        reply,
      });
      expect(eligible(state.invoices[0])).toBe(false);
      expect(balance(state.invoices[0])).toBe(1437240);
    },
  );
  it("pauses document requests until the missing copy is provided", () => {
    const state = applyReply({
      ...initialReceivables(),
      stage: "review",
      reply: "documents",
    });
    expect(eligible(state.invoices[0])).toBe(false);
  });
  it("only explicit receipt confirmation sets the balance to zero", () => {
    const claimed = applyReply({
      ...initialReceivables(),
      stage: "review",
      reply: "paid",
    });
    expect(claimed.invoices[0].status).toBe("verify");
    const confirmed = confirmPayment(claimed);
    expect(balance(confirmed.invoices[0])).toBe(0);
    expect(eligible(confirmed.invoices[0])).toBe(false);
    expect(confirmPayment(confirmed)).toEqual(confirmed);
    expect(confirmed.invoices.slice(1)).toEqual(claimed.invoices.slice(1));
  });
  it("does not reopen a settled invoice from a late reply", () => {
    const paid = confirmPayment({ ...initialReceivables(), stage: "review" });
    expect(
      applyReply({ ...paid, stage: "review", reply: "dispute" }).invoices[0]
        .status,
    ).toBe("paid");
  });
});
