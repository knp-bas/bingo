// Shapes shared between server and client.

export type RoundStatus = "playing" | "finished";

export interface RoundInfo {
  id: number;
  size: number;
  freeCenter: boolean;
  maxWinners: number;
  maxNumber: number;
  status: RoundStatus;
}

export interface WinnerInfo {
  rank: number;
  name: string;
  /** The number whose call completed the winner's line. */
  winningNumber: number;
}

export interface GameState {
  round: RoundInfo | null;
  calls: number[];
  /** Present while the draw animation is running. Times are relative to when the state was sent. */
  rolling: { remainingMs: number; durationMs: number } | null;
  winners: WinnerInfo[];
  playersInRound: number;
  online: number;
}

export interface CardResponse {
  round: RoundInfo | null;
  card: number[][] | null;
  rank: number | null;
}
