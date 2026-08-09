import Link from "next/link";

const Home = () => {
  return (
    <main className="min-h-[calc(100vh-65px)]">
      <div className="landing-shell">
        <p className="eyebrow">Confidential dice table</p>
        <h1>Roll. Bluff.<br />Don’t get caught.</h1>
        <p className="landing-copy">Raise the bid with only your own dice in view. Challenge when the story stops holding together.</p>
        <Link className="primary-action" href="/play/robot">Play Robot</Link>
      </div>
    </main>
  );
};

export default Home;
