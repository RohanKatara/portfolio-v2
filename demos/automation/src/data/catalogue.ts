export type Product = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price: number;
  taxBps: number;
};
export const products: Record<string, Product> = {
  bearing: {
    id: "bearing",
    sku: "BRG-6204-2RS",
    name: "6204 sealed ball bearing",
    unit: "pcs",
    price: 32000,
    taxBps: 1800,
  },
  belt: {
    id: "belt",
    sku: "VBT-B72",
    name: "B72 industrial V-belt",
    unit: "pcs",
    price: 45000,
    taxBps: 1800,
  },
  motor1: {
    id: "motor1",
    sku: "MTR-1HP-1P",
    name: "1 HP motor · single phase",
    unit: "pcs",
    price: 680000,
    taxBps: 1800,
  },
  motor3: {
    id: "motor3",
    sku: "MTR-1HP-3P",
    name: "1 HP motor · three phase",
    unit: "pcs",
    price: 740000,
    taxBps: 1800,
  },
};
export const supplier = {
  name: "Pragati Industrial Supplies",
  location: "Pune, Maharashtra",
  email: "sales@pragati.example",
};
export const customer = {
  name: "Apex Engineering Works",
  contact: "Neha Deshmukh",
  location: "Pimpri-Chinchwad, Pune",
  email: "purchase@apex.example",
};
export const quoteScenarios = [
  {
    id: "standard",
    label: "Standard enquiry",
    description: "Two products. One ready-to-review quote.",
    tag: "Happy path",
  },
  {
    id: "ambiguous",
    label: "Unclear specification",
    description: "The motor phase needs a clarification.",
    tag: "Exception",
  },
  {
    id: "quantity",
    label: "Missing quantity",
    description: "A quantity is needed before quoting.",
    tag: "Exception",
  },
] as const;
export type QuoteScenario = (typeof quoteScenarios)[number]["id"];
export const orderScenarios = [
  {
    id: "clean",
    label: "Clean purchase order",
    description: "Match, validate, and prepare an order.",
    tag: "Happy path",
  },
  {
    id: "mismatch",
    label: "Price mismatch",
    description: "Spot a difference before it reaches accounts.",
    tag: "Exception",
  },
  {
    id: "unmapped",
    label: "Unfamiliar item code",
    description: "Clarify the item, then resolve a rate difference.",
    tag: "Exception",
  },
  {
    id: "duplicate",
    label: "Duplicate order",
    description: "Catch a PO that has already been entered.",
    tag: "Exception",
  },
] as const;
export type OrderScenario = (typeof orderScenarios)[number]["id"];
export const replies = [
  {
    id: "promise",
    label: "Promise to pay",
    text: "We will clear invoice INV-1042 on 30 September 2026. Please hold the reminder until then.",
    interpretation: "A specific payment promise",
    action:
      "Record the promised date and schedule the next check for the following day.",
  },
  {
    id: "dispute",
    label: "Quantity dispute",
    text: "The quantity on INV-1042 does not match our goods-received record. Please check the signed delivery note before we process payment.",
    interpretation: "A quantity discrepancy needs review",
    action:
      "Flag the invoice for the account owner and pause routine reminders.",
  },
  {
    id: "documents",
    label: "Invoice copy needed",
    text: "Could you send a copy of INV-1042? Our accounts team cannot find the invoice.",
    interpretation: "A request for a supporting document",
    action:
      "Assign the missing invoice copy and pause reminders until the document is provided.",
  },
  {
    id: "paid",
    label: "Customer says paid",
    text: "We have transferred the full amount for INV-1042. Please check and confirm receipt.",
    interpretation: "Payment claimed · receipt unverified",
    action:
      "Request a receipt check. Keep the balance open until payment is confirmed.",
  },
] as const;
export type ReplyKind = (typeof replies)[number]["id"];
export const owners = ["Meera Shah", "Arjun Rao"] as const;
export type Owner = (typeof owners)[number];
