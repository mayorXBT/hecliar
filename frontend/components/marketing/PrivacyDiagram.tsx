export function PrivacyDiagram() {
  return (
    <div className="marketing-privacy-diagram">
      <div className="marketing-privacy-node marketing-privacy-node--you"><span>Your encrypted dice</span><small>Visible to you</small></div>
      <div className="marketing-privacy-route"><span>permission</span></div>
      <div className="marketing-privacy-node"><span>You</span><small>Private hand</small></div>
      <div className="marketing-privacy-node marketing-privacy-node--opponent"><span>Opponent encrypted dice</span><small>Visible to opponent</small></div>
      <div className="marketing-privacy-route"><span>challenge / settlement</span></div>
      <div className="marketing-privacy-node marketing-privacy-node--result"><span>Public round result</span><small>One resolved outcome</small></div>
      <p>Authorization boundaries keep each hand with its permitted player; a challenge produces a public round result, not a public dice tray.</p>
    </div>
  );
}
