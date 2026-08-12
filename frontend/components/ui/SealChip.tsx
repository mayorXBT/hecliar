/**
 * A ciphertext handle, truncated. This exists because "your dice are
 * confidential at the chain level" was previously a sentence with nothing
 * behind it — the handle is the artefact that makes the claim checkable.
 *
 * Rendered in mono so it reads as something a machine produced. The full
 * value goes in `title` and in the accessible name; the visible form is a
 * fragment because the point is recognition, not transcription.
 */
export function SealChip({
  handle,
  label = "Ciphertext handle",
  lead = 6,
  tail = 4,
}: {
  handle: string;
  label?: string;
  lead?: number;
  tail?: number;
}) {
  const short =
    handle.length > lead + tail + 1
      ? `${handle.slice(0, lead)}…${handle.slice(-tail)}`
      : handle;

  return (
    <span className="hx-seal-chip" title={handle}>
      <span className="hx-seal-chip-label">{label}</span>
      <code aria-label={`${label} ${handle}`}>{short}</code>
    </span>
  );
}
