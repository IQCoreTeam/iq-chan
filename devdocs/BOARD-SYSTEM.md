# Board System

## Official Boards
- Board list hardcoded in `src/lib/constants.ts` as `OFFICIAL_BOARDS`
- Each entry maps a URL slug to an on-chain seed + display metadata
- PDA derived client-side from the seed — pure math, no RPC call
- Homepage reads from this constant — zero RPC calls

### Current code (`src/lib/constants.ts`):
```ts
export const OFFICIAL_BOARDS: Record<string, { seed: string; title: string; description: string; image: string }> = {
    po:  { seed: "po",  title: "Politically Incorrect", ... },
    biz: { seed: "biz", title: "Business & Finance",    ... },
    // promoted board — slug differs from seed:
    // degen: { seed: "a8f3b2c1...", title: "Degen Community", ... },
};
```

### How slug → PDA works:
```ts
resolveBoardSeed("biz")    // → "biz" (legacy, slug = seed)
resolveBoardSeed("degen")  // → "a8f3b2c1..." (promoted, slug ≠ seed)
resolveBoardSeed("a8f3b2c1...")  // → "a8f3b2c1..." (unofficial, passthrough)

// Then: getFeedPda(dbRoot, seed) → deterministic PDA → fetch from gateway
```

## Unofficial (Private) Boards
- Anyone can create a board via `/#/addboard`
- User picks a display name (e.g. `/degen/`) — shown at top of board page
- Seed is auto-generated UUID — user cannot pick it
- URL is the random seed (e.g. `/#/a8f3b2c1e4d5f6a7...`)
- Creator saves and shares the link — it cannot be recovered
- Metadata (slug, title, description, image) stored on-chain in `{seed}/metadata` table
- Not shown on the homepage

### Creation flow:
```ts
const boardSeed = crypto.randomUUID().replace(/-/g, "");

// 1. Board table (random seed) → goes into global_table_seeds
createExtTableInstruction(..., { table_seed: boardSeedBytes, gate_opt: gate });

// 2. Metadata table (seed: "{boardSeed}/metadata")
createExtTableInstruction(..., { table_seed: metaSeedBytes });

// 3. Write metadata row
writeRow(..., JSON.stringify({ slug, title, description, image, time }));
```

### Visiting an unofficial board (`/#/a8f3b2c1.../`):
- `resolveBoardSeed("a8f3b2c1...")` → passthrough (not in OFFICIAL_BOARDS)
- Feed PDA derived from "a8f3b2c1..."
- Board page fetches `{seed}/metadata` table to show display name at top

## Promoting to Official
1. Admin reviews board via `/#/admin`
2. Admin calls `onboardTable` on-chain
3. Admin adds to `OFFICIAL_BOARDS` in constants:
```ts
degen: { seed: "a8f3b2c1...", title: "Degen Community", image: "/boards/degen.webp" },
```
4. Redeploy to Arweave
5. `/#/degen/` now works — resolves to same PDA as `/#/a8f3b2c1.../`
6. Both URLs work forever, same PDA, same gateway cache

## Why This Works
- No name squatting — users get random seeds, admin controls readable slugs
- No cache conflicts — one seed = one PDA = one cache entry, regardless of slug
- Zero RPC for official boards — metadata in constants
- Unofficial boards self-serve — slug is display only, stored in metadata
- Legacy boards (po, biz, a, g) unaffected — seed = slug, same PDAs as always

## On-Chain Features Used
- `createExtTableInstruction` — anyone creates private board
- `onboardTableInstruction` — admin promotes board (global_table_seeds → table_seeds)
- `manageTableCreatorsInstruction` — dbRoot creator sets who can admin
- `GateConfig` — token/collection gating per board
- `ext_creators: []` — anyone can create ext tables
- `table_creators: [admin wallets]` — only admins can create public tables and onboard

## Routes
- `/#/` — homepage (official boards from constants)
- `/#/{slug}` — official board by slug (resolved via OFFICIAL_BOARDS seed)
- `/#/{hash}` — unofficial board by seed (passthrough, metadata fetched from chain)
- `/#/{slug}/{threadPda}` — thread page
- `/#/addboard` — create new board (not linked in UI)
- `/#/admin` — admin panel (not linked in UI)

## Key Files
- `src/lib/constants.ts` — `OFFICIAL_BOARDS`, `resolveBoardSeed()`, PDA helpers
- `src/lib/board.ts` — `fetchBoards()`, `getFeedPda()`, `SEED_TO_BOARD_ID`
- `src/lib/types.ts` — `BoardMeta` (with `seed` field)
- `src/hooks/use-boards.tsx` — `BoardsProvider` context
- `src/hooks/use-threads.ts` — uses `resolveBoardSeed()` for feed PDA
- `src/hooks/use-post.ts` — uses `resolveBoardSeed()` for thread creation + feed CC
- `src/components/pages/board-page.tsx` — fetches chain metadata for unofficial boards
- `src/components/pages/addboard-page.tsx` — random seed, slug as display name
- `src/components/pages/admin-page.tsx` — onboard + manage creators
