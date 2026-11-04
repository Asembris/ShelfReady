import { useEffect, useRef, useState } from "react";
import type { Anchor } from "./motion";
import type { JobMood, World } from "./world/world";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query);
    const change = () => setMatches(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [query]);
  return matches;
}
export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

/** The single renderer's handle, shared with the opening so its dive lands in the same world. */
export const stage: {
  world: World | null;
  dived: boolean;
} = { world: null, dived: false };

/**
 * Scene time is anchored to where each chapter's copy actually sits in the
 * document, so words and picture agree at any viewport height or text wrap.
 * Measured on layout change only; the render loop never touches layout.
 */
function readAnchors(): Anchor[] {
  const height = innerHeight;
  const anchors = [...document.querySelectorAll<HTMLElement>("[data-scene]")]
    .map((el): [number, number] => {
      const box = el.getBoundingClientRect();
      const top = box.top + scrollY;
      // data-focus places a block's centre at a chosen height, leaving the subject clear.
      const focus = Number(el.dataset.focus ?? 0.5);
      const y =
        el.dataset.align === "top"
          ? top - Number(el.dataset.lead ?? 0)
          : top + box.height / 2 - height * focus;
      return [Math.max(0, y), Number(el.dataset.scene)];
    })
    .sort((a, b) => a[1] - b[1]);
  for (let i = 1; i < anchors.length; i++)
    anchors[i][0] = Math.max(anchors[i][0], anchors[i - 1][0] + 1);
  return anchors;
}

/** One fixed canvas behind the whole page. The CSS scene beneath it is the WebGL-free fallback. */
export function WorldStage({
  ready,
  mood,
  layoutKey,
}: {
  ready: boolean;
  mood: JobMood;
  layoutKey: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [world, setWorld] = useState<World | null>(null);
  useEffect(() => {
    if (reduced || !host.current) return;
    const element = host.current;
    let cancelled = false;
    let created: World | null = null;
    const compact = matchMedia("(max-width:850px),(pointer:coarse)").matches;
    const lose = () => {
      stage.world = null;
      setWorld(null);
      // No film to watch: the chapters collapse into plain reading order.
      document.documentElement.dataset.film = "off";
    };
    import("./world/world")
      .then(({ createWorld }) =>
        createWorld(element, {
          tier: compact ? "compact" : "full",
          onLost: lose,
        }),
      )
      .then((made) => {
        if (cancelled) return made.dispose();
        created = made;
        stage.world = made;
        made.setAnchors(readAnchors());
        setWorld(made);
      })
      .catch(() => lose()); // No WebGL: the CSS scene and every control remain.
    return () => {
      cancelled = true;
      stage.world = null;
      created?.dispose();
    };
  }, [reduced]);

  useEffect(() => {
    if (!world) return;
    const measure = () => world.setAnchors(readAnchors());
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
    };
  }, [world]);

  // A changed page layout is a cut, not a journey through every chapter in between.
  const firstLayout = useRef(true);
  useEffect(() => {
    if (!world) return;
    world.setAnchors(readAnchors());
    if (firstLayout.current) firstLayout.current = false;
    else world.snap();
  }, [world, layoutKey]);

  useEffect(() => {
    if (ready && world && !stage.dived) world.reveal();
  }, [ready, world]);

  useEffect(() => world?.setJob(mood), [world, mood]);

  return (
    <div className="world" aria-hidden="true">
      <div className="world-fallback">
        <i />
      </div>
      <div
        ref={host}
        className={`world-canvas ${world ? "is-live" : ""}`}
        data-testid="world"
        data-renderer={world ? "webgl" : "fallback"}
      />
    </div>
  );
}
