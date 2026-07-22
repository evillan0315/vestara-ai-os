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

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="widget-enter">
        <h1 className="text-2xl font-bold text-vestara-text">Settings</h1>
        <p className="text-sm text-vestara-text-muted">Loading configuration...</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-vestara-glass animate-pulse" />
              <div className="h-4 w-32 rounded bg-vestara-glass animate-pulse" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="h-3 w-24 rounded bg-vestara-glass animate-pulse" />
                  <div className="h-5 w-12 rounded-full bg-vestara-glass animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded bg-vestara-glass animate-pulse" />
          <div className="h-4 w-48 rounded bg-vestara-glass/50 animate-pulse" />
        </div>
        <div className="h-10 w-24 rounded-lg bg-vestara-glass animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-vestara-glass animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 rounded bg-vestara-glass animate-pulse" />
                <div className="h-3 w-24 rounded bg-vestara-glass/50 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-2 w-full rounded-full bg-vestara-glass animate-pulse" />
              <div className="flex gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-6 w-16 rounded-full bg-vestara-glass animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="widget-enter">
        <h1 className="text-2xl font-bold text-vestara-text">Dashboard</h1>
        <p className="text-sm text-vestara-text-muted">Loading system statistics...</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-4">
            <div className="h-3 w-16 rounded bg-vestara-glass mb-3 animate-pulse" />
            <div className="h-6 w-20 rounded bg-vestara-glass/50 animate-pulse" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-5">
            <div className="h-4 w-24 rounded bg-vestara-glass mb-4 animate-pulse" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-3 w-20 rounded bg-vestara-glass animate-pulse" />
                  <div className="h-3 w-12 rounded bg-vestara-glass/50 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="glass rounded-lg p-5">
          <div className="h-4 w-24 rounded bg-vestara-glass mb-4 animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-vestara-glass animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 rounded bg-vestara-glass animate-pulse" />
                  <div className="h-2 w-16 rounded bg-vestara-glass/50 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
