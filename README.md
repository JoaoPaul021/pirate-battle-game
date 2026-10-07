# Pirate Battle

A top-down naval shooter built for the Jungle Gaming Frontend Game Developer challenge.

The project uses React for application UI, PixiJS for the game scene, TypeScript for the full codebase, TanStack Query + Axios for remote state, MSW for the REST API simulation, and Playwright for E2E and visual regression tests.

**Initial implementation estimate:** 18-22 focused hours over 2 days.

## Stack

- React 19
- TypeScript (strict mode)
- PixiJS 8
- TanStack Query 5
- Axios
- MSW 2
- Playwright
- Vite

## Requirements

- Node.js 20+
- npm
- Chromium for the Playwright suite

No environment variables or private services are required.

## Setup

```bash
npm install
npm run dev
```

The MSW worker is versioned at `assets/mockServiceWorker.js`. If the installed MSW version changes, regenerate it with:

```bash
npm run mocks:init
```

The development server is available at the URL printed by Vite, usually `http://localhost:5173`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Serve the optimized build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript project check |
| `npm run mocks:init` | Regenerate the MSW service worker |
| `npm run test:e2e` | Run the Playwright E2E suite |
| `npm run test:e2e:headed` | Run Playwright with visible browsers |
| `npm run test:e2e:update` | Update visual regression baselines |
| `npm run test:e2e:report` | Open the latest Playwright HTML report |

Install Playwright Chromium once after a clean checkout:

```bash
npx playwright install chromium
```

## Controls

### Keyboard

| Action | Control |
| --- | --- |
| Sail forward | `W` or `Arrow Up` |
| Turn left | `A` or `Arrow Left` |
| Turn right | `D` or `Arrow Right` |
| Front cannon | `Space` |
| Left broadside | `Q` |
| Right broadside | `E` |
| Pause / resume | `Esc` |

Touch controls are shown automatically on coarse-pointer and smaller-screen devices. Movement and attacks can be held at the same time.

## Gameplay

The player sails inside a fixed 1280x720 world rendered into the available viewport while preserving aspect ratio.

- The player cannot leave the arena or cross islands.
- The front cannon fires one projectile.
- Each broadside fires three parallel projectiles.
- Chasers pursue the player and damage on impact.
- Shooters approach their preferred range and fire at the player.
- Destroying an enemy with player damage adds one point.
- A Chaser that self-destructs against the player does not award a point.
- A match ends when time expires or the player's health reaches zero.
- Manual pause and focus-loss pause suspend the simulation, timer, spawns and cooldowns.

## Gameplay configuration

All balancing values live in `src/config/gameConfig.ts`. Gameplay systems consume the typed configuration instead of hard-coded balancing values.

Player-facing options:

| Option | Default | Range | Step |
| --- | ---: | ---: | ---: |
| Game session time | 120 s | 60-180 s | 30 s |
| Enemy spawn time | 3 s | 1-10 s | 1 s |

Current base balance:

| Value | Setting |
| --- | ---: |
| Player health | 100 |
| Player movement | 220 units/s |
| Player rotation | 2.8 rad/s |
| Chaser health | 55 |
| Chaser movement | 135 units/s |
| Chaser collision damage | 28 |
| Shooter health | 70 |
| Shooter movement | 105 units/s |
| Shooter attack range | 360 units |
| Shooter preferred range | 280 units |
| Front cannon damage | 24 |
| Front cannon cooldown | 420 ms |
| Broadside projectile damage | 18 |
| Broadside cooldown | 1100 ms |
| Shooter projectile damage | 12 |
| Shooter cooldown | 1400 ms |

Each match receives a snapshot of the current options when `Play` is selected. Changing options later does not mutate a running match.

## Ranking and Match History

Ranking and history are presented as REST resources but are intercepted in the browser by MSW.

- Axios is the HTTP client.
- TanStack Query owns query/mutation state, caching, invalidation and retries.
- Ranking only compares matches with the same session duration and spawn interval.
- Ranking order is score descending, then duration ascending, completion date ascending, then match id.
- Match registration is idempotent by match id.
- Confirmed matches and pending submissions survive refresh through `localStorage`.
- A pending submission never blocks starting another game.

The mock API is local to the browser, so data is intentionally isolated per browser/profile.

## Network scenarios

Open **Ranking** or **Match History**, expand **Network scenarios**, and select a case.

| Scenario | Behaviour |
| --- | --- |
| Success | Normal reads and writes |
| Empty lists | Ranking/history return empty result sets |
| Slow network | Adds fixed latency |
| Variable latency | Alternates fast and slow reads |
| Ranking failure | Ranking returns HTTP 503 |
| History failure | History returns HTTP 503 |
| HTTP 429 | Read requests return 429 |
| HTTP 500 | Read requests return 500 |
| Request timeout | Read latency exceeds Axios' 5 s timeout |
| Connection failure | MSW returns a network failure |
| Timeout after save | Match is confirmed, then the first response exceeds the client timeout |
| Registration unavailable | Match POST returns 503 and remains pending |

`Reset mock data` clears confirmed local mock records and pending submissions and restores the `Success` scenario.

The same scenarios are available in development, the optimized preview and the published build.

## Persistence

The application uses local storage for:

- player options;
- last completed match;
- confirmed mock matches;
- pending match submissions;
- selected network scenario;
- optional local profiling runs.

Leaving or refreshing an active match destroys it. An abandoned match is not registered.

## Accessibility and responsive behaviour

- Menu actions are regular semantic buttons.
- Keyboard focus is visible.
- Pause/result dialogs move focus to the primary action.
- Errors use accessible alert/status regions.
- Health, score, timer and enemy count are also exposed through a semantic live region without updating React every frame.
- The canvas uses `devicePixelRatio` with a maximum resolution of 2.
- The world keeps the same gameplay coordinates on every screen size.
- Touch controls are available on mobile and coarse-pointer devices.
- Layouts adapt to small portrait screens and short landscape viewports.
- `prefers-reduced-motion` is respected by the UI layer.

## Tests

Playwright covers navigation, options, asset failure/retry, core movement/collisions, weapons, enemies, pause, match ending/restart, persistence, API scenarios, pending registration recovery, touch controls and visual regression.

Desktop runs the complete behavioural suite. Mobile runs focused interaction flows plus visual regression. Tests are serialized because focus transitions, Service Worker scenarios and browser-local persistence are intentionally shared browser behaviours and are more reproducible with one worker.

The test-only mode is activated with `?e2e=1`. It provides a seeded random source and a controlled simulation clock while preserving the real game rules and rendering path.

Visual baselines live in:

```text
tests/__screenshots__/chromium-desktop
tests/__screenshots__/chromium-mobile
```

The latest HTML report is generated under `playwright-report/`. Failed tests retain Playwright traces through the configured `retain-on-failure` policy.

More detail is available in [TESTING.md](TESTING.md).

## Performance profiling

Performance decisions and the profiling procedure are documented in [PERFORMANCE.md](PERFORMANCE.md).

For a reference run, build the production bundle, start preview, open the game with `?profile=1`, use a 180 second match and complete the full match. A lightweight probe records average FPS, p95 frame time and entity counts into the console and `localStorage` under `pirate-battle-performance-runs`.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the React/PixiJS boundary, simulation lifecycle, collision model, resource cleanup, REST contracts, Query cache strategy and pending-match recovery.

## Deployment with Vercel

The repository includes `vercel.json` and does not require environment variables.

1. Import the GitHub repository into Vercel.
2. Keep the detected framework as **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Deploy.

The Vite `publicDir` is `assets`, which places `mockServiceWorker.js` at the root of the final build so MSW also works on the deployed URL.

## Project structure

```text
src/
  api/              REST contracts, Axios client, TanStack Query hooks, local pending data
  components/       React UI components
  config/           typed gameplay configuration
  game/
    audio/           audio feedback
    input/           keyboard input state
    profiling/       optional production profiling probe
    rendering/       PixiJS scene and visual entities
    simulation/      gameplay rules and continuous combat state
    testing/         deterministic E2E bridge
  mocks/            MSW handlers, fixtures, scenarios and local mock store
  screens/           application screens
tests/               Playwright E2E and visual regression tests
assets/              challenge-provided art, audio and MSW worker
```

## Assets

All game art and audio used by the application are assets supplied with the challenge. No additional external art, fonts or sound libraries were added.

## Known limitations

- Island collision uses stable rectangular gameplay bounds rather than per-pixel collision against artwork.
- Mock ranking/history data is browser-local and is not shared between devices or users.
- Audio playback still follows browser autoplay policies.
- The performance memory metric uses Chromium's non-standard `performance.memory` when available; other browsers return `null` for heap measurements.
