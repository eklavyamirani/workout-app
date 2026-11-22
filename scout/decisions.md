# Decision history

Every triage decision on a scout proposal, newest last. The scout reads this before each run (see [run.md](run.md)) and cites an entry when it brings an idea back.

One line per decision, appended by the session where the owner decided (see [README.md → Recording a decision](README.md#recording-a-decision)):

```
- <YYYY-MM-DD> · <proposal id> · <issue #n or "draft"> · <status> · <title> — <owner's one-line reason>
```

`status` is approved, rejected, parked, prototyped, promoted or expired. A later line for the same id supersedes an earlier one. The reason is the owner's own words, shortened only if the owner agrees.

## Log

- 2026-11-21 · workout-2026-11-21-1 · draft · rejected · GZCLP works out today's weight and stage for you — "I can do this manually and prefer it that way."
- 2026-11-21 · workout-2026-11-21-2 · #55 · approved · Show which plates to load for the weight you're about to lift — "Approve for demo."
- 2026-11-21 · workout-2026-11-21-2 · #55 · prototyped · Show which plates to load for the weight you're about to lift — "Approve for demo." (prototype #57; the demo was sent to the owner in the session)
