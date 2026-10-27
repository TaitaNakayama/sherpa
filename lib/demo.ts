import { riskUsd } from "./risk";
import type { AnalyzeResponse, Position } from "./types";

// Frozen real snapshot of a public Hyperliquid wallet, so the demo works offline.
export const DEMO_ADDRESS = "0xaa57ef244c09de1a28437f3e05f208e87c938566";

const positions: Position[] = [
  { asset: "BTC", side: "long", sizeUsd: 2498400, leverage: 40, entry: 85297, markPrice: 83280, liqPrice: 77494.06, liqDistancePct: 6.947571, pnlUsd: -60510, fundingPerDayUsd: 749.52, concentrationPct: 606.64 },
  { asset: "ETH", side: "long", sizeUsd: 1284450, leverage: 25, entry: 2686.9, markPrice: 2568.9, liqPrice: 2219.09, liqDistancePct: 13.617231, pnlUsd: -59000, fundingPerDayUsd: 385.33, concentrationPct: 311.88 },
  { asset: "DOGE", side: "long", sizeUsd: 1423594.63, leverage: 10, entry: 0.093782, markPrice: 0.088825, liqPrice: 0.077567, liqDistancePct: 12.674246, pnlUsd: -79446.27, fundingPerDayUsd: 427.08, concentrationPct: 345.67 },
  { asset: "XPL", side: "long", sizeUsd: 1049763.2, leverage: 10, entry: 0.090438, markPrice: 0.087311, liqPrice: 0.072304, liqDistancePct: 17.187675, pnlUsd: -37605.65, fundingPerDayUsd: 314.93, concentrationPct: 254.9 },
  { asset: "ZEC", side: "short", sizeUsd: 1613119.48, leverage: 10, entry: 1026.29, markPrice: 1320.4, liqPrice: 1454.02, liqDistancePct: 10.1199, pnlUsd: -359309.66, fundingPerDayUsd: -483.94, concentrationPct: 391.69 },
];

const at = (asset: string) => riskUsd(positions.find((p) => p.asset === asset)!);

export const DEMO_RESPONSE: AnalyzeResponse = {
  account: { value: 411840.45, marginUsed: 522485.73 },
  positions,
  summary:
    "This account is stretched thin: four of its five positions would be wiped out by a price move of less than 14%. The biggest danger is BTC, where a 6.9% drop triggers liquidation.",
  recommendations: [
    {
      action: "reduce_leverage",
      asset: "BTC",
      title: "Lower your BTC leverage",
      why: [
        "At 40x, a 6.9% drop in BTC would liquidate this position.",
        "It is also your largest bet, 6.1x the size of your whole account.",
        "Dropping to 5x or less gives the price far more room to move.",
      ],
      riskUsd: at("BTC"),
      invalidatedIf: "BTC climbs back toward your $85,297 entry price.",
    },
    {
      action: "add_stop_loss",
      asset: "ZEC",
      title: "Put a stop-loss on your ZEC short",
      why: [
        "ZEC has risen from $1,026 to $1,320 against you, a loss of $359,310 so far.",
        "A 10.1% further rise would liquidate the position.",
      ],
      riskUsd: at("ZEC"),
      invalidatedIf: "ZEC falls back below your $1,026 entry price.",
    },
    {
      action: "reduce_size",
      asset: "ETH",
      title: "Shrink your ETH position",
      why: [
        "A 13.6% drop in ETH would liquidate it.",
        "Holding it costs $385 per day in funding.",
      ],
      riskUsd: at("ETH"),
      invalidatedIf: "Funding on ETH turns negative, so you get paid to hold.",
    },
  ],
};
