import { useEffect, useRef, useState } from "react";
import ProofScene, { useReducedMotion } from "./ProofScene";

const beats = [
  [
    "Rehearse.",
    "Give change a safe place.",
    "Confirm your mappings. Transform supplier values in isolation, then import them into disposable WooCommerce.",
    "Your production store stays out of reach.",
  ],
  [
    "Verify.",
    "Look beyond a success message.",
    "Read persisted values independently. Check identifiers, prices and stock against trusted expectations.",
    "The model cannot change the validators.",
  ],
  [
    "Release.",
    "Let only the proven changes through.",
    "Download resolved, verified updates with a change report. Unresolved rows stay visible and outside your CSV.",
    "The final decision stays yours.",
  ],
];

export default function ProofPassage({ enabled }: { enabled: boolean }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const reduced = useReducedMotion();
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = root.current!;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(el);
    if (reduced) return () => observer.disconnect();
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const p = Math.max(
        0,
        Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
      );
      progress.current = p;
      el.dataset.progress = p.toFixed(3);
      el.dataset.beat = p < 0.32 ? "rehearse" : p < 0.68 ? "verify" : "release";
      el.style.setProperty("--passage-p", String(p));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [reduced]);
  return (
    <section
      id="process"
      className={`proof-passage ${reduced ? "passage-static" : ""}`}
      ref={root}
      aria-label="Rehearse. Verify. Release."
      data-beat="rehearse"
    >
      <div className="passage-stage">
        <div className="passage-heading">
          <span>THE PROOF PASSAGE</span>
          <p>A rehearsal earns its release.</p>
        </div>
        <div className="passage-art">
          {near && enabled && !reduced ? (
            <ProofScene journey={progress} />
          ) : (
            <img src="/brand/icon-dark.svg" alt="" />
          )}
        </div>
        <div className="passage-copy">
          {beats.map(([title, sub, body, foot], i) => (
            <article key={title} className={`passage-beat beat-${i}`}>
              <h2>{title}</h2>
              <h3>{sub}</h3>
              <p>{body}</p>
              <span>{foot}</span>
            </article>
          ))}
        </div>
        <div className="passage-caption">
          <span>Conceptual geometry. No job is running.</span>
          <span>Open passage → Independent readback → Resolved release</span>
        </div>
      </div>
      <div className="passage-handoff">
        <p>
          Enough possibility.
          <br />
          <strong>Now, your actual catalog.</strong>
        </p>
        <a className="text-link" href="#studio">
          Open studio ↗
        </a>
      </div>
    </section>
  );
}
