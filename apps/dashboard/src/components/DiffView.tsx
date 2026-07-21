import { useMemo, useState } from 'react';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffBlock {
  fileName?: string;
  lines: DiffLine[];
}

function parseDiffBlocks(content: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  const diffRegex = /```diff\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = diffRegex.exec(content)) !== null) {
    const diffText = match[1];
    const lines = diffText.split('\n');
    const block: DiffBlock = { lines: [] };

    for (const line of lines) {
      if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        block.fileName = line.replace(/^[+-]{3} /, '').replace(/^[ab]\//, '');
        block.lines.push({ type: 'header', content: line });
      } else if (line.startsWith('@@')) {
        block.lines.push({ type: 'header', content: line });
      } else if (line.startsWith('+')) {
        block.lines.push({ type: 'add', content: line });
      } else if (line.startsWith('-')) {
        block.lines.push({ type: 'remove', content: line });
      } else {
        block.lines.push({ type: 'context', content: line });
      }
    }

    if (block.lines.length > 0) {
      blocks.push(block);
    }
  }

  return blocks;
}

interface DiffViewProps {
  content: string;
}

export function DiffView({ content }: DiffViewProps) {
  const blocks = useMemo(() => parseDiffBlocks(content), [content]);
  const [viewMode, setViewMode] = useState<'inline' | 'split'>('inline');

  if (blocks.length === 0) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const splitLines = useMemo(() => {
    if (viewMode !== 'split') return [];
    return blocks.flatMap((b) => b.lines);
  }, [blocks, viewMode]);

  const renderLine = (line: DiffLine, idx: number) => {
    const bg =
      line.type === 'add' ? 'bg-green-500/10' :
      line.type === 'remove' ? 'bg-red-500/10' : '';

    const prefix =
      line.type === 'add' ? '+' :
      line.type === 'remove' ? '-' : ' ';

    const lineCls =
      line.type === 'add' ? 'text-green-400' :
      line.type === 'remove' ? 'text-red-400' :
      line.type === 'header' ? 'text-vestara-cyan' :
      'text-vestara-text-dim';

    return (
      <div key={idx} className={`flex font-mono text-xs leading-relaxed ${bg}`}>
        <span className="w-8 shrink-0 text-right text-vestara-text-dim/40 select-none">
          {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
        </span>
        <span className={`flex-1 whitespace-pre ${lineCls}`}>{line.content}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setViewMode('inline')}
          className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
            viewMode === 'inline'
              ? 'bg-vestara-gold/20 text-vestara-gold'
              : 'text-vestara-text-dim hover:text-vestara-text'
          }`}
        >
          Inline
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
            viewMode === 'split'
              ? 'bg-vestara-gold/20 text-vestara-gold'
              : 'text-vestara-text-dim hover:text-vestara-text'
          }`}
        >
          Split
        </button>
      </div>

      {blocks.map((block, bi) => (
        <div key={bi} className="overflow-hidden rounded-lg border border-vestara-glass-border">
          {block.fileName && (
            <div className="border-b border-vestara-glass-border bg-vestara-bg px-3 py-1 text-[10px] font-medium text-vestara-text-dim">
              {block.fileName}
            </div>
          )}
          <div className="overflow-x-auto p-2">
            {block.lines.map((line, li) => renderLine(line, li))}
          </div>
        </div>
      ))}
    </div>
  );
}
