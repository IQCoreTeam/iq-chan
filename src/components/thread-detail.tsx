// ThreadDetail({ thread, replies })
//   Full thread view — OP post followed by all replies.
//
// Input props:
//   thread: { no: number, sub: string, com: string, name: string, time: number, img?: string }
//   replies: Array<{ no: number, com: string, name: string, time: number, img?: string }>
//
// Renders:
//   1. OP: <Post /> with sub (subject) displayed
//   2. Separator line
//   3. Replies: <Post /> for each reply, in chronological order
//   4. Separator between each reply
