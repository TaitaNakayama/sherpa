import { compactUsd, pct, price, share, usd } from "@/lib/format";
import type { Position } from "@/lib/types";

type Level = { label: string; color: string; bg: string };

function riskLevel(p: Position): Level {
  const d = p.liqDistancePct;
  if (d === null) return { label: "No liquidation price", color: "text-text-secondary", bg: "bg-white/[0.06]" };
  if (d < 15) return { label: "High risk", color: "text-red", bg: "bg-red/[0.14]" };
  if (d < 30) return { label: "Watch", color: "text-amber", bg: "bg-amber/[0.14]" };
  return { label: "Comfortable", color: "text-green", bg: "bg-green/[0.14]" };
}

function liquidationLine(p: Position) {
  if (p.liqDistancePct === null) return "This position has no liquidation price.";
  const move = p.side === "long" ? "drop" : "rise";
  return `A ${pct(p.liqDistancePct)} ${move} liquidates this position.`;
}

function fundingLine(p: Position) {
  const f = p.fundingPerDayUsd;
  if (Math.abs(f) < 0.01) return "Funding costs less than a cent a day.";
  return f > 0 ? `Costs ${usd(f)}/day in funding.` : `Earns ${usd(f * -1)}/day in funding.`;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-text-tertiary">{label}</dt>
      <dd className={`mt-1 text-[15px] tabular-nums ${tone ?? "text-text"}`}>{value}</dd>
    </div>
  );
}

export function PositionList({ positions }: { positions: Position[] }) {
  const sorted = [...positions].sort(
    (a, b) => (a.liqDistancePct ?? Infinity) - (b.liqDistancePct ?? Infinity),
  );

  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-[22px] bg-surface">
      {sorted.map((p) => {
        const level = riskLevel(p);
        return (
          <li key={p.asset} className="px-6 py-7 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[17px] font-semibold">
                {p.asset}
                <span className="font-normal text-text-secondary">
                  {" "}
                  · {p.side === "long" ? "Long" : "Short"} · {p.leverage}× leverage
                </span>
              </h3>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${level.color} ${level.bg}`}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {level.label}
              </span>
            </div>

            <p className="mt-3 text-[21px] font-semibold leading-snug tracking-[-0.01em] text-balance sm:text-[24px]">
              {liquidationLine(p)}
              <span className="block text-text-tertiary">{fundingLine(p)}</span>
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat label="Position size" value={compactUsd(p.sizeUsd)} />
              <Stat label="Bought at → now" value={`${price(p.entry)} → ${price(p.markPrice)}`} />
              <Stat
                label="Profit or loss"
                value={usd(p.pnlUsd, { sign: true })}
                tone={p.pnlUsd >= 0 ? "text-green" : "text-red"}
              />
              <Stat label="Size vs. account" value={share(p.concentrationPct)} />
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
