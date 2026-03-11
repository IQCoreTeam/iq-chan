// Header()
//   Top navigation bar, displayed on all pages via layout.tsx.
//
// Input props: (none — reads route params for breadcrumb)
//
// Renders:
//   Left section: iqchan logo/name + board shortcut links (e.g. [po] [biz] [a])
//   Right section: <WalletButton />
//   Breadcrumb: Home > /{boardId} > Thread #{no} (based on current route)
