import type { ReactNode } from "react";

type FeatureShowcaseProps = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  visual: ReactNode;
  reverse?: boolean;
  tone?: "default" | "tint";
};

export function FeatureShowcase({ id, eyebrow, title, copy, visual, reverse = false, tone = "default" }: FeatureShowcaseProps) {
  return (
    <section id={id} className={`marketing-feature marketing-feature--${tone}${reverse ? " marketing-feature--reverse" : ""}`}>
      <div className="marketing-feature__copy">
        <p className="marketing-kicker">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <div className="marketing-feature__visual">{visual}</div>
    </section>
  );
}
