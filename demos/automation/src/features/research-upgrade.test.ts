import { describe, expect, it } from "vitest";
import {
  applyReply,
  approveOrder,
  approveQuote,
  balance,
  canApproveOrder,
  confirmPayment,
  decideQuote,
  eligible,
  initialOrder,
  initialQuote,
  initialReceivables,
  invoiceTask,
  quoteTask,
  recordQuoteFollowUp,
  resolveInvoiceBlocker,
} from "./rules";
import { actionTiming, daysBetween, moveDate } from "../lib/dates";
import { orderCsv } from "../lib/order-export";
import { validOrder, validQuote, validReceivables } from "../lib/storage";

describe("Quote ownership and lifecycle", () => {
  it("requires approval before follow-up or a customer decision", () => {
    const state = initialQuote();
    expect(recordQuoteFollowUp(state)).toBe(state);
    expect(decideQuote(state, "accepted")).toBe(state);
    expect(quoteTask(state).owner).toBe("Awaiting assignment");
  });
  it.each(["accepted", "declined"] as const)(
    "closes %s opportunities and prevents another follow-up",
    (outcome) => {
      const approved = approveQuote({
        ...initialQuote(),
        stage: "review",
        owner: "Arjun Rao",
      });
      expect(quoteTask(approved).owner).toBe("Arjun Rao");
      expect(actionTiming(quoteTask(approved).due, "2026-09-29")).toBe(
        "1 day overdue",
      );
      const followed = recordQuoteFollowUp(approved);
      expect(quoteTask(followed).due).toBe("2026-09-30");
      expect(recordQuoteFollowUp(followed)).toBe(followed);
      const closed = decideQuote(followed, outcome);
      expect(quoteTask(closed)).toMatchObject({ closed: true, due: null });
      expect(recordQuoteFollowUp(closed)).toBe(closed);
      expect(decideQuote(closed, "accepted")).toBe(closed);
      expect(validQuote(closed)).toBe(true);
    },
  );
});

describe("Customer code and price review", () => {
  it("requires both decisions, preserves the source price and exports the reviewed amount", () => {
    const review = {
      ...initialOrder(),
      scenario: "unmapped" as const,
      stage: "review" as const,
    };
    expect(canApproveOrder(review)).toBe(false);
    expect(canApproveOrder({ ...review, mapping: "bearing" })).toBe(false);
    expect(canApproveOrder({ ...review, resolution: "correct" })).toBe(false);
    const approved = approveOrder({
      ...review,
      mapping: "bearing",
      resolution: "correct",
    });
    expect(approved.stage).toBe("complete");
    expect(approved.created).toEqual(["apex:AEW-2050"]);
    expect(validOrder(approved)).toBe(true);
    expect(orderCsv(approved)).toContain(
      '"BRG-6204-2RS","6204 sealed ball bearing","24","320.00","7680.00","1382.40","9062.40"',
    );
    expect(orderCsv(approved)).toContain('"SO-2050","AEW-2050"');
    expect(canApproveOrder({ ...approved, stage: "review" })).toBe(false);
  });
  it("exports a manager-approved exception without silently restoring catalogue prices", () => {
    const approved = approveOrder({
      ...initialOrder(),
      scenario: "mismatch",
      stage: "review",
      resolution: "honour",
    });
    expect(orderCsv(approved)).toContain(
      '"24","300.00","7200.00","1296.00","8496.00"',
    );
    expect(orderCsv(approved)).toContain("Sample manager approved PO price");
    expect(() => orderCsv(initialOrder())).toThrow();
  });
});

describe("Collections blockers and dated actions", () => {
  it("releases a missed promise only after its promised date", () => {
    const promised = applyReply({
      ...initialReceivables(),
      stage: "review",
      reply: "promise",
    });
    const invoice = promised.invoices[0];
    expect(eligible(invoice, "2026-09-29")).toBe(false);
    expect(eligible(invoice, "2026-09-30")).toBe(false);
    expect(eligible(invoice, "2026-10-01")).toBe(true);
    expect(invoiceTask(invoice, "2026-10-01").title).toBe(
      "Follow up on missed promise",
    );
    expect(balance(invoice)).toBe(1437240);
    const renewed = applyReply({
      ...promised,
      asOf: "2026-10-01",
      stage: "review",
      reply: "promise",
    });
    expect(renewed.invoices[0].promiseDate).toBe("2026-10-05");
    expect(renewed.invoices[0].nextActionDate).toBe("2026-10-06");
    expect(validReceivables(renewed)).toBe(true);
  });
  it("keeps document requests paused and schedules follow-up after provision", () => {
    const blocked = applyReply({
      ...initialReceivables(),
      stage: "review",
      reply: "documents",
    });
    expect(eligible(blocked.invoices[0], "2026-10-01")).toBe(false);
    const resolved = resolveInvoiceBlocker(blocked);
    expect(resolved.invoices[0]).toMatchObject({
      status: "open",
      resolution: "documents-provided",
      nextActionDate: "2026-09-28",
    });
    expect(eligible(resolved.invoices[0], "2026-09-27")).toBe(false);
    expect(eligible(resolved.invoices[0], "2026-09-28")).toBe(true);
    expect(balance(resolved.invoices[0])).toBe(balance(blocked.invoices[0]));
    expect(resolveInvoiceBlocker(resolved)).toBe(resolved);
    expect(validReceivables(resolved)).toBe(true);
  });
  it("resolves a dispute without changing money, and records the receipt separately", () => {
    const blocked = applyReply({
      ...initialReceivables(),
      stage: "review",
      reply: "dispute",
    });
    expect(blocked.invoices[0].owner).toBe("Arjun Rao");
    const resolved = resolveInvoiceBlocker(blocked);
    expect(eligible(resolved.invoices[0])).toBe(true);
    expect(resolved.invoices[0].owner).toBe("Meera Shah");
    expect(resolved.invoices[0].paid).toBe(0);
    expect(resolved.invoices[0].activity).toHaveLength(3);
    const paid = confirmPayment(resolved);
    expect(balance(paid.invoices[0])).toBe(0);
    expect(invoiceTask(paid.invoices[0], paid.asOf).closed).toBe(true);
    expect(eligible(paid.invoices[0], "2026-10-01")).toBe(false);
    expect(resolveInvoiceBlocker(paid)).toBe(paid);
    expect(validReceivables(paid)).toBe(true);
  });
  it("does not manufacture follow-up eligibility for incomplete or future records", () => {
    const invoice = initialReceivables().invoices[0];
    expect(eligible({ ...invoice, due: "2026-10-01" })).toBe(false);
    expect(eligible({ ...invoice, due: "2026-09-26" })).toBe(false);
    const missing: Partial<typeof invoice> = { ...invoice };
    delete missing.nextActionDate;
    expect(eligible(missing as typeof invoice)).toBe(false);
    expect(resolveInvoiceBlocker(initialReceivables())).toEqual(
      initialReceivables(),
    );
  });
});

describe("Upgrade recovery and calendar boundaries", () => {
  it.each(["owner", "asOf", "followedUp", "outcome"])(
    "rejects missing quote %s",
    (key) => {
      const state: Record<string, unknown> = { ...initialQuote() };
      delete state[key];
      expect(validQuote(state)).toBe(false);
    },
  );
  it.each(["owner", "nextActionDate", "activity", "lastReply", "resolution"])(
    "rejects missing invoice %s",
    (key) => {
      const state = initialReceivables();
      const invoice: Record<string, unknown> = { ...state.invoices[0] };
      delete invoice[key];
      expect(
        validReceivables({
          ...state,
          invoices: [invoice, ...state.invoices.slice(1)],
        }),
      ).toBe(false);
    },
  );
  it("rejects missing mapping and clock fields", () => {
    const order: Partial<ReturnType<typeof initialOrder>> = initialOrder();
    delete order.mapping;
    expect(validOrder(order)).toBe(false);
    const state: Partial<ReturnType<typeof initialReceivables>> =
      initialReceivables();
    delete state.asOf;
    expect(validReceivables(state)).toBe(false);
  });
  it("handles month/year boundaries and invalid date values", () => {
    expect(moveDate("2026-09-30", 1)).toBe("2026-10-01");
    expect(moveDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(moveDate("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween(undefined, "2026-09-26")).toBeNull();
    expect(actionTiming(null, "2026-09-26")).toBe("Closed");
    expect(actionTiming("2026-09-26", "2026-09-26")).toBe("Due today");
  });
});
