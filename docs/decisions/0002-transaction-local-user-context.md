# 0002 — Per-request transaction carries the RLS user id

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption) · Affects: `server/Data/UserScope.cs`, `UserResolverMiddleware`, `SyncEndpoints`, tests; platform §5.1, §12 item 1
- Reversibility: easy — internal to the API; no schema or wire change.

## Context
`UserResolverMiddleware` set `app.current_user_id` with
`set_config(..., false)` (session level) so the value survived outside a
transaction. Behind the platform's PgBouncer in transaction mode (§5.1,
§6b.1), a server connection moves to another client when each transaction
ends. So the user id leaks to whichever client gets the connection next. Also,
the middleware's `set_config` and the endpoint's later statements can run on
**different** server connections. The test added here reproduced the leak
against the old code. A fresh pooler client on the shared backend read the
previous request's user id
(`Expected: "" Actual: "f47ed35c-6a34-4193-a7c6-8778d3b51e1c"`).

## Decision
The middleware resolves the user in autocommit, then opens **one
transaction per request** with `set_config('app.current_user_id', id, true)`
(`UserScope.BeginAsync`). It passes the connection and transaction to
endpoints through `HttpContext.Items`. Writing endpoints commit before they
respond. Anything not committed is rolled back when the middleware disposes
the transaction.

Tests run the API behind a real PgBouncer (`edoburu/pgbouncer:v1.26.1-p0`,
PgBouncer 1.26.1) in transaction mode with `default_pool_size = 1`, so all
requests share one backend. The tests check that (a) no user id is visible
to the next pooler client, (b) sequential requests by A and B see only
their own rows, and (c) the scope ends with its transaction on the same
connection. The pooled client sets `No Reset On Close=true`, as Npgsql
recommends for transaction-mode PgBouncer
([npgsql.org/doc/compatibility.html](https://www.npgsql.org/doc/compatibility.html)).
That also stops Npgsql's `DISCARD ALL` from masking a leak.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: one request transaction, `set_config(..., true)`, explicit commit in writers** | Correct under any pooling mode; user id cannot outlive the request; same pattern the platform test suite will check | Reads also run in a (short) transaction; writers must remember to commit |
| Commit in middleware after `_next` | Endpoints need not commit | Response body is already written, so a failed commit is reported to the client as success |
| `SET LOCAL` per endpoint transaction, no middleware scope | Smallest diff | Every endpoint must repeat the context setup; easy to forget on a new endpoint |
| Keep session `set_config` and `RESET` after the request | Small change | Still broken under transaction pooling: statements can hit different backends; a crash before `RESET` leaks |
| Mock the pooler (single raw connection) instead of PgBouncer | No extra image | Does not exercise real transaction-mode semantics; Npgsql reset would hide leaks |

## Why
Transaction-local state is the only thing a transaction-mode pooler keeps
consistent (PgBouncer docs, "Feature matrix for pooling modes": SET/RESET is
not supported in transaction mode,
[pgbouncer.org/features.html](https://www.pgbouncer.org/features.html)).
Committing in the endpoint keeps the "acknowledged = durable" guarantee the
push endpoint already had.

## Revisit if
An endpoint needs several independent transactions per request (then give it
its own `UserScope` per transaction), or long-running streaming reads make
holding a transaction for the response undesirable.

## Review
