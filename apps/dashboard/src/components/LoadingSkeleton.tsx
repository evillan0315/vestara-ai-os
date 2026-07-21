export function MessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[80%] animate-pulse">
        <div className="glass-sm space-y-2 rounded-lg px-4 py-3">
          <div className="h-3 w-3/4 rounded bg-vestara-glass" />
          <div className="h-3 w-1/2 rounded bg-vestara-glass" />
          <div className="h-3 w-2/3 rounded bg-vestara-glass" />
        </div>
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-1.5 rounded-lg px-3 py-2.5">
          <div className="h-3 w-2/3 rounded bg-vestara-glass" />
          <div className="h-2 w-1/3 rounded bg-vestara-glass/50" />
        </div>
      ))}
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-lg p-3 md:p-4 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-vestara-glass mb-2" />
          <div className="h-3 w-1/2 rounded bg-vestara-glass/50" />
        </div>
      ))}
    </div>
  );
}

export function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-lg p-3 md:p-4 animate-pulse">
          <div className="h-3 w-1/2 rounded bg-vestara-glass mb-2" />
          <div className="h-6 w-1/3 rounded bg-vestara-glass/50" />
        </div>
      ))}
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-sm rounded-lg p-3 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-vestara-glass mb-1" />
          <div className="h-3 w-1/3 rounded bg-vestara-glass/50" />
        </div>
      ))}
    </div>
  );
}
