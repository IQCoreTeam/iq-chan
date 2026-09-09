# Link previews

Share URLs use `/share/{network}[/{board}[/{thread}[/{transaction}]]]`.
For example, `/share/robinhood/iq` previews the HoodChan IQ board.
The same path with `?image=1` serves a 1200×630 PNG. HTML includes Open Graph
and Twitter large-image metadata without requiring JavaScript, covering
Open Graph consumers such as Discord, Telegram, Slack and Facebook as well
as Twitter cards. Actual display and caching remain platform-controlled.

People opening a share URL automatically go to the existing hash route,
retaining the selected post anchor and its existing scroll/highlight behavior.
There is no preview landing page. The HTTP response retains its metadata for
unfurlers; a small browser script uses location.replace to open the app without
an extra Back-button stop. A noscript link is the only fallback UI. HTTP and
meta-refresh redirects are avoided so crawlers can read the metadata.

Site, board and thread share controls copy the share URL, using the same copy
component as post menus. Copy failures expose a selectable URL. Post menus also
use that URL for Share on X. Ordinary internal navigation and quotes retain
the existing hash router. Static/on-chain mirrors share their matching public
domain, because a static export cannot answer dynamic crawler requests.

The deployed Next server must serve `/share/*`; no gateway deployment is
required. Existing `#/...` URLs cannot provide post-specific metadata because
HTTP requests omit fragments. Social previews require the new share URLs.
The two production hosts retain their network branding. Localhost is retained
in locally copied URLs for review, so those links are not public share links.

Cards use the actual logo assets and the site's Yotsuba palette. The app keeps
its existing theme.css import and root metadata images. The image renderer
uses inline palette values checked against theme.css by the share tests.
Card layouts follow the home sections and post information/thumbnail/message
layout, without simulated interactive controls. Images are static social
previews; visitors use the existing app.

Reads reuse the existing SVM/EVM adapters, including Solana instruction merges.
Successful preview data is cached for 60 seconds. Missing selected replies
return 404 rather than substituting an OP; read failures return 503. Neither
response is publicly cached. Browsers still continue to the requested app
destination when preview data is unavailable. A reply outside a gateway's
returned window is reported unavailable rather than shown as a different post.

Images are optional. The renderer reads registered local logos and only fetches
HTTPS images from `hoodchan.xyz`, `blockchan.sol.site`, `images.nubs.site`,
`i.ibb.co` and `i.imgur.com`. Other attachments keep a text preview. Redirects
are rejected; image reads have a three-second deadline, a 2 MB byte limit and
a 16-megapixel decode limit. Sharp normalizes accepted images to bounded PNG
thumbnails, including WebP inputs, before Next ImageResponse renders the card.
Sharp already appears as an optional Next dependency in the upstream lockfile;
this feature declares it directly because these conversions require it.

Run `npm test` for the browser/unit suite and isolated server-route tests,
then `npx tsc --noEmit` and `npm run build`. Server tests run separately because
the existing hook tests mock the chain module globally in Bun.
For Docker checks, pass the `NEXT_PUBLIC_RPC_ENDPOINT` and
`NEXT_PUBLIC_GATEWAY_URL` build arguments as CI does; they are compiled into
the client bundle. Check the HTML's actual image URL through the mapped port
and production Host headers, not just a direct request to the PNG endpoint.

Before publishing, inspect site/board/thread/reply previews for both chains,
check the raw HTML with a crawler user agent, and open a reply's destination.
After an approved public deployment, verify an actual unfurl in the target
social platform. Local HTTP/image tests cannot prove a platform's caching or
display behavior. Platforms may retain older previews beyond our cache TTL.
