type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  copy: string;
  tone?: "default" | "dark";
};

export function SectionHeader({ eyebrow, title, copy, tone = "default" }: SectionHeaderProps) {
  return (
    <header className={`marketing-section-header marketing-section-header--${tone}`}>
      <p className="marketing-kicker">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </header>
  );
}
