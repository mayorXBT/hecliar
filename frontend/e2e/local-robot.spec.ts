import { expect, test, type Page, type TestInfo } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 667 },
] as const;

async function expectPrivateStateNotPersisted(page: Page) {
  const storage = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  // What matters is that nothing secret is written down, not which keys exist.
  // Hecliar stores only what is needed to recover a match after a reload: an
  // id, a room code and a mode, none of which reveal a die. Wallet libraries
  // own the rest of localStorage and are not this test's business.
  const hecliarKeys = [...storage.local, ...storage.session]
    .map(([key]) => key)
    .filter((key) => key.startsWith("hecliar."));
  expect(hecliarKeys.sort()).toEqual(
    expect.arrayContaining(["hecliar.last-match-id"]),
  );
  for (const key of hecliarKeys) {
    expect(
      ["hecliar.last-match-id", "hecliar.last-room-code", "hecliar.last-mode"],
      `unexpected Hecliar storage key ${key}`,
    ).toContain(key);
  }

  const hecliarValues = JSON.stringify(
    [...storage.local, ...storage.session].filter(([key]) => key.startsWith("hecliar.")),
  ).toLowerCase();
  expect(hecliarValues).not.toContain("gadget");
  expect(hecliarValues).not.toContain("dice");

  const matchId = [...storage.session].find(([key]) => key === "hecliar.last-match-id");
  expect(matchId?.[1]).toMatch(/^[1-9]\d*$/);
}

async function expectTableFits(page: Page, mobile: boolean) {
  const measurements = await page.evaluate(() => {
    const selectors = Array.from(document.querySelectorAll<HTMLElement>(".selector-grid"));
    const action = document.querySelector<HTMLElement>(".table-action-region");
    const actionBox = action?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      selectorOverflow: selectors.map((selector) => selector.scrollWidth - selector.clientWidth),
      actionBox: actionBox ? { top: actionBox.top, bottom: actionBox.bottom } : null,
      viewportHeight: window.innerHeight,
    };
  });
  expect(measurements.pageWidth).toBeLessThanOrEqual(measurements.viewportWidth);
  expect(measurements.selectorOverflow.every((overflow) => overflow <= 1)).toBe(true);
  if (mobile) {
    expect(measurements.actionBox).not.toBeNull();
    expect(measurements.actionBox!.top).toBeGreaterThanOrEqual(0);
    expect(measurements.actionBox!.bottom).toBeLessThanOrEqual(measurements.viewportHeight);
  }
}

async function playToMatchCompletion(page: Page) {
  for (let step = 0; step < 12; step += 1) {
    const state = await expect.poll(async () => {
      if (await page.getByText("Match complete", { exact: true }).isVisible().catch(() => false)) return "match";
      if (await page.getByText(/^Round (held|caught)$/).isVisible().catch(() => false)) return "round";
      if (await page.getByText("Your turn — raise or challenge", { exact: true }).isVisible().catch(() => false)) return "human";
      return "waiting";
    }, { timeout: 12_000 }).not.toBe("waiting").then(async () => {
      if (await page.getByText("Match complete", { exact: true }).isVisible().catch(() => false)) return "match";
      if (await page.getByText(/^Round (held|caught)$/).isVisible().catch(() => false)) return "round";
      return "human";
    });

    if (state === "match") return;
    if (state === "round") {
      await page.getByRole("button", { name: "Next round" }).click();
      continue;
    }

    const challenge = page.getByRole("button", { name: "Challenge" });
    if (await challenge.isEnabled()) {
      await challenge.click();
    } else {
      await page.getByRole("button", { name: "Quantity 8" }).click();
      await page.getByRole("button", { name: "Face 6" }).click();
      await page.getByRole("button", { name: "Raise" }).click();
    }
  }
  throw new Error("Robot match did not finish within four rounds");
}

for (const viewport of viewports) {
  test(`completes and rematches a confidential Robot game at ${viewport.name} size`, async ({ page }, testInfo: TestInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/play/robot");
    await page.getByRole("button", { name: "Start match" }).click();

    await expect(page.getByRole("region", { name: "Hecliar game table" })).toBeVisible();
    // The redesign replaced the visible "4 hidden dice" caption with sealed
    // dice carrying an accessible name, so assert on that rather than on text
    // that no longer exists.
    await expect(page.getByLabel("4 hidden opponent dice")).toBeVisible();
    await expect(page.locator("[data-testid='hidden-die']")).toHaveCount(4);
    await expect(page.locator("[data-testid='own-die']")).toHaveCount(4);
    await expect(page.locator("[data-testid='revealed-die']")).toHaveCount(0);
    await expect(page.getByLabel("Revealed dice")).toHaveCount(0);
    await expectPrivateStateNotPersisted(page);
    await expectTableFits(page, viewport.name === "mobile");
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-private-table.png`), fullPage: true });

    await playToMatchCompletion(page);

    await expect(page.getByText("Match complete", { exact: true })).toBeVisible();
    await expect(page.locator(".table-action-region")).toHaveCount(0);
    const playAgain = page.getByRole("button", { name: "Play again" });
    await playAgain.scrollIntoViewIfNeeded();
    await expect(playAgain).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-match-result.png`), fullPage: true });
    await playAgain.click();

    await expect(page.getByRole("region", { name: "Hecliar game table" })).toBeVisible();
    await expect(page.locator("[data-testid='own-die']")).toHaveCount(4);
    await expect(page.locator("[data-testid='revealed-die']")).toHaveCount(0);
    await expectPrivateStateNotPersisted(page);
    await expectTableFits(page, viewport.name === "mobile");
    expect(consoleErrors).toEqual([]);
  });
}
