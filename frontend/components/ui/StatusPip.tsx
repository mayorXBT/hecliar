import { clsx } from "clsx";

/**
 * Machine state. Colour never carries the meaning alone — every pip is
 * followed by its own word, so the amber and green read as reinforcement
 * rather than as the message.
 */
export type PipTone = "idle" | "pending" | "verified" | "failed";

export function StatusPip({
  tone,
  children,
  live = false,
}: {
  tone: PipTone;
  children: React.ReactNode;
  /** Announce changes, e.g. a turn handover or a settling challenge. */
  live?: boolean;
}) {
  return (
    <p
      aria-live={live ? "polite" : undefined}
      className={clsx("hx-status", `hx-status--${tone}`)}
    >
      <span aria-hidden="true" className="hx-status-pip" />
      {children}
    </p>
  );
}
