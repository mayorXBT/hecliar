import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "@/components/ui/Reveal";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  );
}

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

function mockObserver() {
  const instances: { cb: ObserverCallback; disconnect: () => void }[] = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
      constructor(cb: ObserverCallback) {
        instances.push({ cb, disconnect: this.disconnect });
      }
    },
  );
  return instances;
}

// vitest is not configured with `globals: true`, so RTL does not auto-clean.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Reveal", () => {
  it("mounts already revealed under prefers-reduced-motion, with no observer", () => {
    mockReducedMotion(true);
    const instances = mockObserver();

    render(<Reveal>Sealed until challenged</Reveal>);

    expect(screen.getByText("Sealed until challenged").className).toContain("is-shown");
    expect(instances).toHaveLength(0);
  });

  it("stays hidden until it enters the viewport", async () => {
    mockReducedMotion(false);
    const instances = mockObserver();

    render(<Reveal>Sealed until challenged</Reveal>);
    const node = screen.getByText("Sealed until challenged");
    expect(node.className).not.toContain("is-shown");

    instances[0].cb([{ isIntersecting: true }]);
    await waitFor(() => expect(node.className).toContain("is-shown"));
  });

  it("reveals once and disconnects, so it does not re-animate on every pass", async () => {
    mockReducedMotion(false);
    const instances = mockObserver();

    render(<Reveal>Sealed until challenged</Reveal>);
    instances[0].cb([{ isIntersecting: true }]);

    await waitFor(() =>
      expect(screen.getByText("Sealed until challenged").className).toContain("is-shown"),
    );
    expect(instances[0].disconnect).toHaveBeenCalled();
  });

  it("carries its stagger position", () => {
    mockReducedMotion(true);
    mockObserver();

    render(<Reveal order={3}>Sealed until challenged</Reveal>);
    expect(
      screen.getByText("Sealed until challenged").style.getPropertyValue("--reveal-order"),
    ).toBe("3");
  });
});
