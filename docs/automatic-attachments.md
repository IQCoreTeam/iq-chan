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
