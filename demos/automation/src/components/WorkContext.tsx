import type { WorkTask } from "../features/rules";
import { actionTiming, dateLabel, daysBetween } from "../lib/dates";
import { owners, type Owner } from "../data/catalogue";
import { Pill } from "./UI";

export function WorkContext({
  task,
  asOf,
  onAssign,
}: {
  task: WorkTask;
  asOf: string;
  onAssign?: (owner: Owner) => void;
}) {
  const late = task.due && (daysBetween(asOf, task.due) ?? 0) > 0;
  return (
    <section className="work-context" aria-label="Current work item">
      <div className="work-context-main">
        <span className="eyebrow">NEXT ACTION</span>
        <h2>{task.title}</h2>
        <p>{task.reason}</p>
      </div>
      <div className="work-context-owner">
        <span className="eyebrow">RESPONSIBLE PERSON</span>
        {onAssign ? (
          <label>
            <span className="sr-only">Assigned salesperson</span>
            <select
              value={task.owner}
              onChange={(event) => {
                const owner = owners.find(
                  (name) => name === event.target.value,
                );
                if (owner) onAssign(owner);
              }}
            >
              {owners.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
          </label>
        ) : (
          <strong>{task.owner}</strong>
        )}
      </div>
      <div className="work-context-due">
        <Pill tone={task.closed ? "success" : late ? "warning" : "neutral"}>
          {actionTiming(task.due, asOf)}
        </Pill>
        <small>Sample date · {dateLabel(asOf)}</small>
      </div>
    </section>
  );
}
export function BusinessContext({
  manual,
  outcome,
}: {
  manual: string;
  outcome: string;
}) {
  return (
    <details className="business-context">
      <summary>Where this helps the business</summary>
      <div>
        <p>
          <strong>Work handled today</strong>
          {manual}
        </p>
        <p>
          <strong>What this workflow changes</strong>
          {outcome}
        </p>
      </div>
      <small>
        Sample scenario. Actual value depends on your volume, review effort and
        existing software.
      </small>
    </details>
  );
}
