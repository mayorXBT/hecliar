import { clsx } from "clsx";

/**
 * How the round was settled, itemised. The old result panel stated the
 * outcome; this shows the arithmetic the contract actually did, which is
 * what makes "settled by attested reveal" mean something to a reader.
 */

export type ReceiptRow = {
  label: string;
  value: string;
  /** `adjust` is a gadget's contribution, `total` the count that decided it. */
  kind?: "base" | "adjust" | "total";
};

export function Receipt({
  rows,
  verdict,
  outcome,
  caption,
}: {
  rows: readonly ReceiptRow[];
  verdict: string;
  outcome: "held" | "caught";
  caption?: string;
}) {
  return (
    <div className="hx-receipt">
      {caption && <p className="hx-receipt-caption">{caption}</p>}
      <dl className="hx-receipt-rows">
        {rows.map((row) => (
          <div
            className={clsx("hx-receipt-row", `hx-receipt-row--${row.kind ?? "base"}`)}
            key={`${row.label}:${row.value}`}
          >
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className={clsx("hx-receipt-verdict", `hx-receipt-verdict--${outcome}`)}>
        {verdict}
      </p>
    </div>
  );
}
