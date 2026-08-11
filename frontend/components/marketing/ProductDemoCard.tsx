const dice = [2, 3, 3, 6];

export function ProductDemoCard() {
  return (
    <section className="marketing-product-demo" aria-label="Illustrative live round preview">
      <div className="marketing-product-demo__bar">
        <span>Illustrative round preview</span>
        <span className="marketing-status"><i /> Your turn</span>
      </div>
      <div className="marketing-product-demo__grid">
        <div className="marketing-demo-player marketing-demo-player--opponent">
          <p>Opponent</p>
          <strong>4 concealed dice</strong>
          <div className="marketing-concealed-dice" aria-hidden="true"><b>?</b><b>?</b><b>?</b><b>?</b></div>
        </div>
        <div className="marketing-demo-bid">
          <span>Score · 1—0</span>
          <p>Bid · <strong>five 3s</strong></p>
          <div className="marketing-bid-route" aria-hidden="true"><i /><i /><i /></div>
          <small>Public claim in motion</small>
        </div>
        <div className="marketing-demo-player marketing-demo-player--you">
          <p>Your illustrative hand</p>
          <strong>4 concealed dice</strong>
          <div className="marketing-visible-dice" aria-label="Illustrative dice values 2, 3, 3, 6">
            {dice.map((die, index) => <b key={`${die}-${index}`}>{die}</b>)}
          </div>
        </div>
      </div>
      <div className="marketing-demo-actions">
        <span>Raise</span>
        <span className="marketing-challenge-button">Challenge</span>
      </div>
    </section>
  );
}
