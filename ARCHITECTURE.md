# Architecture

## Overview

Pirate Battle is split into two execution layers:

- **React** owns application navigation, menus, options, HUD, dialogs, ranking/history and remote-state status.
- **PixiJS** owns the real-time arena, ships, projectiles, effects and health indicators attached to ships.

The continuous combat model is not stored in React state. `GameSimulation` owns it and advances independently from React's render cycle.

```text
React App
  |
  +-- MainMenu / Options / Ranking / History
  |
  +-- GameScreen
        |
        +-- PirateGame
              |
              +-- GameInput
              +-- GameSimulation
              +-- GameRenderer (PixiJS)
              +-- GameAudio
```

## Application lifecycle

`App.tsx` keeps a small screen state instead of using URL routes. Starting a game creates a `GameConfig` snapshot from the saved options and passes it to `GameScreen`.

`GameScreen` creates one `PirateGame` instance inside an effect. On cleanup it calls `destroy()`, so React Strict Mode's mount/unmount cycle is supported without leaving duplicate tickers or listeners behind.

Initialization order:

1. Create the PixiJS `Application`.
2. Attach its canvas to the React-owned host element.
3. Create `GameRenderer` and load all gameplay textures.
4. Build the world and initial player view.
5. Attach keyboard input and pause/focus listeners.
6. Start audio and the PixiJS ticker.
7. Notify React that the game is ready.

If asset loading fails, initialization reports the error to React and destroys partially-created game resources before gameplay starts.

## Simulation loop

`PirateGame` receives Pixi's ticker delta in milliseconds. The real frame interval is available to the optional profiler, while simulation delta is capped at 50 ms to avoid a single long browser stall producing an extreme physics step.

For each active frame:

1. Update the simulation using `deltaSeconds` and the current input state.
2. Consume simulation events.
3. Synchronize PixiJS views with the simulation state.
4. Play audio feedback for emitted events.
5. Publish a small HUD snapshot only when a visible HUD value changed.
6. Finish the match once and pass the summary back to React.

Pause returns before the simulation update, so timers, movement, projectiles, enemy AI, cooldowns and spawning are all suspended by the same mechanism.

## Simulation state

`GameSimulation` owns:

- player position, rotation, health and hit state;
- enemies and their type-specific state;
- projectiles;
- score;
- elapsed match time;
- spawn accumulator;
- weapon cooldowns;
- deterministic entity ids;
- end state and reason;
- transient gameplay events consumed by renderer/audio.

The simulation receives the typed `GameConfig`, so balance changes do not require changes to system logic.

### Movement

Ships rotate from angular speed in radians per second. Forward movement uses the ship heading and linear speed multiplied by `deltaSeconds`.

Movement is accepted only when the resulting circle remains:

- inside the arena padding;
- outside every island collision rectangle.

Enemy movement uses the same movement/collision path as the player.

### Enemy behaviour

The first two successful enemy spawns guarantee one Chaser and one Shooter. Later types use the configured weights.

Spawn positions are sampled from arena edges. A candidate is rejected when it is too close to the player or intersects an island. The search is bounded to 30 attempts so a blocked spawn never stalls the frame.

**Chaser**

- rotates toward the player;
- moves directly toward the player;
- on collision, damages the player and destroys itself;
- self-destruction does not increment score.

**Shooter**

- rotates toward the player;
- approaches until near its preferred range;
- fires only while the player is inside attack range and the weapon cooldown is ready.

### Weapons and projectiles

Front cannon and left/right broadside have independent cooldowns. A broadside creates three projectiles with longitudinal offsets so the shots are parallel rather than emitted from one point.

Every projectile stores ownership, direction, damage, speed and remaining lifetime. It is removed when it:

- hits an island;
- hits a valid target;
- expires;
- leaves the arena.

A projectile is removed immediately after applying damage, preventing duplicate damage across frames.

### Collisions

The implementation intentionally keeps collision primitives simple and deterministic:

- ship vs island: circle-to-axis-aligned rectangle;
- projectile vs island: circle-to-axis-aligned rectangle;
- ship/projectile vs ship: circle-to-circle.

The collision rectangles follow the gameplay footprint of the visible islands instead of using per-pixel sprite collision. This keeps movement stable across resolutions and avoids binding gameplay rules to art transparency.

## Rendering

`GameRenderer` owns the PixiJS scene graph.

Layers:

1. tiled water and island scenery;
2. ship entities;
3. projectiles;
4. transient effects.

Textures are loaded once through PixiJS `Assets` and reused by sprites. Existing enemy/projectile views are kept in maps keyed by simulation ids. Views are created when entities appear and destroyed when those ids leave the simulation.

Damage presentation switches ship textures based on remaining-health ratio and briefly applies a hit tint. Simulation events create muzzle/impact/explosion effects without putting visual-only state into the simulation.

### Canvas scaling

Gameplay coordinates always use the 1280x720 arena. On resize, the renderer chooses the smaller of the horizontal and vertical scale factors and centers the world inside the Pixi screen.

PixiJS uses `autoDensity` and a resolution capped at 2x device pixel ratio. CSS resizing therefore does not change gameplay coordinates or collision rules.

## React synchronization

React is deliberately not updated at ticker frequency.

`PirateGame` builds a HUD signature from:

- player health;
- score;
- integer remaining time;
- enemy count.

The `onHudChange` callback fires only when that signature changes. This keeps semantic HUD values in React without causing a React render for every animation frame.

Pause state, loading/errors and the final match summary are discrete events and are also sent to `GameScreen` through callbacks.

## Input

`GameInput` stores boolean actions rather than directly moving entities inside DOM event handlers.

Keyboard events update the input state, then the simulation reads the complete state during the next frame. Touch controls use the same `InputAction` values through `PirateGame.setAction`, so keyboard and touch share all gameplay rules.

Input is cleared on pause, blur, resume, exit and destroy. This prevents held input from accumulating while the simulation is suspended.

## Resource management

`PirateGame.destroy()`:

- disconnects the `ResizeObserver`;
- removes keyboard and focus listeners;
- destroys input state;
- stops and clears audio elements;
- removes the Pixi ticker callback;
- destroys the Pixi application and its display tree.

Renderer entity maps remove and destroy views after simulation entities disappear. Restart creates a new `PirateGame` instance and a new match id.

## Remote state and REST contracts

The frontend uses three typed operations:

```text
GET  /api/ranking
GET  /api/history
POST /api/matches
```

Axios is configured with `/api` as the base URL and a 5 second timeout.

`MatchRecord` includes:

- match id;
- player id/name;
- completion timestamp;
- score;
- effective duration;
- end reason;
- full gameplay configuration snapshot.

The client validates the basic paginated response shape before exposing it to screen components, so an unexpected HTML/invalid response becomes a handled query error instead of a render crash.

## TanStack Query strategy

Ranking query keys contain:

- selected mock network scenario;
- session duration;
- spawn interval;
- page number.

History keys contain:

- selected network scenario;
- player id;
- page number.

Queries use a 10 second stale time, refetch on mount/focus and receive the AbortSignal supplied by TanStack Query. Retries stop after two failures, and HTTP 4xx responses are not retried.

Successful match registration invalidates both ranking and history roots so visible or subsequently-opened tabs refresh from the mock API.

## Ranking rules

Ranking only contains matches whose session duration and spawn interval are identical to the selected current options.

Tie-break order:

1. score descending;
2. effective duration ascending;
3. completion timestamp ascending;
4. match id ascending.

This makes ordering deterministic even when every gameplay field is equal.

## MSW and local mock state

MSW intercepts REST calls at the network layer in development, tests and the built application. Fixtures and user-confirmed matches are merged by `src/mocks/store.ts`.

Confirmed user matches are kept in `localStorage` so the next ranking/history request sees the same state after refresh.

The network scenario selector writes its scenario to local storage, cancels in-flight queries and invalidates ranking/history. Read handlers evaluate the selected scenario per request, making delayed and failure states reproducible.

## Idempotent and pending match registration

Before a POST begins, `useRegisterMatch` writes the record to the pending queue. A successful response removes it and invalidates ranking/history.

The MSW store treats match id as the idempotency key:

- if an id is already confirmed, POST returns the existing record;
- otherwise it stores the record once.

The `Timeout after save` scenario confirms a record first, then delays the first response beyond Axios' timeout. Retrying the same match id therefore recovers the existing record without duplication.

Pending records survive refresh and can be retried from the menu. Starting another match is independent of pending submissions.

## Test mode

`?e2e=1` enables deterministic test support without changing the production rules:

- a seeded random source controls spawn sampling;
- the normal real-time ticker is replaced by explicit 1/60 second stepping;
- Playwright can set real input actions, advance simulation time and inspect a debug snapshot;
- a controlled focus-loss hook exercises the same pause path without relying on OS window focus timing.

This keeps E2E tests fast and reproducible while using the real movement, combat, collision and rendering code.

## Balance decisions

The default match is 120 seconds with a 3 second enemy interval. The Chaser is faster and lower-health than the Shooter so it creates immediate movement pressure. The Shooter is slower and attempts to remain near 280 units, creating a different positioning problem.

The front weapon is faster and has a shorter cooldown for precise aiming. Broadsides deal less damage per projectile but fire three shots and have a longer cooldown, rewarding ship orientation rather than repeated frontal fire.

The first Chaser/Shooter guarantee avoids a standard match finishing before both required behaviours have appeared.

## Known limitations

- Island collision uses static rectangles matched to the scene, not collision polygons generated from tiles.
- Enemy navigation does not use pathfinding; blocked movement simply prevents a step, so an enemy may need player movement to route around some island edges.
- Mock API data is local to each browser profile and is not multi-user shared state.
- Audio is best-effort because browsers may block playback until user interaction.
- Chromium heap sampling used by profiling is non-standard and is absent in browsers that do not expose `performance.memory`.
