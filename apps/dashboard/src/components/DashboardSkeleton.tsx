export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-vestara-glass" />
          <div className="h-3 w-32 rounded bg-vestara-glass/50" />
        </div>
        <div className="h-8 w-8 rounded-lg bg-vestara-glass" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass p-4">
            <div className="h-3 w-12 rounded bg-vestara-glass mb-2" />
            <div className="h-7 w-20 rounded bg-vestara-glass/50 mb-1" />
            <div className="h-3 w-24 rounded bg-vestara-glass/50" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass p-4 lg:col-span-2">
          <div className="h-4 w-24 bg-vestara-glass rounded mb-3" />
          <div className="h-48 rounded bg-vestara-glass/30" />
        </div>
        <div className="glass p-4">
          <div className="h-4 w-24 bg-vestara-glass rounded mb-3" />
          <div className="h-48 rounded bg-vestara-glass/30" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass p-4">
            <div className="h-4 w-20 bg-vestara-glass rounded mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-vestara-glass/50" />
              <div className="h-3 w-2/3 rounded bg-vestara-glass/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
