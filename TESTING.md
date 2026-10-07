# Testing

## Test strategy

The Playwright suite validates behaviour through the browser instead of testing implementation details in isolation.

The desktop project runs the full functional suite. The mobile project runs the main mobile flows and visual regression to avoid duplicating every desktop assertion while still exercising touch-specific behaviour.

The configuration uses one worker. This is intentional: the tests exercise focus loss, a page-scoped MSW Service Worker and browser-local persistence. Serial execution keeps those browser behaviours reproducible.

## Covered areas

- main navigation;
- option validation and persistence;
- asset loading failure and retry;
- player movement and rotation;
- arena boundaries and island blocking;
- front cannon and broadside behaviour;
- weapon cooldowns;
- Chaser and Shooter spawning/behaviour;
- pause, focus loss and resume;
- finish by time and restart state;
- last-match persistence;
- abandoned matches not being recorded;
- ranking/history pagination;
- empty/error network states;
- pending match registration across refresh;
- idempotent retry after timeout-after-save;
- mobile touch controls;
- desktop and mobile visual regression.

## Running locally

Create the optimized build first because Playwright runs against `vite preview`:

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

The HTML reporter writes to:

```text
playwright-report/index.html
```

Open it with:

```bash
npm run test:e2e:report
```

Traces are retained for failed tests and can be opened with Playwright's trace viewer.

## Visual baselines

Baselines are versioned by project:

```text
tests/__screenshots__/chromium-desktop
tests/__screenshots__/chromium-mobile
```

Update them only when a visual change is intentional:

```bash
npm run test:e2e:update
```

For a single baseline:

```bash
npx playwright test tests/visual.spec.ts --project=chromium-desktop -g "menu visual baseline" --update-snapshots
```

The result dialog baseline captures the dialog itself instead of the continuously-rendered PixiJS world behind it. This avoids treating harmless background animation/frame timing as a UI regression.

## Deterministic simulation

Tests start gameplay with `?e2e=1`.

The test bridge advances the actual simulation in fixed 1/60 second steps, uses a seeded random generator and exposes a read-only debug snapshot. It does not replace movement, enemy, collision, weapon or scoring rules.

This allows a multi-minute game to be tested in seconds without using arbitrary sleeps for gameplay timing.

## Network tests

Tests use the same MSW worker/handlers as development and deployment. Network scenarios are selected through the same browser-local scenario value as the demo UI.

The suite covers:

- success;
- empty lists;
- resource-specific errors;
- pending POST recovery;
- timeout after server-side confirmation without duplicate records.

## Before submission

Run these commands from a clean working tree:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Then confirm there are no unhandled console errors during a manual menu -> match -> result -> ranking/history flow.
