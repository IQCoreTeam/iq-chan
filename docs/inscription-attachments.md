# Inscription attachments

The existing attachment field accepts ordinary media URLs, Solana signatures,
IQ Labs Code-In share links, and supported transaction explorer URLs. A bare EVM
hash uses the active site's network; a Solana signature always selects Solana,
including when displayed on HoodChan.

The form links to `https://iqlabs.dev/?menu=codein` for uploading. After inscribing,
paste the share link or transaction ID back into the form. This does not add an
uploader, change the post's chain, or make browser RPC calls to read media.
The upload link is labeled Solana; it does not promise an available Robinhood
inscription page.

The shared Attachment component calls the existing gateway transport at
`/media/:id?network=:network`, checks its media type and size, and uses native
image/audio/video elements. Ordinary media URLs continue to work. HTML, SVG,
unknown share sites and embedded remote media URLs are not resolved as inscriptions.
There is a 15-second request deadline and a 6 MiB maximum accepted decoded size.
The browser downloads the response before checking its size and starting playback;
this is not a streaming player or a bounded streaming download. The gateway
rejects oversized encoded payloads separately.

The server's `media-src` policy includes `blob:` for attachment object URLs.
Static exports do not emit Next response headers: configure any hosting CSP
to allow `blob:` in `media-src` too.

## Rollout dependency and tests

The selected gateway must support the new `/media` endpoint first. A gateway
without that route returns an error; a 404 is terminal in the existing fallback
transport, so deploying only to a secondary gateway is insufficient.

`npm test` covers reference parsing, image/audio/video rendering, cleanup,
unsupported content, ordinary URLs and EVM network selection. Typecheck and both
`NEXT_PUBLIC_NETWORK=solana npm run build` and
`NEXT_PUBLIC_NETWORK=robinhood npm run build` were checked, including
`STATIC_EXPORT=1` for each. A browser harness using the actual CSP reproduced
blocked playback before the fix and played WAV/video afterward in both site modes.
The WAV came from a signed offline Surfpool row; form tests use a simulated wallet.
Updated WalletConnect rendered a real QR code in the static HoodChan build;
pairing with a physical wallet was not tested.

The dependency lock selects official Solana SDK 0.3.6. SDK confirmation/resume
fixes under separate local review are not part of that published package.
The gateway separately passed signed EVM media tests on a local Anvil fork using
official Ethereum SDK 0.4.0. These checks do not prove live RPC availability,
deployed gateway support or browser-signed posting. No remote changes or mainnet
writes were made.
