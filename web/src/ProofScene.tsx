import { useEffect, useRef, useState, RefObject } from "react";

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
export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Decorative geometry only. No success state or numerical progress is inferred here. */
export default function ProofScene({
  phase = 0,
  intro = false,
  journey,
}: {
  phase?: number;
  intro?: boolean;
  journey?: RefObject<number>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const phaseRef = useRef(phase);
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    phaseRef.current = phase;
    wake.current();
  }, [phase]);
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let cleanup = () => {};
    import("three")
      .then((T) => {
        if (cancelled || !host.current) return;
        const element = host.current;
        let renderer: InstanceType<typeof T.WebGLRenderer>;
        try {
          renderer = new T.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
            preserveDrawingBuffer: true,
          });
        } catch {
          return;
        } // The approved SVG beneath remains available without WebGL.
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.domElement.setAttribute("aria-hidden", "true");
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, 0, 9.5);
        scene.add(new T.AmbientLight(0xb6c9ff, 2.4));
        const light = new T.DirectionalLight(0xffffff, 5);
        light.position.set(-3, 5, 7);
        scene.add(light);
        const edge = new T.DirectionalLight(0x416bff, 3);
        edge.position.set(4, -1, 3);
        scene.add(edge);
        const group = new T.Group();
        scene.add(group);
        const passage = new T.Group();
        scene.add(passage);
        const frameGeometry = new T.EdgesGeometry(
          new T.BoxGeometry(4.8, 3.8, 0.04),
        );
        const frameMaterial = new T.LineBasicMaterial({
          color: 0x6c8cff,
          transparent: true,
          opacity: 0.6,
        });
        const readback = new T.LineSegments(frameGeometry, frameMaterial);
        passage.add(readback);
        const recordGeometry = new T.BoxGeometry(0.7, 0.065, 0.16);
        const recordMaterial = new T.MeshStandardMaterial({
          color: 0xf1f5ff,
          metalness: 0.6,
          roughness: 0.3,
        });
        const records = Array.from({ length: 7 }, (_, i) => {
          const mesh = new T.Mesh(recordGeometry, recordMaterial);
          passage.add(mesh);
          mesh.position.y = (i - 3) * 0.21;
          return mesh;
        });
        const heldGeometry = new T.EdgesGeometry(
          new T.BoxGeometry(0.7, 0.2, 0.16),
        );
        const heldMaterial = new T.LineBasicMaterial({ color: 0xf1f5ff });
        const held = new T.LineSegments(heldGeometry, heldMaterial);
        passage.add(held);
        passage.visible = !!journey;
        // Exact approved planar paths; extrusion is a spatial illustration, not a new logo master.
        const coordinates = [
          [
            [32, 12],
            [88, 12],
            [80, 28],
            [24, 28],
          ],
          [
            [24, 40],
            [80, 40],
            [72, 56],
            [54, 56],
            [54, 48],
            [42, 48],
            [42, 56],
            [16, 56],
          ],
          [
            [16, 68],
            [72, 68],
            [64, 84],
            [8, 84],
          ],
        ];
        const pieces = coordinates.map((points, index) => {
          const shape = new T.Shape();
          points.forEach(([x, y], n) => {
            const a = (x - 48) / 24,
              b = (48 - y) / 24;
            if (n === 0) shape.moveTo(a, b);
            else shape.lineTo(a, b);
          });
          shape.closePath();
          const geometry = new T.ExtrudeGeometry(shape, {
            depth: 0.42,
            bevelEnabled: false,
            steps: 1,
            curveSegments: 1,
          });
          const material = new T.MeshStandardMaterial({
            color: index === 0 ? 0x164bff : intro ? 0xf1f5ff : 0x9baed7,
            metalness: 0.38,
            roughness: 0.29,
          });
          const mesh = new T.Mesh(geometry, material);
          group.add(mesh);
          return mesh;
        });
        // A subtle reference plane makes the shelves read as aligned stages rather than floating decoration.
        const grid = new T.GridHelper(12, 24, 0x335393, 0x1a315e);
        grid.position.set(0, -2.25, -0.7);
        const gridMaterial = grid.material as InstanceType<typeof T.Material>;
        gridMaterial.transparent = true;
        gridMaterial.opacity = intro ? 0 : 0.34;
        scene.add(grid);
        element.appendChild(renderer.domElement);
        let visible = true,
          looping = false,
          last = 0,
          activeUntil = 0,
          hasRendered = false;
        const began = performance.now();
        const pointer = { x: 0, y: 0 };
        const ease = (v: number) =>
          1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
        const render = (now: number) => {
          if (now - last < 1000 / 30) return;
          last = now;
          const elapsed = (now - began) / 1000,
            mode = phaseRef.current;
          const targetY = intro ? 0 : -0.38 + pointer.x * 0.14;
          const targetX = intro ? 0 : 0.28 + pointer.y * 0.1;
          group.rotation.y += (targetY - group.rotation.y) * 0.09;
          group.rotation.x += (targetX - group.rotation.x) * 0.09;
          group.rotation.z += (intro ? 0 : -0.07 - group.rotation.z) * 0.07;
          pieces.forEach((piece, i) => {
            const assembly = intro
              ? ease((elapsed - 0.2 - i * 0.18) / 1.65)
              : ease(elapsed / 1.7);
            const distance = (1 - assembly) * (i === 1 ? -1.6 : 2.2);
            const spread =
              mode === 1 ? 0.16 : mode === 2 ? 0.25 : mode === 4 ? 0.35 : 0;
            const float =
              mode === 2 ? Math.sin(elapsed * 1.7 + i * 0.8) * 0.06 : 0;
            piece.position.x = distance * (i === 0 ? 1 : i === 2 ? -1 : 0);
            piece.position.y =
              distance * (1 - i) * 0.8 + (1 - i) * spread + float;
            piece.position.z =
              (1 - assembly) * (i - 1) * 1.8 +
              (intro ? 0 : assembly * (1 - i) * 0.3);
            piece.rotation.y = (1 - assembly) * (i % 2 ? 1 : -1) * 1.3;
          });
          if (journey) {
            const p = journey.current;
            const open = Math.sin(Math.PI * Math.min(1, p / 0.85));
            const release = ease((p - 0.66) / 0.34);
            group.rotation.set(
              0.3 - open * 0.15,
              -0.42 + open * 1.1 + pointer.x * 0.1,
              -0.08,
            );
            const viewScale = camera.aspect < 1 ? 0.64 : 0.83;
            group.scale.setScalar(viewScale);
            group.position.x = 0.15;
            pieces.forEach((piece, i) => {
              piece.position.set(
                (i - 1) * open * 0.35,
                (1 - i) * open * 0.65,
                (i - 1) * open * 1.5,
              );
              piece.rotation.y = (i - 1) * open * 0.24;
            });
            readback.rotation.y = -0.45 + open * 0.2;
            readback.position.set(0.5, 0, 0.5);
            frameMaterial.opacity = 0.15 + Math.sin(Math.PI * p) * 0.65;
            records.forEach((record, i) => {
              record.position.set(
                0.5 + (1 - release) * Math.sin(i * 1.8) * 0.35,
                (i - 3) * 0.21,
                (p * 2 - 1) * 3 + (i % 2) * 0.2,
              );
              record.rotation.y = -0.42 + open * 0.4;
              record.scale.x = 1 - release * 0.35;
            });
            held.position.set(-1.8 - ease((p - 0.35) / 0.3) * 0.6, -1.15, 0.6);
            held.rotation.y = -0.5;
            passage.scale.setScalar(viewScale * (1 - release * 0.28));
          }
          renderer.render(scene, camera);
          if (!hasRendered) {
            hasRendered = true;
            setReady(true);
          }
          if (!intro && elapsed > 2.6 && mode !== 2 && now > activeUntil) {
            renderer.setAnimationLoop(null);
            looping = false;
          }
        };
        const start = () => {
          activeUntil = performance.now() + 1400;
          if (!looping && visible && !document.hidden) {
            looping = true;
            renderer.setAnimationLoop(render);
          }
        };
        wake.current = start;
        const scroll = () => {
          if (journey) start();
        };
        if (journey) addEventListener("scroll", scroll, { passive: true });
        const size = new T.Vector2();
        const resize = () => {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          renderer.getSize(size);
          if (size.x === rect.width && size.y === rect.height) return;
          renderer.setSize(rect.width, rect.height, false);
          camera.aspect = rect.width / rect.height;
          camera.updateProjectionMatrix();
          // Resizing clears the drawing buffer. Repaint synchronously, including
          // while the demand-driven loop is idle or a screenshot resizes the viewport.
          last = 0;
          render(performance.now());
          start();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        const intersection = new IntersectionObserver(
          (entries) => {
            visible = entries[0].isIntersecting;
            if (visible) start();
            else {
              renderer.setAnimationLoop(null);
              looping = false;
            }
          },
          { threshold: 0.05 },
        );
        intersection.observe(element);
        const visibility = () => {
          if (document.hidden) {
            renderer.setAnimationLoop(null);
            looping = false;
          } else start();
        };
        const move = (e: PointerEvent) => {
          if (e.pointerType === "touch") return;
          const r = element.getBoundingClientRect();
          pointer.x = (e.clientX - r.left) / r.width - 0.5;
          pointer.y = (e.clientY - r.top) / r.height - 0.5;
          start();
        };
        const leave = () => {
          pointer.x = pointer.y = 0;
          start();
        };
        const lost = (e: Event) => {
          e.preventDefault();
          setReady(false);
          renderer.setAnimationLoop(null);
        };
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerleave", leave);
        renderer.domElement.addEventListener("webglcontextlost", lost);
        document.addEventListener("visibilitychange", visibility);
        resize();
        start();
        cleanup = () => {
          if (journey) removeEventListener("scroll", scroll);
          wake.current = () => {};
          observer.disconnect();
          intersection.disconnect();
          document.removeEventListener("visibilitychange", visibility);
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerleave", leave);
          renderer.domElement.removeEventListener("webglcontextlost", lost);
          renderer.setAnimationLoop(null);
          pieces.forEach((p) => {
            p.geometry.dispose();
            p.material.dispose();
          });
          grid.geometry.dispose();
          gridMaterial.dispose();
          frameGeometry.dispose();
          frameMaterial.dispose();
          recordGeometry.dispose();
          recordMaterial.dispose();
          heldGeometry.dispose();
          heldMaterial.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [intro, reduced]);
  return (
    <div
      ref={host}
      className={`proof-scene ${ready && !reduced ? "is-webgl" : ""}`}
      aria-hidden="true"
      data-renderer={ready && !reduced ? "webgl" : "svg"}
    >
      <img className="scene-fallback" src="/brand/icon-dark.svg" alt="" />
    </div>
  );
}

export function BrandIntro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
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
  const finish = () => {
    try {
      sessionStorage.setItem("shelfready:intro", "seen");
    } catch {
      /* storage is optional */
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
    const timer = setTimeout(finish, 3050);
    return () => clearTimeout(timer);
  }, [show, reduced, onDone]);
  if (!show) return null;
  return (
    <div className="brand-intro" data-testid="brand-intro">
      <ProofScene intro />
      <div className="intro-type">
        <img src="/brand/wordmark-dark.svg" alt="ShelfReady" />
        <p>Rehearse. Verify. Release.</p>
      </div>
      <span className="intro-label" role="status">
        Preparing your rehearsal studio
      </span>
      <button className="intro-skip" onClick={finish}>
        Skip intro <span aria-hidden="true">↗</span>
      </button>
      <div className="intro-sequence" aria-hidden="true">
        <span>01 / REHEARSE</span>
        <span>02 / VERIFY</span>
        <span>03 / RELEASE</span>
      </div>
    </div>
  );
}
