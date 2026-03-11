// HomePage()
//   Home page — displays list of all boards.
//   No logic here, just hook + component composition.
//
// Logic:
//   1. const { boards, loading, error } = useBoards()
//   2. if loading → render skeleton/spinner
//   3. if error → render error message
//   4. otherwise → render <BoardList boards={boards} />
