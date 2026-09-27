import { useState } from "react";
import { replies, type ReplyKind } from "../data/catalogue";
import {
  applyReply,
  balance,
  confirmPayment,
  eligible,
  initialReceivables,
  type Invoice,
  invoiceTask,
  nextPromiseDate,
  resolveInvoiceBlocker,
} from "../features/rules";
import { compactMoney, money } from "../lib/money";
import {
  actionTiming,
  dateLabel,
  daysBetween,
  overdueDays,
} from "../lib/dates";
import { useStoredState, validReceivables } from "../lib/storage";
import Icon from "../components/Icon";
import {
  Activity,
  DemoHeader,
  EmptyResult,
  NextDemo,
  Notice,
  PanelTitle,
  Pill,
} from "../components/UI";
import RunControl from "../components/RunControl";
import { BusinessContext, WorkContext } from "../components/WorkContext";
const statusLabels: Record<Invoice["status"], string> = {
  open: "Needs follow-up",
  promise: "Promise recorded",
  disputed: "Dispute · paused",
  documents: "Document requested",
  verify: "Verify payment",
  paid: "Paid",
};
export default function Receivables() {
  const { state, update, notice } = useStoredState(
    "receivables",
    initialReceivables,
    validReceivables,
  );
  const [runVersion, setRunVersion] = useState(0);
  const invoice = state.invoices.find((i) => i.id === state.selected)!;
  const outstanding = state.invoices.reduce((sum, i) => sum + balance(i), 0);
  const queue = state.invoices.filter((i) => eligible(i, state.asOf));
  const pending = state.invoices.filter((i) =>
    ["promise", "disputed", "documents", "verify"].includes(i.status),
  ).length;
  const prioritized = [...state.invoices].sort(
    (a, b) =>
      Number(a.status === "paid") - Number(b.status === "paid") ||
      (daysBetween(a.nextActionDate, b.nextActionDate) ?? 0) ||
      balance(b) - balance(a),
  );
  const processed = state.stage !== "input";
  const completed = state.stage === "complete";
  const paid = invoice.status === "paid";
  const reply = replies.find((r) => r.id === state.reply)!;
  const customerName =
    invoice.customer === "Apex Engineering Works"
      ? "Neha"
      : invoice.customer === "Meridian Packaging"
        ? "Ravi"
        : "Kavita";
  const reset = () => {
    update(initialReceivables());
    setRunVersion((v) => v + 1);
  };
  const run = () => update({ ...state, stage: "review" as const });
  const pickReply = (kind: ReplyKind) => update({ ...state, reply: kind });
  const currentReplyText = reply.text
    .replaceAll("INV-1042", invoice.id)
    .replace(
      "30 September 2026",
      dateLabel(
        completed && invoice.promiseDate
          ? invoice.promiseDate
          : nextPromiseDate(state.asOf),
      ),
    );
  const canRun = eligible(invoice, state.asOf);
  const activities = [
    ...invoice.activity,
    ...(state.stage === "review"
      ? [
          "Reminder preview prepared from invoice facts.",
          "Preset reply being reviewed: " + reply.label + ".",
        ]
      : []),
  ];
  return (
    <div className="demo-page">
      <DemoHeader
        number="03"
        category="ACCOUNTS RECEIVABLE"
        title="Every invoice, a next step."
        description="Find why payment is stuck, assign the next action, and follow it through to a verified receipt."
        onReset={reset}
      />
      {notice && <Notice tone="info">{notice}</Notice>}
      <BusinessContext
        manual="Chasing replies, finding missing invoices, checking delivery disputes and remembering promised payment dates."
        outcome="An action queue with a reason, owner and due date. Reminders pause for blockers and resume when the next payment check is due."
      />
      <div className="section-caption">
        THE SAMPLE INVOICE REGISTER
        <div className="sample-clock">
          <span>Sample date: {dateLabel(state.asOf)}</span>
          {state.asOf === "2026-09-26" ? (
            <button
              className="button secondary"
              onClick={() => update({ ...state, asOf: "2026-10-01" })}
            >
              Advance sample date to 1 Oct
            </button>
          ) : (
            <span>Reset demo to return to 26 Sep</span>
          )}
        </div>
      </div>
      <section className="summary-metrics" aria-label="Receivables summary">
        <div className="metric">
          <span>
            <Icon name="wallet" size={13} />
            OUTSTANDING
          </span>
          <strong data-testid="outstanding">{money(outstanding)}</strong>
          <small>
            Across {state.invoices.filter((i) => balance(i) > 0).length} open
            sample invoices
          </small>
        </div>
        <div className="metric">
          <span>
            <Icon name="clock" size={13} />
            REMINDER QUEUE
          </span>
          <strong data-testid="queue-count">
            {String(queue.length).padStart(2, "0")}
          </strong>
          <small>Eligible for routine follow-up</small>
        </div>
        <div className="metric">
          <span>
            <Icon name="alert" size={13} />
            TRACKED NEXT STEPS
          </span>
          <strong>{String(pending).padStart(2, "0")}</strong>
          <small>Promises, documents, disputes, receipt checks</small>
        </div>
      </section>
      <RunControl
        key={state.selected + state.asOf + runVersion}
        complete={processed || !canRun}
        onFinish={run}
        labels={[
          "Read invoice",
          "Prepare reminder",
          "Review reply",
          "Choose next step",
        ]}
      />
      <WorkContext task={invoiceTask(invoice, state.asOf)} asOf={state.asOf} />
      <div className="work-grid receivables-grid">
        <section className="workspace-panel source-panel">
          <PanelTitle
            number="01"
            right={<Pill tone="neutral">3 sample invoices</Pill>}
          >
            Prioritized action queue
          </PanelTitle>
          <div className="invoice-list">
            {prioritized.map((i) => (
              <button
                key={i.id}
                className={
                  "invoice-button " +
                  (i.id === state.selected ? "selected" : "")
                }
                aria-pressed={i.id === state.selected}
                onClick={() => {
                  if (i.id !== state.selected) {
                    update({
                      ...state,
                      selected: i.id,
                      stage:
                        i.status === "open" && i.lastReply === ""
                          ? "input"
                          : "complete",
                      reply: i.lastReply || "promise",
                    });
                  }
                }}
              >
                <span className="invoice-button-top">
                  <strong>{i.id}</strong>
                  <span>
                    {i.status === "paid"
                      ? "SETTLED"
                      : overdueDays(i.due, state.asOf) + " DAYS OVERDUE"}
                  </span>
                </span>
                <small>{i.customer}</small>
                <span className="invoice-task">
                  <strong>{invoiceTask(i, state.asOf).title}</strong>
                  <span>
                    {i.owner} ·{" "}
                    {actionTiming(invoiceTask(i, state.asOf).due, state.asOf)}
                  </span>
                </span>
                <span className="invoice-button-bottom">
                  <strong>{compactMoney(balance(i))}</strong>
                  <Pill
                    tone={
                      i.status === "paid"
                        ? "success"
                        : ["disputed", "verify"].includes(i.status)
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {i.status === "promise" && eligible(i, state.asOf)
                      ? "Promise overdue"
                      : statusLabels[i.status]}
                  </Pill>
                </span>
              </button>
            ))}
          </div>
          <div className="invoice-detail">
            <div>
              <span>SELECTED INVOICE</span>
              <strong>{invoice.id}</strong>
            </div>
            <div>
              <span>DUE DATE</span>
              <strong>{dateLabel(invoice.due)}</strong>
            </div>
            <div>
              <span>ORIGINAL AMOUNT</span>
              <strong>{money(invoice.amount)}</strong>
            </div>
            <div>
              <span>CONFIRMED PAID</span>
              <strong>{money(invoice.paid)}</strong>
            </div>
            {invoice.promiseDate && (
              <div className="full">
                <span>PROMISE DATE</span>
                <strong>{dateLabel(invoice.promiseDate)}</strong>
              </div>
            )}
          </div>
          {queue.length === 0 && (
            <div className="queue-empty" role="status">
              <Icon name="check" size={16} />
              <span>
                No invoices need a routine reminder. Tracked promises, disputes,
                and receipt checks still need their next action.
              </span>
            </div>
          )}
        </section>
        <section className="workspace-panel result-panel">
          <PanelTitle
            number="02"
            right={
              <Pill tone={paid ? "success" : "neutral"}>
                {paid
                  ? "Paid"
                  : completed
                    ? "Next step recorded"
                    : processed
                      ? "Ready for review"
                      : "Awaiting run"}
              </Pill>
            }
          >
            Follow-up workspace
          </PanelTitle>
          {!processed && canRun ? (
            <EmptyResult
              icon="wallet"
              title="The reminder is only the beginning."
            >
              Run this example, choose a customer reply, and see how the next
              action changes.
            </EmptyResult>
          ) : paid ? (
            <div className="panel-body">
              <div className="complete-card">
                <Icon name="check" size={38} />
                <h2>Payment confirmed.</h2>
                <p>
                  {invoice.id} is paid in the sample register. Its balance is
                  zero, and it won’t receive another routine reminder.
                </p>
              </div>
              <Notice tone="success" icon="check">
                <strong>{money(invoice.amount)} marked received</strong>
                <small>
                  Demo change only. No banking or payment service is connected.
                </small>
              </Notice>
              <div className="after-output">
                <div className="eyebrow">NEXT STEP</div>
                <h3>
                  {queue.length
                    ? "Move to the next invoice."
                    : "The routine queue is clear."}
                </h3>
                <p>
                  {queue.length
                    ? "Select another invoice to explore a different reply, or reset the demo to start again."
                    : "No routine reminders are due in this sample workspace. Check any tracked exceptions separately."}
                </p>
              </div>
            </div>
          ) : (
            <div className="panel-body">
              {canRun && (
                <div className="after-output" style={{ marginTop: 0 }}>
                  <div className="eyebrow">
                    <Icon name="mail" size={13} />
                    REMINDER / MESSAGE PREVIEW
                  </div>
                  <h3>Subject: Payment follow-up · {invoice.id}</h3>
                  <p>
                    Hi {customerName}, a quick follow-up on {invoice.id} for{" "}
                    {money(balance(invoice))}, due on {dateLabel(invoice.due)}.
                    Could you confirm the expected payment date? Please let us
                    know if you need any supporting documents.
                  </p>
                  <small>
                    Preview only · No email or WhatsApp message sent
                  </small>
                </div>
              )}
              {!completed ? (
                <>
                  <span className="reply-label">
                    CHOOSE A PRESET CUSTOMER REPLY
                  </span>
                  <div className="reply-options">
                    {replies.map((r) => (
                      <button
                        className={
                          "choice-button " +
                          (r.id === state.reply ? "selected" : "")
                        }
                        key={r.id}
                        aria-pressed={r.id === state.reply}
                        onClick={() => pickReply(r.id)}
                      >
                        {r.label}
                        {r.id === state.reply && (
                          <Icon name="check" size={13} />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="reply-bubble">
                    <small>CUSTOMER REPLY · PRESET EXAMPLE</small>
                    {currentReplyText}
                  </div>
                  <div className="interpretation">
                    <div className="eyebrow">
                      <Icon name="spark" size={12} />
                      PREPARED INTERPRETATION
                    </div>
                    <h3>{reply.interpretation}</h3>
                    <p>{reply.action}</p>
                  </div>
                  <div className="review-actions">
                    <button
                      className="button primary"
                      onClick={() => update(applyReply(state))}
                    >
                      Apply next step
                      <Icon name="arrow" size={16} />
                    </button>
                    <p>
                      You review the suggested action before the sample invoice
                      changes.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="reply-bubble">
                    <small>CUSTOMER REPLY · PRESET EXAMPLE</small>
                    {currentReplyText}
                  </div>
                  <div className="interpretation">
                    <div className="eyebrow">
                      <Icon name="check" size={13} />
                      RECORDED IN THE DEMO
                    </div>
                    <h3>
                      {invoice.status === "open" && invoice.resolution
                        ? invoice.resolution === "documents-provided"
                          ? "Invoice copy provided. Next action scheduled."
                          : "Delivery check recorded. Follow-up resumed."
                        : invoice.status === "promise"
                          ? `Promise recorded for ${dateLabel(invoice.promiseDate)}.`
                          : invoice.status === "disputed"
                            ? "Dispute opened. Reminders paused."
                            : invoice.status === "verify"
                              ? "Payment claimed. Receipt check needed."
                              : "Invoice copy ready to share."}
                    </h3>
                    <p>
                      {invoice.status === "open" && invoice.resolution
                        ? `Administrative blocker resolved in the sample. Next payment check: ${dateLabel(invoice.nextActionDate)}. The outstanding balance is unchanged.`
                        : invoice.status === "promise"
                          ? `${canRun ? "The promise date has passed without a verified receipt. " : ""}Next follow-up: ${dateLabel(invoice.nextActionDate)}. The balance stays outstanding until receipt is confirmed.`
                          : invoice.status === "disputed"
                            ? "The account owner reviews the quantity difference. The invoice balance is unchanged, and routine reminders are paused."
                            : invoice.status === "verify"
                              ? "A customer reply is not a bank confirmation. The invoice stays open while receipt is checked; routine reminders are paused."
                              : "Provide the requested copy before resuming payment follow-up. The invoice balance stays outstanding, and routine reminders are paused."}
                    </p>
                  </div>
                  {invoice.status === "documents" && (
                    <div className="after-output">
                      <div className="eyebrow">
                        <Icon name="file" size={13} />
                        REPLY / ATTACHMENT PREVIEW
                      </div>
                      <p>
                        Hi {customerName}, please find the copy of {invoice.id}{" "}
                        for your accounts team. Let us know if you need anything
                        else to process payment.
                      </p>
                      <small>
                        Attachment preview: {invoice.id}.pdf · No file or
                        message is sent
                      </small>
                    </div>
                  )}
                  {invoice.status === "documents" && (
                    <div className="review-actions">
                      <button
                        className="button primary"
                        onClick={() => update(resolveInvoiceBlocker(state))}
                      >
                        Mark sample invoice copy provided
                      </button>
                      <p>
                        Records a simulated handoff. No file or message is sent.
                        Schedule the payment check two days later.
                      </p>
                    </div>
                  )}
                  {invoice.status === "disputed" && (
                    <div className="after-output">
                      <div className="eyebrow">PRESET DELIVERY CHECK</div>
                      <p>
                        The signed delivery note and a sample customer
                        confirmation agree with the invoiced quantity. The
                        customer accepts the original invoice; no amount
                        adjustment is required.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => update(resolveInvoiceBlocker(state))}
                      >
                        Record resolved delivery dispute
                      </button>
                      <small>
                        Reviewer confirms this sample evidence. A real
                        discrepancy would require its own approved correction.
                      </small>
                    </div>
                  )}
                  <div className="review-actions">
                    <button
                      className="button secondary"
                      onClick={() => update(confirmPayment(state))}
                    >
                      <Icon name="check" size={15} />
                      Confirm sample payment received
                    </button>
                    <p>
                      This is a separate demo action representing a verified
                      receipt for the full outstanding balance.
                    </p>
                    {canRun && (
                      <button
                        className="text-button"
                        onClick={() => update({ ...state, stage: "review" })}
                      >
                        Review next customer reply
                        <Icon name="arrow" size={13} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
      <Activity items={activities} />
      <NextDemo
        to="/"
        title="Three workflows. Your business rules."
        text="Return to the gallery and choose the process you would customise first."
      />
    </div>
  );
}
