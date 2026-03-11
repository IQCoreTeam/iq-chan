// BoardList({ boards })
//   Grid of board cards for the home page.
//
// Input props:
//   boards: Array<{ board_id: string, title: string, description: string }>
//
// Renders:
//   1. Responsive grid layout
//   2. Each card: Link to /{board_id}
//      - Board title (bold)
//      - /{board_id} slug
//      - Description text (truncated)
