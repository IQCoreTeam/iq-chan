# BlockChan

A fully decentralized imageboard built on Solana. All posts, threads, and boards are stored permanently on-chain using the [IQ Labs SDK](https://github.com/IQCoreTeam/iqlabs-solana-sdk). No servers hold your data — just Solana transactions and a read-only gateway cache.

Live: [blockchan.xyz](https://blockchan.xyz)

## How It Works

- **Posts** are Solana transactions written to on-chain IQDB tables
- **Reads** go through an [IQ Gateway](https://github.com/IQCoreTeam/iq-gateway) (HTTP cache layer)
- **Writes** go directly to Solana RPC via wallet (Phantom, Backpack, etc.)
- **Frontend** is a static Next.js app — can be hosted anywhere or deployed permanently on-chain

The gateway is optional. Anyone can run their own. If all gateways go down, the data is still on Solana and recoverable by spinning up a new gateway.

## Prerequisites

- Node.js 18+
- npm
- A Solana wallet browser extension (Phantom, Backpack, Solflare, etc.)

## Quick Start

```bash
git clone https://github.com/IQCoreTeam/iq-chan.git
cd iq-chan
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. Connect your wallet and start posting.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_RPC_ENDPOINT` | No | `https://api.mainnet-beta.solana.com` | Solana RPC for writes. A paid RPC (Helius, Quicknode) will be faster |

Gateway URLs are set in `src/lib/config.ts` and can be overridden at runtime in your browser console:

```js
localStorage.setItem("blockchan_gateway", "http://localhost:3000");
```

Default gateways:
- `https://gateway.solanainternet.com` (primary)
- `https://gateway.iqlabs.dev` (backup)

The frontend automatically falls back through the list if one is down.

## Deployment

### On-Chain via Iqoogle (Solana Permanent Web)

Host the entire site on Solana. Served via any IQ Gateway at `/site/{manifestSig}`.

1. Clone and install [Iqoogle](https://github.com/IQCoreTeam/Iqoogle) (the IQ app publisher)
2. Build a static export:
```bash
STATIC_EXPORT=1 npm run build
```
3. Create `out/iqbrowser.json`:
```json
{
  "name": "blockchan",
  "version": "2.1.0",
  "description": "On-chain imageboard on Solana",
  "root": "iqchan",
  "runtime": "static",
  "start": ""
}
```
4. Publish (needs a funded Solana wallet):
```bash
cd out
npx tsx /path/to/Iqoogle/src/iqbrowser/index.ts publish
```

### Arweave (Permanent)

The site lives on Arweave forever, served through any Arweave gateway.

```bash
npm i -g arkb
STATIC_EXPORT=1 npm run build
arkb deploy out/ --wallet /path/to/arweave-wallet.json --auto-confirm
```

Access at `https://arweave.net/{manifestId}`.

### Static Export (Any Host)

```bash
STATIC_EXPORT=1 npm run build
```

Output in `out/`. Upload to any static host, CDN, or IPFS.

### Standard Next.js

```bash
npm run build
npm start
```

Works on Vercel, Railway, or any Node.js host.

## Running Your Own Gateway

The frontend needs at least one IQ Gateway for reads. Run your own:

```bash
git clone https://github.com/IQCoreTeam/iq-gateway.git
cd iq-gateway
bun install
cp .env.example .env
bun run dev
```

Then point BlockChan at it:
```js
localStorage.setItem("blockchan_gateway", "http://localhost:3000");
```

See the [gateway repo](https://github.com/IQCoreTeam/iq-gateway) for Docker, Akash, and production deployment.

## Architecture

```
Browser (Next.js static app)
    |
    ├── Reads → IQ Gateway (cache) → Solana RPC → On-chain data
    |
    └── Writes → Solana RPC (via wallet) → IQ Labs Contract
```

- All data lives in IQDB tables on Solana
- Gateway is a stateless read cache (memory → disk → chain)
- Multiple gateways can serve the same data independently
- No backend server — the gateway is replaceable

## Stack

- Next.js 15 / React 19 / TypeScript
- [IQ Labs SDK](https://github.com/IQCoreTeam/iqlabs-solana-sdk)
- Solana Wallet Adapter
- Tailwind CSS

## Links

- [IQ Labs SDK](https://github.com/IQCoreTeam/iqlabs-solana-sdk)
- [IQ Gateway](https://github.com/IQCoreTeam/iq-gateway)
- [SDK Docs](https://iqlabs.mintlify.app/docs-typescript)
- [BlockChan](https://blockchan.xyz)
