// Hyperliquid public info API. Every numeric field comes back as a string.
const INFO_URL = "https://api.hyperliquid.xyz/info";

export interface RawPosition {
  coin: string;
  szi: string;
  leverage: { type: "cross" | "isolated"; value: number };
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  liquidationPx: string | null;
  marginUsed: string;
}

export interface ClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  assetPositions: { type: string; position: RawPosition }[];
}

type MetaAndAssetCtxs = [
  { universe: { name: string }[] },
  { funding: string; markPx: string }[],
];

export interface Market {
  markPx: number;
  hourlyFunding: number;
}

async function postInfo<T>(body: object): Promise<T> {
  const res = await fetch(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export function fetchClearinghouse(user: string) {
  return postInfo<ClearinghouseState>({ type: "clearinghouseState", user });
}

// universe[i] and ctxs[i] describe the same asset, so join them by index.
export async function fetchMarkets(): Promise<Map<string, Market>> {
  const [meta, ctxs] = await postInfo<MetaAndAssetCtxs>({
    type: "metaAndAssetCtxs",
  });
  const markets = new Map<string, Market>();
  meta.universe.forEach((asset, i) => {
    const ctx = ctxs[i];
    if (!ctx) return;
    markets.set(asset.name, {
      markPx: Number(ctx.markPx),
      hourlyFunding: Number(ctx.funding),
    });
  });
  return markets;
}
