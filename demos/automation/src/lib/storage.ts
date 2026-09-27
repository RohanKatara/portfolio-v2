import { useState } from "react";
import {
  type OrderState,
  type QuoteState,
  type ReceivablesState,
  quoteLines,
  poKey,
  hasPriceDifference,
  needsMapping,
} from "../features/rules";
import {
  orderScenarios,
  quoteScenarios,
  replies,
  owners,
} from "../data/catalogue";
import { parseDate } from "./dates";
export const VERSION = 2;
export const storageKey = (name: string) => "workflow-studio:" + name;
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const stages = ["input", "review", "complete"];
export function validQuote(v: unknown): v is QuoteState {
  if (
    !object(v) ||
    !quoteScenarios.some((s) => s.id === v.scenario) ||
    !stages.includes(String(v.stage)) ||
    typeof v.clarification !== "string" ||
    !owners.some((owner) => owner === v.owner) ||
    !["2026-09-26", "2026-09-29"].includes(String(v.asOf)) ||
    typeof v.followedUp !== "boolean" ||
    !["pending", "accepted", "declined"].includes(String(v.outcome))
  )
    return false;
  const allowed =
    v.scenario === "standard"
      ? [""]
      : v.scenario === "ambiguous"
        ? ["", "motor1", "motor3"]
        : ["", "10", "20"];
  if (!allowed.includes(v.clarification)) return false;
  if (v.stage !== "complete" && (v.followedUp || v.outcome !== "pending"))
    return false;
  return v.stage !== "complete" || quoteLines(v as QuoteState).length > 0;
}
export function validOrder(v: unknown): v is OrderState {
  if (
    !object(v) ||
    !orderScenarios.some((s) => s.id === v.scenario) ||
    !stages.includes(String(v.stage)) ||
    !["", "correct", "honour"].includes(String(v.resolution)) ||
    !Array.isArray(v.created) ||
    !["", "bearing"].includes(String(v.mapping)) ||
    (v.scenario !== "unmapped" && v.mapping !== "")
  )
    return false;
  if (
    v.created.some(
      (k) => !["apex:AEW-2048", "apex:AEW-2049", "apex:AEW-2050"].includes(k),
    ) ||
    new Set(v.created).size !== v.created.length
  )
    return false;
  return (
    v.stage !== "complete" ||
    (v.scenario !== "duplicate" &&
      v.created.includes(poKey(v.scenario as OrderState["scenario"])) &&
      !needsMapping(v as OrderState) &&
      (!hasPriceDifference(v as OrderState) || v.resolution !== ""))
  );
}
export function validReceivables(v: unknown): v is ReceivablesState {
  if (
    !object(v) ||
    !stages.includes(String(v.stage)) ||
    !["2026-09-26", "2026-10-01"].includes(String(v.asOf)) ||
    !replies.some((r) => r.id === v.reply) ||
    !Array.isArray(v.invoices) ||
    v.invoices.length !== 3
  )
    return false;
  const ids = new Set<string>();
  for (const i of v.invoices) {
    if (
      !object(i) ||
      typeof i.id !== "string" ||
      !["INV-1042", "INV-1038", "INV-1045"].includes(i.id) ||
      ids.has(i.id) ||
      typeof i.customer !== "string" ||
      i.customer.length > 100 ||
      !Number.isSafeInteger(i.amount) ||
      !Number.isSafeInteger(i.paid) ||
      (i.amount as number) <= 0 ||
      (i.paid as number) < 0 ||
      (i.paid as number) > (i.amount as number) ||
      !parseDate(i.due) ||
      !owners.some((owner) => owner === i.owner) ||
      (i.status === "paid"
        ? i.nextActionDate !== ""
        : !parseDate(i.nextActionDate)) ||
      !(i.lastReply === "" || replies.some((r) => r.id === i.lastReply)) ||
      !["", "documents-provided", "delivery-verified"].includes(
        String(i.resolution),
      ) ||
      !Array.isArray(i.activity) ||
      i.activity.length > 12 ||
      i.activity.some(
        (entry) => typeof entry !== "string" || entry.length > 300,
      ) ||
      !["open", "promise", "disputed", "documents", "verify", "paid"].includes(
        String(i.status),
      )
    )
      return false;
    if (
      (i.status === "paid") !== (i.paid === i.amount) ||
      (i.status === "promise" && !parseDate(i.promiseDate))
    )
      return false;
    ids.add(i.id);
  }
  return typeof v.selected === "string" && ids.has(v.selected);
}
export function decodeStored<T>(
  raw: string | null,
  seed: () => T,
  validate: (v: unknown) => v is T,
): { state: T; restored: boolean } {
  try {
    const decoded: unknown = raw ? JSON.parse(raw) : null;
    if (
      object(decoded) &&
      decoded.version === VERSION &&
      validate(decoded.state)
    )
      return { state: decoded.state, restored: true };
  } catch {
    /* Incompatible sample state is replaced by the current fixtures. */
  }
  return { state: seed(), restored: false };
}
export function useStoredState<T>(
  name: string,
  seed: () => T,
  validate: (v: unknown) => v is T,
) {
  const [initial] = useState(() => {
    try {
      // React may retry a suspended render. Reading must not overwrite the
      // original value, or a retry loses the recovery notice.
      const raw = sessionStorage.getItem(storageKey(name));
      const loaded = decodeStored(raw, seed, validate);
      return {
        state: loaded.state,
        notice:
          raw && !loaded.restored
            ? "Older demo progress was reset to the current sample data."
            : "",
      };
    } catch {
      return {
        state: seed(),
        notice:
          "Storage is unavailable. This demo still works; refreshing will reset progress.",
      };
    }
  });
  const [state, setState] = useState(initial.state);
  const [notice, setNotice] = useState(initial.notice);
  function update(next: T) {
    setState(next);
    try {
      sessionStorage.setItem(
        storageKey(name),
        JSON.stringify({ version: VERSION, state: next }),
      );
    } catch {
      setNotice(
        "Storage is unavailable. This demo still works; refreshing will reset progress.",
      );
    }
  }
  return { state, update, notice };
}
