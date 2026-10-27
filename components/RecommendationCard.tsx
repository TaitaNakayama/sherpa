"use client";

import { useState } from "react";
import { usd } from "@/lib/format";
import type { Recommendation } from "@/lib/types";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10.2l2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RecommendationCard({ rec, onSkip }: { rec: Recommendation; onSkip: () => void }) {
  const [approved, setApproved] = useState(false);
  const [leaving, setLeaving] = useState(false);

  function skip() {
    setLeaving(true);
    setTimeout(onSkip, 220);
  }

  return (
    <article
      className={`rounded-[22px] bg-surface px-6 py-7 transition-[opacity,transform] duration-200 ease-out sm:px-8 ${
        leaving ? "scale-[0.98] opacity-0" : ""
      }`}
    >
      <h3 className="text-[21px] font-semibold leading-snug tracking-[-0.01em]">{rec.title}</h3>

      <ul className="mt-4 space-y-2">
        {rec.why.map((line) => (
          <li key={line} className="flex gap-3 text-[17px] leading-relaxed text-text-secondary">
            <span className="mt-[11px] size-1 shrink-0 rounded-full bg-text-tertiary" aria-hidden />
            {line}
          </li>
        ))}
      </ul>

      <dl className="mt-6 grid gap-4 border-t border-hairline pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-[12px] text-text-tertiary">At stake</dt>
          <dd className="mt-1 text-[15px]">
            <span className="tabular-nums">{usd(rec.riskUsd)}</span>
            <span className="text-text-secondary"> if the price reaches liquidation</span>
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-text-tertiary">This advice no longer applies if</dt>
          <dd className="mt-1 text-[15px] text-text-secondary">{rec.invalidatedIf}</dd>
        </div>
      </dl>

      <div className="mt-6 flex min-h-11 items-center justify-end gap-2">
        {approved ? (
          <p role="status" className="flex w-full items-center gap-2.5 text-[15px] text-green">
            <CheckIcon />
            Simulated: order would be sent for your approval on testnet.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={skip}
              className="h-11 rounded-full px-5 text-[15px] text-link transition-colors hover:bg-white/[0.06]"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => setApproved(true)}
              className="h-11 rounded-full bg-accent px-6 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent/90"
            >
              Approve
            </button>
          </>
        )}
      </div>
    </article>
  );
}
