import { useState } from "react";
import { customer, orderScenarios, products } from "../data/catalogue";
import {
  approveOrder,
  canApproveOrder,
  duplicateOrder,
  initialOrder,
  orderLines,
  poReference,
  hasPriceDifference,
  needsMapping,
} from "../features/rules";
import { money } from "../lib/money";
import { useStoredState, validOrder } from "../lib/storage";
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
import { LineTable, Totals } from "../components/Documents";
import { BusinessContext, WorkContext } from "../components/WorkContext";
import { downloadOrder } from "../lib/order-export";
import { DEMO_DATE } from "../lib/dates";
export default function Orders() {
  const { state, update, notice } = useStoredState(
    "orders",
    initialOrder,
    validOrder,
  );
  const [runVersion, setRunVersion] = useState(0);
  const [showExisting, setShowExisting] = useState(false);
  const processed = state.stage !== "input";
  const completed = state.stage === "complete";
  const duplicate = duplicateOrder(state);
  const lines = orderLines(state);
  const sourceLines = orderLines(state, true);
  const reference = poReference(state.scenario);
  const mappingRequired = needsMapping(state);
  const priceMismatch = hasPriceDifference(state);
  const blockedChecks =
    Number(mappingRequired) + Number(priceMismatch && !state.resolution);
  const reset = () => {
    update({ ...initialOrder(), scenario: state.scenario });
    setRunVersion((v) => v + 1);
    setShowExisting(false);
  };
  const activities = [
    "Sample purchase order " + reference + " loaded.",
    ...(processed
      ? [
          mappingRequired
            ? "Customer code AE-BRG04 requires a confirmed catalogue mapping."
            : "Prepared line items matched to internal product codes.",
        ]
      : []),
    ...(processed && !completed && duplicate
      ? ["Existing customer / PO reference found. New order blocked."]
      : []),
    ...(state.mapping
      ? [
          "Preset customer confirmation: AE-BRG04 means a 6204 bearing with rubber seals. Mapped to BRG-6204-2RS.",
        ]
      : []),
    ...(processed && priceMismatch
      ? [
          "Bearing rate difference flagged: ₹300.00 on the PO, ₹320.00 in the catalogue.",
        ]
      : []),
    ...(state.resolution
      ? [
          state.resolution === "correct"
            ? "Sample customer correction selected: use the agreed catalogue rate."
            : "Sample manager exception selected: honour the customer’s PO rate.",
        ]
      : []),
    ...(completed
      ? [
          "One sales-order draft created in the sample workspace. No ERP entry sent.",
        ]
      : []),
  ];
  return (
    <div className="demo-page">
      <DemoHeader
        number="02"
        category="ORDER OPERATIONS"
        title="A checked order. A cleaner handoff."
        description="Turn a customer's PO into a sales-order draft. Review unfamiliar items and price differences before the handoff."
        onReset={reset}
      />
      {notice && <Notice tone="info">{notice}</Notice>}
      <BusinessContext
        manual="Reading customer POs, translating their item codes, checking prices and typing the same details into the order system."
        outcome="A structured sales-order draft with visible checks, explicit decisions and duplicate protection. Download the approved sample handoff."
      />
      <ScenarioPicker
        scenarios={orderScenarios}
        selected={state.scenario}
        onSelect={(scenario) => {
          if (scenario !== state.scenario) {
            update({ ...initialOrder(), scenario, created: state.created });
            setShowExisting(false);
          }
        }}
      />
      <RunControl
        key={state.scenario + runVersion}
        complete={processed}
        onFinish={() => update({ ...state, stage: "review" })}
        labels={[
          "Read example",
          "Match items",
          "Validate order",
          "Ready to review",
        ]}
      />
      <WorkContext
        asOf={DEMO_DATE}
        task={{
          owner: "Arjun Rao · Order desk",
          due: completed || (processed && duplicate) ? null : DEMO_DATE,
          closed: completed || (processed && duplicate),
          title: completed
            ? "Sales-order draft ready for handoff"
            : !processed
              ? "Check incoming customer PO"
              : duplicate
                ? "Review existing order; no second entry"
                : blockedChecks
                  ? `Resolve ${blockedChecks} blocked ${blockedChecks === 1 ? "check" : "checks"}`
                  : "Approve checked order",
          reason: completed
            ? "Reviewed line items are ready to download; no ERP entry has been sent."
            : "The customer places an order with your business. This workflow prepares your internal sales order.",
        }}
      />
      <div className="work-grid">
        <section className="workspace-panel source-panel">
          <PanelTitle
            number="01"
            right={<Pill tone="neutral">PO example</Pill>}
          >
            The customer document
          </PanelTitle>
          <div className="source-wrap">
            <div className="paper">
              <div className="paper-top">
                <span className="paper-logo">A.</span>
                <span className="paper-type">
                  PURCHASE ORDER
                  <br />
                  <b>{reference}</b>
                </span>
              </div>
              <div className="paper-company">
                <strong>{customer.name}</strong>
                <small>Purchase Department · {customer.location}</small>
              </div>
              <div className="paper-meta">
                <div>
                  <span>SUPPLIER</span>
                  <strong>Pragati Industrial Supplies</strong>
                  <small>Pune, Maharashtra</small>
                </div>
                <div>
                  <span>ORDER DATE</span>
                  <strong>26 Sep 2026</strong>
                  <small>Delivery: 03 Oct 2026</small>
                </div>
              </div>
              <LineTable
                lines={sourceLines}
                customerCode={state.scenario === "unmapped"}
              />
              <Totals lines={sourceLines} />
              <div className="paper-footer">
                <Icon name="file" size={14} />
                <span>
                  Payment terms: 30 days from invoice.
                  <br />
                  <small>Preset document · Fictional order</small>
                </span>
              </div>
            </div>
            <div className="source-context">
              <div>
                <span>CUSTOMER REFERENCE</span>
                <strong>{reference}</strong>
              </div>
              <div>
                <span>THE HANDOFF</span>
                <strong>Order desk → sales order</strong>
              </div>
            </div>
            <p className="source-note">
              <Icon name="lock" size={13} />
              Document fields are predefined. No upload or live extraction is
              used.
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
                    : processed && (duplicate || blockedChecks > 0)
                      ? "warning"
                      : "neutral"
                }
              >
                {completed
                  ? "Draft created"
                  : processed
                    ? duplicate
                      ? "Duplicate found"
                      : blockedChecks > 0
                        ? "Review needed"
                        : "Checks passed"
                    : "Awaiting run"}
              </Pill>
            }
          >
            Validation & approval
          </PanelTitle>
          {!processed ? (
            <EmptyResult icon="box" title="Check once. Enter once.">
              Run the example to match products, compare prices, and check
              whether this order already exists.
            </EmptyResult>
          ) : completed ? (
            <>
              <div className="success-heading">
                <span>
                  <Icon name="check" size={17} />
                </span>
                <div>
                  <h2>Sales-order draft created</h2>
                  <p>One approved order. A clear record of your decision.</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="order-success-number">
                  <span>SO-{reference.slice(-4)}</span>
                  <Pill tone="success">Sample draft</Pill>
                </div>
                <LineTable lines={lines} />
                <Totals lines={lines} />
                <div className="review-actions">
                  <button
                    className="button primary"
                    onClick={() => downloadOrder(state)}
                  >
                    <Icon name="file" size={16} />
                    Download sample order CSV
                  </button>
                  <p>
                    A generic draft for review. Your accounting system may need
                    a different import format.
                  </p>
                </div>
                <div className="after-output">
                  <div className="eyebrow">
                    <Icon name="layers" size={13} />
                    READY FOR THE NEXT HANDOFF
                  </div>
                  <h3>Order desk → dispatch planning</h3>
                  <p>
                    The reviewed quantities and prices are ready for a connected
                    order-management system.
                  </p>
                  <small>
                    This draft exists only in the demo. No Tally, ERP, or
                    customer message was created.
                  </small>
                </div>
                <div className="review-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      update({ ...state, stage: "review" });
                      setShowExisting(false);
                    }}
                  >
                    <Icon name="lock" size={15} />
                    Check this PO again
                  </button>
                  <p>
                    Rechecking the same reference demonstrates duplicate
                    protection.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="panel-body">
              <div className="review-summary">
                <span>
                  <Icon name={duplicate ? "lock" : "check"} size={17} />
                </span>
                <div>
                  <h2>
                    {duplicate
                      ? "This order already exists."
                      : mappingRequired
                        ? "One customer item needs clarification."
                        : "Two items, matched."}
                  </h2>
                  <p>
                    Customer reference: {reference} ·{" "}
                    {mappingRequired
                      ? "Item mapping pending"
                      : "Product units verified"}
                  </p>
                </div>
              </div>
              {duplicate ? (
                <>
                  <div className="duplicate-box">
                    <Icon name="lock" size={29} />
                    <h3>A second order is blocked.</h3>
                    <p>
                      The same customer and PO reference match an existing
                      record. Repeating this action won’t create another order.
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => setShowExisting((v) => !v)}
                      aria-expanded={showExisting}
                    >
                      {showExisting
                        ? "Hide existing order"
                        : "View existing order"}
                      <Icon name="arrow" size={15} />
                    </button>
                    {showExisting && (
                      <div className="existing-order">
                        <strong>
                          SO-{reference.slice(-4)} · {reference}
                        </strong>
                        {customer.name}
                        <br />
                        24 bearings · 10 V-belts
                        <br />
                        Already entered in the sample workspace.
                      </div>
                    )}
                  </div>
                  <button className="button primary" disabled>
                    Create sales-order draft
                    <Icon name="lock" size={15} />
                  </button>
                </>
              ) : (
                <>
                  <ul className="validation-checks" aria-label="Order checks">
                    <li>
                      <Icon name="check" size={15} />
                      Customer and PO reference{" "}
                      <Pill tone="success">Unique</Pill>
                    </li>
                    <li>
                      <Icon
                        name={mappingRequired ? "alert" : "check"}
                        size={15}
                      />
                      Catalogue mapping{" "}
                      <Pill tone={mappingRequired ? "warning" : "success"}>
                        {mappingRequired ? "1 item blocked" : "2 items matched"}
                      </Pill>
                    </li>
                    <li>
                      <Icon
                        name={
                          priceMismatch && !state.resolution ? "alert" : "check"
                        }
                        size={15}
                      />
                      Agreed prices{" "}
                      <Pill
                        tone={
                          priceMismatch && !state.resolution
                            ? "warning"
                            : "success"
                        }
                      >
                        {priceMismatch && !state.resolution
                          ? "Decision needed"
                          : "Checked"}
                      </Pill>
                    </li>
                  </ul>
                  {state.scenario === "unmapped" && (
                    <div className="mapping-review">
                      <Notice tone={mappingRequired ? "warning" : "success"}>
                        <strong>
                          AE-BRG04 →{" "}
                          {mappingRequired
                            ? "Internal SKU not confirmed"
                            : "BRG-6204-2RS"}
                        </strong>
                        <small>
                          “6204 bearing” does not identify the seal type. A
                          rubber-sealed bearing and a metal-shielded bearing are
                          different items.
                        </small>
                      </Notice>
                      <div className="after-output">
                        <div className="eyebrow">
                          PRESET CUSTOMER CLARIFICATION
                        </div>
                        <p>
                          “Our code AE-BRG04 means the 6204 bearing with rubber
                          seals on both sides. Please use your BRG-6204-2RS.”
                        </p>
                        {mappingRequired ? (
                          <button
                            className="button secondary"
                            onClick={() =>
                              update({ ...state, mapping: "bearing" })
                            }
                          >
                            Confirm mapping from customer reply
                          </button>
                        ) : (
                          <Pill tone="success">
                            Mapping confirmed by reviewer
                          </Pill>
                        )}
                      </div>
                    </div>
                  )}
                  {priceMismatch && (
                    <>
                      <Notice>
                        <strong>The bearing rate doesn’t match.</strong>
                        <small>
                          Resolve this difference before approving. The original
                          PO stays visible on the left.
                        </small>
                      </Notice>
                      <div className="comparison">
                        <div>
                          <span>On the customer PO</span>
                          <strong>{money(sourceLines[0].unitPrice!)}</strong>
                          <small>per bearing · 24 pieces</small>
                        </div>
                        <div>
                          <span>In the agreed price book</span>
                          <strong>{money(products.bearing.price)}</strong>
                          <small>₹480.00 difference before GST</small>
                        </div>
                      </div>
                      <div
                        className="choice-options"
                        aria-label="Price resolution"
                      >
                        <button
                          className={
                            "choice-button " +
                            (state.resolution === "correct" ? "selected" : "")
                          }
                          aria-pressed={state.resolution === "correct"}
                          onClick={() =>
                            update({ ...state, resolution: "correct" })
                          }
                        >
                          Customer corrects to ₹320
                        </button>
                        <button
                          className={
                            "choice-button " +
                            (state.resolution === "honour" ? "selected" : "")
                          }
                          aria-pressed={state.resolution === "honour"}
                          onClick={() =>
                            update({ ...state, resolution: "honour" })
                          }
                        >
                          Manager approves ₹300
                        </button>
                      </div>
                      {state.resolution && (
                        <Notice tone="info" icon="check">
                          {state.resolution === "correct"
                            ? "Preset customer correction selected. The draft uses the catalogue rate."
                            : "Preset manager exception selected. The draft honours the lower PO rate."}
                        </Notice>
                      )}
                    </>
                  )}
                  {!mappingRequired && (!priceMismatch || state.resolution) && (
                    <>
                      <LineTable lines={lines} />
                      <Totals lines={lines} />
                    </>
                  )}
                  <div className="review-actions">
                    <button
                      className="button primary"
                      disabled={!canApproveOrder(state)}
                      onClick={() => update(approveOrder(state))}
                    >
                      Create sales-order draft
                      <Icon name="arrow" size={16} />
                    </button>
                    <p>
                      {canApproveOrder(state)
                        ? "Creates one sample record after your approval. Nothing is posted to an ERP."
                        : "Resolve every blocked check above to enable approval."}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
      <Activity items={activities} />
      <NextDemo
        to="/receivables"
        title="Give overdue invoices a next step."
        text="Explore reminders, payment promises, and exceptions without chasing a spreadsheet."
      />
    </div>
  );
}
