const useCases = ["Quick Robot match", "Private two-player room", "Best-of-three rematch", "3–6 dice", "Secret gadgets"];

export function LogoMarquee() {
  return (
    <div className="marketing-marquee" aria-label="Ways to play Hecliar">
      <div>{[...useCases, ...useCases].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
    </div>
  );
}
