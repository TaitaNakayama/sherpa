export function usd(n: number, opts: { sign?: boolean } = {}) {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : 2;
  const s = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (n < 0) return `−${s}`;
  return opts.sign && n > 0 ? `+${s}` : s;
}

export function price(n: number) {
  if (n < 1) return `$${n.toPrecision(4)}`;
  const digits = n >= 1000 ? 0 : 2;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(n: number) {
  return `${n < 100 ? n.toFixed(1) : Math.round(n)}%`;
}

// Leveraged positions are often several times the account, so say "6.1× your account".
export function share(concentrationPct: number) {
  if (concentrationPct >= 100) return `${(concentrationPct / 100).toFixed(1)}× your account`;
  return `${pct(concentrationPct)} of your account`;
}

export function compactUsd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  });
}
