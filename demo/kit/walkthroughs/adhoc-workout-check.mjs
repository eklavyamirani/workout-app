// Walkthrough: a feature the app has on main (decisions 0016 and 0019). The fixture lifter starts GZCLP
// from New workout on whatever day it is, the squat opens with the weight and reps of its last logged set
// (the fixture's October session), one set is logged, the other two exercises are skipped, and the
// finished workout is read back from the API to show it was saved there.
// Used by demo/proposals/adhoc-workout-check.json, the kit's template check.

// The finished session, as the API returns it to this signed-in user (null until the sync push lands)
async function serverSession(page) {
  return page.evaluate(async () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const r = await fetch("/api/sync/pull?since=2000-01-01T00:00:00Z", { headers: { authorization: `Bearer ${localStorage.getItem("__auth_token")}` } });
    if (!r.ok) return { error: r.status };
    const { changes } = await r.json();
    const c = changes.find((x) => x.key === `sessions:${today}:fixture-gzclp` && x.value && x.value.status === "completed");
    if (!c) return null;
    return {
      sets: c.value.activities.reduce((n, a) => n + (a.sets ? a.sets.length : 0), 0),
      skipped: c.value.activities.filter((a) => a.skipped).length,
    };
  });
}

export default {
  query: "",
  setup: async ({ page }) => {
    if (!(await page.getByText("New workout").count())) throw new Error("No New workout picker: this walkthrough needs the app as on main (decision 0019).");
    await page.evaluate(() => window.scrollTo(0, 0));
  },
  // Beats on the 40 s section clock: plan (0), New workout (5), prefill (11), log (17), skip (21),
  // finish (26), next day (31), what the API has (36)
  run: async ({ page, demo }) => {
    await demo.say("Signed in as the fixture lifter. Their GZCLP plan came down from the API.");
    await demo.at(5);
    await demo.say("Today isn't a planned day. New workout starts it anyway.");
    await demo.tap("text=New workout");
    await demo.at(8.5);
    await demo.tap('[aria-label="Start GZCLP now"]');
    await page.getByRole("button", { name: /^Log Set/ }).waitFor();
    await demo.at(11);
    // Read the prefill from the page ("Log Set (155 lbs × 6 reps)"), so the narration matches the screen
    const label = await page.getByRole("button", { name: /^Log Set/ }).innerText();
    const [, weight, reps] = label.match(/\(([\d.]+) lbs × (\d+) reps\)/) || [];
    await demo.say(weight && reps
      ? `Squat opens at ${weight} pounds for ${reps}: its last set, from October.`
      : "Squat opens with its last logged set, from October.");
    await demo.at(17);
    await demo.say("One tap logs the set.");
    await demo.tap('button:has-text("Log Set")');
    await demo.at(20.5);
    await demo.say("Skip the other two today.");
    await demo.tap('button:text-is("Incline Bench Press")');
    await demo.wait(900);
    await demo.tap('button[title="Skip exercise"]'); // moves on to the next exercise not done
    await demo.wait(1100);
    await demo.tap('button[title="Skip exercise"]');
    await demo.at(25.5);
    await demo.say("Finish saves the workout and syncs it to the server.");
    await demo.wait(900);
    await demo.tap('button:text-is("Finish")');
    // Sync pushes about two seconds after the last change; wait for it to reach the API
    let saved = null;
    for (let i = 0; i < 20 && !(saved && !saved.error); i++) { await demo.wait(500); saved = await serverSession(page); }
    if (!saved || saved.error) throw new Error(`The finished workout did not reach the API (${JSON.stringify(saved)}).`);
    await demo.at(31);
    const nextDay = await page.getByText(/^Day \d+ - /).nth(1).innerText({ timeout: 2000 }).catch(() => "");
    await demo.say(nextDay
      ? `Today shows done, and the next session moves on to ${nextDay.replace(" - ", ", ")}.`
      : "Today shows done, and the plan moves on.");
    await demo.at(36);
    await demo.say(`The API has it: ${saved.sets} set logged, ${saved.skipped === 2 ? "two" : saved.skipped} skipped.`);
  },
};
