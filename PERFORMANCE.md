# Performance

This document describes the profiling approach used for Pirate Battle and records the results of a local gameplay run.

## Goals

The main performance goals for the project were:

- Keep gameplay responsive during movement, combat and enemy spawning.
- Avoid frame-rate-dependent movement by using delta time.
- Keep the PixiJS rendering loop lightweight.
- Avoid unnecessary work outside the active match.
- Monitor entity count and memory usage during gameplay.
- Keep the game playable on different screen sizes and input methods.

## Profiling mode

A small profiling utility is available in the project and can be enabled through the URL:

```text
?profile=1
```

The production build can be profiled locally with:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/?profile=1
```

At the end of the match, the profiler prints a summary to the browser console.

The collected values include:

- Average FPS
- 95th percentile frame time
- Number of frame samples
- Average number of active entities
- Maximum number of active entities
- JavaScript heap usage at the beginning and end of the measured session

## Profiling results

The following results were collected locally using the production Vite build.

| Metric | Result |
| --- | ---: |
| Duration | 38 s |
| Frame samples | 5,349 |
| Average FPS | 143.41 |
| p95 frame time | 7.1 ms |
| Average entities | 6.64 |
| Maximum entities | 12 |
| Heap at start | 12.18 MB |
| Heap at end | 12.98 MB |

## Interpretation

The measured gameplay remained smooth during the profiling run.

The average frame rate was 143.41 FPS on the test machine. Frame rate depends on hardware, browser behavior and display refresh rate, so this value should not be treated as a fixed performance target for every device.

The p95 frame time was 7.1 ms. For comparison, maintaining 60 FPS provides a frame budget of approximately 16.7 ms. During this run, 95% of the measured frames stayed comfortably below that value.

The simulation reached a maximum of 12 active entities, with an average of 6.64 during the measured session.

Heap usage changed from 12.18 MB at the beginning of the measurement to 12.98 MB at the end. This short profiling run did not show signs of uncontrolled memory growth, but it is not sufficient by itself to prove the absence of memory leaks. Longer sessions and repeated play/restart cycles would be useful for a more complete memory analysis.

## Performance considerations

Some implementation decisions were made with runtime performance in mind:

- Movement and gameplay simulation use delta time instead of assuming a fixed frame rate.
- Game logic and PixiJS rendering are kept separated.
- Projectiles have a limited lifetime and are removed when they are no longer needed.
- Destroyed enemies and expired effects are removed from the active simulation.
- Match state is recreated when starting a new game instead of reusing stale simulation data.
- PixiJS resources and event listeners are cleaned up when the game instance is destroyed.
- Gameplay stops advancing while the match is paused.
- Rendering resolution takes the device pixel ratio into account.
- Profiling is disabled during normal gameplay unless explicitly enabled with `?profile=1`.

## Testing notes

The measurement above represents a local profiling session and is not intended to represent every possible hardware configuration.

Performance may vary depending on:

- CPU and GPU
- Browser
- Display refresh rate
- Device pixel ratio
- Screen resolution
- Number of active enemies and projectiles
- Mobile device limitations

A longer stress test with a larger number of simultaneous entities would be the next step for identifying the practical upper limit of the current implementation.

## Possible future improvements

If the project required further optimization, the next areas I would investigate are:

1. Longer profiling sessions on desktop and mobile devices.
2. Repeated match restart tests to observe long-term memory behavior.
3. Stress tests with a higher enemy spawn rate.
4. Object pooling for frequently created projectiles and temporary effects.
5. Additional asset loading and texture memory analysis.
6. Profiling on lower-end mobile hardware.
7. Measuring loading time and asset transfer size under slower network conditions.

The current implementation prioritizes clear game architecture and predictable behavior while keeping enough instrumentation available to identify performance bottlenecks if the game grows in complexity.
