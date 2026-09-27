import {
  type OrderScenario,
  type QuoteScenario,
  products,
  type ReplyKind,
  type Owner,
} from "../data/catalogue";
import { type Line } from "../lib/money";
import { DEMO_DATE, daysBetween, moveDate } from "../lib/dates";
export type Stage = "input" | "review" | "complete";
export type WorkTask = {
  title: string;
  reason: string;
  owner: string;
  due: string | null;
  closed?: boolean;
};
export type QuoteState = {
  scenario: QuoteScenario;
  stage: Stage;
  clarification: string;
  owner: Owner;
  asOf: string;
  followedUp: boolean;
  outcome: "pending" | "accepted" | "declined";
};
export const initialQuote = (): QuoteState => ({
  scenario: "standard",
  stage: "input",
  clarification: "",
  owner: "Meera Shah",
  asOf: DEMO_DATE,
  followedUp: false,
  outcome: "pending",
});
export function quoteLines(state: QuoteState): Line[] {
  if (state.scenario === "standard")
    return [
      { productId: "bearing", quantity: 24 },
      { productId: "belt", quantity: 10 },
    ];
  if (state.scenario === "ambiguous")
    return state.clarification === "motor1" || state.clarification === "motor3"
      ? [{ productId: state.clarification, quantity: 2 }]
      : [];
  return state.clarification === "10" || state.clarification === "20"
    ? [{ productId: "belt", quantity: Number(state.clarification) }]
    : [];
}
export const canApproveQuote = (state: QuoteState) =>
  state.stage === "review" && quoteLines(state).length > 0;
export const approveQuote = (state: QuoteState): QuoteState =>
  canApproveQuote(state) ? { ...state, stage: "complete" } : state;
export function quoteTask(state: QuoteState): WorkTask {
  const owner = state.stage === "input" ? "Awaiting assignment" : state.owner;
  if (state.stage === "input")
    return {
      owner,
      due: DEMO_DATE,
      title: "Capture and assign enquiry",
      reason: "One sample email is waiting at the sales desk.",
    };
  if (state.stage === "review")
    return {
      owner,
      due: DEMO_DATE,
      title: quoteLines(state).length
        ? "Review quotation"
        : "Obtain missing specification",
      reason: quoteLines(state).length
        ? "Catalogue pricing is ready for approval."
        : "Approval is blocked until the customer clarifies the requirement.",
    };
  if (state.outcome !== "pending")
    return {
      owner,
      due: null,
      closed: true,
      title:
        state.outcome === "accepted"
          ? "Customer accepted"
          : "Customer declined",
      reason: "Decision recorded. No further quotation follow-up is scheduled.",
    };
  return {
    owner,
    due: state.followedUp ? "2026-09-30" : "2026-09-28",
    title: state.followedUp
      ? "Check for customer decision"
      : "Follow up on quotation",
    reason: state.followedUp
      ? "Sample follow-up reviewed; a customer decision is still outstanding."
      : "Quotation approved; no customer decision is recorded.",
  };
}
export function recordQuoteFollowUp(state: QuoteState): QuoteState {
  return state.stage === "complete" &&
    state.outcome === "pending" &&
    !state.followedUp
    ? { ...state, followedUp: true }
    : state;
}
export function decideQuote(
  state: QuoteState,
  outcome: "accepted" | "declined",
): QuoteState {
  return state.stage === "complete" && state.outcome === "pending"
    ? { ...state, outcome }
    : state;
}

export type OrderState = {
  scenario: OrderScenario;
  stage: Stage;
  resolution: string;
  created: string[];
  mapping: "" | "bearing";
};
export const initialOrder = (): OrderState => ({
  scenario: "clean",
  stage: "input",
  resolution: "",
  created: [],
  mapping: "",
});
export const poReference = (scenario: OrderScenario) =>
  scenario === "unmapped"
    ? "AEW-2050"
    : scenario === "mismatch"
      ? "AEW-2049"
      : "AEW-2048";
export const hasPriceDifference = (state: OrderState) =>
  ["mismatch", "unmapped"].includes(state.scenario);
export const needsMapping = (state: OrderState) =>
  state.scenario === "unmapped" && state.mapping !== "bearing";
export const poKey = (scenario: OrderScenario) =>
  "apex:" + poReference(scenario);
export function duplicateOrder(state: OrderState) {
  return (
    state.scenario === "duplicate" ||
    state.created.includes(poKey(state.scenario))
  );
}
export function orderLines(state: OrderState, source = false): Line[] {
  const sourcePrice = hasPriceDifference(state)
    ? 30000
    : products.bearing.price;
  const useSourcePrice = source || state.resolution === "honour";
  return [
    {
      productId: "bearing",
      quantity: 24,
      unitPrice: useSourcePrice ? sourcePrice : products.bearing.price,
    },
    { productId: "belt", quantity: 10 },
  ];
}
export function canApproveOrder(state: OrderState) {
  return (
    state.stage === "review" &&
    !duplicateOrder(state) &&
    !needsMapping(state) &&
    (!hasPriceDifference(state) ||
      ["correct", "honour"].includes(state.resolution))
  );
}
export function approveOrder(state: OrderState): OrderState {
  return canApproveOrder(state)
    ? {
        ...state,
        stage: "complete",
        created: [...state.created, poKey(state.scenario)],
      }
    : state;
}

export type Invoice = {
  id: string;
  customer: string;
  amount: number;
  paid: number;
  due: string;
  status: "open" | "promise" | "disputed" | "documents" | "verify" | "paid";
  promiseDate?: string;
  owner: Owner;
  nextActionDate: string;
  lastReply: ReplyKind | "";
  resolution: "" | "documents-provided" | "delivery-verified";
  activity: string[];
};
export const seedInvoices = (): Invoice[] =>
  [
    {
      id: "INV-1042",
      customer: "Apex Engineering Works",
      amount: 1437240,
      paid: 0,
      due: "2026-09-12",
    },
    {
      id: "INV-1038",
      customer: "Meridian Packaging",
      amount: 2832000,
      paid: 0,
      due: "2026-09-05",
    },
    {
      id: "INV-1045",
      customer: "Vertex Machine Tools",
      amount: 944000,
      paid: 0,
      due: "2026-09-20",
    },
  ].map((invoice) => ({
    ...invoice,
    status: "open",
    owner: "Meera Shah",
    nextActionDate: DEMO_DATE,
    lastReply: "",
    resolution: "",
    activity: [
      "Sample invoice loaded; outstanding balance requires follow-up.",
    ],
  }));
export type ReceivablesState = {
  selected: string;
  stage: Stage;
  reply: ReplyKind;
  invoices: Invoice[];
  asOf: string;
};
export const initialReceivables = (): ReceivablesState => ({
  selected: "INV-1042",
  stage: "input",
  reply: "promise",
  invoices: seedInvoices(),
  asOf: DEMO_DATE,
});
export const balance = (invoice: Invoice) =>
  Math.max(0, invoice.amount - invoice.paid);
export const eligible = (invoice: Invoice, asOf: string = DEMO_DATE) =>
  balance(invoice) > 0 &&
  (daysBetween(asOf, invoice.due) ?? -1) > 0 &&
  (daysBetween(asOf, invoice.nextActionDate) ?? -1) >= 0 &&
  (invoice.status === "open" ||
    (invoice.status === "promise" &&
      (daysBetween(asOf, invoice.promiseDate) ?? -1) > 0));
export const nextPromiseDate = (asOf: string) =>
  (daysBetween(asOf, "2026-09-30") ?? 0) >= 0 ? "2026-10-05" : "2026-09-30";
const logAction = (invoice: Invoice, text: string) =>
  [...invoice.activity, text].slice(-12);
export function invoiceTask(invoice: Invoice, asOf: string): WorkTask {
  const common = {
    owner: invoice.owner,
    due: invoice.status === "paid" ? null : invoice.nextActionDate,
  };
  if (invoice.status === "paid")
    return {
      ...common,
      closed: true,
      title: "Payment verified",
      reason: "Balance cleared. Reminders stopped.",
    };
  if (invoice.status === "documents")
    return {
      ...common,
      title: "Provide missing invoice copy",
      reason:
        "Customer cannot process the invoice without its copy. Routine reminders paused.",
    };
  if (invoice.status === "disputed")
    return {
      ...common,
      title: "Check delivery evidence",
      reason:
        "Quantity disputed. Resolve the discrepancy before chasing payment.",
    };
  if (invoice.status === "verify")
    return {
      ...common,
      title: "Verify receipt against bank record",
      reason: "Customer says paid; the outstanding balance is unchanged.",
    };
  if (invoice.status === "promise")
    return {
      ...common,
      title: eligible(invoice, asOf)
        ? "Follow up on missed promise"
        : "Check promised payment",
      reason: eligible(invoice, asOf)
        ? "Promised date passed without a confirmed receipt."
        : "Hold routine reminders until the promise date has passed.",
    };
  return {
    ...common,
    title: "Request payment update",
    reason:
      invoice.resolution === "documents-provided"
        ? "Invoice copy provided in the sample; check the customer's next step."
        : invoice.resolution === "delivery-verified"
          ? "Delivery discrepancy resolved in the sample; payment remains outstanding."
          : "Overdue balance; no customer reply or payment recorded.",
  };
}
export function applyReply(state: ReceivablesState): ReceivablesState {
  if (state.stage !== "review") return state;
  const invoice = state.invoices.find((i) => i.id === state.selected);
  if (!invoice || !eligible(invoice, state.asOf)) return state;
  const status = {
    promise: "promise",
    dispute: "disputed",
    documents: "documents",
    paid: "verify",
  } as const;
  return {
    ...state,
    stage: "complete",
    invoices: state.invoices.map((i) =>
      i.id === state.selected
        ? {
            ...i,
            status: status[state.reply],
            promiseDate:
              state.reply === "promise"
                ? nextPromiseDate(state.asOf)
                : undefined,
            nextActionDate:
              state.reply === "promise"
                ? moveDate(nextPromiseDate(state.asOf), 1)
                : state.asOf,
            owner: state.reply === "dispute" ? "Arjun Rao" : "Meera Shah",
            lastReply: state.reply,
            resolution: "",
            activity: logAction(
              i,
              `${state.asOf}: ${state.reply === "promise" ? `Payment promised for ${nextPromiseDate(state.asOf)}.` : state.reply === "dispute" ? "Quantity dispute assigned to order desk; reminders paused." : state.reply === "documents" ? "Missing invoice copy assigned; reminders paused." : "Payment claimed; receipt verification assigned."}`,
            ),
          }
        : i,
    ),
  };
}
export function confirmPayment(state: ReceivablesState): ReceivablesState {
  if (state.stage === "input") return state;
  const selected = state.invoices.find((i) => i.id === state.selected);
  if (!selected || selected.status === "paid") return state;
  return {
    ...state,
    stage: "complete",
    invoices: state.invoices.map((i) =>
      i.id === state.selected
        ? {
            ...i,
            paid: i.amount,
            status: "paid",
            promiseDate: undefined,
            nextActionDate: "",
            activity: logAction(
              i,
              `${state.asOf}: Sample receipt explicitly verified. Balance cleared; reminders stopped.`,
            ),
          }
        : i,
    ),
  };
}
export function resolveInvoiceBlocker(
  state: ReceivablesState,
): ReceivablesState {
  const invoice = state.invoices.find((i) => i.id === state.selected);
  if (
    state.stage !== "complete" ||
    !invoice ||
    !["documents", "disputed"].includes(invoice.status)
  )
    return state;
  const documents = invoice.status === "documents";
  return {
    ...state,
    invoices: state.invoices.map((i) =>
      i.id === invoice.id
        ? {
            ...i,
            status: "open",
            owner: "Meera Shah",
            resolution: documents ? "documents-provided" : "delivery-verified",
            nextActionDate: documents ? moveDate(state.asOf, 2) : state.asOf,
            activity: logAction(
              i,
              `${state.asOf}: ${documents ? "Sample invoice copy marked provided; next check in two days. No message sent." : "Preset delivery evidence and customer confirmation resolve quantity dispute. Balance unchanged."}`,
            ),
          }
        : i,
    ),
  };
}
