import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Icon, { type IconName } from "./Icon";
export function Pill({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
export function Notice({
  children,
  tone = "",
  icon = "alert",
}: {
  children: ReactNode;
  tone?: string;
  icon?: IconName;
}) {
  return (
    <div className={"notice " + tone}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}
export function DemoHeader({
  number,
  category,
  title,
  description,
  onReset,
}: {
  number: string;
  category: string;
  title: string;
  description: string;
  onReset: () => void;
}) {
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/">All workflows</Link>
        <Icon name="chevron" size={12} />
        <span>Demo {number}</span>
      </div>
      <div className="demo-heading">
        <div>
          <div className="eyebrow">
            <span className="short-line" />
            {category} <span className="muted">/ {number}</span>
          </div>
          <h1>
            {title.includes(". ") ? (
              <>
                {title.slice(0, title.indexOf(". ") + 1)}{" "}
                <em>{title.slice(title.indexOf(". ") + 2)}</em>
              </>
            ) : (
              title
            )}
          </h1>
          <p>{description}</p>
        </div>
        <button className="button ghost reset" onClick={onReset}>
          <Icon name="reset" size={16} />
          Reset demo
        </button>
      </div>
      <div className="disclosure">
        <span className="status-dot" />
        <strong>Interactive simulation</strong>
        <span className="disclosure-detail">Sample data · No live AI</span>
      </div>
    </>
  );
}
export function ScenarioPicker<T extends string>({
  scenarios,
  selected,
  onSelect,
}: {
  scenarios: ReadonlyArray<{
    id: T;
    label: string;
    description: string;
    tag: string;
  }>;
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <section className="scenario-picker" aria-label="Choose a scenario">
      <div className="section-caption">
        CHOOSE YOUR SCENARIO
        <span>Start simple. Then explore the exceptions.</span>
      </div>
      <div className="scenario-options">
        {scenarios.map((s, i) => (
          <button
            key={s.id}
            className={
              "scenario-option " + (selected === s.id ? "selected" : "")
            }
            aria-pressed={selected === s.id}
            onClick={() => onSelect(s.id)}
          >
            <span className="scenario-index">0{i + 1}</span>
            <span>
              <strong>{s.label}</strong>
              <small>{s.description}</small>
            </span>
            <span className="radio-mark">{selected === s.id && <span />}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
export function PanelTitle({
  number,
  children,
  right,
}: {
  number: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="panel-title">
      <h2>
        <span className="panel-number">{number}</span>
        {children}
      </h2>
      {right}
    </div>
  );
}
export function EmptyResult({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-result">
      <div className="empty-orbit">
        <Icon name={icon} size={32} />
        <span />
        <span />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      <span className="micro">PRESET INPUT → REVIEWABLE OUTPUT</span>
    </div>
  );
}
export function Activity({ items }: { items: string[] }) {
  return (
    <section className="activity" aria-label="Activity trail">
      <div className="section-caption">
        ACTIVITY TRAIL<span>Sample workspace</span>
      </div>
      <ol>
        {items.map((text, i) => (
          <li key={i}>
            <span className="activity-dot" />
            <span>{text}</span>
            <span className="activity-order">0{i + 1}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function NextDemo({
  to,
  title,
  text,
}: {
  to: string;
  title: string;
  text: string;
}) {
  return (
    <Link className="next-demo" to={to}>
      <div>
        <span className="eyebrow">KEEP EXPLORING</span>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <span className="round-arrow">
        <Icon name="arrow" />
      </span>
    </Link>
  );
}
