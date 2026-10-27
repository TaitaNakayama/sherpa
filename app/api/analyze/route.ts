import { fetchClearinghouse, fetchMarkets } from "@/lib/hyperliquid";
import { getRecommendations } from "@/lib/recommend";
import { buildPositions } from "@/lib/risk";
import type { AnalyzeResponse } from "@/lib/types";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address")?.trim() ?? "";
  if (!ADDRESS.test(address)) {
    return Response.json(
      { error: "That doesn't look like a wallet address. It should start with 0x followed by 40 characters." },
      { status: 400 },
    );
  }

  let state, markets;
  try {
    [state, markets] = await Promise.all([fetchClearinghouse(address), fetchMarkets()]);
  } catch (err) {
    console.error("[analyze] Hyperliquid request failed:", err);
    return Response.json(
      { error: "Couldn't reach Hyperliquid right now. Try again, or turn on demo data." },
      { status: 502 },
    );
  }

  const account = {
    value: Number(state.marginSummary.accountValue),
    marginUsed: Number(state.marginSummary.totalMarginUsed),
  };
  const positions = buildPositions(state, markets);

  if (positions.length === 0) {
    return Response.json({
      account,
      positions,
      summary: "This wallet has no open positions.",
      recommendations: [],
    } satisfies AnalyzeResponse);
  }

  const { summary, recommendations } = await getRecommendations(account, positions);
  return Response.json({ account, positions, summary, recommendations } satisfies AnalyzeResponse);
}
