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
test("gallery navigation, disclosure and mobile layout", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Less chasing",
  );
  await page.getByRole("link", { name: "Explore the demos" }).click();
  await expect(
    page.getByRole("heading", { name: "Take the next step yourself." }),
  ).toBeInViewport();
  await page.getByRole("link", { name: /01 SALES OPERATIONS/ }).click();
  await expect(
    page.getByText("Interactive simulation", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("quotation approval, print, reload, navigation and reset", async ({
  page,
}) => {
  await page.goto("./#/quotes");
  await run(page);
  await expect(page.getByTestId("grand-total")).toHaveText("₹14,372.40");
  await page.getByRole("button", { name: "Approve quotation" }).click();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printCalled = "yes";
    };
  });
  await page.getByRole("button", { name: "Print quotation" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-print-called",
    "yes",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".source-panel")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeHidden();
  await expect(page.locator(".quote-document")).toBeVisible();
  await expect(page.getByTestId("grand-total")).toHaveText("₹14,372.40");
  await page.emulateMedia({ media: "screen" });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All workflows", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Quotations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(
    page.getByRole("button", { name: "Run scenario" }),
  ).toBeVisible();
});
test("missing specifications and quantities block quotation approval", async ({
  page,
}) => {
  await page.goto("./#/quotes");
  await page.getByRole("button", { name: /Unclear specification/ }).click();
  await run(page);
  await expect(
    page.getByRole("button", { name: "Approve quotation" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Three phase", exact: true }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("₹17,464.00");
  await page.getByRole("button", { name: "Approve quotation" }).click();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Missing quantity/ }).click();
  await run(page);
  await expect(
    page.getByRole("button", { name: "Approve quotation" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "We need 20 pieces" }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("₹10,620.00");
  await page.getByRole("button", { name: "Approve quotation" }).click();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
});
test("clean purchase order creates once and rechecking blocks duplicates", async ({
  page,
}) => {
  await page.goto("./#/orders");
  await run(page);
  await page.getByRole("button", { name: "Create sales-order draft" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Sales-order draft created",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check this PO again" }).click();
  await expect(
    page.getByRole("button", { name: "Create sales-order draft" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "View existing order" }).click();
  await expect(page.locator(".existing-order")).toContainText("SO-2048");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Create sales-order draft" }),
  ).toBeDisabled();
});
test("price mismatch requires explicit resolution with correct totals", async ({
  page,
}) => {
  await page.goto("./#/orders");
  await page.getByRole("button", { name: /Price mismatch/ }).click();
  await run(page);
  await expect(
    page.getByRole("button", { name: "Create sales-order draft" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Manager approves ₹300" }).click();
  await expect(
    page.locator(".result-panel").getByTestId("grand-total"),
  ).toHaveText("₹13,806.00");
  await page.getByRole("button", { name: "Customer corrects to ₹320" }).click();
  await expect(
    page.locator(".result-panel").getByTestId("grand-total"),
  ).toHaveText("₹14,372.40");
  await page.getByRole("button", { name: "Create sales-order draft" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Sales-order draft created",
      exact: true,
    }),
  ).toBeVisible();
});
test("seeded duplicate is blocked without creating an order", async ({
  page,
}) => {
  await page.goto("./#/orders");
  await page.getByRole("button", { name: /Duplicate order/ }).click();
  await run(page);
  await expect(
    page.getByRole("heading", { name: "A second order is blocked." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create sales-order draft" }),
  ).toBeDisabled();
});
test("payment promise and dispute pause reminders while keeping balances", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  await expect(page.getByTestId("queue-count")).toHaveText("03");
  const initialBalance = await page.getByTestId("outstanding").textContent();
  await run(page);
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(page.getByTestId("queue-count")).toHaveText("02");
  await expect(page.getByTestId("outstanding")).toHaveText(initialBalance!);
  await expect(
    page.getByRole("heading", { name: "Promise recorded for 30 Sep 2026." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /INV-1038/ }).click();
  await run(page);
  await page
    .getByRole("button", { name: "Quantity dispute", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(
    page.getByRole("heading", { name: "Dispute opened. Reminders paused." }),
  ).toBeVisible();
  await expect(page.getByTestId("queue-count")).toHaveText("01");
  await page.reload();
  await expect(page.getByTestId("queue-count")).toHaveText("01");
});
test("document request prepares preview and pauses routine reminders", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  await run(page);
  await page
    .getByRole("button", { name: "Invoice copy needed", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(
    page.getByRole("heading", { name: "Invoice copy ready to share." }),
  ).toBeVisible();
  await expect(
    page.getByText(/Attachment preview: INV-1042.pdf/),
  ).toBeVisible();
  await expect(page.getByTestId("queue-count")).toHaveText("02");
});
test("payment claim does not clear balance; explicit receipt confirmation does", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  await run(page);
  await page
    .getByRole("button", { name: "Customer says paid", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply next step" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Payment claimed. Receipt check needed.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("outstanding")).toHaveText("₹52,132.40");
  await page
    .getByRole("button", { name: "Confirm sample payment received" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed.", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("outstanding")).toHaveText("₹37,760.00");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed.", exact: true }),
  ).toBeVisible();
});
test("settling every invoice produces zero balances and an empty reminder queue", async ({
  page,
}) => {
  await page.goto("./#/receivables");
  for (const id of ["INV-1042", "INV-1038", "INV-1045"]) {
    await page.getByRole("button", { name: new RegExp(id) }).click();
    await run(page);
    await page.getByRole("button", { name: "Apply next step" }).click();
    await page
      .getByRole("button", { name: "Confirm sample payment received" })
      .click();
  }
  await expect(page.getByTestId("outstanding")).toHaveText("₹0.00");
  await expect(page.getByTestId("queue-count")).toHaveText("00");
  await expect(
    page.getByText(/No invoices need a routine reminder/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByTestId("queue-count")).toHaveText("03");
});
test("broken stored state is recovered with an explanation", async ({
  page,
}) => {
  await page.goto("./#/quotes");
  // Wait for the lazy route to initialise before replacing its saved state.
  await expect(
    page.getByRole("button", { name: "Run scenario" }),
  ).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem(
      "workflow-studio:quotes",
      JSON.stringify({
        version: 1,
        state: { scenario: "ambiguous", stage: "review" },
      }),
    ),
  );
  await page.reload();
  await expect(page.getByText(/Older demo progress was reset/)).toBeVisible();
  // Rendering must not overwrite the fixture before recovery is visible.
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("workflow-studio:quotes")!).state,
    ),
  ).toEqual({ scenario: "ambiguous", stage: "review" });
  await run(page);
  await expect(
    page.getByRole("button", { name: "Approve quotation" }),
  ).toBeEnabled();
});
test("demo interactions make no external requests or API calls", async ({
  page,
}) => {
  const forbidden: string[] = [];
  page.on("request", (req) => {
    if (
      new URL(req.url()).origin !==
        new URL(process.env.DEMO_BASE_URL || "http://127.0.0.1:5173").origin ||
      ["fetch", "xhr"].includes(req.resourceType())
    )
      forbidden.push(req.url());
  });
  await page.goto("./#/quotes");
  await run(page);
  await page.getByRole("button", { name: "Approve quotation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Purchase orders", exact: true })
    .click();
  await run(page);
  await page.getByRole("button", { name: "Create sales-order draft" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Receivables", exact: true })
    .click();
  await run(page);
  await page.getByRole("button", { name: "Apply next step" }).click();
  expect(forbidden).toEqual([]);
});
test("keyboard controls work and scenario remains usable offline after loading", async ({
  page,
  context,
}) => {
  await page.goto("./#/quotes");
  await page.getByRole("button", { name: "Run scenario" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Example processed", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Approve quotation" }).click();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
});

test("skip link focuses content without changing the hash route", async ({
  page,
}) => {
  await page.goto("./#/quotes");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toHaveCSS("clip-path", "inset(50%)");
  await skipLink.focus();
  await expect(skipLink).toHaveCSS("clip-path", "none");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).toHaveURL(/#\/quotes$/);
});
test("animation can be skipped and reset cancels an in-flight run", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./#/quotes");
  await page.clock.install();
  await page.getByRole("button", { name: "Run scenario" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.clock.fastForward(5000);
  await expect(
    page.getByRole("button", { name: "Run scenario" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve quotation" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Run scenario" }).click();
  await page.getByRole("button", { name: "Skip animation" }).click();
  await expect(
    page.getByRole("button", { name: "Approve quotation" }),
  ).toBeEnabled();
});
test("storage failure falls back to a working in-memory demo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled for this test");
    };
  });
  await page.goto("./#/quotes");
  await run(page);
  await expect(page.getByText(/Storage is unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Approve quotation" }).click();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
});
test("independent tabs have independent sample progress", async ({
  page,
  context,
}) => {
  await page.goto("./#/quotes");
  await run(page);
  await page.getByRole("button", { name: "Approve quotation" }).click();
  const other = await context.newPage();
  await other.goto("./#/quotes");
  await expect(
    other.getByRole("button", { name: "Run scenario" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Quotation approved", exact: true }),
  ).toBeVisible();
  await other.close();
});
