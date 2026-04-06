# portfolio-v2

Desktop-only editorial scroll portfolio for Rohan Katara — Astro 5 + React islands + GSAP + Lenis + OGL.

Replaces the existing `coffee-portfolio` after the Verification Checklist (`plan: section K`) is cleared. Until then, both sites coexist and `coffee-portfolio` is **strictly read-only**.

## Develop

```bash
PATH="/c/Program Files/nodejs:$PATH" npm install
PATH="/c/Program Files/nodejs:$PATH" npm run dev
```

## Build

```bash
PATH="/c/Program Files/nodejs:$PATH" npm run build
PATH="/c/Program Files/nodejs:$PATH" npm run preview
```

## Architecture

See `C:\Users\rohan\.claude\plans\squishy-mixing-book.md` for the full Phase 2 plan.

## Repo isolation

This project has its own git history and **no remote configured by default**. The sibling `coffee-portfolio` repo is never edited or committed to during the build of this experiment. Cutover happens at the Vercel dashboard level, not via git.
