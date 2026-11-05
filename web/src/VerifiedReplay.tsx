// Transcribed from the recorded SQL observer results in docs/live-deployment.md.
const recorded = [
  { id: 10, sku: "00017", before: "12.30 / 4", after: "13.55 / 7" },
  { id: 11, sku: "A-2", before: "0.10 / 0", after: "1.35 / 2" },
];

export default function VerifiedReplay() {
  return (
    <details className="demo-help verified-replay">
      <summary>Verified replay · read-only evidence</summary>
      <p>
        Recorded on November 5, 2026. Opening this replay makes no inference
        request, starts no rehearsal and consumes no upload allowance.
      </p>
      <p>
        The recorded run used Vultr inference and an isolated runner. Native
        WooCommerce import was checked by an independent MariaDB observer. Both
        rows resolved and the disposable store and sandbox were removed.
      </p>
      <table>
        <caption>Recorded SQL readback · price / stock</caption>
        <thead>
          <tr>
            <th scope="col">Product ID</th>
            <th scope="col">Exact SKU</th>
            <th scope="col">Before</th>
            <th scope="col">Persisted</th>
          </tr>
        </thead>
        <tbody>
          {recorded.map(({ id, sku, before, after }) => (
            <tr key={sku}>
              <td>{id}</td>
              <td>{sku}</td>
              <td>{before}</td>
              <td>{after}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <a href="https://github.com/Asembris/ShelfReady/blob/main/docs/live-deployment.md#verified-public-journey">
          Source evidence and export checksums
        </a>
      </p>
    </details>
  );
}
