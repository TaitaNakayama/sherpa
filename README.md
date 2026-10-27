# Sherpa

A risk copilot for Hyperliquid perps. Paste a wallet address and Sherpa shows each open position's risk in plain English, plus 2–3 AI suggestions you can approve or skip. Approving is simulated only: Sherpa never places orders and never touches private keys.

## Run it

```bash
npm install
cp .env.example .env.local   # then paste your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

`ANTHROPIC_MODEL` is optional and defaults to `claude-haiku-5-5`.

## Demo tips

- **Use demo data** (the switch under the address field) loads a frozen snapshot of a real wallet. It makes no network calls, so it works offline.
- Live wallet with risky positions at the time of writing: `0xaa57ef244c09de1a28437f3e05f208e87c938566`. Positions change, so check it before you present.
- To find another wallet, pick an address from `https://stats-data.hyperliquid.xyz/Mainnet/leaderboard` (a large JSON file). Many top accounts hold no perps, so try a few.

## How it works

`GET /api/analyze?address=0x…` (`app/api/analyze/route.ts`) does the following:

1. Fetches `clearinghouseState` (positions) and `metaAndAssetCtxs` (mark prices, hourly funding) from `https://api.hyperliquid.xyz/info`.
2. Computes the risk numbers in plain TypeScript (`lib/risk.ts`):
   - liquidation distance
   - funding per day, where positive means you pay
   - position size relative to account value
   - dollars at stake if price reaches liquidation
3. Asks Claude for a two-sentence summary and 2–3 recommendations as schema-validated JSON (`lib/recommend.ts`).
4. Validates the recommendations in code. It drops any that name an asset you don't hold or suggest leverage above 5×.
5. Falls back to rule-based recommendations if the AI call fails or nothing survives validation. The app still works without a valid key.

The AI is never asked to calculate anything. Every dollar figure on the page is computed in code.
