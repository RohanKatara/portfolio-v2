import { useEffect } from 'react';
import { closeCase, openCase, parseHash, isCaseSlug, type CaseSlug } from '../lib/overlay';

export default function CaseOverlayController() {
  useEffect(() => {
    const cold = parseHash();
    if (cold) {
      openCase(cold, { pushHistory: false });
    }

    const onHashChange = () => {
      const slug = parseHash();
      if (slug) {
        openCase(slug, { pushHistory: false });
      } else if (document.body.hasAttribute('data-overlay-open')) {
        closeCase({ popHistory: false });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest<HTMLElement>('[data-open-case]');
      if (trigger) {
        e.preventDefault();
        const slug = trigger.getAttribute('data-open-case');
        if (slug && isCaseSlug(slug)) openCase(slug as CaseSlug);
        return;
      }
      const closer = target.closest<HTMLElement>('[data-close-case]');
      if (closer) {
        e.preventDefault();
        closeCase();
      }
    };
    document.addEventListener('click', onClick);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.body.hasAttribute('data-overlay-open')) {
        closeCase();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
