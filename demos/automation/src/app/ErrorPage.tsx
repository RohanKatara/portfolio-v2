import { Link, useRouteError } from "react-router-dom";
export default function ErrorPage() {
  const error = useRouteError();
  return (
    <div className="error-page">
      <span className="eyebrow">LET’S GET BACK ON TRACK</span>
      <h1>This demo couldn’t load.</h1>
      <p>
        Your sample records can always be reset. Try reloading, or return to the
        workflow gallery.
      </p>
      {import.meta.env.DEV && (
        <pre>
          {error instanceof Error ? error.message : "Route unavailable"}
        </pre>
      )}
      <div className="button-row">
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload demo
        </button>
        <Link className="button secondary" to="/">
          All workflows
        </Link>
      </div>
    </div>
  );
}
