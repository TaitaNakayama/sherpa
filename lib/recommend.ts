import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { pct, usd } from "./format";
import { riskUsd } from "./risk";
import { ACTIONS, type Position, type Recommendation } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_LEVERAGE = 5;

const LlmOutput = z.object({
  summary: z.string(),
  recommendations: z.array(
    z.object({
      action: z.enum(ACTIONS),
      asset: z.string(),
      title: z.string(),
      why: z.array(z.string()),
      targetLeverage: z.number().nullable(),
      invalidatedIf: z.string(),
    }),
  ),
});
type LlmRecommendation = z.infer<typeof LlmOutput>["recommendations"][number];

const SYSTEM = `You are a risk copilot for Hyperliquid perpetual futures traders. Your reader has never traded perps, so write in plain, calm English with no jargon (say "borrowed money" rather than "margin" where you can).

You receive an account and its open positions with risk numbers that were already computed. Return:
- summary: exactly two short sentences about the account's overall health.
- recommendations: 2 or 3 recommendations about the existing positions, most urgent first.

Rules:
- Only quote numbers that appear in the input, formatted as given. Never compute or invent new numbers.
- asset must be one of the input assets, spelled exactly the same.
- action must be one of: reduce_leverage, add_stop_loss, reduce_size, close_position, hold.
- targetLeverage: for reduce_leverage, a whole number from 1 to 5; otherwise null. Never suggest leverage above 5x.
- why: 2 or 3 short bullet sentences.
- invalidatedIf: one short sentence describing what would make this advice no longer apply.
- title: an imperative under 8 words, e.g. "Lower your BTC leverage".`;

function describe(account: { value: number; marginUsed: number }, positions: Position[]) {
  return JSON.stringify(
    {
      account: { value: usd(account.value), marginUsed: usd(account.marginUsed) },
      positions: positions.map((p) => ({
        asset: p.asset,
        side: p.side,
        size: usd(p.sizeUsd),
        leverage: `${p.leverage}x`,
        entryPrice: p.entry,
        currentPrice: p.markPrice,
        liquidationPrice: p.liqPrice ?? "none",
        priceMoveToLiquidation: p.liqDistancePct === null ? "none" : pct(p.liqDistancePct),
        unrealizedPnl: usd(p.pnlUsd),
        fundingPerDay: `${usd(Math.abs(p.fundingPerDayUsd))} ${p.fundingPerDayUsd >= 0 ? "paid" : "earned"}`,
        shareOfAccount: pct(p.concentrationPct),
        lossIfLiquidated: usd(riskUsd(p)),
      })),
    },
    null,
    2,
  );
}

// Any "N×" above 5 that isn't the position's current leverage counts as suggesting it.
function suggestsHighLeverage(rec: LlmRecommendation, current: number) {
  if (rec.targetLeverage !== null && rec.targetLeverage > MAX_LEVERAGE) return true;
  const text = [rec.title, ...rec.why, rec.invalidatedIf].join(" ");
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*[x×]/gi)) {
    const n = Number(m[1]);
    if (n > MAX_LEVERAGE && n !== current) return true;
  }
  return false;
}

export function validate(recs: LlmRecommendation[], positions: Position[]): Recommendation[] {
  const byAsset = new Map(positions.map((p) => [p.asset, p]));
  return recs
    .filter((r) => {
      const p = byAsset.get(r.asset);
      return p !== undefined && !suggestsHighLeverage(r, p.leverage);
    })
    .slice(0, 3)
    .map((r) => ({
      action: r.action,
      asset: r.asset,
      title: r.title,
      why: r.why,
      riskUsd: riskUsd(byAsset.get(r.asset)!),
      invalidatedIf: r.invalidatedIf,
    }));
}

function riskiestFirst(positions: Position[]) {
  return [...positions].sort(
    (a, b) => (a.liqDistancePct ?? Infinity) - (b.liqDistancePct ?? Infinity),
  );
}

export function ruleBasedRecommendations(
  account: { value: number },
  positions: Position[],
): Recommendation[] {
  const recs: Recommendation[] = [];
  const drop = (p: Position) => (p.side === "long" ? "drop" : "rise");

  // Each action is used at most once so the fallback doesn't repeat the same advice.
  const used = (action: Recommendation["action"]) => recs.some((r) => r.action === action);

  for (const p of riskiestFirst(positions)) {
    const d = p.liqDistancePct;
    if (d !== null && d < 15 && !used("reduce_leverage")) {
      recs.push({
        action: "reduce_leverage",
        asset: p.asset,
        title: `Lower your ${p.asset} leverage`,
        why: [
          `A ${pct(d)} price ${drop(p)} would liquidate this position.`,
          `You are using ${p.leverage}x leverage. Going to ${MAX_LEVERAGE}x or less gives the price much more room.`,
        ],
        riskUsd: riskUsd(p),
        invalidatedIf: `The ${p.asset} price moves away from your liquidation price.`,
      });
    } else if (d !== null && d < 30 && !used("add_stop_loss")) {
      recs.push({
        action: "add_stop_loss",
        asset: p.asset,
        title: `Add a stop-loss on ${p.asset}`,
        why: [
          `A ${pct(d)} price ${drop(p)} would liquidate this position.`,
          "A stop-loss closes it automatically before that happens, limiting the damage.",
        ],
        riskUsd: riskUsd(p),
        invalidatedIf: `You close or shrink the ${p.asset} position.`,
      });
    } else if (p.fundingPerDayUsd > account.value * 0.001 && !used("reduce_size")) {
      recs.push({
        action: "reduce_size",
        asset: p.asset,
        title: `Shrink your ${p.asset} position`,
        why: [
          `Holding this position costs ${usd(p.fundingPerDayUsd)} per day in funding.`,
          "A smaller position costs proportionally less to keep open.",
        ],
        riskUsd: riskUsd(p),
        invalidatedIf: "Funding turns negative and you start getting paid to hold.",
      });
    }
  }

  if (recs.length === 0 && positions.length > 0) {
    const largest = [...positions].sort((a, b) => b.sizeUsd - a.sizeUsd)[0];
    recs.push({
      action: "hold",
      asset: largest.asset,
      title: `Keep ${largest.asset} as it is`,
      why: [
        largest.liqDistancePct === null
          ? "This position has no liquidation price right now."
          : `The price would need to move ${pct(largest.liqDistancePct)} before liquidation.`,
        "Nothing here needs urgent attention.",
      ],
      riskUsd: riskUsd(largest),
      invalidatedIf: "You add leverage or the price moves sharply against you.",
    });
  }
  return recs.slice(0, 3);
}

export function fallbackSummary(positions: Position[]) {
  const worst = riskiestFirst(positions)[0];
  if (!worst || worst.liqDistancePct === null) {
    return `You have ${positions.length} open position${positions.length === 1 ? "" : "s"}. None of them is close to a liquidation price right now.`;
  }
  const mood = worst.liqDistancePct < 15 ? "Your account is under pressure." : "Your account looks stable for now.";
  return `${mood} Your riskiest position is ${worst.asset}, which is ${pct(worst.liqDistancePct)} away from liquidation.`;
}

export async function getRecommendations(
  account: { value: number; marginUsed: number },
  positions: Position[],
): Promise<{ summary: string; recommendations: Recommendation[] }> {
  const fallback = () => ({
    summary: fallbackSummary(positions),
    recommendations: ruleBasedRecommendations(account, positions),
  });

  try {
    const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: describe(account, positions) }],
      output_config: { effort: "low", format: zodOutputFormat(LlmOutput) },
    });

    const parsed = response.parsed_output;
    if (response.stop_reason === "refusal" || !parsed) {
      console.warn(`[analyze] LLM returned nothing usable (stop_reason=${response.stop_reason})`);
      return fallback();
    }
    const recommendations = validate(parsed.recommendations, positions);
    if (recommendations.length === 0) {
      console.warn("[analyze] every LLM recommendation failed validation");
      return fallback();
    }
    return { summary: parsed.summary, recommendations };
  } catch (err) {
    console.warn("[analyze] LLM call failed, using rule-based recommendations:", err);
    return fallback();
  }
}
