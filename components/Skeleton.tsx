function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-raised ${className}`} />;
}

export function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Analyzing wallet">
      <Bar className="h-7 w-11/12" />
      <Bar className="mt-3 h-7 w-3/5" />
      <div className="mt-10 flex gap-12">
        <Bar className="h-10 w-32" />
        <Bar className="h-10 w-32" />
      </div>
      <div className="mt-16 space-y-px overflow-hidden rounded-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface px-8 py-7">
            <Bar className="h-4 w-40" />
            <Bar className="mt-4 h-6 w-4/5" />
            <Bar className="mt-6 h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
