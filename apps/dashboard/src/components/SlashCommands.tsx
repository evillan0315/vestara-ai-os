import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

interface Command {
  command: string;
  description: string;
  template: string;
}

const COMMANDS: Command[] = [
  { command: '/test', description: 'Write unit tests for the current code', template: 'Write comprehensive unit tests for ' },
  { command: '/lint', description: 'Lint and fix code issues', template: 'Run linting and fix all issues in ' },
  { command: '/deploy', description: 'Generate deployment configuration', template: 'Create a deployment config for ' },
  { command: '/explain', description: 'Explain the selected code', template: 'Explain how this code works: ' },
  { command: '/refactor', description: 'Refactor code for better patterns', template: 'Refactor this to follow best practices: ' },
  { command: '/docs', description: 'Generate documentation', template: 'Generate documentation for ' },
  { command: '/review', description: 'Review code for issues', template: 'Review this code for bugs and security issues: ' },
  { command: '/optimize', description: 'Optimize performance', template: 'Optimize this code for performance: ' },
];

interface SlashCommandsProps {
  value: string;
  onSelect: (text: string) => void;
  onClose: () => void;
}

export function SlashCommands({ value, onSelect, onClose, }: SlashCommandsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const prefix = value.startsWith('/') ? value.slice(1).toLowerCase() : '';

  const filtered = useMemo(() => {
    if (!prefix) return COMMANDS;
    return COMMANDS.filter((c) => c.command.startsWith('/' + prefix) || c.description.toLowerCase().includes(prefix));
  }, [prefix]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        onSelect(filtered[selectedIndex].template);
        onClose();
      }
      if (e.key === 'Escape') { onClose(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (!value.startsWith('/')) return null;

  return (
    <div ref={ref} className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-64 overflow-auto rounded-lg border border-vestara-glass-border bg-vestara-surface shadow-xl">
      {filtered.length === 0 ? (
        <p className="px-3 py-2 text-xs text-vestara-text-dim">No matching commands</p>
      ) : (
        filtered.map((cmd, i) => (
          <button
            key={cmd.command}
            onClick={() => { onSelect(cmd.template); onClose(); }}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors ${
              i === selectedIndex ? 'bg-vestara-gold/10 text-vestara-gold' : 'text-vestara-text hover:bg-vestara-glass'
            }`}
          >
            <span className="font-mono text-vestara-cyan">{cmd.command}</span>
            <span className="text-vestara-text-dim">{cmd.description}</span>
          </button>
        ))
      )}
    </div>
  );
}
