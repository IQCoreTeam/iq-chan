// Post({ no, com, name, time, sub?, img?, isOwner?, onEdit?, onDelete? })
//   Single post card — reused for both OP threads and replies.
//
// Input props:
//   no (number) — post number
//   com (string) — comment body text
//   name (string) — author display name
//   time (number) — unix timestamp
//   sub? (string) — subject/title, only present for OP
//   img? (string) — image on_chain_path or URL, optional
//   isOwner? (boolean) — true if current wallet is the post author
//   onEdit? (callback) — called when edit button clicked
//   onDelete? (callback) — called when delete button clicked
//
// Renders:
//   1. Image thumbnail if img exists (click to expand to full size)
//   2. Header line: name · No.{no} · formatted time
//   3. Subject line if sub exists (bold)
//   4. Body: segmentPostBody(com) → map segments to text spans and <QuoteLink /> components
//   5. Edit/Delete buttons if isOwner is true
