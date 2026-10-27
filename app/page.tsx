"use client";

import { useRef, useState } from "react";
import { PositionList } from "@/components/PositionList";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Skeleton } from "@/components/Skeleton";
import { DEMO_ADDRESS, DEMO_RESPONSE } from "@/lib/demo";
import { usd } from "@/lib/format";
import type { AnalyzeResponse } from "@/lib/types";

function DemoSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex select-none items-center gap-2.5 rounded-full text-[14px] text-text-secondary transition-colors hover:text-text"
    >
      <span
        aria-hidden
        className={`relative h-[22px] w-9 shrink-0 rounded-full transition-colors duration-200 ${
          on ? "bg-accent" : "bg-surface-raised"
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 ease-out ${
            on ? "translate-x-[14px]" : ""
          }`}
        />
      </span>
      Use demo data
    </button>
  );
}

function AddressForm({
  address,
  setAddress,
  loading,
  onSubmit,
  compact,
}: {
  address: string;
  setAddress: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`flex w-full items-center rounded-full bg-surface ring-1 ring-hairline transition-shadow focus-within:ring-2 focus-within:ring-link ${
        compact ? "h-10 pl-4 pr-1" : "h-14 pl-6 pr-1.5"
      }`}
    >
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Wallet address, 0x…"
        aria-label="Hyperliquid wallet address"
        spellCheck={false}
        autoComplete="off"
        className={`min-w-0 flex-1 bg-transparent text-text placeholder:text-text-tertiary focus:outline-none focus-visible:outline-none ${
          compact ? "text-[14px]" : "text-[17px]"
        }`}
      />
      <button
        type="submit"
        disabled={loading || address.trim() === ""}
        className={`shrink-0 rounded-full bg-accent font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-text-tertiary ${
          compact ? "h-8 px-4 text-[13px]" : "h-11 px-6 text-[15px]"
        }`}
      >
        {loading ? "Analyzing…" : "Analyze"}
      </button>
    </form>
  );
}

function Results({ data }: { data: AnalyzeResponse }) {
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const visible = data.recommendations.map((rec, i) => ({ rec, i })).filter(({ i }) => !skipped.has(i));

  return (
    <div className="animate-rise">
      <section aria-label="Account summary">
        <p className="text-[26px] font-semibold leading-[1.25] tracking-[-0.015em] text-balance sm:text-[32px]">
          {data.summary}
        </p>
        <dl className="mt-10 grid grid-cols-2 gap-8 sm:flex sm:gap-16">
          <div>
            <dt className="text-[14px] text-text-tertiary">Account value</dt>
            <dd className="mt-1 text-[24px] font-semibold tabular-nums">{usd(data.account.value)}</dd>
          </div>
          <div>
            <dt className="text-[14px] text-text-tertiary">Margin in use</dt>
            <dd className="mt-1 text-[24px] font-semibold tabular-nums">{usd(data.account.marginUsed)}</dd>
          </div>
        </dl>
        <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-text-tertiary">
          Margin is the money set aside to keep your bets open. If losses eat through it, the exchange closes
          positions for you. That is called liquidation.
        </p>
      </section>

      {data.positions.length === 0 ? (
        <p className="mt-16 text-[17px] text-text-secondary">
          Nothing to analyze. Try another wallet, or turn on demo data.
        </p>
      ) : (
        <>
          <section className="mt-20" aria-labelledby="positions-heading">
            <h2 id="positions-heading" className="text-[24px] font-semibold tracking-[-0.01em]">
              Your positions
            </h2>
            <p className="mt-1 mb-6 text-[15px] text-text-tertiary">Riskiest first.</p>
            <PositionList positions={data.positions} />
          </section>

          <section className="mt-20" aria-labelledby="recs-heading">
            <h2 id="recs-heading" className="text-[24px] font-semibold tracking-[-0.01em]">
              What you could do
            </h2>
            <p className="mt-1 mb-6 text-[15px] text-text-tertiary">
              Approving only simulates an order. Nothing is ever sent.
            </p>
            {visible.length === 0 ? (
              <p className="rounded-[22px] bg-surface px-8 py-7 text-[17px] text-text-secondary">
                All caught up. You&apos;ve reviewed every suggestion.
              </p>
            ) : (
              <div className="space-y-4">
                {visible.map(({ rec, i }) => (
                  <RecommendationCard
                    key={i}
                    rec={rec}
                    onSkip={() => setSkipped((s) => new Set(s).add(i))}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [address, setAddress] = useState("");
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const latest = useRef(0);

  async function analyze(useDemo = demo) {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    setData(null);

    let result: AnalyzeResponse | null = null;
    let message: string | null = null;
    if (useDemo) {
      await new Promise((r) => setTimeout(r, 600));
      result = DEMO_RESPONSE;
    } else {
      try {
        const res = await fetch(`/api/analyze?address=${encodeURIComponent(address.trim())}`);
        const body = await res.json();
        if (res.ok) result = body;
        else message = body.error ?? "Something went wrong. Try again.";
      } catch {
        message = "Couldn't reach the server. Turn on demo data to keep going.";
      }
    }

    if (id !== latest.current) return;
    setData(result);
    setError(message);
    setRunId(id);
    setLoading(false);
  }

  function toggleDemo(on: boolean) {
    setDemo(on);
    if (on) {
      setAddress(DEMO_ADDRESS);
      analyze(true);
    }
  }

  const compact = loading || data !== null;
  const form = (
    <AddressForm
      address={address}
      setAddress={setAddress}
      loading={loading}
      onSubmit={() => analyze()}
      compact={compact}
    />
  );
  const errorLine = error && (
    <p role="alert" className="mt-4 flex items-center gap-2 text-[15px] text-red">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {error}
    </p>
  );

  if (!compact) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center px-4 pb-[12vh]">
        <p className="absolute top-0 left-0 px-4 py-4 text-[17px] font-semibold sm:px-8">Sherpa</p>
        <div className="w-full max-w-[820px] text-center">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-[72px]">
            <span className="block">Know your risk.</span>
            <span className="block text-balance text-text-tertiary">Before the market does.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[34ch] text-[19px] leading-relaxed text-text-secondary sm:text-[21px]">
            Paste a Hyperliquid wallet. See what could go wrong, in plain English.
          </p>
          <div className="mx-auto mt-10 max-w-[560px] text-left">
            {form}
            {errorLine}
          </div>
          <div className="mt-6 flex justify-center">
            <DemoSwitch on={demo} onChange={toggleDemo} />
          </div>
        </div>
        <p className="absolute bottom-6 px-4 text-center text-[12px] text-text-tertiary">
          Reads public data only. Never asks for private keys. Never places real orders.
        </p>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-hairline bg-black/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              latest.current++;
              setData(null);
              setLoading(false);
              setError(null);
            }}
            className="text-[17px] font-semibold"
          >
            Sherpa
          </button>
          <div className="order-last w-full sm:order-none sm:flex-1">{form}</div>
          <div className="ml-auto sm:ml-0">
            <DemoSwitch on={demo} onChange={toggleDemo} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pt-14 pb-24 sm:pt-20">
        {errorLine}
        {loading ? <Skeleton /> : data && <Results key={runId} data={data} />}
        <p className="mt-24 text-center text-[12px] text-text-tertiary">
          Reads public data only. Never asks for private keys. Never places real orders.
        </p>
      </main>
    </>
  );
}
