# The Archive: a continuous Three.js film

Work on `feat/ui-overhaul`. This replaces the previous landing scenes, which the
owner rejected. Backend contracts, authentication, trusted validation, sandbox
policy, native import/readback, deployment, fixtures, frozen evaluations and the
locked brand files are unchanged. No commit in this phase touches those paths.
This supersedes the renderer and scroll descriptions in
[scroll-polish](scroll-polish.md), [cinematic-refinement](cinematic-refinement.md)
and the "Brand and rendering" section of [ui-overhaul](ui-overhaul.md).

## Reference study

Both recordings were sampled into temporal frame sheets, and Cubexio was opened
in a real browser.

- **ShelfReady, 9.38 s.** One logo stays right while captions change, with visible
  ghosting between headlines near 3.5 s and 8 s, hard white/navy seams and a
  disappearing header. This recording (20:53) predates the last three commits
  (21:12 to 21:20), so it shows the earlier state of the same design.
- **Cubexio, 32.31 s, and its live page.** A 400×420 canvas object travels over
  full-bleed photographs on Lenis scroll, set in Syne and DM Sans. The useful
  principles are one persistent thread, a new composition per section, and a
  release of energy at the end. No code, asset, color, layout or cube idea was
  reused, and there is no photography here at all.

The recording's frame timing is capture cadence, not site FPS, so it was not used
as a performance measurement.

## The film

The rejected design was a logo beside captions. Here the logo appears once.

| Scene time | Beat | What happens |
| --- | --- | --- |
| Opening (~3 s) | Identity | The approved mark assembles, then the camera flies through its verification notch |
| 0 | The hall | A dark archive of shelves; the pointer is a lamp that reveals index tabs |
| 1 | A supplier file is a rumor | Rows tear through as a storm, carrying ambiguous values such as `1.250,00` and `€ or £?` |
| 2 | Nothing moves until you say so | The storm freezes overhead; one small person stands at a door |
| 3 | Rehearse | Through the door, a disposable store assembles; a god's-eye view with the word on the air |
| 4 | Verify | A scanner blade crosses the store; expected and read-back ledgers compare |
| 5 | Release | The store is demolished; verified rows rise into one sheet; held rows stay visibly outside |
| 6 | Studio | The world dims and rests behind a lit working sheet |

The door keeps the brand notch's 12:8 proportion, and buttons and the sheet's
corner use the mark's exact 1:2 slope. Those are the only other brand references.
The scene is illustrative: rows and values are conceptual, and copy says so. During
a real job the world shows only an indeterminate sweep and never encodes progress.

**Typography** stays in the approved Inter, set far larger and lighter, with
tabular slashed numerals for data and titles physically placed in the world.
Display weight 300 departs from the package's suggested heading weight of 600; the
wordmark outlines themselves are untouched. That choice is the owner's to overrule.

## Why it jittered, and what changed

Measured with one harness on the same GPU (GTX 1660), using real wheel input and
per-frame sampling of what the scene displayed. The old build is a single run.
New-build figures are the range across one dev and four production runs.
Raw results are in ignored `artifacts/creative-review/round3/measure/`.

| Measure | Old | New |
| --- | --- | --- |
| Largest share of one wheel notch delivered in a single frame | 47.9% | 7.7% |
| Velocity jumps over 25% of peak, in 12 steady notches | 13 | 4 to 7 |
| Largest velocity jump, as a share of peak | 100% | 33 to 34% |
| Worst frame | 50 ms | 16.8 ms in four runs; 83 ms in one |
| Long tasks while scrolling | one, 52 ms | none in four runs; one, 79 ms, in one |
| WebGL contexts | 2 | 1 |

Root causes and fixes:

1. **First-order smoothing.** `damp` has discontinuous velocity, so each notch was
   a pulse. Scene time now follows an exact closed-form critically damped spring,
   whose result is identical at any refresh rate. It trails steady scrolling by
   about 180 ms by design.
2. **Wake-up step.** The stopped loop resumed with a 50 ms delta, delivering almost
   half the remaining distance in one frame. A resume now never integrates the gap.
3. **Two clocks.** A separate scroll rAF ran after the renderer's, so the scene read
   stale progress. One loop now reads scroll once, first, then draws.
4. **Sticky canvas.** A sticky canvas moves on the compositor while its pixels come
   from the main thread. The one canvas is now fixed and words pass over it on
   native scroll, so nothing tries to pin 3D objects to moving DOM. Scroll is never
   hijacked.
5. **Words and picture drifted.** Progress was a global fraction. Scene time is now
   anchored to where each chapter's copy actually measures in the document, and
   only re-measured on layout change, never per frame.
6. **Renderer costs.** Removed `preserveDrawingBuffer`, the alpha canvas and
   `low-power`. All instance motion is a pure function of uniforms, so there are no
   per-frame buffer uploads, and everything compiles and uploads before first use.
7. **Caption ghosting.** Overlapping crossfades are gone; copy reveals through line
   masks on compositor-friendly properties.

## Verification

**Final code, from the real checkout, run sequentially:**

- **Browser: 24 of 24 passed in 3.0 minutes**, real GPU.
- **Python: 117 passed in 89.71 s**, with one existing deprecation warning. Ruff passed.
- All 17 locked brand assets passed. The bounded tracked-file credential scan passed
  and is not an exhaustive security audit. `npm audit` found 0 vulnerabilities, using
  the OS certificate store. `git diff --check` passed.
- `npm run format:check` warns on this checkout because `core.autocrlf=true` leaves
  CRLF in the working copy while Git stores LF. With `--end-of-line auto`, every file
  matches.

**Real journeys**, with live Vultr inference, the isolated sandbox, native
WooCommerce import, independent SQL readback and store destruction. The first ran
inside the full film; the second used reduced motion.

| Journey | Outcome | Transformation |
| --- | --- | --- |
| Standard mappings | 3 input = 2 verified + 1 held; CSV and report downloaded | `chatcmpl-fc3288d9-263c-4f83-bb22-37a97fb3a8e4`, 835 tokens, 1 attempt |
| Reviewed interpretation | 2 of 2 verified | `chatcmpl-8f6c3350-5895-4e38-baba-179a1d9ceaaa`, 1,549 tokens, 1 attempt |

Reports retain `00017`, `13.5500`, `7` and `A-2`, `1.35`, `2`; `UNKNOWN` was excluded
from the CSV. Later project-label queries found no staging containers or volumes.
These are regression journeys, not benchmarks or evidence of agent superiority.

**Browser coverage** includes the once-per-session opening and its 2.8 to 3.5 s bound,
skip by button and Escape, WCAG A/AA axe scans at every chapter on 1440×900, 390×844 and
360×640, forward and reverse scene-time agreement, one context throughout, keyboard
navigation through the chapter index and skip link, deep links, reduced motion, absent
WebGL, reported software WebGL, context loss, and all consent and failure boundaries.
Axe cannot read contrast against a canvas, so copy over the film was judged by eye.

**Failures found along the way**, all fixed in the application rather than the tests:

- Spill geometry produced NaN at MSAA edges, and bloom spread it into white bands.
- A sRGB-encoded clear color caused a one-frame pale flash at the opening's handover.
- After upload, the operator was left at a stale offset, stranded on the footer.
- `/#studio` deep links landed at the top of the page.
- **The full suite first failed 6 of 23 under the default config, which uses software
  WebGL.** PageDown went unanswered for 5 s. This was a real product bug: such devices
  now get the still frame, decided before the Three.js chunk downloads, and the
  Playwright config now requests the GPU.
- A later run failed 1 of 24: chapter links landed on empty film rather than words.

**Visual inspection** used real compositor frames through CDP screencast on the
production build. Median frame gap was 16.5 ms and p95 was 20.5 ms at 1440×810; 16.6 and
21.7 ms at 390×844; no GL errors. The opening took 3.08 to 3.12 s after load. Five
iterations were inspected at full size and are retained under ignored
`artifacts/creative-review/round3/`.

**Weak devices.** With 70 ms of main-thread load injected into each frame, quality
stepped down three times and the page fell back to the still frame after 9 seconds.

**Package.** Main JS 228.64 kB / 72.04 kB gzip, CSS 33.71 kB / 8.24 kB gzip. The lazy
world chunk is 591.00 kB / 153.03 kB gzip, down from 753.31 / 192.54 kB through named
imports, and still triggers Vite's size warning. No dependencies were added.

## Limits

- Everything ran in local Chromium on one Windows desktop with a GTX 1660. **No physical
  phone, iOS/Safari, Firefox, touch inertia, low-end GPU or screen reader was tested.**
  Phone results are emulated viewports on that same GPU, so they say nothing about
  phone GPU performance. Mid-range phones may land on lower quality or the still frame.
- Automated wheel input arrives as instant 100 px steps, a worst case. Real browsers
  animate wheel scrolling, which was not separately measured, and neither was subjective
  smoothness at the owner's 144 Hz or capture cadence. The old baseline is a single run.
- The film tests need a GPU. On a GPU-less machine they will fail by design, because the
  page correctly takes the still frame.
- A weak device can run the film for up to about 9 seconds before falling back.
- The figure is built from primitives. It reads well as a silhouette at a distance and is
  the weakest asset in its brief close-up.
- The mark's flat opening uses the exact approved paths and colors. During the dive the
  extruded, graded mark is an illustration, as earlier scenes were.
- Visual quality is the owner's judgment. Nothing here is a measured user preference.
- Public authentication and HTTPS were not retested, and `public.spec.ts` was not run.
  Nothing was deployed.

## Reproduction

Use the existing environment and Docker setup with ports 18765 and 18766 free, then run
`npm run test:e2e` from `web/`. For frontend-only regressions, add
`--grep-invert "real Vultr|grounded interpretation"`. Evidence is written under ignored
`artifacts/`, and synthetic UI fixtures remain separate from the real journeys.
