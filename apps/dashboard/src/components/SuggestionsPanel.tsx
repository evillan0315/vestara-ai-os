import { useMemo } from 'react';

interface SuggestionGroup {
  title: string;
  prompts: string[];
}

const DEFAULT_GROUPS: SuggestionGroup[] = [
  {
    title: 'Explore',
    prompts: [
      'Explain this codebase',
      'Summarize the project architecture',
      'List all API endpoints',
    ],
  },
  {
    title: 'Develop',
    prompts: [
      'Write a REST API',
      'Create a React component',
      'Add TypeScript types',
    ],
  },
  {
    title: 'Debug',
    prompts: [
      'Fix the failing test',
      'Find potential bugs',
      'Review security issues',
    ],
  },
  {
    title: 'Refactor',
    prompts: [
      'Refactor auth module',
      'Optimize database queries',
      'Extract utility functions',
    ],
  },
];

const PROJECT_GROUPS: SuggestionGroup[] = [
  {
    title: 'Project',
    prompts: [
      'Analyze this project\'s structure',
      'Generate documentation',
      'Suggest improvements for this project',
    ],
  },
  {
    title: 'Test',
    prompts: [
      'Write unit tests',
      'Add integration tests',
      'Check test coverage',
    ],
  },
];

interface SuggestionsPanelProps {
  onSelect: (prompt: string) => void;
  hasProject?: boolean;
  projectName?: string;
}

export function SuggestionsPanel({ onSelect, hasProject, projectName }: SuggestionsPanelProps) {
  const groups = useMemo(() => {
    const result = [...DEFAULT_GROUPS];
    if (hasProject) {
      result.unshift(...PROJECT_GROUPS);
    }
    return result;
  }, [hasProject]);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-vestara-glass-border bg-vestara-glass px-4 py-1.5">
          <span className="text-base">⚡</span>
          <span className="text-xs font-medium text-vestara-text-muted">OpenCode AI Agent</span>
        </div>
        <p className="mt-3 text-lg text-vestara-text-muted">
          Ask me to write code, refactor, debug, or explain anything.
        </p>
        {hasProject && projectName && (
          <p className="mt-1 text-sm text-vestara-gold">
            Active project: {projectName}
          </p>
        )}
        <div className="mt-8 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-vestara-text-dim">
                {group.title}
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {group.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => onSelect(prompt)}
                    className="glass-sm group relative overflow-hidden rounded-lg px-4 py-2.5 text-xs text-vestara-text-muted transition-all hover:text-vestara-text"
                  >
                    <span className="relative z-10">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
