# iq-chan devnotes

## 2025-03-25 — Code cleanup, deduplicate constants, gateway-based gate check

### Deduplicated BOARD_COLUMNS
`["sub", "com", "name", "time", "img", "threadPda", "threadSeed"]` was defined identically in
`use-post.ts` (as `THREAD_COLUMNS`) and `admin-page.tsx` (as `BOARD_COLUMNS`). Moved to
`lib/constants.ts` as `BOARD_COLUMNS`, single source of truth.

### Extracted gateError()
Error normalization (`"ata"` / `"token account"` → `"You are not a holder"`) was duplicated 3x
in `use-post.ts` (createThread catch, postReply catch). Extracted to `gateError()` at module level.

### useBoardGate → gateway
`useBoardGate` now fetches gate info from the gateway (`/table/:pda/meta`) instead of making
direct RPC calls from the browser. The public Solana RPC blocks browser requests (403), and
we don't want to expose Helius keys to the client.

### Config
`PRIMARY_GATEWAY` in `lib/config.ts`:
- Production: `https://gateway.solanainternet.com`
- Local dev: change to `http://localhost:3002`
- Users can override via `localStorage.setItem("blockchan_gateway", "http://...")`
- Fallback chain: primary → Akash direct → gateway.iqlabs.dev

## Architecture

### Board system
- `DEFAULT_BOARDS` in `constants.ts` — hardcoded official boards (po, biz, a, g, iq)
- `resolveBoardSeed(slug)` — maps URL slug to on-chain seed
- User-created boards get random UUID seeds (no name squatting)
- Feed PDA derived from: FEED_SEED_PREFIX + PROGRAM_ID + DB_ROOT_KEY + boardSeedBytes
- Posts write to board table via `db_code_in`, CC feed PDA in remainingAccounts for bump ordering

### Write flow (Zo's new)
- OP: TX1 creates thread ext table, TX2 writes row to board table via `iqlabs.writer.writeRow`
- Reply: single TX writes to thread table via `iqlabs.writer.writeRow`
- Gate enforcement happens on-chain in `db_code_in` instruction
- `checkGate()` pre-flight checks SOL + token balance before signing

## Deployment

### Arweave (frontend)
```bash
npx next build && npx next export   # or: next build (output: export in next.config)
npx arkb deploy out --wallet /path/to/arweave-key.json
# Note the manifest TX ID, update Cloudflare Worker to point to it
```

### Cloudflare Worker
Update the Arweave manifest hash in the worker script, then `wrangler deploy`.
