# Board System

## Official Boards
- Board list is hardcoded in `src/lib/constants.ts` as `DEFAULT_BOARDS`
- Each entry maps a slug (e.g. "biz") to metadata (title, description, image)
- PDA is derived client-side from the slug — pure math, no RPC call
- Homepage reads from this constant — zero RPC calls
- To add a new official board: add entry to `DEFAULT_BOARDS`, redeploy to Arweave

### Current code (`src/lib/constants.ts`):
```ts
export const DEFAULT_BOARDS: Record<string, { title: string; description: string; image: string }> = {
    po:  { title: "Politically Incorrect", description: "Political discussion",            image: "/boards/po.webp" },
    biz: { title: "Business & Finance",    description: "Business and finance discussion", image: "/boards/biz.webp" },
    a:   { title: "Anime & Manga",         description: "Anime and manga discussion",     image: "/boards/a.webp" },
    g:   { title: "Technology",             description: "Technology discussion",           image: "/boards/g.webp" },
};
```

### PDA resolution (`src/lib/board.ts`):
```ts
// No RPC call — pure local math
getFeedPda(DB_ROOT_KEY, "biz")
// → BWg1LzP3jVuhTxkaP2PXxou61sWEKW1VVRYdPieYtJtg (deterministic, always the same)
```

### Adding a new official board:
```ts
// Just add one line to DEFAULT_BOARDS and redeploy:
sol: { title: "Solana General", description: "Solana discussion", image: "/boards/sol.webp" },
```

## Unofficial (Private) Boards
- Anyone can create a board via `/#/addboard`
- Board seed is randomly generated — user cannot pick the slug
- URL is the raw seed/PDA (e.g. `/#/7DAkS9iNbp...`)
- Creator saves and shares the link directly
- Board name/metadata is stored on-chain in a metadata table
- Not shown on the homepage

### Creation flow (`src/components/pages/addboard-page.tsx`):
```ts
// Two tables created per board:
// 1. Board table (seed: randomId) — goes into global_table_seeds
createExtTableInstruction(builder, accounts, {
    table_seed: boardSeedBytes,
    gate_opt: gate,  // optional token/collection gate
    ...
});

// 2. Metadata table (seed: "{randomId}/metadata") — stores title, description, image
createExtTableInstruction(builder, accounts, {
    table_seed: metaSeedBytes,
    ...
});

// Then write metadata row:
writeRow(connection, wallet, dbRootIdBytes, metaSeedBytes,
    JSON.stringify({ title, description, image, time: Date.now() })
);
```

## Promoting to Official
- Admin reviews private boards via `/#/admin`
- Admin calls `onboardTable` on-chain to register the seed
- Admin adds the board to `DEFAULT_BOARDS` with a human-readable slug and redeploys
- Once official, the board appears on the homepage with its slug (e.g. `/#/iq/`)

### Admin onboarding (`src/components/pages/admin-page.tsx`):
```ts
// On-chain: add seed to table_seeds
onboardTableInstruction(builder, {
    signer: wallet.publicKey,
    db_root: DB_ROOT_KEY,
}, {
    db_root_id: DB_ROOT_ID_BYTES,
    table_seed: boardSeedBytes,
});

// Then update constants.ts and redeploy
```

## Why Constants Over On-Chain Board List
- No RPC credits wasted polling `table_seeds` for data that rarely changes
- No stale cache issues — constants are always correct after deploy
- No name squatting — random seeds for users, admin controls readable names
- Faster page load — homepage renders instantly

## On-Chain Features Used
- `createExtTableInstruction` — anyone creates private board (ext table)
- `onboardTableInstruction` — admin promotes board to official
- `manageTableCreatorsInstruction` — admin controls who can create tables
- `GateConfig` — token/collection gating per board
- Metadata table (`{seed}/metadata`) — stores board title, description, image on-chain

## Routes
- `/#/` — homepage (official boards from constants)
- `/#/{boardId}` — official board by slug
- `/#/{pda}` — unofficial board by seed/PDA
- `/#/addboard` — create new board (not linked in UI)
- `/#/admin` — admin panel (not linked in UI)

## Key Files
- `src/lib/constants.ts` — `DEFAULT_BOARDS`, `DB_ROOT_ID_BYTES`, PDA derivation helpers
- `src/lib/board.ts` — `fetchBoards()`, `getFeedPda()`, `SEED_TO_BOARD_ID` lookup
- `src/lib/types.ts` — `BoardMeta` interface
- `src/hooks/use-boards.tsx` — `BoardsProvider` context, `useBoards()` hook
- `src/hooks/use-post.ts` — thread creation with optional `gate` param
- `src/app/page.tsx` — router with `/#/addboard` and `/#/admin` routes
- `src/components/pages/addboard-page.tsx` — board creation form
- `src/components/pages/admin-page.tsx` — onboard + manage creators
