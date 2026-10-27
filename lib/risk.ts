import type { ClearinghouseState, Market } from "./hyperliquid";
import type { Position } from "./types";

// All risk math lives here, never in the LLM.

export function liqDistancePct(markPrice: number, liqPrice: number | null) {
  if (liqPrice === null || !(markPrice > 0)) return null;
  return (Math.abs(markPrice - liqPrice) / markPrice) * 100;
}

// Positive hourly funding means longs pay shorts. A positive result means the user pays.
export function fundingPerDayUsd(
  positionValueUsd: number,
  hourlyFundingRate: number,
  side: "long" | "short",
) {
  const sign = side === "long" ? 1 : -1;
  return positionValueUsd * hourlyFundingRate * 24 * sign;
}

export function concentrationPct(positionValueUsd: number, accountValue: number) {
  if (!(accountValue > 0)) return 0;
  return (positionValueUsd / accountValue) * 100;
}

// Dollars lost if price moves to the liquidation price. Without one, the position's margin.
export function riskUsd(position: Position) {
  if (position.liqDistancePct === null) {
    return position.leverage > 0 ? position.sizeUsd / position.leverage : position.sizeUsd;
  }
  return (position.sizeUsd * position.liqDistancePct) / 100;
}

export function buildPositions(
  state: ClearinghouseState,
  markets: Map<string, Market>,
): Position[] {
  const accountValue = Number(state.marginSummary.accountValue);

  return state.assetPositions.map(({ position: p }) => {
    const size = Number(p.szi);
    const side = size < 0 ? "short" : "long";
    const sizeUsd = Number(p.positionValue);
    const market = markets.get(p.coin);
    const markPrice = market?.markPx ?? (size !== 0 ? sizeUsd / Math.abs(size) : 0);
    const liqPrice = p.liquidationPx === null ? null : Number(p.liquidationPx);

    return {
      asset: p.coin,
      side,
      sizeUsd,
      leverage: p.leverage.value,
      entry: Number(p.entryPx),
      markPrice,
      liqPrice,
      liqDistancePct: liqDistancePct(markPrice, liqPrice),
      pnlUsd: Number(p.unrealizedPnl),
      fundingPerDayUsd: fundingPerDayUsd(sizeUsd, market?.hourlyFunding ?? 0, side),
      concentrationPct: concentrationPct(sizeUsd, accountValue),
    };
  });
}
