import { test, expect } from "@playwright/test";

test("shared demo URLs load with or without a trailing slash", async ({ page, baseURL }) => {
  test.skip(!baseURL?.includes("/automation-demos/"), "Requires the integrated portfolio build");
  const origin = new URL(baseURL!).origin;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (new URL(response.url()).origin === origin && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  for (const suffix of ["", "/"]) {
    await page.goto(`${origin}/automation-demos${suffix}#/orders`);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/automation-demos/favicon.svg");
    await expect(page.getByRole("button", { name: "Run scenario", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Run scenario", exact: true }).click();
    await expect(page.getByText("Example processed", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  }
  expect(errors).toEqual([]);
});

test("portfolio visitors can open all three working demos", async ({ page, baseURL }) => {
  test.skip(!baseURL?.includes("/automation-demos/"), "Requires the integrated portfolio build");
  const origin = new URL(baseURL!).origin;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (new URL(response.url()).origin === origin && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${origin}/`);
  await page.locator(".selected-work-card[href='/work/#ai-automations']").click();
  await expect(page.getByRole("heading", { name: "See the workflow. Make the decisions." })).toBeVisible();
  await expect(page.locator(".demo-card")).toHaveCount(3);
  await expect(page.locator(".project-list .project-row")).toHaveCount(4);
  for (const route of ["quotes", "orders", "receivables"]) {
    await page.locator(`.demo-card[href='/automation-demos/#/${route}']`).click();
    await expect(page.getByRole("button", { name: "Run scenario", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Run scenario", exact: true }).click();
    await expect(page.getByText("Example processed", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const back = page.getByRole("link", { name: /Back to AI & Automations/ });
    await expect(back).toHaveAttribute("href", "https://rohankatara.com/work/#ai-automations");
    if (origin === "https://rohankatara.com") await back.click();
    else await page.goto(`${origin}/work/#ai-automations`);
    await expect(page.locator(".demo-card")).toHaveCount(3);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
