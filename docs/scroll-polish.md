# Proof Passage: focused scroll refinement

Self-authored under explicit creative delegation, on `feat/ui-overhaul`.
No new motion dependency, external runtime, generated asset, or infrastructure.

## Research and creative direction

Studied [scroll-craft](https://github.com/nateherkai/scroll-craft) at
`75d81f74e83692add18cd7a8a8e078b8a887a579`: skill workflow, approved collection,
hero-depth, devices, feeling curve, taste, structure and verification references.
The architectural mark in Herkules, physical order in Glaido, and purposeful
material response in FORME informed the direction. These are documented examples;
their private implementations were not tested. Doctor/shoot entry points were
inspected. No third-party script or engine was executed or copied into the app.
The downloaded research repository remains ignored under `.runtime/scroll-craft`.

Adapt independent planes, one engineered peak, opening/middle/exit composition,
native scroll, phone-specific pacing and actual-scroll screenshots. The user's
React/Three.js architecture overrides the standalone engine, video pipeline,
workspace generator and device-count requirements. This is a bounded split-stage
passage, not a new continuous-world site or a pretend live product surface.

Before implementation, the authored direction was communicated as a proof
passage: shelves open into depth, update geometry traverses an independent
readback plane, held geometry stays aside, and release settles back into order.
The existing intro and opening remain. The operator studio stays restrained.

| Beat | Intended feeling | Cause |
| --- | --- | --- |
| Opening | Clarity | Existing stable claim and brand sculpture |
| Rehearse | Curiosity | Shelves open in depth |
| Verify, the signature peak | Scrutiny | Readback frame intersects the changing geometry |
| Release | Relief | Released geometry aligns; held element stays outside |
| Studio | Authority | Real input, explicit consent, independently verified exports |

The memory hook is the shelves opening into a passage that leaves an unresolved
piece behind. Scene geometry is explicitly conceptual, never current job data,
verification results, or measured progress. Scroll is reversible. The final
message holds. A direct studio link bypasses the narrative at any time.

Far grid, separated shelves, near frame and traveling geometry move independently.
Copy uses its own clear ground. Phones place the complete scene above the copy
and shorten travel. Reduced motion removes pinning and reveals all explanations
in natural reading order. The approved SVG remains available without WebGL.

## Reproduction

Use the existing environment and Docker setup. From `web/`, run `npm run test:e2e`
for real local integration plus frontend checks. Run `npm run test:e2e --
scroll.spec.ts` for only scroll checks. Ports 18765/18766 must be free first.
Scroll screenshots are ignored under `artifacts/scroll-polish/`, grouped by width.
Tests use real browser scroll positions, including reverse travel, rather than
setting animation progress directly. Native pointer lock/capture are disabled
in those automated contexts. No paid asset service is used.

## Measured verification

The first full browser run passed both fresh real local integration journeys
and the eight existing UI regressions. Its three new scroll cases failed: one
measured the opening's 9px entrance transform before it settled, and two found
insufficient contrast in a secondary studio label. The original log is retained
at ignored `.runtime/scroll-e2e.log`. The label was darkened and layout comparison
now starts after the actual entrance animation finishes. No contrast rule or
downstream validator was excluded. Visual inspection also caught a cropped lower
shelf on phones; scene scale and vertical composition were adjusted.

After those fixes, **12 frontend/scroll tests passed in 1.1 minutes**. Three
viewport cases (1440×900, 390×844, 360×640) each sampled seven actual positions,
including reverse travel: **21 screenshots**. Every settled stage passed axe
WCAG A/AA checks, kept copy in the viewport, changed canvas pixels across travel,
preserved document geometry, reached the studio, and reported no page errors.
Reduced motion exposed all explanations without a canvas or pinned travel.
Existing checks also covered unavailable/lost WebGL, the once-per-session intro,
consent reset, partial results, false-success prevention and restoration outages.
Synthetic API fixtures in UI tests remain clearly separate from real integration.

Fresh live local evidence from the full run:

| Journey | Outcome | Transformation evidence |
| --- | --- | --- |
| Standard mappings | 3 input = 2 verified + 1 held; CSV/report downloaded | `chatcmpl-b38d42f9-a634-4b77-bfae-4e2530643c6a`, 790 tokens, one attempt, 1.4 minutes |
| Human-confirmed interpretation | 2/2 independently verified | `chatcmpl-a020ec62-9e99-4c95-a58c-f5da5a120e73`, 1,549 tokens, one attempt, 57.0 seconds |

Both used Vultr inference, the local separate worker, isolated sandbox and native
WooCommerce. Reports contain independent persisted SQL values and state that the
store was destroyed. Subsequent project-label queries found no ShelfReady staging
containers or volumes. This is functional regression evidence, not a competitive
benchmark or an agent-value claim. The final changes after this live run concerned
scene framing, intro-time renderer gating, contrast and test timing; operator/API
behavior was unchanged. Final UI regressions ran after all those changes.

Screenshots were inspected at full size, including midpoint and release frames
on desktop and compact phone. The first composition felt oversized and crowded
on phones; after reframing, the intended scrutiny-to-relief turn reads with a
complete silhouette and separate copy. This is an art-direction judgment, not
measured user preference. Production-package desktop and phone frames were also
captured and inspected using Vite preview on loopback, with no cloud changes.

TypeScript/Vite production build, pinned formatting, Ruff, whitespace and
tracked-file credential checks passed. Main JS is **229.39 kB / 72.43 kB gzip**;
CSS **40.40 kB / 9.50 kB gzip**. The existing lazy Three.js chunk remains
**753.31 kB / 192.54 kB gzip** and still triggers Vite's size warning. No added
dependencies. Canonical brand SVGs, backend, infrastructure and frozen evidence
were not modified.

## Performance and limits

The existing DPR 1.5 and 30 FPS caps, idle/offscreen/hidden-document pauses and
resource disposal remain. Scroll updates use one coalesced animation frame and
refs instead of React state per scroll tick. The passage mounts its renderer only
near the section and after the intro; it disposes it when leaving. At the boundary
the opening and passage can retain two contexts, each bounded and visibility
gated. This supersedes the earlier pass's single-mounted-scene description.
The existing preserved drawing buffer supports stopped-frame rendering/captures
and has a memory tradeoff. No performance claim is based on headless frame rate.

Mobile checks emulate viewport sizes in Chromium. Real iOS/Android GPU, touch
inertia, low-power devices, Safari, Firefox and screen-reader testing remain
unverified. Static explanation and SVG fallbacks preserve meaning. The narrative
uses discrete readable copy beats with brief transitions, not scroll-jacked
navigation. No public endpoints or new upload permissions were introduced.
