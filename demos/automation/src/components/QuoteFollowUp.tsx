import {
  decideQuote,
  recordQuoteFollowUp,
  type QuoteState,
} from "../features/rules";
import { Notice } from "./UI";

export default function QuoteFollowUp({
  state,
  update,
}: {
  state: QuoteState;
  update: (state: QuoteState) => void;
}) {
  if (state.outcome !== "pending")
    return (
      <Notice tone="success" icon="check">
        <strong>
          {state.outcome === "accepted"
            ? "Customer acceptance recorded"
            : "Customer decline recorded"}
        </strong>
        <small>
          The opportunity is closed in this demo. Quotation follow-ups have
          stopped.{" "}
          {state.outcome === "accepted" &&
            "Sales can now request the customer's purchase order."}
        </small>
      </Notice>
    );
  return (
    <section
      className="after-output quote-follow-up"
      aria-label="Quotation follow-up"
    >
      <div className="eyebrow">ASSIGNED FOLLOW-UP · {state.owner}</div>
      <h3>
        {state.followedUp
          ? "Follow-up reviewed. Track the decision."
          : "Keep the quotation from being forgotten."}
      </h3>
      <p>
        Hi Neha, following up on QT-2026-048. Do the quantities and
        specifications meet your requirement? Please confirm how you would like
        to proceed.
      </p>
      <small>Message preview only. No email or WhatsApp message is sent.</small>
      <div className="action-stack">
        {state.asOf === "2026-09-26" && !state.followedUp && (
          <button
            className="button secondary"
            onClick={() => update({ ...state, asOf: "2026-09-29" })}
          >
            Advance sample date to 29 Sep
          </button>
        )}
        {!state.followedUp && (
          <button
            className="button primary"
            onClick={() => update(recordQuoteFollowUp(state))}
          >
            Record sample follow-up reviewed
          </button>
        )}
        <div className="choice-options" aria-label="Preset customer decision">
          <button
            className="choice-button"
            onClick={() => update(decideQuote(state, "accepted"))}
          >
            Customer accepts quotation
          </button>
          <button
            className="choice-button"
            onClick={() => update(decideQuote(state, "declined"))}
          >
            Customer declines quotation
          </button>
        </div>
      </div>
    </section>
  );
}
