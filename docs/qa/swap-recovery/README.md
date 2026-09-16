# Swap execution recovery — local evidence

Base: upstream e6d060997808fc92143675d96d373833ba6704ea, after PR #18 merge.

The production catch replaced every execution exception with "Swap status is uncertain", even before the HTTP request. The local change preserves validation and documented Jupiter rejection errors, keeps a transaction receipt where available, checks ambiguous submissions with getSignatureStatuses, and disables new trades in this mounted card while unresolved. Check status only reads; it never signs or executes again. Receipt links say "View transaction", not "confirmed" for unknown transactions. The order's lastValidBlockHeight is forwarded when supplied.

Validation:
- 37 client/library tests, 231 assertions pass; 11 server tests, 160 assertions pass.
- TypeScript and Next production build pass.
- Browser clicks with a simulated wallet and intercepted transport: expired quote rejection; lost execution response with pending status; manual read-only recovery to finalized. One execute and two status reads. Screenshots attached.
- Fresh production 0.1 SOL quote returned HTTP 200 via Metis; the user-approved production attempt reproduced the generic error. No execution response was captured, so the original cause is not yet established.

Live validation: user approved a 0.1 SOL buy in Phantom on localhost:4364. UI showed Swap confirmed and refreshed the balance. Public RPC getTransaction returned meta.err=null at slot 447573376 for 4A56tjVbHzuVc1gAw82fPYd8B3YDi5aMW2HdKkTzqCsT4vtERqsGYxb9PF5btsvX3Lm7PF7N2a6yA4ue3L7evRsv. IQ balance rose from 2264407.886065151 to 2299767.189950370 (+35359.303885219 IQ). Receipt and screenshot attached. The local build used a loopback read-only RPC proxy because the default RPC rejected localhost; execute still used Jupiter directly. This proves a live buy, not live sell or every route/failure. Original production failure remains unclassified.

Limitations: Pending protection is per mounted card (not a cross-tab/reload lock). A sponsored transaction without a first signature or Jupiter receipt cannot be checked by signature. Unknown receipts do not expire automatically; they remain unresolved until checked. No test board posts were submitted.
