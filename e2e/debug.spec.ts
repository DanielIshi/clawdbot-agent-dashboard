import { test } from "@playwright/test";
test("debug prod", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", err => errors.push("PAGEERROR: " + err.toString()));
  await page.goto("https://apps.srv947487.hstgr.cloud/agent-dashboard/");
  await page.waitForTimeout(5000);
  const rootHTML = await page.locator("#root").innerHTML();
  console.log("ROOT HTML LENGTH:", rootHTML.length);
  console.log("ERRORS:", JSON.stringify(errors));
  if (rootHTML.length > 0) console.log("FIRST 300:", rootHTML.substring(0, 300));
});
