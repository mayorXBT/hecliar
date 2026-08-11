"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const tabs = [
  { label: "Private roll", code: <><span className="syntax-keyword">const</span> hand = <span className="syntax-keyword">await</span> <span className="syntax-function">confidentialRoll</span>(player);{"\n"}<span className="syntax-comment">{"// opaque handle; dice remain private"}</span>{"\n"}<span className="syntax-keyword">return</span> hand;</> },
  { label: "Public bid", code: <><span className="syntax-keyword">await</span> <span className="syntax-function">placeBid</span>{"({ quantity: "}<span className="syntax-number">5</span>{", face: "}<span className="syntax-number">3</span>{" });"}{"\n"}<span className="syntax-comment">{"// the bid is shared with the table"}</span>{"\n"}<span className="syntax-comment">{"// the dice are not"}</span></> },
  { label: "Challenge", code: <><span className="syntax-keyword">const</span> round = <span className="syntax-keyword">await</span> <span className="syntax-function">challengeBid</span>();{"\n"}<span className="syntax-comment">{"// settlement counts relevant dice"}</span>{"\n"}<span className="syntax-comment">{"// the round result becomes public"}</span></> },
] satisfies ReadonlyArray<{ label: string; code: ReactNode }>;

export function CodeDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const id = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { label, code } = tabs[activeTab];

  const activateTab = (index: number) => {
    setActiveTab(index);
    requestAnimationFrame(() => tabRefs.current[index]?.focus());
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
        : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (nextIndex === null) return;
    event.preventDefault();
    activateTab(nextIndex);
  };

  return (
    <div className="marketing-code-demo">
      <div role="tablist" aria-label="Confidentiality model">
        {tabs.map(({ label: tab }, index) => (
          <button key={tab} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={activeTab === index}
            aria-controls={`${id}-panel-${index}`} tabIndex={activeTab === index ? 0 : -1} onClick={() => activateTab(index)} onKeyDown={(event) => onTabKeyDown(event, index)}>{tab}</button>
        ))}
      </div>
      <pre id={`${id}-panel-${activeTab}`} role="tabpanel" aria-labelledby={`${id}-tab-${activeTab}`}><code>{code}</code></pre>
      <p><strong>{label}:</strong> a compact view of the permission boundary, not a live contract console.</p>
    </div>
  );
}
