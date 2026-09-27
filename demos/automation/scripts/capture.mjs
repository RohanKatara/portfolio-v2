import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const destination = fileURLToPath(new URL("../../previews/", import.meta.url));
const base = process.env.DEMO_BASE_URL || "http://127.0.0.1:4173";
await mkdir(destination, { recursive: true });
async function run(page) {
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await page.getByText("Example processed", { exact: true }).waitFor();
}
async function capture(page, filename, locator) {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) throw new Error("Viewport overflow: " + filename);
  if (locator) await locator.screenshot({ path: destination + "/" + filename });
  else
    await page.screenshot({
      path: destination + "/" + filename,
      fullPage: true,
    });
}
const desktop = await chromium.launch();
const page = await desktop.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
await page.goto(base);
await capture(page, "overview-desktop.png");
await page.screenshot({ path: destination + "/overview-cover.png" });
await page.goto(base + "/#/quotes");
await run(page);
await page.getByRole("button", { name: "Approve quotation" }).click();
await page
  .getByRole("button", { name: "Advance sample date to 29 Sep" })
  .click();
await capture(page, "quotation-desktop.png");
await page.emulateMedia({ media: "print" });
await capture(page, "quotation-print.png");
await page.emulateMedia({ media: "screen" });
await page.goto(base + "/#/orders");
await page.getByRole("button", { name: /Unfamiliar item code/ }).click();
await run(page);
await capture(page, "purchase-order-desktop.png");
await page
  .getByRole("button", { name: "Confirm mapping from customer reply" })
  .click();
await page.getByRole("button", { name: "Customer corrects to ₹320" }).click();
await page.getByRole("button", { name: "Create sales-order draft" }).click();
await capture(page, "sales-order-draft-desktop.png");
await page.goto(base + "/#/receivables");
await run(page);
await page.getByRole("button", { name: "Apply next step" }).click();
await page.getByRole("button", { name: /INV-1038/ }).click();
await run(page);
await page
  .getByRole("button", { name: "Quantity dispute", exact: true })
  .click();
await page.getByRole("button", { name: "Apply next step" }).click();
await page.getByRole("button", { name: /INV-1045/ }).click();
await run(page);
await page
  .getByRole("button", { name: "Invoice copy needed", exact: true })
  .click();
await page.getByRole("button", { name: "Apply next step" }).click();
await page
  .getByRole("button", { name: "Advance sample date to 1 Oct" })
  .click();
await page.getByRole("button", { name: /INV-1042/ }).click();
await capture(page, "receivables-desktop.png");
await desktop.close();
const mobile = await webkit.launch();
const phone = await mobile.newPage({
  ...devices["iPhone 13"],
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
await phone.goto(base);
await capture(phone, "overview-mobile.png");
await phone.goto(base + "/#/quotes");
await run(phone);
await phone.getByRole("button", { name: "Approve quotation" }).click();
await phone
  .getByRole("button", { name: "Advance sample date to 29 Sep" })
  .click();
await capture(phone, "quotation-mobile.png", phone.locator(".result-panel"));
await capture(
  phone,
  "quotation-action-mobile.png",
  phone.locator(".work-context"),
);
await phone.goto(base + "/#/orders");
await phone.getByRole("button", { name: /Unfamiliar item code/ }).click();
await run(phone);
await capture(
  phone,
  "purchase-order-mobile.png",
  phone.locator(".result-panel"),
);
await phone.goto(base + "/#/receivables");
await run(phone);
await phone
  .getByRole("button", { name: "Customer says paid", exact: true })
  .click();
await capture(phone, "receivables-mobile.png", phone.locator(".result-panel"));
await phone.getByRole("button", { name: "Apply next step" }).click();
await capture(
  phone,
  "receivables-action-mobile.png",
  phone.locator(".work-context"),
);
await mobile.close();
console.log("Desktop, print, and mobile previews saved to " + destination);
