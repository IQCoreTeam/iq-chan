# Link previews

Share URLs use `/share/{network}[/{board}[/{thread}[/{transaction}]]]`.
For example, `/share/robinhood/iq` previews the HoodChan IQ board.
The same path with `?image=1` serves a 1200×630 PNG. HTML includes Open Graph
and Twitter large-image metadata without requiring JavaScript. The page's
Open link leads to the existing hash route, retaining a selected post anchor.

Site, board and thread views expose share links. Post menus copy the share
URL and use it for Share on X. Ordinary internal navigation and quotes retain
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
Card layouts follow the home
sections and post information/thumbnail/message layout, without simulated
interactive controls. Images are static previews; links on the HTML page work.

Reads reuse the existing SVM/EVM adapters, including Solana instruction merges.
Successful preview data is cached for 60 seconds. Missing selected replies
return 404 rather than substituting an OP; read failures return 503. Neither
response is publicly cached. A reply outside a gateway's returned window is
reported unavailable rather than shown as a different post.

Images are optional. The renderer reads registered local logos and only fetches
HTTPS images from `hoodchan.xyz`, `blockchan.sol.site`, `images.nubs.site`,
`i.ibb.co` and `i.imgur.com`. Other attachments keep a text preview. Redirects
are rejected; image reads have a three-second deadline, a 2 MB byte limit and
a 16-megapixel decode limit. Sharp normalizes accepted images to bounded PNG
thumbnails, including WebP inputs, before Next ImageResponse renders the card.
Sharp already appears as an optional Next dependency in the upstream lockfile;
this feature declares it directly because these conversions require it. The
production Docker image still needs an image-rendering smoke test.

Run `npm test` for the browser/unit suite and isolated server-route tests,
then `npx tsc --noEmit` and `npm run build`. Server tests run separately because
the existing hook tests mock the chain module globally in Bun.

Before publishing, inspect site/board/thread/reply previews for both chains,
check the raw HTML with a crawler user agent, and open a reply's destination.
After an approved public deployment, verify an actual unfurl in the target
social platform. Local HTTP/image tests cannot prove a platform's caching or
display behavior. Platforms may retain older previews beyond our cache TTL.
