// PostForm({ mode, onSubmit, loading })
//   Shared form for creating threads or posting replies.
//
// Input props:
//   mode ("thread" | "reply") — determines which fields to show
//   onSubmit (callback) — called with form data: { sub?, com, name, img? }
//   loading (boolean) — disables form while submitting
//
// Renders:
//   1. If wallet not connected: "Connect Wallet" prompt, form disabled
//   2. Thread mode fields: subject input, comment textarea, name input, image upload
//   3. Reply mode fields: comment textarea, name input, image upload
//   4. Image upload: file picker, preview thumbnail after selection
//   5. Estimated cost display (thread: ~0.023 SOL, reply: ~0.003 SOL)
//   6. Submit button (disabled while loading)
