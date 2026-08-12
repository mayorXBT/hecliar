/**
 * The Hecliar mark: one die in isometric projection, three faces separated by
 * the felt showing through — six, one, four.
 *
 * Drawn in `currentColor` with no background, and the pips knocked out
 * through a mask rather than painted, so the mark sits on felt or on paper
 * without carrying a plate of its own. The mask id is a constant rather than
 * a `useId`: every instance draws the same mask, so sharing one is harmless,
 * and it keeps the component renderable on the server.
 *
 * Each face is a parallelogram, and its pips are placed in that face's own
 * unit square and then sheared with it — which is why they read as ellipses
 * on the sloped faces, the way real pips do in this projection.
 */
export function Logo({
  size = 20,
  title,
}: {
  size?: number;
  /** Give this only when the mark stands alone; beside the wordmark it is
   *  decorative and should stay unlabelled. */
  title?: string;
}) {
  const mask = "hx-logo-die";

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      className="hx-logo"
      fill="none"
      height={size}
      role={title ? "img" : undefined}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}

      <mask id={mask}>
        {/* White keeps, black cuts. */}
        <g fill="#fff" stroke="#fff" strokeLinejoin="round" strokeWidth="3.5">
          <path d="M30 11 L7 23 L7 43 L30 31 Z" />
          <path d="M34 11 L57 23 L57 43 L34 31 Z" />
          <path d="M32 37 L11 48 L32 59 L53 48 Z" />
        </g>

        {/* Left face — six, in the face's own sheared grid. */}
        <g fill="#000" transform="matrix(23 -12 0 20 7 23)">
          <ellipse cx="0.31" cy="0.2" rx="0.1" ry="0.1" />
          <ellipse cx="0.69" cy="0.2" rx="0.1" ry="0.1" />
          <ellipse cx="0.31" cy="0.5" rx="0.1" ry="0.1" />
          <ellipse cx="0.69" cy="0.5" rx="0.1" ry="0.1" />
          <ellipse cx="0.31" cy="0.8" rx="0.1" ry="0.1" />
          <ellipse cx="0.69" cy="0.8" rx="0.1" ry="0.1" />
        </g>

        {/* Right face — one. */}
        <g fill="#000" transform="matrix(23 12 0 20 34 11)">
          <ellipse cx="0.5" cy="0.5" rx="0.12" ry="0.12" />
        </g>

        {/* Front face — four. */}
        <g fill="#000" transform="matrix(21 11 21 -11 11 48)">
          <ellipse cx="0.3" cy="0.3" rx="0.09" ry="0.09" />
          <ellipse cx="0.72" cy="0.3" rx="0.09" ry="0.09" />
          <ellipse cx="0.3" cy="0.72" rx="0.09" ry="0.09" />
          <ellipse cx="0.72" cy="0.72" rx="0.09" ry="0.09" />
        </g>
      </mask>

      <rect fill="currentColor" height="64" mask={`url(#${mask})`} width="64" x="0" y="0" />
    </svg>
  );
}
