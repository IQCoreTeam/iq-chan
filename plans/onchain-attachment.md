# On-chain attachments: remaining work (input side)

Tracking issue: IQCoreTeam/iq-chan#33
Display side already merged into the base branch `feat/onchain-attachment` (commit fd80ff4). This branch (`feat/onchain-attachment-picker`) builds the input side on top.

## The one rule everything follows from

On chain, a post `img` holds a **bare tx signature**, never an assembled gateway url. The browser assembles the gateway view at read time, so the gateway host is swappable and a dead gateway falls through. Store with no transform.

## Already in place (reuse, do not reimplement)

- `src/lib/inscription.ts`
  - `parseInscriptionRef(input)` -> bare sig from a sig, an iqlabs `?post=` link, or a gateway url (null for a plain url).
  - `inscriptionSrcCandidates(sig, gateways, networkParam)` -> ordered `/img` then `/render` candidates.
- `src/components/inscription-attachment.tsx` -> gateway-cycling thumbnail + on-chain badge (badge links to `net.explorerTxUrl + sig`).
- `src/components/post.tsx` -> detects an inscription before the url path.
- Shared helpers: `getFallbacks()` (`src/lib/config.ts`), `resolveNetwork()` (`src/lib/chains/resolve.ts`), `safePostUrl` (`src/lib/format.tsx`).

## Tasks

### 1. Inventory read (one function in the existing read modules)

Add to `src/lib/chains/solana/read.ts` and `src/lib/chains/evm/read.ts`, not a new module. Returns the user's code-in inscriptions, the same list iqlabs.dev "my inventory" shows.

- Target feed is the **iq6900 code-in feed**, not the iqchan board: db_root `iq6900-codein-feed-v1`, table `global-feed`. Derive the PDA in-app with the SDK already imported here (`iqlabs.contract.getDbRootPda`, `getTablePda`, `utils.toSeedBytes`).
- Solana: `GET /user/{address}/assets?limit=N` through `gwFetch`, take each `.signature`, then `GET /table/{iq6900FeedPda}/slice?sigs=a,b,c`, keep rows that have a `kind`. Reference: iq6900 `assets/js/codein/browser.js` `readMine`.
- Robinhood: EVM `/user/assets` only indexes codeIn, so filter the iq6900 feed rows by the `who` column instead. Reference: iq6900 `assets/js/codein/evm.js` `readMine`.
- Shape each entry as `{ sig, kind, preview }` so the modal and picker do not re-decode.

### 2. Image source picker (post-form + quick-reply)

`src/components/post-form.tsx` and `src/components/quick-reply.tsx`. A small `[URL] [On-chain]` control over the existing Attachment URL field.

- URL tab: the current field, unchanged.
- On-chain tab: a field that accepts a sig or an iqlabs `?post=` link (normalize with `parseInscriptionRef`, store the bare sig) plus a "Browse my inscriptions" button that opens the modal.
- Both tabs set the same existing `img` state. The write path (`chains/*/writer.tsx`) does not change, it still stores `img` verbatim.

### 3. Inventory modal

A grid of the connected wallet's inscriptions (thumbnails resolved through the gateway, reuse `inscriptionSrcCandidates`), click sets `img = sig` and closes. Reuse any existing modal/overlay pattern (see `src/lib/chains/solana/wallet-modal-ui.tsx`).

### 4. Refactor: one renderer decision

The "img -> inscription vs url" branch currently lives inline in `post.tsx`. Extract a `PostAttachment` that both `post.tsx` and the form preview use, so the detection lives in one place (one function per purpose).

### 5. Solscan guide popup

Mirror the iqlabs.dev viewer affordance (reference: iq6900 `assets/js/sections/pages/code_in_v2.js`, the share / solscan help popup). The on-chain badge opens a short guide popup, "how to view this inscription on Solscan", with a "view on Solscan" action (`net.explorerTxUrl + sig`) and a link to the gateway viewer. Keep the gateway url dynamic (from `getFallbacks()`), so a gateway domain change needs no post rewrite. The raw image stays clean; no iq-gateway change required for this path.

## Conventions

English in repo-facing text, no em-dash, no emoji in product UI, centralized tokens (no raw hex). Reuse existing functions. iq-chan auto-deploys on push to `main`, so land this behind review and merge one PR at a time.
