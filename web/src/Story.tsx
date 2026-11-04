import { ReactNode, useEffect, useRef } from "react";

/** Reveal when a block enters the frame; hide again when it leaves, so reversing replays cleanly. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current!;
    const observer = new IntersectionObserver(
      ([entry]) => el.classList.toggle("in-frame", entry.isIntersecting),
      { rootMargin: "-14% 0px -14% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const Line = ({ children }: { children: ReactNode }) => (
  <span className="ln">
    <span>{children}</span>
  </span>
);

const CHAPTERS: {
  id: string;
  scene: number;
  mark: string;
  label: string;
  title?: string;
  statement: string[];
  body: string;
  foot: string;
  place: string;
  focus?: number;
}[] = [
  {
    id: "the-file",
    scene: 1,
    mark: "01",
    label: "The file",
    statement: ["A supplier file", "is a rumor."],
    body: "Is 1.250 a thousand and a quarter, or one and a quarter? Is 00017 an identifier, or the number seventeen? Is 12 a count of units, or of boxes?",
    foot: "ShelfReady never guesses identity, currency or intent.",
    place: "place-left",
  },
  {
    id: "your-decision",
    scene: 2,
    mark: "02",
    label: "Your decision",
    statement: ["Nothing moves", "until you say so."],
    body: "You see the source values. You choose every column. A model may propose a mapping, but a proposal authorizes nothing, and changing any choice clears your consent.",
    foot: "Every row hangs here until a person confirms.",
    place: "place-center",
    focus: 0.33,
  },
  {
    id: "rehearse",
    scene: 3,
    mark: "03",
    label: "The rehearsal",
    title: "Rehearse.",
    statement: ["A store built", "to be thrown away."],
    body: "Your confirmed mapping becomes a transformation, run in an isolated container with no network and no credentials. Its output is imported natively into a disposable WooCommerce store.",
    foot: "Your production store is never in the room.",
    place: "place-right",
  },
  {
    id: "verify",
    scene: 4,
    mark: "04",
    label: "The evidence",
    title: "Verify.",
    statement: ["A success message", "is not evidence."],
    body: "Persisted values are read back independently and compared with trusted expectations: identifiers, prices, stock, and the fields that should not have changed. The model cannot edit the validators.",
    foot: "Illustrative rows. Your evidence is your job’s own report.",
    place: "place-left",
  },
  {
    id: "release",
    scene: 5,
    mark: "05",
    label: "The release",
    title: "Release.",
    statement: ["Only what was", "proven leaves."],
    body: "You get a verified CSV and a change report. Rows that could not be resolved are held out, listed with their reason, and never exported. Then the store is destroyed.",
    foot: "Nothing is published for you. The final decision stays yours.",
    place: "place-right",
  },
];

function Chapter({ chapter }: { chapter: (typeof CHAPTERS)[number] }) {
  const copy = useReveal<HTMLDivElement>();
  const Statement = chapter.title ? "h3" : "h2";
  return (
    <article
      id={chapter.id}
      className={`chapter ${chapter.place}`}
      aria-labelledby={`${chapter.id}-title`}
    >
      <div
        ref={copy}
        className="chapter-copy"
        data-scene={chapter.scene}
        data-focus={chapter.focus}
        id={`${chapter.id}-copy`}
      >
        <p className="chapter-label">
          <span>{chapter.mark}</span>
          {chapter.title ? (
            <strong className="chapter-title" id={`${chapter.id}-title`}>
              {chapter.title}
            </strong>
          ) : (
            chapter.label
          )}
        </p>
        <Statement
          className="chapter-statement"
          id={chapter.title ? undefined : `${chapter.id}-title`}
        >
          {chapter.statement.map((line) => (
            <Line key={line}>{line} </Line>
          ))}
        </Statement>
        <p className="chapter-body">{chapter.body}</p>
        <p className="chapter-foot">{chapter.foot}</p>
      </div>
    </article>
  );
}

export const FILM_INDEX = [
  { id: "top", label: "Opening" },
  ...CHAPTERS.map((c) => ({ id: c.id, label: c.label })),
  { id: "studio", label: "Studio" },
];

export default function Story() {
  const handoff = useReveal<HTMLDivElement>();
  return (
    <section
      id="process"
      className="story"
      aria-label="How a rehearsal works: rehearse, verify, release"
    >
      <p className="story-note">
        A film of the process. Conceptual; no job is running.
      </p>
      {CHAPTERS.map((chapter) => (
        <Chapter key={chapter.id} chapter={chapter} />
      ))}
      <div ref={handoff} className="handoff">
        <p>
          <Line>Enough theater.</Line>
          <Line>
            <em>Now, your actual catalog.</em>
          </Line>
        </p>
        <a className="text-link" href="#studio">
          Open studio <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
