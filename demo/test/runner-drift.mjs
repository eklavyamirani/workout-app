// Is this repository's copy of the demo runner still the same as violin's?
//
//   node demo/test/runner-drift.mjs            compare with violin's main
//   node demo/test/runner-drift.mjs <ref>      compare with a branch, tag or commit
//
// Reads demo/runner/UPSTREAM.json (which files are copied, and from which commit), fetches the same files
// from the public violin repository and reports each as same / changed upstream / changed here. Also lists
// runner files and runner tests violin has that this copy lacks, and compares the pinned dependencies.
// Needs network access to GitHub; no token. Exit status 1 when anything differs.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEMO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const up = JSON.parse(fs.readFileSync(path.join(DEMO, "runner/UPSTREAM.json"), "utf8"));
const ref = process.argv[2] || "main";
const raw = (r, f) => `https://raw.githubusercontent.com/${up.repo}/${r}/demo/${f}`;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const get = async (url) => { const r = await fetch(url); if (r.status === 404) return null; if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.text(); };

let drift = 0;
console.log(`demo/runner copied from ${up.repo}@${up.commit.slice(0, 7)}; comparing with ${ref}`);
for (const f of up.files) {
  const here = fs.readFileSync(path.join(DEMO, f), "utf8");
  const [base, head] = await Promise.all([get(raw(up.commit, f)), get(raw(ref, f))]);
  let state;
  if (head === null) state = "gone upstream";
  else if (head === here) state = "same";
  else if (base === here) state = "changed upstream: copy it again";
  else state = "changed HERE: move the change to violin";
  if (state !== "same") drift++;
  console.log(`  ${state.padEnd(38)} ${f}${state === "same" ? "" : `  (here ${sha(here)}, ${ref} ${head === null ? "-" : sha(head)})`}`);
}
// New upstream files: any runner module, any file in runner/voice/ (the Linux voice's setup), and any runner
// test (test/*.test.mjs; violin's other test scripts drive violin's own kit).
for (const [dir, suffix] of [["runner", ".mjs"], ["runner/voice", ""], ["test", ".test.mjs"]]) {
  const listing = await fetch(`https://api.github.com/repos/${up.repo}/contents/demo/${dir}?ref=${encodeURIComponent(ref)}`).then((r) => (r.ok ? r.json() : []));
  for (const e of Array.isArray(listing) ? listing : []) {
    const f = `${dir}/${e.name}`;
    if (e.type === "file" && e.name.endsWith(suffix) && !up.files.includes(f)) { drift++; console.log(`  ${"new upstream: copy it".padEnd(38)} ${f}`); }
  }
}
const pkg = (s) => { const j = JSON.parse(s); return JSON.stringify({ dependencies: j.dependencies, optionalDependencies: j.optionalDependencies }); };
const upPkg = await get(raw(ref, up.same_dependencies));
if (upPkg && pkg(upPkg) !== pkg(fs.readFileSync(path.join(DEMO, up.same_dependencies), "utf8"))) {
  drift++;
  console.log(`  ${"dependencies differ".padEnd(38)} ${up.same_dependencies}: ${ref} has ${pkg(upPkg)}`);
}
console.log(drift ? `${drift} difference(s)` : "no drift");
process.exit(drift ? 1 : 0);
