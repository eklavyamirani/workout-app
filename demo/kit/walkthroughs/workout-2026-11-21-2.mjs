// Walkthrough: proposal #55 (workout-2026-11-21-2), plate breakdown prototype, round 2: the owner asked for
// "settings for the available plates configured globally". The fixture lifter's squat shows the plates per
// side for the default 45 lb bar; the lifter opens "Plates", sets a 35 lb bar and drops the 35s and 2.5s;
// the same squat now loads from that; the Programs page shows the one setting; the API has it (it syncs).
// Numbers in the narration are read from the page. Used by demo/proposals/workout-2026-11-21-2.json.

const plates = (page) => page.getByTestId("plate-breakdown").innerText({ timeout: 2000 }).catch(() => "");
// "Bar 35 + 45, 10, 5 per side" → "45, 10 and 5"
const spoken = (t) => (t.match(/\+ (.*) per side/) || [])[1]?.replace(/, ([^,]*)$/, " and $1").replace(/2\.5/g, "two and a half");

// The setting as the server has it, through the app's own sync pull with the signed-in user's token.
async function serverSetting(page) {
  return page.evaluate(async () => {
    const r = await fetch("/api/sync/pull?since=2000-01-01T00:00:00Z", { headers: { Authorization: `Bearer ${localStorage.getItem("__auth_token")}` } });
    if (!r.ok) return null;
    const c = ((await r.json()).changes || []).find((x) => x.key === "settings:plates" && !x.deleted);
    return c ? c.value : null;
  });
}

export default {
  query: "",
  setup: async ({ page }) => {
    if (!(await page.getByText("New workout").count())) throw new Error("No New workout picker: this walkthrough needs the app as on main (decision 0019).");
    await page.evaluate(() => window.scrollTo(0, 0));
  },
  // Beats on the 40 s section clock: start (0), default line (5), open settings (11), change (15),
  // back in the workout (22), Programs page (28), server (34)
  run: async ({ page, demo }) => {
    await demo.say("GZCLP squat day. New workout starts it.");
    await demo.tap("text=New workout");
    await demo.wait(1500);
    await demo.tap('[aria-label="Start GZCLP now"]');
    await page.getByRole("button", { name: /^Log Set/ }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));

    await demo.at(5);
    const w0 = await page.locator("#set-weight").inputValue();
    const p0 = await plates(page);
    if (!p0) throw new Error("No plate breakdown under the weight box: this walkthrough needs the plate-breakdown prototype checked out.");
    await demo.say(`${w0} pounds on the default 45 pound bar: ${spoken(p0) || "the plates"} a side.`);

    await demo.at(11);
    await demo.say("Your gym is different. Tap Plates.");
    await demo.tap('[aria-label="Edit bar and plates"]');
    await page.getByRole("dialog", { name: "Your bar and plates" }).waitFor();

    await demo.at(15);
    await demo.say("A 35 pound bar, and no 35s or two and a halfs.");
    await page.locator("#bar-weight").fill("");
    await demo.tap("#bar-weight");
    await page.locator("#bar-weight").pressSequentially("35", { delay: 180 });
    await demo.tap('[aria-label="35 lb plates"]');
    await demo.tap('[aria-label="2.5 lb plates"]');
    await demo.tap('button:text-is("Save")');

    await demo.at(22);
    const p1 = await plates(page);
    if (!/^Bar 35 /.test(p1)) throw new Error(`The plate line didn't follow the new setting: "${p1}"`);
    await demo.say(`The same ${w0} now loads ${spoken(p1) || "from your plates"} a side.`);

    await demo.at(28);
    await demo.say("It's one setting for the whole app, on the Programs page too.");
    await demo.tap('[aria-label="Back"]');
    await demo.wait(800);
    await demo.tap('button:has-text("Programs")');
    await page.getByTestId("plate-settings-summary").waitFor();

    await demo.at(34);
    let saved = null;
    for (let i = 0; i < 12 && !saved; i++) { await page.waitForTimeout(500); saved = await serverSetting(page); }
    if (!saved || saved.bar !== 35) throw new Error(`The setting didn't reach the API: ${JSON.stringify(saved)}`);
    await demo.say(`And it syncs: the server has the ${saved.bar} pound bar.`);
  },
};
