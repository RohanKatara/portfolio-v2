import { useState } from "react";
import {
  customer,
  products,
  quoteScenarios,
  type QuoteScenario,
} from "../data/catalogue";
import {
  approveQuote,
  canApproveQuote,
  initialQuote,
  quoteLines,
  quoteTask,
} from "../features/rules";
import { useStoredState, validQuote } from "../lib/storage";
import Icon from "../components/Icon";
import {
  Activity,
  DemoHeader,
  EmptyResult,
  NextDemo,
  Notice,
  PanelTitle,
  Pill,
  ScenarioPicker,
} from "../components/UI";
import RunControl from "../components/RunControl";
import { LineTable, QuoteDocument, Totals } from "../components/Documents";
import { BusinessContext, WorkContext } from "../components/WorkContext";
import QuoteFollowUp from "../components/QuoteFollowUp";

function sourceText(scenario: QuoteScenario) {
  if (scenario === "ambiguous")
    return "Hi team,\n\nPlease quote for 2 units of your 1 HP industrial motor. We need delivery to our Pimpri workshop next week.\n\nPlease share availability and your best rate.\n\nThank you,";
  if (scenario === "quantity")
    return "Hi team,\n\nWe need B72 industrial V-belts for the next maintenance cycle. Please send your quotation, including GST, for delivery to our Pimpri workshop.\n\nThank you,";
  const [bearing, belt] = quoteLines(initialQuote());
  return `Hi team,\n\nPlease share a quotation for:\n• ${bearing.quantity} pcs — 6204 sealed ball bearings\n• ${belt.quantity} pcs — B72 industrial V-belts\n\nInclude GST and deliver to our Pimpri workshop. Please confirm your quotation by tomorrow.\n\nThank you,`;
}
export default function Quotes() {
  const { state, update, notice } = useStoredState(
    "quotes",
    initialQuote,
    validQuote,
  );
  const [runVersion, setRunVersion] = useState(0);
  const lines = quoteLines(state);
  const processed = state.stage !== "input";
  const completed = state.stage === "complete";
  const reset = () => {
    update({ ...initialQuote(), scenario: state.scenario });
    setRunVersion((v) => v + 1);
  };
  const activities = [
    "Sample enquiry loaded from Apex Engineering Works.",
    ...(processed
      ? [
          "Preset requirements revealed and checked against the sample catalogue.",
          `Enquiry RFQ-048 captured and assigned to ${state.owner}.`,
        ]
      : []),
    ...(state.clarification
      ? [
          state.scenario === "ambiguous"
            ? `Clarification selected: ${products[state.clarification].name}.`
            : `Customer clarification selected: ${state.clarification} pieces.`,
        ]
      : []),
    ...(completed
      ? [
          "Quotation QT-2026-048 approved in the sample workspace.",
          "Follow-up preview prepared; no message sent.",
        ]
      : []),
    ...(state.followedUp
      ? ["Sample follow-up reviewed; next decision check is due 30 Sep."]
      : []),
    ...(state.outcome !== "pending"
      ? [`Customer ${state.outcome} quotation; further follow-up stopped.`]
      : []),
  ];
  return (
    <div className="demo-page">
      <DemoHeader
        number="01"
        category="SALES OPERATIONS"
        title="From enquiry to quotation."
        description="Capture the enquiry, assign a salesperson, and track the quotation until the customer decides."
        onReset={reset}
      />
      {notice && <Notice tone="info">{notice}</Notice>}
      <BusinessContext
        manual="Copying enquiry details, looking up prices and remembering which quotations still need a reply."
        outcome="A checked quotation with an owner and a dated next action. Missing specifications and overdue follow-ups stay visible."
      />
      <ScenarioPicker
        scenarios={quoteScenarios}
        selected={state.scenario}
        onSelect={(scenario) => {
          if (scenario !== state.scenario)
            update({ ...initialQuote(), scenario });
        }}
      />
      <RunControl
        key={state.scenario + runVersion}
        complete={processed}
        onFinish={() => update({ ...state, stage: "review" })}
      />
      <WorkContext
        task={quoteTask(state)}
        asOf={state.asOf}
        onAssign={
          processed ? (owner) => update({ ...state, owner }) : undefined
        }
      />
      <div className="work-grid">
        <section className="workspace-panel source-panel">
          <PanelTitle
            number="01"
            right={<Pill tone="neutral">Email example</Pill>}
          >
            The incoming enquiry
          </PanelTitle>
          <div className="source-wrap">
            <div className="email-card">
              <div className="email-toolbar">
                <span>INBOX / NEW ENQUIRY</span>
                <span className="window-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="email-content">
                <div className="email-sender">
                  <span className="avatar">ND</span>
                  <div>
                    <strong>{customer.contact}</strong>
                    <small>{customer.email}</small>
                  </div>
                </div>
                <div className="email-subject">
                  {state.scenario === "ambiguous"
                    ? "Quotation required — 1 HP motors"
                    : state.scenario === "quantity"
                      ? "Requirement for B72 V-belts"
                      : "RFQ — Bearings & V-belts"}
                </div>
                <div className="email-text">{sourceText(state.scenario)}</div>
                <div className="email-signature">
                  <strong>{customer.contact}</strong>Purchase Department
                  <br />
                  {customer.name}
                </div>
                <span className="sample-stamp">
                  FICTIONAL ENQUIRY · 26 SEP 2026
                </span>
              </div>
            </div>
            <div className="source-context">
              <div>
                <span>BUSINESS</span>{" "}
                <strong>Industrial components supplier</strong>
              </div>
              <div>
                <span>THE HANDOFF</span>
                <strong>Sales desk → quote approval</strong>
              </div>
            </div>
            <p className="source-note">
              <Icon name="lock" size={13} />
              This is a preset example. No customer information is collected.
            </p>
          </div>
        </section>
        <section className="workspace-panel result-panel">
          <PanelTitle
            number="02"
            right={
              <Pill
                tone={
                  completed
                    ? "success"
                    : processed && lines.length === 0
                      ? "warning"
                      : "neutral"
                }
              >
                {completed
                  ? "Approved"
                  : processed
                    ? lines.length
                      ? "Review ready"
                      : "Needs your input"
                    : "Awaiting run"}
              </Pill>
            }
          >
            The next step
          </PanelTitle>
          {!processed ? (
            <EmptyResult icon="file" title="Your next quotation starts here.">
              Run this example to see requirements become matched products and a
              reviewable quote.
            </EmptyResult>
          ) : completed ? (
            <>
              <div className="success-heading">
                <span>
                  <Icon name="check" size={17} />
                </span>
                <div>
                  <h2>Quotation approved</h2>
                  <p>Sample document ready for review or printing.</p>
                </div>
              </div>
              <div className="panel-body">
                <QuoteDocument lines={lines} />
                <div
                  className="button-row print-actions"
                  style={{ marginTop: 17 }}
                >
                  <button
                    className="button secondary"
                    onClick={() => window.print()}
                  >
                    <Icon name="print" size={16} />
                    Print quotation
                  </button>
                  {state.outcome === "pending" && (
                    <button
                      className="text-button"
                      onClick={() =>
                        update({ ...state, stage: "review", followedUp: false })
                      }
                    >
                      Back to review
                      <Icon name="arrow" size={14} />
                    </button>
                  )}
                </div>
                <QuoteFollowUp state={state} update={update} />
              </div>
            </>
          ) : (
            <div className="panel-body">
              <div className="review-summary">
                <span>
                  <Icon name="check" size={17} />
                </span>
                <div>
                  <h2>
                    {lines.length
                      ? "Requirements, made clear."
                      : "One detail needs a person."}
                  </h2>
                  <p>
                    Prepared interpretation · Checked against the sample
                    catalogue
                  </p>
                </div>
              </div>
              {state.scenario === "ambiguous" && (
                <>
                  <Notice>
                    <strong>The motor phase isn’t specified.</strong>
                    <small>
                      Both catalogue matches fit “1 HP”. Choose the preset
                      clarification from the customer.
                    </small>
                  </Notice>
                  <div
                    className="choice-options"
                    aria-label="Motor clarification"
                  >
                    {(["motor1", "motor3"] as const).map((id) => (
                      <button
                        className={
                          "choice-button " +
                          (state.clarification === id ? "selected" : "")
                        }
                        aria-pressed={state.clarification === id}
                        key={id}
                        onClick={() => update({ ...state, clarification: id })}
                      >
                        <Icon
                          name={state.clarification === id ? "check" : "box"}
                          size={14}
                        />
                        {id === "motor1" ? "Single phase" : "Three phase"}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {state.scenario === "quantity" && (
                <>
                  <Notice>
                    <strong>The required quantity is missing.</strong>
                    <small>
                      A quote needs an exact quantity. Choose a preset customer
                      response to continue.
                    </small>
                  </Notice>
                  <div
                    className="choice-options"
                    aria-label="Quantity clarification"
                  >
                    {["10", "20"].map((q) => (
                      <button
                        className={
                          "choice-button " +
                          (state.clarification === q ? "selected" : "")
                        }
                        aria-pressed={state.clarification === q}
                        key={q}
                        onClick={() => update({ ...state, clarification: q })}
                      >
                        <Icon
                          name={state.clarification === q ? "check" : "box"}
                          size={14}
                        />
                        We need {q} pieces
                      </button>
                    ))}
                  </div>
                </>
              )}
              {lines.length > 0 ? (
                <>
                  <LineTable lines={lines} />
                  <Totals lines={lines} />
                </>
              ) : (
                <p className="review-footnote">
                  Pricing appears after the missing detail is resolved. Approval
                  is paused.
                </p>
              )}
              <div className="review-actions">
                <button
                  className="button primary"
                  disabled={!canApproveQuote(state)}
                  onClick={() => update(approveQuote(state))}
                >
                  Approve quotation
                  <Icon name="arrow" size={16} />
                </button>
                <p>
                  {canApproveQuote(state)
                    ? "Prices come from the sample catalogue. You approve the final quotation."
                    : "Resolve the clarification above to enable approval."}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      <Activity items={activities} />
      <NextDemo
        to="/orders"
        title="Now, let’s check a purchase order."
        text="See how a price mismatch is caught before an order is entered."
      />
    </div>
  );
}
