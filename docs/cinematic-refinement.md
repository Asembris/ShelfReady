# Cinematic refinement after reference review

> Superseded: the owner rejected this design. See [The Archive](cinematic-world.md) for the current renderer and scroll model. Retained as history.

Work remains on `feat/ui-overhaul`. Architecture, backend, native verification,
authentication, frozen evaluations and infrastructure are unchanged.

## Reference study

Inspected both supplied recordings through temporal frame sheets before code
changes, then opened Cubexio directly in Chromium. The text web reader failed;
Chromium loaded the actual site. No reference assets, layout code or branding
were reused. Visual-analysis skill guided coarse-to-fine source-frame inspection.

The ShelfReady recording is 9.38 seconds. Half-second samples show the same mark
beside successive captions, with visible caption overlap near the changes. The
Cubexio recording is 32.31 seconds. Two-second samples show a coherent object
language across a photographic opening, service/process compositions and a
disassembled ending. Its useful principles are continuity, composition changes,
foreground/background separation and a stronger release of energy at the end.
Its colors, photographs and cube identity are not appropriate ShelfReady assets.
Frame-sheet order is chronological, left to right, four columns. Recording
timestamps and source frame rates are not measurements of the websites' FPS.
Source sheets and the live reference screenshot are ignored under
`artifacts/creative-review/`.

## Motion diagnosis and changes

- The previous renderer deliberately gated all scenes at 30 FPS. Desktop now
  renders on browser animation frames; compact devices keep a bounded 30 FPS
  cadence. Existing DPR, visibility pauses, idle stopping and cleanup remain.
- Fixed per-frame rotation increments changed response with refresh rate.
  Exponential damping uses elapsed seconds. Tests compare 30/60/120 Hz over equal
  elapsed time and verify monotonic convergence. Long-frame deltas are bounded
  to avoid an extreme jump after interruption.
- Geometry read raw scroll while pointer rotations smoothed separately. The
  narrative now damps its target and drives the geometry from that displayed
  position. It stops only after reaching the target, including after rapid
  reversal. Re-entering initializes the damped position from the current scroll
  target, without introducing travel from zero. The three-second opening remains.
- Scene scale switched at an aspect-ratio threshold. It now varies continuously.
  Camera distance and material colors interpolate rather than switch abruptly.
- Caption visibility/opacity transitions overlaid outgoing and incoming words,
  clearly visible in the supplied recording. Copy changes as readable, mutually
  exclusive beats. Motion is carried by the scene, not overlapping ghost text.

## Art direction and iteration

The opening now shares a continuous navy ground with the story. The inverse
approved lockup, large pale typography, cobalt emphasis and unboxed sculpture
establish one environment instead of a light marketing block beside a dark tile.
Studio controls get shorter motion, clearer typographic hierarchy and quieter
surfaces; they retain the same API, accessible labels and confirmation authority.

Rehearsal opens the shelf structure. Verification brings paired source/readback
geometry into alignment and reduces the mark's prominence. Release resolves into
a folio with structured rows and a small brand signature. Held geometry remains
outside. These are explicitly conceptual objects, not fabricated catalog values,
current job progress or claims of successful verification.

First iteration recordings showed the folio occluding the signature and too much
of the old sculpture during comparison. The next iteration introduced paired
readback geometry and shrank the mark; the final depth correction places its
signature in front of the folio. Desktop and phone frames were inspected at full
size, not accepted based solely on compilation. Evidence remains ignored in
`artifacts/creative-review/after/` and `iteration-2/`; final evidence is identified
below. Earlier captures are retained as iterations, not presented as final.

## Verification

**Browser checks:** all 16 tests passed in 3.4 minutes, including two real local
Vultr/sandbox/native WooCommerce/independent SQL-readback journeys. After the final
signature depth correction, all 14 non-inference browser tests passed in 1.5
minutes. Those include actual forward/reverse scroll positions at 1440×900,
390×844 and 360×640, axe contrast/accessibility, layout stability, intro timing,
reduced motion, WebGL unavailability/context loss, consent, partial/failed results
and restoration. Mocked failure-state fixtures remain explicitly synthetic.

Live transformation IDs: `chatcmpl-ee474e7d-ec28-41db-a2d0-3eb155c40070` (835 tokens)
and `chatcmpl-1c131232-6005-4d4c-b7a0-80f20ae2023e` (1,549 tokens). Their reports
record native import, independent persisted readback and store destruction. No
benchmark was rescored and no agent-superiority claim follows from these tests.

**Measured motion:** a five-second native-scroll sweep sampled actual WebGL clear
calls for the passage canvas: 270 draws, **53.63 draws/sec**, median gap **18.1ms**,
p95 **23.7ms**. This was local headless Chromium while other verification work
was active, not a hardware/device certification or a locked 60 FPS claim. Rapid
alternating scroll targets settled to **0.4000** for a target of 0.4; resizing to
390px produced no document overflow. Raw results: ignored
`artifacts/creative-review/performance.json`. The trace measures scene draws,
not the recorded video's encoding frame rate or subjective smoothness.

**Backend:** the first complete run had 116 passes and a containment-test timeout
under concurrent browser/recording load. The sandbox returned timeout/137 with no
results and correctly failed the test. No limit or assertion was changed. The
unchanged test passed alone in 2.30 seconds. The original failure log is retained
in `.runtime/cinematic-python.log`. A complete sequential rerun passed **all 117
tests in 87.88 seconds**, with one existing Starlette/AnyIO deprecation warning;
log: `.runtime/cinematic-python-serial.log`. Subsequent project-label queries
found no ShelfReady staging containers or volumes.

**Package:** strict TypeScript/Vite and pinned formatting passed. Main JS
230.56 kB / 72.88 kB gzip; CSS 42.93 kB / 9.99 kB gzip. The lazy Three.js chunk
remains 753.31 kB / 192.54 kB gzip and still emits Vite's size warning. No new
runtime dependencies. Ruff and whitespace checks passed. Production-package
desktop/phone scroll frames were captured under `artifacts/creative-review/package/`
and inspected at full size. All 17 locked brand assets passed naming, transparency,
favicon notch, rendering, font and reference checks. The tracked-file known-secret/
private-key scan passed; it is bounded rather than an exhaustive security audit.

## Evidence and limits

Final desktop/phone screenshots and actual Playwright recordings are in ignored
`artifacts/creative-review/final/`; earlier `after/` and `iteration-2/` captures
remain available for comparison. The source recordings belong to the user and
remain at their original paths. None of these videos, private browser chrome,
generated artifacts or source assets from Cubexio are committed to Git.
Final recordings: `final/desktop.mp4` and `final/mobile.mp4`. They document local
browser interaction; their recording cadence is separate from the draw measurement.

Actual inspection covered the supplied recordings' coarse temporal samples, the
live reference opening, fresh local frames and two development iterations. It
does not establish a visual-quality rating from independent users. The final
design is more compositionally varied, but its symbolic readback geometry remains
an illustration; the studio's real evidence is what authorizes exports.

No physical phone, iOS/Safari, Firefox, touch inertia or assistive-technology audit
was performed. Desktop cadence is below a guaranteed 60 FPS. Existing preserved
drawing buffers have a memory cost; compact rendering, DPR bounds, offscreen/idle
pauses and disposal reduce it. Existing cloud billing obligations and deployment
state were not changed. No public endpoint was exposed, PR opened or merge made.
