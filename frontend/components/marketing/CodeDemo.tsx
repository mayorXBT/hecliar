"use client";

import { useId, useState } from "react";

const tabs = [
  ["Private roll", "const hand = await confidentialRoll(player);\n// opaque handle; dice remain private\nreturn hand;"],
  ["Public bid", "await placeBid({ quantity: 5, face: 3 });\n// the bid is shared with the table\n// the dice are not"],
  ["Challenge", "const round = await challengeBid();\n// settlement counts relevant dice\n// the round result becomes public"],
] as const;

export function CodeDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const id = useId();
  const [label, code] = tabs[activeTab];

  return (
    <div className="marketing-code-demo">
      <div role="tablist" aria-label="Confidentiality model">
        {tabs.map(([tab], index) => (
          <button key={tab} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={activeTab === index}
            aria-controls={`${id}-panel-${index}`} tabIndex={activeTab === index ? 0 : -1} onClick={() => setActiveTab(index)}>{tab}</button>
        ))}
      </div>
      <pre id={`${id}-panel-${activeTab}`} role="tabpanel" aria-labelledby={`${id}-tab-${activeTab}`}><code>{code}</code></pre>
      <p><strong>{label}:</strong> a compact view of the permission boundary, not a live contract console.</p>
    </div>
  );
}
