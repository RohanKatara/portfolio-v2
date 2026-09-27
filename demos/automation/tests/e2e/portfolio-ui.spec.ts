import { test, expect } from "@playwright/test";

test("neutral demo identity, portfolio return links and narrow route navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("link", { name: "Automation demos home" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Back to AI & Automations/ }),
  ).toHaveAttribute("href", "https://rohankatara.com/work/#ai-automations");
  await expect(
    page.getByRole("link", { name: "Discuss your workflow" }),
  ).toHaveAttribute("href", "https://rohankatara.com/#contact");
  await page.setViewportSize({ width: 360, height: 800 });
  for (const label of [
    "Quotations",
    "Purchase orders",
    "Receivables",
    "Overview",
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Automation demos home" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /\bRK\b|Rohan Katara|workflowstudio\./,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Less chasing",
  );
  expect(errors).toEqual([]);
});
