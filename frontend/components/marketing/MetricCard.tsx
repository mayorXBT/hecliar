import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  copy: string;
  visual: ReactNode;
  tone?: "default" | "signal";
};

export function MetricCard({ label, value, copy, visual, tone = "default" }: MetricCardProps) {
  return (
    <article className={`marketing-metric-card marketing-metric-card--${tone}`}>
      <div className="marketing-metric-card__top">
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <div className="marketing-metric-card__visual" aria-hidden="true">{visual}</div>
      <p className="marketing-metric-card__copy">{copy}</p>
    </article>
  );
}
