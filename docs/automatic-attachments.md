# Automatic inscription attachments — NOT READY

The shared AttachmentField is used by both PostForm and QuickReply. Click
**Inscribe attachment**, choose media in IQ Labs' existing Solana uploader, and
complete its normal wallet/funding flow. After a successful inscription the
reference returns to the post automatically. Review and submit the post separately.
New attachments accept a transaction ID for the board’s chain, or a new inscription from its matching uploader. Solana uses Code In; Robinhood uses Hood In. Arbitrary URL input is rejected. Both paths store the canonical transaction ID, not an inscription-site or gateway URL.
Completed inscriptions show a preview with Replace and Remove controls.
Existing posts with external attachments remain readable. If automatic return
fails, keep the draft and return to the uploader to retry the attachment handoff.

This does not copy the uploader, SDK writer, funding or refund logic into the
frontend. The popup carries out those operations on IQ Labs. Only the public
signature, network and random request ID return to the posting app; draft text,
wallet keys and signing material are not exchanged. HoodChan posts and new attachments use Robinhood. Existing posts with older Solana inscription links remain readable.

## Coordinated rollout

Requires the matching `code_in_v2.js` attachment return change in iq6900 and the
gateway `/media` route. Deploy and verify those before enabling this frontend.
The currently deployed uploader does not have the return protocol yet. This
prototype is submitted as a draft. **NOT READY: not fully tested or approved by
Nubs or Zo. Do not merge or deploy yet.**

The configured uploader defaults to `https://iqlabs.dev/`. Set the build-time
`NEXT_PUBLIC_INSCRIPTION_URL` for a local/staging uploader. The receiver validates
the exact configured origin, the popup Window and a per-upload UUID. A completed
transaction ID is validated through the shared inscription parser.
Cancellation, removing the attachment, unmounting or starting a new request removes
the old listener. Failure/cancellation does not close an upload still in progress.

The IQ Labs side accepts only explicit posting origins. Loopback return origins
are accepted only when the uploader itself is served on loopback. Add any new
production posting domain intentionally on that side. Static/on-chain hosting
does not need a backend for the exchange. Browser popup permission and opener
preservation are required; a COOP policy that severs the opener prevents return.

## Protocol

Open `?menu=codein&attachmentOrigin=<origin>&attachmentRequest=<UUIDv4>`.
The uploader sends `iq:attachment-ready`, then `iq:attachment-complete` containing
`requestId`, `network` (`solana` or `robinhood`), and `signature`. The frontend acknowledges with
`iq:attachment-accepted` and `requestId`. Every message uses an exact target origin,
never `*`. A rejected or incomplete inscription never sends a completion.

## Validation and remaining work

The September 23 Mac run used installed Phantom on public devnet, the actual
uploader, a locally built patched SDK, and the local gateway. The 4,044-byte WAV
returned automatically to the BlockChan draft. Thread and reply posting both
succeeded, and their direct thread route read back through the gateway. Ten
successful transactions finalized without errors; audio readback matched the
original bytes and playback completed at 0.25 seconds.

[Receipts, screenshots, source pins and remaining release checks](https://github.com/NubsCarson/iq6900/blob/codex/iq6900-ready-20260923/docs/phantom-devnet-20260923.md).

The inscription-only composer passed 83 frontend tests and TypeScript checking;
30 uploader tests passed. Desktop and 390px mobile layouts were inspected.
Physical mobile-wallet signing and deployed cross-origin popup behavior remain
unverified. Production uses the published SDK import; the tested SDK patch still
needs an explicit release/integration. Deploy the gateway media handler and
uploader return protocol before enabling the inscription-only frontend.
No mainnet transactions or production deployment were performed.
