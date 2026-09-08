Run `npm ci`, then `npm test` with Bun installed.

The tests use synthetic chain responses and a DOM to exercise confirmed-post reconciliation, stale reads, navigation races, notification failures/deadlines, and both posting forms. They do not sign transactions or call a live wallet/gateway.
