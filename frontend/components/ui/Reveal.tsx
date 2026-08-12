"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Scroll-entry reveal for the landing page. Deliberately not framer-motion:
 * the marketing route should not ship an animation library, so this is an
 * IntersectionObserver and a class.
 *
 * Reveals once and then disconnects — content that re-animates every time it
 * passes the fold is the thing that makes a page feel like a template.
 *
 * Under reduced motion no observer is created and the content is shown
 * outright. The stylesheet already skips the hidden state in that case, so
 * this is belt and braces rather than the only guard.
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
  const reduced = usePrefersReducedMotion();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (reduced || typeof IntersectionObserver === "undefined") return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  const shown = entered || reduced;

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
