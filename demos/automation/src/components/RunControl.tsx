import { useEffect, useState } from "react";
import Icon from "./Icon";
export default function RunControl({
  complete,
  onFinish,
  labels = [
    "Read example",
    "Match records",
    "Check details",
    "Ready to review",
  ],
}: {
  complete: boolean;
  onFinish: () => void;
  labels?: string[];
}) {
  const [step, setStep] = useState(-1);
  const running = step >= 0;
  useEffect(() => {
    if (step < 0) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        if (step >= labels.length - 1) {
          setStep(-1);
          onFinish();
        } else setStep(step + 1);
      },
      reduced ? 30 : 470,
    );
    return () => window.clearTimeout(timer);
  }, [step, labels.length, onFinish]);
  return (
    <section
      className={"run-control " + (running ? "is-running" : "")}
      aria-label="Workflow progress"
    >
      <div className="flow-steps">
        {labels.map((label, i) => (
          <div
            key={label}
            className={
              "flow-step " +
              (complete || (running && i < step)
                ? "done"
                : step === i
                  ? "current"
                  : "")
            }
          >
            <span className="step-icon">
              {complete || (running && i < step) ? (
                <Icon name="check" size={13} />
              ) : (
                <span>0{i + 1}</span>
              )}
            </span>
            <span>{label}</span>
            {i < labels.length - 1 && <span className="step-line" />}
          </div>
        ))}
      </div>
      <div className="run-action">
        {complete ? (
          <span className="ready-label">
            <Icon name="check" size={15} />
            Example processed
          </span>
        ) : running ? (
          <>
            <span className="micro" role="status">
              Walking through the example…
            </span>
            <button
              className="text-button"
              onClick={() => {
                setStep(-1);
                onFinish();
              }}
            >
              Skip animation
              <Icon name="arrow" size={14} />
            </button>
          </>
        ) : (
          <button className="button primary" onClick={() => setStep(0)}>
            <Icon name="play" size={15} />
            Run scenario
            <Icon name="arrow" size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
