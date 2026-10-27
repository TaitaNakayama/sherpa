export type Action =
  | "reduce_leverage"
  | "add_stop_loss"
  | "reduce_size"
  | "close_position"
  | "hold";

export const ACTIONS: Action[] = [
  "reduce_leverage",
  "add_stop_loss",
  "reduce_size",
  "close_position",
  "hold",
];

export interface Position {
  asset: string;
  side: "long" | "short";
  sizeUsd: number;
  leverage: number;
  entry: number;
  markPrice: number;
  liqPrice: number | null;
  liqDistancePct: number | null;
  pnlUsd: number;
  fundingPerDayUsd: number;
  concentrationPct: number;
}

export interface Recommendation {
  action: Action;
  asset: string;
  title: string;
  why: string[];
  riskUsd: number;
  invalidatedIf: string;
}

export interface AnalyzeResponse {
  account: { value: number; marginUsed: number };
  positions: Position[];
  summary: string;
  recommendations: Recommendation[];
}
