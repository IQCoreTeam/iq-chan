// RootLayout({ children })
//   Root layout wrapping all pages. Sets up providers and global UI.
//
// Providers (outermost → innermost):
//   1. ConnectionProvider — Solana RPC endpoint configuration
//   2. WalletProvider — phantom, solflare, etc.
//
// Renders:
//   <Header /> — fixed top navigation bar
//   {children} — page content
//
// Imports globals.css for Tailwind base styles
