// Walkthrough: read-only tour of features on main. The fixture lifter previews the next planned day from
// the calendar (decision 0015), then looks at the program on the Programs tab. Nothing is changed.
// Used by demo/test/proposals/preview-next-workout-check.json, the second template check (two proposals,
// same structure).
const words = ["no", "one", "two", "three", "four", "five", "six", "seven"];
const say = (n) => words[n] ?? String(n);

export default {
  query: "",
  setup: async ({ page }) => {
    if (!(await page.locator('[aria-label="Preview GZCLP"]').count())) throw new Error("No planned GZCLP day to preview in the fixture.");
    await page.evaluate(() => window.scrollTo(0, 0));
  },
  // Beats: calendar (0), open preview (5), the day (10), its exercises (16), Programs (22), the program (28),
  // back (34)
  run: async ({ page, demo }) => {
    await demo.say("The fixture lifter's GZCLP calendar, synced from the API.");
    await demo.at(5);
    await demo.say("The eye previews a planned day before you start it.");
    await demo.wait(900);
    await demo.tap('[aria-label="Preview GZCLP"]');
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await demo.at(10);
    // "Tomorrow · Day 1 - Squat Focus" and the numbered exercises, read from the dialog
    const sub = (await dialog.locator("#workout-preview-title ~ *").first().innerText({ timeout: 2000 }).catch(() => "")).split(" · ");
    const count = await dialog.locator("li").count();
    await demo.say(sub.length === 2
      ? `${sub[0]}: ${sub[1].replace(" - ", ", ")}. ${say(count)[0].toUpperCase() + say(count).slice(1)} exercises.`
      : `${say(count)} exercises planned.`);
    await demo.at(16);
    await demo.say("Each shows its tier, its sets and reps, and its starting weight.");
    await demo.at(22);
    await demo.tap('[aria-label="Close preview"]');
    await demo.say("The Programs tab has the program itself.");
    await demo.wait(700);
    await demo.tap('button:has-text("Programs")');
    await demo.at(28);
    const line = await page.getByText(/· Weekly ·|· Flexible ·|· Interval ·/).first().innerText({ timeout: 2000 }).catch(() => "");
    const days = line.match(/(\d+) days\/week/);
    await demo.say(days ? `GZCLP, weekly, ${say(+days[1])} days a week.` : "GZCLP and its schedule.");
    await demo.at(34);
    await demo.tap('button:has-text("Calendar")');
    await demo.say("Back to the calendar. Nothing was changed.");
  },
};
