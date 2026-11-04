import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { WorldStage } from "./Cinema";
import { BrandIntro } from "./Intro";
import Story, { FILM_INDEX, useReveal } from "./Story";

type Table = { headers: string[]; rows: string[][] };
type Intent = {
  currency: string;
  price_format: string;
  stock_unit: string;
  allow_sku_trim: boolean;
  request: string;
};
type Choice = {
  column: string | null;
  rule: string;
  evidence: { row: number; value: string }[];
  explanation: string;
};
type Interpretation = {
  proposal: { fields: Record<string, Choice>; uncertainties: string[] };
  intent: Intent;
};
type Upload = {
  id: string;
  tables: Record<string, Table>;
  candidates: Record<string, Record<string, string[]>>;
};
type Values = { price: string; stock: string };
type Report = {
  input_rows?: number;
  resolved_rows?: number;
  reason?: string;
  error_type?: string;
  unresolved?: { row: number; sku: string; reason: string }[];
  attempts?: { attempt: number; validation_error?: string }[];
  changes?: { row: number; sku: string; before: Values; after: Values }[];
};
type Status = { state: string; report: Report | null };
const labels: Record<string, string> = {
  sku: "SKU",
  price: "Regular price",
  stock: "Stock quantity",
  name: "Product name",
  type: "Product type",
};
const readSession = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
function remember(key: string, value?: string) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* optional continuity */
  }
}
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request(path: string, data?: unknown, signal?: AbortSignal) {
  const response = await fetch("/api" + path, {
    ...(data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
    signal,
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      response.status === 429
        ? "Request limit reached. Please pause and try again."
        : "The service returned an unreadable response. Please check your connection or access.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(
      typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail),
      response.status,
    );
  return body;
}
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function FileSlot({
  kind,
  file,
  onFile,
  busy,
}: {
  kind: "baseline" | "supplier";
  file?: File;
  onFile: (f?: File) => void;
  busy: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`file-slot ${file ? "has-file" : ""} ${over ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) onFile(e.dataTransfer.files[0]);
      }}
    >
      <div className="slot-top">
        <span className="small-index">{kind === "baseline" ? "01" : "02"}</span>
        <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
          <path
            d="M5 1h14l8 8v25H5zM19 1v9h8M10 18h12M10 23h12M10 28h7"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
        {file && <span className="file-check">✓</span>}
      </div>
      <h3>
        {kind === "baseline"
          ? "Your current catalog."
          : "Your supplier update."}
      </h3>
      <p>
        {kind === "baseline"
          ? "The WooCommerce baseline you want to preserve."
          : "The new prices and stock you want to rehearse."}
      </p>
      <label className="file-picker">
        <input
          aria-label={
            kind === "baseline" ? "Baseline WooCommerce CSV" : "Supplier CSV"
          }
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <span className="file-pick-label">
          {file ? (
            <>
              <strong>{file.name}</strong>
              <small>
                {(file.size / 1024).toFixed(1)} KiB · choose another file
              </small>
            </>
          ) : (
            <>
              <strong>
                Choose a CSV <span aria-hidden="true">↗</span>
              </strong>
              <small>or drop it here · up to 16 KiB</small>
            </>
          )}
        </span>
      </label>
    </div>
  );
}
function SourcePreview({ table, kind }: { table: Table; kind: string }) {
  return (
    <details className="source-preview">
      <summary>
        Preview first five rows{" "}
        <span>
          {table.rows.length} rows · {table.headers.length} columns
        </span>
      </summary>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${kind} source preview`}
      >
        <table>
          <caption className="sr-only">{kind} source rows</caption>
          <thead>
            <tr>
              <th scope="col">Row</th>
              {table.headers.map((h) => (
                <th scope="col" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.slice(0, 5).map((r, i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                {r.map((v, j) => (
                  <td key={j}>{v || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const [files, setFiles] = useState<
    Partial<Record<"baseline" | "supplier", File>>
  >({});
  const [upload, setUpload] = useState<Upload | null>(null);
  const [mapping, setMapping] = useState<
    Record<string, Record<string, string>>
  >({});
  const [consent, setConsent] = useState(false);
  const [interpretation, setInterpretation] = useState<Interpretation | null>(
    null,
  );
  const [interpretRequested, setInterpretRequested] = useState(false);
  const [rules, setRules] = useState<Record<string, string>>({
    sku: "identity",
    price: "identity",
    stock: "identity",
  });
  const [intent, setIntent] = useState<Intent>({
    currency: "unknown",
    price_format: "unknown",
    stock_unit: "unknown",
    allow_sku_trim: false,
    request: "",
  });
  const [status, setStatus] = useState<Status | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(!!readSession("shelfready:job"));
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [restoreRetry, setRestoreRetry] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pollError, setPollError] = useState("");
  const [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [solidHeader, setSolidHeader] = useState(false);
  const [current, setCurrent] = useState("top");
  const heroRef = useRef<HTMLElement>(null);
  const studioRef = useReveal<HTMLElement>();
  const active = !!status && ["queued", "running"].includes(status.state);
  const verified = !!status && ["complete", "partial"].includes(status.state);
  const phase = status
    ? verified
      ? 3
      : status.state === "failed"
        ? 4
        : 2
    : upload
      ? 1
      : 0;
  useEffect(() => {
    const saved = readSession("shelfready:job");
    if (!saved) return;
    const controller = new AbortController();
    setRestoring(true);
    setRestoreFailed(false);
    request("/jobs/" + saved, undefined, controller.signal)
      .then((s: Status) => {
        setStatus(s);
        setJobId(saved);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          if (e instanceof ApiError && e.status === 404) {
            setError(
              "Your previous rehearsal has expired or is no longer available.",
            );
            remember("shelfready:job");
          } else {
            setRestoreFailed(true);
            setError(
              "Your previous rehearsal could not be restored right now. Its reference is preserved; retry when your connection or access returns.",
            );
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false);
      });
    return () => controller.abort();
  }, [restoreRetry]);
  useEffect(() => {
    if (!active || !jobId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next: Status = await request(
          "/jobs/" + jobId,
          undefined,
          controller.signal,
        );
        setStatus(next);
        setPollError("");
        if (["queued", "running"].includes(next.state))
          timer = setTimeout(poll, 1800);
      } catch (e) {
        if (!controller.signal.aborted)
          setPollError(
            e instanceof Error ? e.message : "Connection interrupted",
          );
      }
    }
    timer = setTimeout(poll, 1000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, jobId, retry]);
  useEffect(() => {
    if (upload || status) heading.current?.focus({ preventScroll: true });
  }, [upload?.id, status?.state]);
  // The browser resolves a deep link before React has rendered its target.
  useLayoutEffect(() => {
    if (location.hash.length > 1)
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView({ behavior: "instant" });
  }, []);
  // Each stage replaces the panel and may remove the film above it. Without this
  // the browser keeps a stale offset and strands the operator below the content.
  const lastPhase = useRef(phase);
  useLayoutEffect(() => {
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    const studio = studioRef.current;
    if (!studio) return;
    scrollTo({
      top: studio.getBoundingClientRect().top + scrollY - 84,
      behavior: "instant",
    });
  }, [phase]);
  useEffect(() => {
    // The header needs a ground only where the working surface passes beneath it.
    const studio = studioRef.current;
    if (!studio) return;
    const header = new IntersectionObserver(
      ([entry]) => setSolidHeader(entry.isIntersecting),
      { rootMargin: "0px 0px -92% 0px" },
    );
    header.observe(studio);
    const chapters = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setCurrent(entry.target.id);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const { id } of FILM_INDEX) {
      const target = document.getElementById(id);
      if (target && id !== "top") chapters.observe(target);
    }
    const hero = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCurrent("top");
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    if (heroRef.current) hero.observe(heroRef.current);
    return () => {
      header.disconnect();
      chapters.disconnect();
      hero.disconnect();
    };
  }, [phase]);
  function selectFile(kind: "baseline" | "supplier", file?: File) {
    setFiles((old) => ({ ...old, [kind]: file }));
    setUpload(null);
    setConsent(false);
    setInterpretation(null);
    setInterpretRequested(false);
    setError("");
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      for (const kind of ["baseline", "supplier"] as const)
        if (!files[kind] || files[kind]!.size > 16384)
          throw Error("Choose both CSVs, at most 16 KiB each.");
      const result: Upload = await request("/jobs", {
        baseline: await files.baseline!.text(),
        supplier: await files.supplier!.text(),
      });
      setUpload(result);
      setJobId(result.id);
      setStatus(null);
      setConsent(false);
      setInterpretation(null);
      setInterpretRequested(false);
      setMapping(
        Object.fromEntries(
          Object.entries(result.candidates).map(([kind, fields]) => [
            kind,
            Object.fromEntries(
              Object.entries(fields).map(([field, options]) => [
                field,
                options.length === 1 ? options[0] : "",
              ]),
            ),
          ]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload could not be read");
    } finally {
      setBusy(false);
    }
  }
  async function interpret() {
    setBusy(true);
    setError("");
    setConsent(false);
    setInterpretRequested(true);
    try {
      const result: Interpretation = await request(
        "/jobs/" + upload!.id + "/interpret",
        intent,
      );
      setInterpretation(result);
      setMapping((old) => ({
        ...old,
        supplier: Object.fromEntries(
          Object.entries(result.proposal.fields).map(([f, c]) => [
            f,
            c.column || "",
          ]),
        ),
      }));
      setRules(
        Object.fromEntries(
          Object.entries(result.proposal.fields).map(([f, c]) => [f, c.rule]),
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Interpretation failed. Continue with manual mapping.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const reviewed = interpretation
        ? {
            intent,
            proposal: {
              fields: Object.fromEntries(
                Object.entries(mapping.supplier).map(([f, column]) => [
                  f,
                  {
                    column: column || null,
                    rule: rules[f],
                    evidence: column
                      ? [
                          {
                            row: 1,
                            value:
                              upload!.tables.supplier.rows[0][
                                upload!.tables.supplier.headers.indexOf(column)
                              ],
                          },
                        ]
                      : [],
                    explanation:
                      "Explicitly reviewed source column and normalization",
                  },
                ]),
              ),
              uncertainties: interpretation.proposal.uncertainties,
            },
          }
        : undefined;
      await request("/jobs/" + upload!.id + "/confirm", {
        ...mapping,
        replace_price_and_stock_same_currency: consent,
        ...(reviewed ? { interpretation: reviewed } : {}),
      });
      remember("shelfready:job", upload!.id);
      setStatus({ state: "queued", report: null });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Confirmation could not be submitted",
      );
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setStatus(null);
    setUpload(null);
    setJobId(null);
    setFiles({});
    setError("");
    setPollError("");
    setConsent(false);
    setInterpretation(null);
    setInterpretRequested(false);
    remember("shelfready:job");
  }
  const mappingsReady =
    !!upload &&
    Object.entries(upload.candidates).every(
      ([kind, fields]) =>
        Object.keys(fields).every((f) => mapping[kind]?.[f]) &&
        new Set(Object.values(mapping[kind] || {})).size ===
          Object.keys(fields).length,
    );
  const title = restoring
    ? "Restoring your rehearsal."
    : status
      ? active
        ? "A safe place to get it right."
        : verified
          ? status.state === "partial"
            ? "Verified rows. Clear exceptions."
            : "Ready, with proof."
          : "Nothing released."
      : upload
        ? "Make the meaning explicit."
        : "Every good update starts here.";
  return (
    <>
      <WorldStage
        ready={introDone}
        mood={
          active
            ? "active"
            : status?.state === "failed"
              ? "failed"
              : verified
                ? "verified"
                : "idle"
        }
        layoutKey={phase ? "workspace" : "film"}
      />
      <BrandIntro onDone={finishIntro} />
      <div
        className={`app-shell ${introDone ? "is-ready" : ""} ${phase ? "has-workspace" : ""}`}
        inert={!introDone}
      >
        <a className="skip-link" href="#studio">
          Skip to rehearsal studio
        </a>
        <header className={`site-header ${solidHeader ? "is-solid" : ""}`}>
          <a className="brand-link" href="#top" aria-label="ShelfReady home">
            <img
              src="/brand/horizontal-dark.svg"
              width="168"
              height="36"
              alt="ShelfReady"
            />
          </a>
          <nav aria-label="Main navigation">
            <a href={phase ? "#top" : "#process"}>
              {phase ? "Overview" : "The process"}
            </a>
            <a href="#studio">Rehearsal studio</a>
          </nav>
          <a className="header-cta" href="#studio">
            Open studio <Arrow diagonal />
          </a>
        </header>
        {!phase && (
          <nav
            className={`film-index ${current === "studio" ? "is-away" : ""}`}
            aria-label="Chapters"
          >
            {FILM_INDEX.map((chapter) => (
              <a
                key={chapter.id}
                href={chapter.href}
                aria-current={current === chapter.id ? "true" : undefined}
              >
                <span>{chapter.label}</span>
              </a>
            ))}
          </nav>
        )}
        <main id="top">
          <section
            ref={heroRef}
            className={`hero ${phase ? "hero-condensed" : ""}`}
            aria-labelledby="hero-title"
            {...(phase ? {} : { "data-scene": 0, "data-align": "top" })}
          >
            <p className="hero-eyebrow">The catalog rehearsal studio</p>
            <h1 id="hero-title">
              <span className="ln">
                <span>Make the change. </span>
              </span>
              <span className="ln">
                <span>
                  <em>Keep the confidence.</em>
                </span>
              </span>
            </h1>
            <div className="hero-foot">
              <p className="hero-description">
                Your next supplier update deserves a dress rehearsal. Test
                prices and stock in a disposable WooCommerce store. Release a
                file backed by real verification.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#studio">
                  Start a rehearsal <Arrow />
                </a>
                <a className="text-link" href="#process">
                  Explore the process <span aria-hidden="true">↓</span>
                </a>
              </div>
              <p className="hero-assurance">
                Your production store stays out of reach.
              </p>
            </div>
          </section>
          {!phase && <Story />}
          <section
            id="studio"
            ref={studioRef}
            className="studio"
            aria-labelledby="studio-title"
            data-scene="6"
            data-align="top"
            data-lead="110"
          >
            <div className="studio-heading">
              <div>
                <span className="eyebrow">
                  YOUR WORKSPACE /{" "}
                  {String(phase === 0 ? 1 : phase === 1 ? 2 : 3).padStart(
                    2,
                    "0",
                  )}
                </span>
                <h2 id="studio-title" ref={heading} tabIndex={-1}>
                  {title}
                </h2>
              </div>
              <span className="environment-pill">
                <i />
                Disposable WooCommerce
              </span>
            </div>
            <div className="workspace-grid">
              <aside className="workspace-rail" aria-label="Rehearsal stages">
                <ol className="stage-list">
                  {[
                    "Source files",
                    "Review & confirm",
                    "Rehearse & verify",
                    "Verified release",
                  ].map((s, i) => (
                    <li
                      key={s}
                      className={`${phase === i ? "current" : ""} ${phase > i && phase !== 4 ? "past" : ""}`}
                      aria-current={phase === i ? "step" : undefined}
                    >
                      <span>
                        {phase > i && phase !== 4
                          ? "✓"
                          : String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        {s}
                        <small>
                          {
                            [
                              "Two source files",
                              "Your authority",
                              "Isolated execution",
                              "Evidence included",
                            ][i]
                          }
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="boundary-note">
                  <span className="eyebrow">BUILT-IN BOUNDARIES</span>
                  <p>
                    Existing simple products.
                    <br />
                    Exact SKU matching.
                    <br />
                    Price and stock only.
                  </p>
                  <span>
                    No production access. No currency conversion or tax
                    decisions.
                  </span>
                </div>
              </aside>
              <div className="workspace-main">
                {error && (
                  <div role="alert" className="error-banner">
                    <strong>Let’s resolve this first.</strong>
                    <p>{error}</p>
                    <button
                      className="small-button"
                      onClick={() => setError("")}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {restoring ? (
                  <div className="restoring">
                    <span className="activity-spinner" />
                    <p>Looking up your last rehearsal…</p>
                  </div>
                ) : restoreFailed ? (
                  <div className="failure-content">
                    <h3>Your rehearsal reference is safe.</h3>
                    <p>
                      We won’t start a replacement while the previous job’s
                      state is unknown.
                    </p>
                    <button
                      className="button button-secondary"
                      onClick={() => setRestoreRetry((n) => n + 1)}
                    >
                      Retry previous rehearsal
                    </button>
                  </div>
                ) : !status ? (
                  <>
                    {!upload ? (
                      <div className="source-panel panel-enter">
                        <div className="panel-heading">
                          <span className="section-number">01 / SOURCE</span>
                          <h3>Two files. One controlled rehearsal.</h3>
                          <p>
                            Use UTF-8 CSVs with headers. Your current catalog is
                            the baseline; your supplier file supplies the
                            replacements.
                          </p>
                        </div>
                        <div className="file-grid">
                          <FileSlot
                            kind="baseline"
                            file={files.baseline}
                            onFile={(f) => selectFile("baseline", f)}
                            busy={busy}
                          />
                          <FileSlot
                            kind="supplier"
                            file={files.supplier}
                            onFile={(f) => selectFile("supplier", f)}
                            busy={busy}
                          />
                        </div>
                        <div className="input-limits">
                          <span>16 KiB / file</span>
                          <span>100 rows maximum</span>
                          <span>SKU strings preserved</span>
                        </div>
                        <div className="panel-action">
                          <p>
                            Nothing executes until you confirm the mappings.
                          </p>
                          <button
                            className="button button-primary"
                            disabled={
                              busy || !files.baseline || !files.supplier
                            }
                            onClick={submit}
                          >
                            {busy
                              ? "Reading your files…"
                              : "Upload and review mappings"}
                            {!busy && <Arrow />}
                          </button>
                        </div>
                        <details className="demo-help">
                          <summary>Using the invite-only public demo?</summary>
                          <p>
                            That deployment accepts only its two supplied
                            synthetic files.{" "}
                            <a
                              href="/demo/index.html"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open the demo fixture downloads ↗
                            </a>{" "}
                            Other files are rejected by the public API.
                          </p>
                        </details>
                      </div>
                    ) : (
                      <div className="review-panel panel-enter">
                        <div className="panel-heading">
                          <span className="section-number">02 / REVIEW</span>
                          <h3>A column name isn’t a business decision.</h3>
                          <p>
                            Check the source values and confirm every mapping.
                            Suggested matches are a starting point; you make the
                            call.
                          </p>
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => {
                              setUpload(null);
                              setConsent(false);
                              setInterpretation(null);
                              setInterpretRequested(false);
                              setError("");
                            }}
                          >
                            ← Change source files
                          </button>
                        </div>
                        {Object.entries(upload.tables).map(([kind, table]) => (
                          <fieldset className="mapping-card" key={kind}>
                            <legend>
                              {kind === "baseline"
                                ? "Current catalog"
                                : "Supplier update"}{" "}
                              <span>{table.rows.length} rows</span>
                            </legend>
                            <div className="mapping-grid">
                              {Object.keys(upload.candidates[kind]).map(
                                (field) => (
                                  <label key={field}>
                                    <span>{labels[field]}</span>
                                    <select
                                      aria-label={`${kind} ${field}`}
                                      value={mapping[kind]?.[field] || ""}
                                      disabled={busy}
                                      onChange={(e) => {
                                        setConsent(false);
                                        setMapping((old) => ({
                                          ...old,
                                          [kind]: {
                                            ...old[kind],
                                            [field]: e.target.value,
                                          },
                                        }));
                                      }}
                                    >
                                      <option value="">Choose column</option>
                                      {table.headers.map((h) => (
                                        <option key={h}>{h}</option>
                                      ))}
                                    </select>
                                  </label>
                                ),
                              )}
                            </div>
                            <SourcePreview table={table} kind={kind} />
                          </fieldset>
                        ))}
                        <details className="interpretation">
                          <summary>
                            <span>
                              Need help interpreting supplier columns?
                              <small>
                                Optional · experimental · human review required
                              </small>
                            </span>
                            <span aria-hidden="true">+</span>
                          </summary>
                          <div className="interpretation-body">
                            <p>
                              Vultr can propose mappings using the first five
                              supplier rows, headers and baseline SKUs. Source
                              evidence is not proof of business meaning. Nothing
                              executes from a proposal alone.
                            </p>
                            <div className="intent-grid">
                              <label>
                                Declared currency
                                <select
                                  value={intent.currency}
                                  disabled={busy}
                                  onChange={(e) => {
                                    setConsent(false);
                                    setIntent({
                                      ...intent,
                                      currency: e.target.value,
                                    });
                                  }}
                                >
                                  <option value="unknown">
                                    Unspecified — abstain
                                  </option>
                                  {["EUR", "USD", "GBP"].map((c) => (
                                    <option key={c}>{c}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Declared price format
                                <select
                                  value={intent.price_format}
                                  disabled={busy}
                                  onChange={(e) => {
                                    setConsent(false);
                                    setIntent({
                                      ...intent,
                                      price_format: e.target.value,
                                    });
                                  }}
                                >
                                  <option value="unknown">
                                    Unspecified — abstain
                                  </option>
                                  <option value="dot">
                                    Decimal dot, no grouping
                                  </option>
                                  <option value="comma">
                                    Decimal comma, no grouping
                                  </option>
                                </select>
                              </label>
                              <label>
                                Declared stock unit
                                <select
                                  value={intent.stock_unit}
                                  disabled={busy}
                                  onChange={(e) => {
                                    setConsent(false);
                                    setIntent({
                                      ...intent,
                                      stock_unit: e.target.value,
                                    });
                                  }}
                                >
                                  <option value="unknown">
                                    Unspecified — abstain
                                  </option>
                                  <option value="each">
                                    Available individual units
                                  </option>
                                </select>
                              </label>
                            </div>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={intent.allow_sku_trim}
                                disabled={busy}
                                onChange={(e) => {
                                  setConsent(false);
                                  setIntent({
                                    ...intent,
                                    allow_sku_trim: e.target.checked,
                                  });
                                }}
                              />
                              <span>
                                SKU outer whitespace is export padding; trimming
                                is authorized
                              </span>
                            </label>
                            <label className="intent-request">
                              Explicit interpretation intent
                              <textarea
                                maxLength={500}
                                value={intent.request}
                                disabled={busy}
                                placeholder="Describe the intended selling price and available individual stock. Be explicit about business meaning."
                                onChange={(e) => {
                                  setConsent(false);
                                  setIntent({
                                    ...intent,
                                    request: e.target.value,
                                  });
                                }}
                              />
                            </label>
                            <button
                              className="button button-secondary"
                              disabled={
                                busy ||
                                interpretRequested ||
                                intent.request.length < 10
                              }
                              onClick={interpret}
                            >
                              {busy
                                ? "Requesting proposal…"
                                : "Propose supplier interpretation"}
                            </button>
                            {interpretRequested && !interpretation && !busy && (
                              <p className="interpret-note">
                                This upload’s proposal request has been used.
                                You can continue with manual mappings.
                              </p>
                            )}
                            {interpretation && (
                              <div className="proposal-list">
                                {Object.entries(
                                  interpretation.proposal.fields,
                                ).map(([f, c]) => (
                                  <article key={f}>
                                    <span className="section-number">
                                      {labels[f]} / PROPOSAL
                                    </span>
                                    <h4>
                                      {c.column ||
                                        "Abstained — confirmation needed"}
                                    </h4>
                                    <p>{c.explanation}</p>
                                    <blockquote>
                                      Source evidence:{" "}
                                      {c.evidence
                                        .map((e) => `row ${e.row}: ${e.value}`)
                                        .join("; ") || "No source cited"}
                                    </blockquote>
                                    <label>
                                      {f} normalization
                                      <select
                                        value={rules[f]}
                                        disabled={busy}
                                        onChange={(e) => {
                                          setConsent(false);
                                          setRules({
                                            ...rules,
                                            [f]: e.target.value,
                                          });
                                        }}
                                      >
                                        {[
                                          "identity",
                                          ...(f === "sku"
                                            ? ["trim"]
                                            : f === "price"
                                              ? ["decimal_comma"]
                                              : ["strip_each"]),
                                        ].map((r) => (
                                          <option key={r}>{r}</option>
                                        ))}
                                      </select>
                                    </label>
                                  </article>
                                ))}
                                <p>
                                  Uncertainties:{" "}
                                  {interpretation.proposal.uncertainties.join(
                                    "; ",
                                  ) ||
                                    "None reported by model; human review still required."}
                                </p>
                              </div>
                            )}
                          </div>
                        </details>
                        <div
                          className={`confirmation ${consent ? "is-confirmed" : ""}`}
                        >
                          <span className="section-number">
                            YOUR CONFIRMATION
                          </span>
                          <label className="checkbox-row">
                            <input
                              type="checkbox"
                              checked={consent}
                              disabled={busy}
                              onChange={(e) => setConsent(e.target.checked)}
                            />
                            <span>
                              I confirm these mappings and intend to replace
                              prices and stock using the same currency. No
                              conversion or tax decisions.
                            </span>
                          </label>
                          <p>
                            This authorizes a disposable rehearsal, never a
                            production-store update.
                          </p>
                        </div>
                        <div className="panel-action">
                          <p>
                            {mappingsReady
                              ? "All required columns selected. Review their meaning before continuing."
                              : "Choose a distinct source column for every required field."}
                          </p>
                          <button
                            className="button button-primary"
                            disabled={!consent || !mappingsReady || busy}
                            onClick={confirm}
                          >
                            {busy
                              ? "Submitting rehearsal…"
                              : "Confirm and rehearse"}
                            {!busy && <Arrow />}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="result-panel panel-enter">
                    <div
                      className={`result-status ${verified ? "verified" : status.state === "failed" ? "failed" : "working"}`}
                      aria-live="polite"
                    >
                      <span className={active ? "live-dot" : ""}>
                        {verified ? "✓" : status.state === "failed" ? "×" : ""}
                      </span>
                      <span>
                        Status:{" "}
                        <strong data-testid="state">{status.state}</strong>
                      </span>
                      <span className="job-reference">
                        {jobId?.slice(0, 8)}
                      </span>
                    </div>
                    {active ? (
                      <div className="execution">
                        <div className="execution-orbit" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </div>
                        <h3>
                          {status.state === "queued"
                            ? "Your rehearsal is in the queue."
                            : "Working through the real thing."}
                        </h3>
                        <p>
                          Transformation in isolation. Native WooCommerce
                          import. Independent readback. Your results appear only
                          after verification and cleanup.
                        </p>
                        <div className="execution-note">
                          <span className="activity-spinner" />
                          Awaiting backend completion · no estimated progress
                        </div>
                        <p className="muted">
                          You can return in this tab session. No production
                          credentials are involved.
                        </p>
                      </div>
                    ) : verified ? (
                      <>
                        <div className="result-intro">
                          <span className="section-number">
                            {status.state === "partial"
                              ? "PARTIAL SUCCESS / FULL TRANSPARENCY"
                              : "REHEARSAL COMPLETE"}
                          </span>
                          <h3>
                            {status.state === "partial"
                              ? "Keep the good changes. Know what needs attention."
                              : "Your changes have earned their release."}
                          </h3>
                          <p>
                            {status.state === "partial"
                              ? "Only resolved, independently verified rows are exported. Review every unresolved row below."
                              : "Your approved mappings were rehearsed in disposable WooCommerce and checked against independently read persisted values."}
                          </p>
                        </div>
                        <div className="result-metrics">
                          <div>
                            <span>Input rows</span>
                            <strong>{status.report?.input_rows ?? "—"}</strong>
                          </div>
                          <div>
                            <span>Verified for export</span>
                            <strong>
                              {status.report?.resolved_rows ?? "—"}
                            </strong>
                          </div>
                          <div>
                            <span>Unresolved</span>
                            <strong>
                              {status.report?.unresolved?.length ?? 0}
                            </strong>
                          </div>
                        </div>
                        <div className="download-panel">
                          <div>
                            <span className="section-number">
                              YOUR VERIFIED RELEASE
                            </span>
                            <p>
                              Resolved updates, plus the evidence to review.
                            </p>
                          </div>
                          <a
                            className="button button-primary"
                            href={"/api/jobs/" + jobId + "/download/csv"}
                          >
                            Download verified CSV <Arrow diagonal />
                          </a>
                          <a
                            className="text-link"
                            href={"/api/jobs/" + jobId + "/download/report"}
                          >
                            Download change report <Arrow diagonal />
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="failure-content">
                        <span className="failure-mark" aria-hidden="true">
                          ↗
                        </span>
                        <h3>A stop is safer than an unchecked change.</h3>
                        <p>
                          Rehearsal failed. No verified CSV is available. Your
                          production store was never connected.
                        </p>
                        <p className="failure-reason">
                          {status.report?.reason ||
                            "Verification did not complete. Nothing was released."}
                        </p>
                      </div>
                    )}
                    {pollError && (
                      <div className="error-banner" role="alert">
                        <strong>
                          Connection interrupted. The job may still be running.
                        </strong>
                        <p>{pollError}</p>
                        <button
                          className="small-button"
                          onClick={() => {
                            setPollError("");
                            setRetry((n) => n + 1);
                          }}
                        >
                          Retry status check
                        </button>
                      </div>
                    )}
                    {verified && !!status.report?.changes?.length && (
                      <div className="result-table">
                        <div className="table-title">
                          <h3>Verified replacements</h3>
                          <span>Persisted & independently checked</span>
                        </div>
                        <div
                          className="table-scroll"
                          tabIndex={0}
                          role="region"
                          aria-label="Verified replacements"
                        >
                          <table>
                            <caption className="sr-only">
                              Verified replacements
                            </caption>
                            <thead>
                              <tr>
                                <th scope="col">SKU</th>
                                <th scope="col">Price before</th>
                                <th scope="col">Price after</th>
                                <th scope="col">Stock before</th>
                                <th scope="col">Stock after</th>
                              </tr>
                            </thead>
                            <tbody>
                              {status.report.changes.map((r) => (
                                <tr key={r.sku}>
                                  <th scope="row">{r.sku}</th>
                                  <td>{r.before.price}</td>
                                  <td className="changed-value">
                                    {r.after.price}
                                  </td>
                                  <td>{r.before.stock}</td>
                                  <td className="changed-value">
                                    {r.after.stock}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {verified && !!status.report?.unresolved?.length && (
                      <div className="result-table unresolved-table">
                        <div className="table-title">
                          <h3>Unresolved supplier rows</h3>
                          <span>Not included in your CSV</span>
                        </div>
                        <div
                          className="table-scroll"
                          tabIndex={0}
                          role="region"
                          aria-label="Unresolved supplier rows"
                        >
                          <table>
                            <caption className="sr-only">
                              Unresolved supplier rows
                            </caption>
                            <thead>
                              <tr>
                                <th scope="col">Row</th>
                                <th scope="col">SKU</th>
                                <th scope="col">Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {status.report.unresolved.map((r) => (
                                <tr key={r.row}>
                                  <th scope="row">{r.row}</th>
                                  <td>{r.sku}</td>
                                  <td>{r.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {!!status.report?.attempts?.length && (
                      <details className="execution-details">
                        <summary>
                          Execution details · {status.report.attempts.length}{" "}
                          transformation attempt
                          {status.report.attempts.length === 1 ? "" : "s"}
                        </summary>
                        <p>
                          At most three transformation attempts. The model
                          cannot edit the validators.
                        </p>
                        {status.report.attempts.map((a) => (
                          <p key={a.attempt}>
                            Attempt {a.attempt}:{" "}
                            {a.validation_error ||
                              "No transformation validation error reported."}
                          </p>
                        ))}
                        {status.report.error_type && (
                          <p>Error category: {status.report.error_type}</p>
                        )}
                      </details>
                    )}
                    {!active && (
                      <div className="result-bottom">
                        <p>
                          {verified
                            ? "The disposable staging store has been removed. Keep the report with your CSV."
                            : "Review your source files and mappings before starting again."}
                        </p>
                        <button
                          className="button button-secondary"
                          onClick={reset}
                        >
                          Start another rehearsal <Arrow />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
        <footer className="site-footer">
          <div className="footer-line">
            <p>Rehearse. Verify. Release.</p>
            <span>Built for deliberate catalog changes.</span>
            <a href="#top">Back to top ↑</a>
          </div>
          <img
            className="footer-wordmark"
            src="/brand/wordmark-dark.svg"
            alt="ShelfReady"
            width="1332"
            height="336"
          />
        </footer>
      </div>
    </>
  );
}
