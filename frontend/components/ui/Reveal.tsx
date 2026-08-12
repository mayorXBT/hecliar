"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

/**
 * Scroll-entry reveal for the landing page. Deliberately not framer-motion:
 * the marketing route should not ship an animation library, so this is an
 * IntersectionObserver and a class.
 *
 * Reveals once and then disconnects — content that re-animates every time it
 * passes the fold is the thing that makes a page feel like a template.
 *
 * Under `prefers-reduced-motion` the content mounts already revealed and no
 * observer is created at all.
 */
export function Reveal({
  children,
  /** Stagger within a group, in steps of 60ms. */
  order = 0,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  order?: number;
  as?: "div" | "section" | "li" | "article";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // jsdom implements neither of these; treat a missing API as "do not
    // animate" rather than throwing.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reduced?.matches !== false || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      className={clsx("hx-reveal", shown && "is-shown", className)}
      ref={ref as never}
      style={{ "--reveal-order": order } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
