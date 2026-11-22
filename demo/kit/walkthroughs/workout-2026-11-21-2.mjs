// Walkthrough: proposal #55 (workout-2026-11-21-2), the plate breakdown prototype.
// The fixture lifter starts GZCLP from New workout; the squat opens at its last logged weight and the line
// under the weight box says which plates go on each side of a 45 lb bar. Steps up, an odd weight the plates
// can't make, then a set is logged. Numbers in the narration are read from the page.
// Used by demo/proposals/workout-2026-11-21-2.json.

const plates = (page) => page.getByTestId("plate-breakdown").innerText({ timeout: 2000 }).catch(() => "");
// "Bar 45 + 45, 10 per side" → "45 and 10 a side"
const spoken = (t) => (t.match(/\+ (.*) per side/) || [])[1]?.replace(/, ([^,]*)$/, " and $1").replace(/2\.5/g, "two and a half");

export default {
  query: "",
  setup: async ({ page }) => {
    if (!(await page.getByText("New workout").count())) throw new Error("No New workout picker: this walkthrough needs the app as on main (decision 0019).");
    await page.evaluate(() => window.scrollTo(0, 0));
  },
  // Beats on the 40 s section clock: start (0), squat opens (6), +5 (14), odd weight (21), heavier (29), log (35)
  run: async ({ page, demo }) => {
    await demo.say("A GZCLP day. New workout starts the squat.");
    await demo.tap("text=New workout");
    await demo.wait(1500);
    await demo.tap('[aria-label="Start GZCLP now"]');
    await page.getByRole("button", { name: /^Log Set/ }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await demo.at(6);
    const w0 = await page.locator("#set-weight").inputValue();
    const p0 = await plates(page);
    if (!p0) throw new Error("No plate breakdown under the weight box: this walkthrough needs the plate-breakdown prototype checked out.");
    await demo.say(`${w0} pounds. Under the weight: the bar, plus ${spoken(p0) || "the plates"} on each side.`);
    await demo.at(14);
    await demo.tap('[aria-label="Increase weight"]');
    await demo.wait(600);
    const w1 = await page.locator("#set-weight").inputValue();
    await demo.say(`Plus five makes ${w1}: ${spoken(await plates(page)) || "the plates update"} a side.`);
    await demo.at(21);
    await page.locator("#set-weight").fill("");
    await demo.tap("#set-weight");
    await page.locator("#set-weight").pressSequentially("137", { delay: 180 });
    await demo.wait(500);
    const odd = await plates(page);
    const [, lo, hi] = odd.match(/try ([\d.]+) or ([\d.]+)/) || [];
    await demo.say(lo ? `137 can't be loaded with these plates. It offers ${lo} or ${hi}.` : "An odd weight says it can't be loaded.");
    await demo.at(29);
    await page.locator("#set-weight").fill("");
    await demo.tap("#set-weight");
    await page.locator("#set-weight").pressSequentially("185", { delay: 180 });
    await demo.wait(500);
    await demo.say(`185 is ${spoken(await plates(page)) || "shown"} a side.`);
    await demo.at(35);
    await demo.say("Load the bar, then log the set as before.");
    await demo.tap('button:has-text("Log Set")');
  },
};
