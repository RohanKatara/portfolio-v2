import { describe, expect, it } from "vitest";
import {
  decodeStored,
  validOrder,
  validQuote,
  validReceivables,
  VERSION,
} from "./storage";
import {
  initialOrder,
  initialQuote,
  initialReceivables,
} from "../features/rules";
import { dateLabel, overdueDays, parseDate } from "./dates";
describe("Versioned sample state", () => {
  it("restores valid state and reseeds broken JSON or an older schema", () => {
    expect(
      decodeStored(
        JSON.stringify({ version: VERSION, state: initialQuote() }),
        initialQuote,
        validQuote,
      ).restored,
    ).toBe(true);
    for (const raw of [
      "{",
      "null",
      JSON.stringify({ version: 0, state: initialQuote() }),
      JSON.stringify({ version: 1, state: initialQuote() }),
    ])
      expect(decodeStored(raw, initialQuote, validQuote).restored).toBe(false);
  });
  it("rejects deleted fields from legacy quote and order state", () => {
    const quote: Partial<ReturnType<typeof initialQuote>> = initialQuote();
    delete quote.clarification;
    expect(validQuote(quote)).toBe(false);
    const order: Partial<ReturnType<typeof initialOrder>> = initialOrder();
    delete order.created;
    expect(validOrder(order)).toBe(false);
  });
  it("rejects a clarification from a different scenario", () => {
    expect(
      validQuote({
        ...initialQuote(),
        scenario: "ambiguous",
        clarification: "10",
        stage: "review",
      }),
    ).toBe(false);
  });
  it("rejects an invoice with a deleted field, not just null", () => {
    const state = initialReceivables();
    const legacy: Partial<(typeof state.invoices)[0]> = {
      ...state.invoices[0],
    };
    delete legacy.paid;
    expect(
      validReceivables({
        ...state,
        invoices: [legacy, ...state.invoices.slice(1)],
      }),
    ).toBe(false);
    expect(
      validReceivables({
        ...state,
        invoices: [
          { ...state.invoices[0], status: "paid" },
          ...state.invoices.slice(1),
        ],
      }),
    ).toBe(false);
    expect(validReceivables(state)).toBe(true);
  });
  it("requires a promise date and unique invoice IDs", () => {
    const state = initialReceivables();
    expect(
      validReceivables({
        ...state,
        invoices: [
          { ...state.invoices[0], status: "promise" },
          ...state.invoices.slice(1),
        ],
      }),
    ).toBe(false);
    expect(
      validReceivables({
        ...state,
        invoices: [state.invoices[0], state.invoices[0], state.invoices[2]],
      }),
    ).toBe(false);
  });
});
describe("Shared date parsing", () => {
  it.each([undefined, null, "", "invalid", "2026-02-30", "26/09/2026"])(
    "gracefully handles %s",
    (value) => expect(parseDate(value)).toBeNull(),
  );
  it("handles ISO date strings and server-shaped microseconds", () => {
    expect(dateLabel("2026-09-26")).toBe("26 Sep 2026");
    expect(parseDate("2026-09-26T10:12:33.123456+05:30")).not.toBeNull();
  });
  it("uses the fixed sample clock and clamps future dates", () => {
    expect(overdueDays("2026-09-12")).toBe(14);
    expect(overdueDays("2026-10-01")).toBe(0);
    expect(overdueDays(undefined)).toBe(0);
  });
});
