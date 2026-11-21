#!/usr/bin/env node
// Is workout's scout kit still in step with violin's?
//
//   node scout/drift.js            compare with violin's main
//   node scout/drift.js <ref>      compare with a branch, tag or commit
//
// Reads scout/UPSTREAM.json. Files in `same` must equal violin's at <ref>: each is reported as same /
// changed upstream (copy it again) / changed here (move the change to violin). Files in `adapted` are
// workout's own versions: each is reported as unchanged upstream, or changed upstream since the pinned
// commit (port what applies by hand). Files violin adds to scout/ (outside runs/) that this list doesn't
// know are reported too. Reads the public violin repository; needs network access, no token. Exit status 1
// when anything needs attention.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const up = JSON.parse(fs.readFileSync(path.join(__dirname, "UPSTREAM.json"), "utf8"));
const ref = process.argv[2] || "main";
const raw = (r, f) => `https://raw.githubusercontent.com/${up.repo}/${r}/${f}`;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const get = async (url) => { const r = await fetch(url); if (r.status === 404) return null; if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.text(); };
const line = (state, f, extra = "") => console.log(`  ${state.padEnd(44)} ${f}${extra}`);

(async () => {
  let drift = 0;
  console.log(`scout kit from ${up.repo}@${up.commit.slice(0, 7)}; comparing with ${ref}`);
  for (const f of up.same) {
    const here = fs.readFileSync(path.join(ROOT, f), "utf8");
    const [base, head] = await Promise.all([get(raw(up.commit, f)), get(raw(ref, f))]);
    let state;
    if (head === null) state = "gone upstream";
    else if (head === here) state = "same";
    else if (base === here) state = "changed upstream: copy it again";
    else state = "changed HERE: move the change to violin";
    if (state !== "same") drift++;
    line(state, f, state === "same" ? "" : `  (here ${sha(here)}, ${ref} ${head === null ? "-" : sha(head)})`);
  }
  for (const f of up.adapted) {
    const [base, head] = await Promise.all([get(raw(up.commit, f)), get(raw(ref, f))]);
    const state = head === null ? "gone upstream" : head === base ? "adapted; unchanged upstream" : "adapted; changed upstream: port by hand";
    if (head !== base) drift++;
    line(state, f);
  }
  const known = new Set([...up.same, ...up.adapted, ...up.own]);
  const listing = await fetch(`https://api.github.com/repos/${up.repo}/contents/scout?ref=${encodeURIComponent(ref)}`).then((r) => (r.ok ? r.json() : []));
  for (const e of Array.isArray(listing) ? listing : []) {
    const f = `scout/${e.name}`;
    if (e.type === "file" && !known.has(f)) { drift++; line("new upstream: look at it", f); }
  }
  console.log(drift ? `${drift} difference(s)` : "no drift");
  process.exit(drift ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(2); });
