// Pure bingo rules — safe to import from both server and client.

export const MIN_SIZE = 5;
export const MAX_SIZE = 7;
export const FREE = 0; // value stored in the free centre cell

/** Each column holds 3N consecutive numbers, so an N×N game uses 1..3N². */
export function numbersPerColumn(size: number) {
  return size * 3;
}

export function maxNumber(size: number) {
  return size * numbersPerColumn(size);
}

export function columnOf(n: number, size: number) {
  return Math.floor((n - 1) / numbersPerColumn(size));
}

export function columnRange(col: number, size: number): [number, number] {
  const per = numbersPerColumn(size);
  return [col * per + 1, (col + 1) * per];
}

export function columnHeader(col: number, size: number) {
  if (size === 5) return "BINGO"[col];
  const [a, b] = columnRange(col, size);
  return `${a}-${b}`;
}

export function canHaveFreeCenter(size: number) {
  return size % 2 === 1;
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns rows[r][c]. Column c draws from its own number range (so the B-I-N-G-O
 * header tells players where to look), in random top-to-bottom order.
 */
export function generateCard(size: number, freeCenter: boolean): number[][] {
  const cols = Array.from({ length: size }, (_, c) => {
    const [a, b] = columnRange(c, size);
    const pool = Array.from({ length: b - a + 1 }, (_, i) => a + i);
    return shuffle(pool).slice(0, size);
  });
  const rows = Array.from({ length: size }, (_, r) => cols.map((col) => col[r]));
  if (freeCenter && canHaveFreeCenter(size)) {
    const m = Math.floor(size / 2);
    rows[m][m] = FREE;
  }
  return rows;
}

/** All 2N+2 winning lines as lists of [row, col]. */
export function allLines(size: number): [number, number][][] {
  const idx = Array.from({ length: size }, (_, i) => i);
  return [
    ...idx.map((r) => idx.map((c) => [r, c] as [number, number])),
    ...idx.map((c) => idx.map((r) => [r, c] as [number, number])),
    idx.map((i) => [i, i] as [number, number]),
    idx.map((i) => [i, size - 1 - i] as [number, number]),
  ];
}

/** Returns the completed line (cells) or null. `isHit` decides whether a cell counts. */
export function findLine(
  card: number[][],
  isHit: (value: number, r: number, c: number) => boolean,
): [number, number][] | null {
  for (const line of allLines(card.length)) {
    if (line.every(([r, c]) => card[r][c] === FREE || isHit(card[r][c], r, c))) {
      return line;
    }
  }
  return null;
}

/**
 * Index (0-based) of the call that first completed a line on this card,
 * or -1 if the card has no line yet.
 */
export function completedAtCall(card: number[][], calls: number[]): number {
  const called = new Set<number>();
  for (let i = 0; i < calls.length; i++) {
    called.add(calls[i]);
    if (findLine(card, (v) => called.has(v))) return i;
  }
  return -1;
}
