import { clsx } from "clsx";

/**
 * Three elevations, used to say where to look. The old sheet gave the
 * opponent, the bid and your hand the same card, which is why nothing on the
 * table had priority.
 *
 * 1 inset well — supporting detail
 * 2 raised     — the default panel
 * 3 stage      — the one surface that owns the screen
 */
export function Surface({
  level = 2,
  as: Tag = "section",
  className,
  children,
  ...rest
}: {
  level?: 1 | 2 | 3;
  as?: "section" | "div" | "article" | "aside";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={clsx("hx-surface", `hx-surface--${level}`, className)} {...rest}>
      {children}
    </Tag>
  );
}
