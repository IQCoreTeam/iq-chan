# Uploader return integration

Zo's shared AttachmentField remains the single link/transaction-ID input and
retains Browse my inscriptions. Inscribe attachment opens the matching Code-In
or Hood-In page with the current origin and a UUID request. Only its matching
window/origin/request/network can return a canonical transaction ID. That ID
enters the existing img field; post text and inventory selection stay local.

Both full post forms and quick replies pause submission while a return request
is pending. Cancellation, popup closure and editing the field discard the old
request and preserve the draft. Posting remains manual. Uploader iq6900 #5 is
merged. Production opener/CSP and mobile signing still need rollout verification.

InscriptionMedia adds bounded passive media previews to the existing inscription
attachment renderer. Requests begin within 200 pixels of the viewport, expire
after 15 seconds, and accept at most 6 MiB of decoded bytes. It reuses the
existing gateway transport, response reader and InscriptionImage fallback;
text/ascii and unavailable media still use Zo's image/render candidate path.
The badge, guide and inventory image thumbnails remain upstream's components.
Gateway #32 must deploy before enabling the media route.

## Homepage thumbnails

The shared homepage previously sent a bare inscription transaction ID directly
into img src. On the deployed HoodChan onchain-image-testing thread, the thread
image loaded but its homepage card fell back to a no-image placeholder.
ThreadThumbnail now detects the reference through parseInscriptionRef and reuses
InscriptionImage's gateway/image/render fallback. Natural dimensions still drive
its existing 150-pixel thumbnail scaling. Both Solana and EVM regressions cover
resolution, fallback and load sizing without an additional board scan. Chrome
verified the same live Robinhood inscription on the patched local homepage:
0x422070350c660a3f79c5562cda187632e298b7a1ede82ee666aa7863a21533b5.
This was read-only production data; no transaction was submitted.
