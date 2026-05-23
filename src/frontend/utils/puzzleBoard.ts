export const PUZZLE_SIZE = 4;
const EMPTY = PUZZLE_SIZE * PUZZLE_SIZE - 1;

export function createSolvedBoard(): number[] {
  return Array.from({ length: PUZZLE_SIZE * PUZZLE_SIZE }, (_, i) => i);
}

export function shuffleBoard(board: number[]): number[] {
  const next = isValidPuzzleBoard(board) ? [...board] : createSolvedBoard();

  for (let i = 0; i < 200; i++) {
    const empty = next.indexOf(EMPTY);
    if (empty === -1) {
      return shuffleBoard(createSolvedBoard());
    }

    const neighbors = getPuzzleNeighbors(empty);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    if (pick == null) continue;

    const tile = next[pick];
    if (tile == null) continue;
    [next[empty], next[pick]] = [tile, EMPTY];
  }

  return next;
}

export function getPuzzleNeighbors(emptyIndex: number): number[] {
  const row = Math.floor(emptyIndex / PUZZLE_SIZE);
  const col = emptyIndex % PUZZLE_SIZE;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(emptyIndex - PUZZLE_SIZE);
  if (row < PUZZLE_SIZE - 1) neighbors.push(emptyIndex + PUZZLE_SIZE);
  if (col > 0) neighbors.push(emptyIndex - 1);
  if (col < PUZZLE_SIZE - 1) neighbors.push(emptyIndex + 1);
  return neighbors;
}

export function isPuzzleSolved(board: number[]): boolean {
  return (
    board.length === PUZZLE_SIZE * PUZZLE_SIZE && board.every((v, i) => v === i)
  );
}

export function createFreshPuzzleBoard(): number[] {
  return shuffleBoard(createSolvedBoard());
}

export function isValidPuzzleBoard(board: unknown): board is number[] {
  if (!Array.isArray(board) || board.length !== PUZZLE_SIZE * PUZZLE_SIZE) {
    return false;
  }
  const seen = new Set<number>();
  for (const cell of board) {
    if (
      typeof cell !== 'number' ||
      !Number.isInteger(cell) ||
      cell < 0 ||
      cell > EMPTY
    ) {
      return false;
    }
    if (seen.has(cell)) return false;
    seen.add(cell);
  }
  return seen.size === PUZZLE_SIZE * PUZZLE_SIZE;
}

/** Coerce saved/corrupt state back to a playable board or start fresh. */
export function normalizePuzzleBoard(board: unknown): number[] {
  if (isValidPuzzleBoard(board)) return [...board];
  return createFreshPuzzleBoard();
}

export function tileLabel(value: number): string {
  if (value === EMPTY) return '';
  if (!Number.isInteger(value) || value < 0 || value >= EMPTY) return '';
  return String(value + 1);
}

export function applyPuzzleMove(
  board: number[],
  tileIndex: number
): number[] | null {
  if (!isValidPuzzleBoard(board)) return null;

  const empty = board.indexOf(EMPTY);
  if (empty === -1) return null;
  if (!getPuzzleNeighbors(empty).includes(tileIndex)) return null;

  const next = [...board];
  [next[empty], next[tileIndex]] = [next[tileIndex]!, next[empty]!];
  return next;
}
