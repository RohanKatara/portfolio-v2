import MockTalkThumb from './MockTalkThumb';
import KrishnaThumb from './KrishnaThumb';
import AutomateProThumb from './AutomateProThumb';
import ContentEngineThumb from './ContentEngineThumb';

export type ThumbSlug = 'mocktalk' | 'krishna' | 'automate-pro' | 'content-engine';
export type ThumbVariant = 'preview' | 'hero';

interface Props {
  slug: ThumbSlug;
  /** Currently advisory only — sizing is driven by the parent container. */
  variant?: ThumbVariant;
}

const map = {
  'mocktalk':       MockTalkThumb,
  'krishna':        KrishnaThumb,
  'automate-pro':   AutomateProThumb,
  'content-engine': ContentEngineThumb,
} as const;

/**
 * Slug-dispatched animated project thumbnail. Used in two places:
 *  - inside ProjectHoverImage (cursor-following preview, ~420x260)
 *  - inside CaseOverlay as a full-bleed hero
 *
 * The component fills 100% of its parent container; sizing happens upstream.
 */
export default function Thumbnail({ slug }: Props) {
  const Component = map[slug];
  if (!Component) return null;
  return <Component />;
}
