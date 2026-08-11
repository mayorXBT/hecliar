const stages = [
  ["Roll privately", "Each side receives a confidential hand."],
  ["Raise publicly", "Bid a quantity and face. Every bid must be higher."],
  ["Challenge the claim", "Stop raising when the table no longer adds up."],
  ["Reveal only the result", "Settlement counts the relevant dice and awards one round."],
] as const;

export function HowItWorksDiagram() {
  return (
    <div className="marketing-round-diagram">
      <ol>
        {stages.map(([title, copy], index) => (
          <li key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </li>
        ))}
      </ol>
      <p className="marketing-round-diagram__caption">The cyan route follows the public bid; it never exposes either hand.</p>
    </div>
  );
}
