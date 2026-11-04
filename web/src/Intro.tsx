import { useEffect, useRef, useState } from "react";
import { stage, useReducedMotion } from "./Cinema";

const OPENING_MS = 3050;
const DIVE_AT_MS = 2080;

/**
 * The approved mark's exact paths, one layer per shelf: each travels on the
 * compositor, so a busy main thread cannot stall the first impression.
 */
const SHELVES = [
  { d: "M32 12H88L80 28H24Z", fill: "#6C8CFF" },
  { d: "M24 40H80L72 56H54V48H42V56H16Z", fill: "#F1F5FF" },
  { d: "M16 68H72L64 84H8Z", fill: "#F1F5FF" },
];

/**
 * About three seconds, once per tab session. The mark assembles as exact vector
 * art, then hands over invisibly to the world's identical mark, whose notch the
 * camera flies through. Presentation timing only: nothing is loading or running.
 */
export function BrandIntro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const mark = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"assemble" | "dive" | "close">("assemble");
  const [show, setShow] = useState(() => {
    try {
      return (
        !matchMedia("(prefers-reduced-motion: reduce)").matches &&
        !sessionStorage.getItem("shelfready:intro")
      );
    } catch {
      return false;
    }
  });
  const finish = (skipped = false) => {
    try {
      sessionStorage.setItem("shelfready:intro", "seen");
    } catch {
      /* storage is optional */
    }
    if (skipped) {
      stage.dived = false;
      if (mode === "dive") stage.world?.reveal();
    }
    setShow(false);
  };
  useEffect(() => {
    if (!show) {
      onDone();
      return;
    }
    if (reduced) {
      finish();
      return;
    }
    const dive = setTimeout(() => {
      const world = stage.world;
      const box = mark.current?.getBoundingClientRect();
      if (world && box) {
        stage.dived = true;
        world.dive(
          {
            x: box.left + box.width / 2,
            y: box.top + box.height / 2,
            size: box.height,
          },
          (OPENING_MS - DIVE_AT_MS) / 1000,
        );
        setMode("dive");
      } else setMode("close"); // Three.js is late or absent: the vector mark simply fades.
    }, DIVE_AT_MS);
    const done = setTimeout(finish, OPENING_MS);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
    };
    addEventListener("keydown", escape);
    return () => {
      clearTimeout(dive);
      clearTimeout(done);
      removeEventListener("keydown", escape);
    };
  }, [show, reduced, onDone]);
  if (!show) return null;
  return (
    <div className={`brand-intro is-${mode}`} data-testid="brand-intro">
      <div className="intro-lockup">
        <div ref={mark} className="intro-mark" aria-hidden="true">
          {SHELVES.map((shelf, i) => (
            <svg key={i} className={`shelf-${i}`} viewBox="0 0 96 96">
              <path {...shelf} />
            </svg>
          ))}
        </div>
        <img
          className="intro-wordmark"
          src="/brand/wordmark-dark.svg"
          alt="ShelfReady"
        />
        <p className="intro-tagline">
          <span>Rehearse.</span> <span>Verify.</span> <span>Release.</span>
        </p>
      </div>
      <span className="sr-only" role="status">
        Preparing your rehearsal studio
      </span>
      <button className="intro-skip" onClick={() => finish(true)}>
        Skip intro <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
