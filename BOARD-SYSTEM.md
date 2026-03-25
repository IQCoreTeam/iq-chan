# Board System

## Official Boards
- Board list is hardcoded in `src/lib/constants.ts` as `DEFAULT_BOARDS`
- Each entry maps a slug (e.g. "biz") to metadata (title, description, image) and a pre-computed PDA
- Homepage reads from this constant — zero RPC calls
- To add a new official board: add entry to `DEFAULT_BOARDS`, redeploy to Arweave

## Unofficial (Private) Boards
- Anyone can create a board via `/#/addboard`
- Board seed is randomly generated — user cannot pick the slug
- URL is the raw seed/PDA (e.g. `/#/7DAkS9iNbp...`)
- Creator saves and shares the link directly
- Board name/metadata is stored on-chain in a metadata table
- Not shown on the homepage

## Promoting to Official
- Admin reviews private boards via `/#/admin`
- Admin calls `onboardTable` on-chain to register the seed
- Admin adds the board to `DEFAULT_BOARDS` with a human-readable slug and redeploys
- Once official, the board appears on the homepage with its slug (e.g. `/#/iq/`)

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
