// The workout app's demo kit: what the generic runner (demo/runner) needs from this app.
// The contract is demo/CONTRACT.md (violin's, with the full-stack differences in demo/README.md).
import { start } from "./serve.mjs";

export default {
  app: "workout",
  // A phone-shaped viewport (9:16), recorded at 2× into the template's 720×1280
  viewport: { width: 390, height: 693 },
  /** The whole app (front end in-process, Postgres + API in Docker) with the fixture, signed in. */
  start: () => start({ port: 0 }),
  /** Signed in, and the first sync has brought the fixture user's programs down from the API. */
  ready: async (page) => {
    await page.waitForFunction(() => localStorage.getItem("__auth_mode") === "authenticated" &&
      JSON.parse(localStorage.getItem("programs:list") || "[]").length > 0, null, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
  },
};
