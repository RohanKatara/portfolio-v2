import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import {
  initialQuote,
  quoteLines,
  initialReceivables,
  balance,
} from "../features/rules";
import { money, quoteTotals } from "../lib/money";
import { products } from "../data/catalogue";

const demos = [
  {
    number: "01",
    category: "SALES OPERATIONS",
    title: "Enquiry to quotation",
    description:
      "From an incoming enquiry to a checked quote. Assign the follow-up and track the customer's decision.",
    path: "/quotes",
    chips: ["Clarify requirements", "Approve quote", "Track decision"],
  },
  {
    number: "02",
    category: "ORDER OPERATIONS",
    title: "Purchase order processing",
    description:
      "Make sense of customer item codes, resolve price differences and prepare a checked sales-order draft.",
    path: "/orders",
    chips: ["Match items", "Catch exceptions", "Export draft"],
  },
  {
    number: "03",
    category: "ACCOUNTS RECEIVABLE",
    title: "Payment follow-up",
    description:
      "Find what is holding up payment. Give every promise, dispute and receipt check a responsible person and a next step.",
    path: "/receivables",
    chips: ["Find blockers", "Track promises", "Verify payment"],
  },
];
const sampleLines = quoteLines(initialQuote());
const sampleTotal = money(quoteTotals(sampleLines).total);
const sampleInvoices = initialReceivables().invoices;

function ExamplePreview({ number }: { number: string }) {
  return (
    <div className={`example-preview example-${number}`} aria-hidden="true">
      <div className="example-toolbar">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>PRESET EXAMPLE / {number}</span>
      </div>
      {number === "01" ? (
        <div className="example-sheet">
          <div className="example-kicker">QUOTATION / QT-2026-048</div>
          <strong>Apex Engineering Works</strong>
          {sampleLines.map((line) => (
            <div className="example-line" key={line.productId}>
              <span>{products[line.productId].name}</span>
              <b>{line.quantity} pcs</b>
            </div>
          ))}
          <div className="example-amount">
            <span>Total incl. sample GST</span>
            <strong>{sampleTotal}</strong>
          </div>
          <span className="example-status">
            Ready for your review <Icon name="check" size={13} />
          </span>
        </div>
      ) : number === "02" ? (
        <div className="example-checks">
          <div className="example-kicker">CUSTOMER PO / AEW-2050</div>
          <strong>Check before the handoff.</strong>
          <div>
            <span>Customer reference</span>
            <span className="check-passed">
              Matched <Icon name="check" size={12} />
            </span>
          </div>
          <div>
            <span>Unfamiliar item code</span>
            <span className="check-pending">Clarify</span>
          </div>
          <div>
            <span>Price difference</span>
            <span className="check-pending">Review</span>
          </div>
          <span className="example-caption">
            Two decisions. One checked order.
          </span>
        </div>
      ) : (
        <div className="example-invoices">
          <div className="example-kicker">SAMPLE FOLLOW-UP QUEUE</div>
          <strong>Every invoice, accounted for.</strong>
          {sampleInvoices.map((invoice) => (
            <div key={invoice.id}>
              <span>
                <b>{invoice.id}</b>
                <small>Payment update needed</small>
              </span>
              <strong>{money(balance(invoice))}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="home-page">
      <section className="showcase-intro">
        <div className="showcase-meta">
          <span className="eyebrow">AI & AUTOMATION / INTERACTIVE DEMOS</span>
          <span className="micro">03 WORKFLOWS · YOUR DECISIONS</span>
        </div>
        <div className="showcase-heading">
          <h1>
            Less chasing.
            <br />
            <em>More moving forward.</em>
          </h1>
          <div>
            <p>
              The everyday work behind a growing business, reimagined. Explore
              three workflows that turn paperwork into a clear next step.
            </p>
            <a
              className="editorial-link"
              href="#workflows"
              onClick={(event) => {
                event.preventDefault();
                document
                  .getElementById("workflows")
                  ?.scrollIntoView({
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  });
              }}
            >
              Explore the demos <Icon name="arrow" size={19} />
            </a>
          </div>
        </div>
        <div className="showcase-disclosure">
          <span className="status-dot" /> Interactive simulations{" "}
          <span>Fictional data · No live AI · No sign-up</span>
        </div>
      </section>
      <section id="workflows" className="demo-collection">
        <div className="collection-heading">
          <span className="eyebrow">THE WORKFLOWS / 01—03</span>
          <h2>Take the next step yourself.</h2>
          <p>
            Start with a standard example. Then see how the exceptions are
            handled.
          </p>
        </div>
        <div className="demo-entries">
          {demos.map((demo) => (
            <Link className="demo-entry" key={demo.number} to={demo.path}>
              <ExamplePreview number={demo.number} />
              <div className="entry-copy">
                <div className="eyebrow">
                  <span>{demo.number}</span> {demo.category}
                </div>
                <h3>{demo.title}</h3>
                <p>{demo.description}</p>
                <div className="entry-chips">
                  {demo.chips.map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </div>
                <span className="editorial-link">
                  Try this workflow <Icon name="arrow" size={20} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="demo-explanation">
        <div>
          <span className="eyebrow">WHAT YOU'RE EXPLORING</span>
          <h2>
            A demonstration.
            <br />
            <em>With decisions to make.</em>
          </h2>
        </div>
        <div>
          <p>
            These examples use prepared interpretations and fictional records.
            The calculations, checks and changes happen as you click.
          </p>
          <p>
            Resolve an exception. Approve an outcome. See the next action. A
            connected implementation would use your business rules and existing
            tools.
          </p>
          <span className="micro">
            NOTHING IS SENT. NO LIVE AI OR API USAGE.
          </span>
        </div>
      </section>
    </div>
  );
}
