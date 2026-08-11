"use client";

import { useEffect } from "react";

export function MarketingMotion() {
  useEffect(() => {
    const motionTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-marketing-motion]"));
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-marketing-reveal]"));
    if (!("IntersectionObserver" in window)) return;

    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("marketing-motion-active", entry.isIntersecting));
    }, { threshold: 0.15 });
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("marketing-reveal-active");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    motionTargets.forEach((target) => motionObserver.observe(target));
    revealTargets.forEach((target) => revealObserver.observe(target));
    return () => {
      motionObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return null;
}
