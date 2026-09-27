import { test, expect, type Page } from "@playwright/test";

async function run(page: Page) {
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(
    page.getByText("Example processed", { exact: true }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("quote assignment, overdue action and customer acceptance persist", async ({
  page,
}) => {
  await page.goto("./#/quotes");
  await run(page);
  await page.getByLabel("Assigned salesperson").selectOption("Arjun Rao");
  await page
    .getByRole("button", { name: "Approve quotation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Advance sample date to 29 Sep" })
    .click();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("1 day overdue");
  await page
    .getByRole("button", { name: "Record sample follow-up reviewed" })
    .click();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Due 30 Sep 2026");
  await page.reload();
  await expect(page.getByLabel("Assigned salesperson")).toHaveValue(
    "Arjun Rao",
  );
  await page
    .getByRole("button", { name: "Customer accepts quotation" })
    .click();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Closed");
  await expect(
    page.getByRole("button", { name: "Record sample follow-up reviewed" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Customer acceptance recorded", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await run(page);
  await page
    .getByRole("button", { name: "Approve quotation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Customer declines quotation" })
    .click();
  await expect(
    page.getByText("Customer decline recorded", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Closed");
});

test("unfamiliar PO code requires two decisions and exports the reviewed draft", async ({
  page,
}) => {
  await page.goto("./#/orders");
  await page.getByRole("button", { name: /Unfamiliar item code/ }).click();
  await run(page);
  const approve = page.getByRole("button", {
    name: "Create sales-order draft",
  });
  await expect(approve).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("2 blocked checks");
  await expect(page.locator(".source-panel")).toContainText(
    "Customer code: AE-BRG04",
  );
  await page
    .getByRole("button", { name: "Confirm mapping from customer reply" })
    .click();
  await expect(approve).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("1 blocked check");
  await page.getByRole("button", { name: "Customer corrects to ₹320" }).click();
  await expect(approve).toBeEnabled();
  await approve.click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sample order CSV" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("sample-SO-2050.csv");
  const stream = await download.createReadStream();
  if (!stream) throw new Error("The sample CSV download has no content");
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain('"SO-2050","AEW-2050"');
  expect(csv).toContain('"24","320.00","7680.00"');
  expect(csv).toContain("BRG-6204-2RS");
  await page.reload();
  await page.getByRole("button", { name: "Check this PO again" }).click();
  await expect(approve).toBeDisabled();
  await expect(page.getByText("A second order is blocked.")).toBeVisible();
});

test("document provision changes the dated task without clearing the balance", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  await run(page);
  await page
    .getByRole("button", { name: "Invoice copy needed", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(page.getByTestId("queue-count")).toHaveText("02");
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Provide missing invoice copy");
  await page
    .getByRole("button", { name: "Mark sample invoice copy provided" })
    .click();
  await expect(page.getByTestId("outstanding")).toHaveText("₹52,132.40");
  await expect(page.getByTestId("queue-count")).toHaveText("02");
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Due 28 Sep 2026");
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Invoice copy provided. Next action scheduled.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Advance sample date to 1 Oct" })
    .click();
  await expect(page.getByTestId("queue-count")).toHaveText("03");
  await page
    .getByRole("button", { name: "Review next customer reply" })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply next step" }),
  ).toBeVisible();
});

test("delivery review resumes follow-up and keeps a record across navigation", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  await run(page);
  await page
    .getByRole("button", { name: "Quantity dispute", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Arjun Rao");
  await page
    .getByRole("button", { name: "Record resolved delivery dispute" })
    .click();
  await expect(page.getByTestId("queue-count")).toHaveText("03");
  await expect(page.getByTestId("outstanding")).toHaveText("₹52,132.40");
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Meera Shah");
  await page.getByRole("button", { name: /INV-1038/ }).click();
  await page.getByRole("button", { name: /INV-1042/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Delivery check recorded. Follow-up resumed.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Activity trail" }),
  ).toContainText("customer confirmation resolve quantity dispute");
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Delivery check recorded. Follow-up resumed.",
    }),
  ).toBeVisible();
});

test("missed promise returns to the queue and paid invoices stay closed", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  await run(page);
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(page.getByTestId("queue-count")).toHaveText("02");
  await page
    .getByRole("button", { name: "Advance sample date to 1 Oct" })
    .click();
  await expect(page.getByTestId("queue-count")).toHaveText("03");
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Follow up on missed promise");
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Due today");
  await page
    .getByRole("button", { name: "Review next customer reply" })
    .click();
  await page
    .getByRole("button", { name: "Customer says paid", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(page.getByTestId("outstanding")).toHaveText("₹52,132.40");
  await page
    .getByRole("button", { name: "Confirm sample payment received" })
    .click();
  await expect(page.getByTestId("outstanding")).toHaveText("₹37,760.00");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Current work item" }),
  ).toContainText("Closed");
  await expect(
    page.getByRole("button", { name: "Review next customer reply" }),
  ).toHaveCount(0);
});

test("version two state missing a new field resets safely", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  await run(page);
  await page.evaluate(() => {
    const key = "workflow-studio:receivables";
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    delete stored.state.invoices[0].nextActionDate;
    sessionStorage.setItem(key, JSON.stringify(stored));
  });
  await page.reload();
  await expect(
    page.getByText("Older demo progress was reset to the current sample data."),
  ).toBeVisible();
  await expect(page.getByTestId("queue-count")).toHaveText("03");
  await run(page);
  await expect(
    page.getByRole("button", { name: "Apply next step" }),
  ).toBeEnabled();
});

test("business explanation and extended screens fit narrow viewports", async ({
  page,
}) => {
  for (const route of ["quotes", "orders", "receivables"]) {
    await page.goto(`./#/${route}`);
    const titles: Record<string, string> = {
      quotes: "From enquiry to quotation.",
      orders: "A checked order. A cleaner handoff.",
      receivables: "Every invoice, a next step.",
    };
    // Hash navigation can retain the previous screen while a lazy chunk loads.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titles[route], { timeout: 15000 });
    await page
      .getByText("Where this helps the business", { exact: true })
      .click();
    await expect(
      page.getByText("What this workflow changes", { exact: true }),
    ).toBeVisible();
    await run(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
