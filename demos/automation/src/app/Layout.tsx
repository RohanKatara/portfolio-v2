import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useNavigation,
} from "react-router-dom";
import { useEffect, useRef } from "react";
import Icon from "../components/Icon";
export default function Layout() {
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
          mainRef.current?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link
            className="demo-wordmark"
            to="/"
            aria-label="Automation demos home"
          >
            <Icon name="layers" size={18} />
            Automation demos
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/quotes">Quotations</NavLink>
            <NavLink to="/orders">Purchase orders</NavLink>
            <NavLink to="/receivables">Receivables</NavLink>
          </nav>
          <a
            className="portfolio-back"
            href="https://rohankatara.com/work/#ai-automations"
          >
            Back to AI &amp; Automations <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="site-main">
        {navigation.state === "loading" && (
          <div className="route-loading" role="status">
            Opening workflow…
          </div>
        )}
        <Outlet />
      </main>
      <aside className="demo-enquiry" aria-label="Discuss a workflow">
        <div>
          <span className="eyebrow">FROM EXAMPLE TO EVERYDAY</span>
          <h2>
            Your process. <em>Your possibilities.</em>
          </h2>
          <p>
            Explore what a workflow like this could do with your documents,
            rules and tools.
          </p>
        </div>
        <a className="button secondary" href="https://rohankatara.com/#contact">
          Discuss your workflow <Icon name="arrow" size={16} />
        </a>
      </aside>
      <footer className="site-footer">
        <Link className="footer-brand" to="/">
          <Icon name="layers" size={16} />
          Automation demos
        </Link>
        <p>Interactive simulation · Sample data · No live AI</p>
        <span>Explore. Review. Decide.</span>
      </footer>
    </>
  );
}
