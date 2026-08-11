type CaseStudyCardProps = { title: string; copy: string; detail: string };

export function CaseStudyCard({ title, copy, detail }: CaseStudyCardProps) {
  return (
    <article className="marketing-case-card">
      <span>{detail}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}
