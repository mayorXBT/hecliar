import { expect, test } from "@playwright/test";

test("keeps a fresh Robot table within a 375px viewport before challenge resolution", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/play/robot");
  await page.getByRole("button", { name: "Start match" }).click();
  await expect(page.getByRole("main", { name: "Hecliar game table" })).toBeVisible();
  await expect(page.getByText("4 hidden dice", { exact: true })).toBeVisible();
  await expect(page.locator("[data-testid='own-die']")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
