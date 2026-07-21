import { useMemo, useState, useCallback } from 'react';

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [code]);

  const handleApplyDiff = useCallback(() => {
    window.dispatchEvent(new CustomEvent('opencode:apply-code', { detail: { language, code } }));
  }, [language, code]);

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-lg border border-vestara-glass-border bg-vestara-bg">
      <div className="flex items-center justify-between border-b border-vestara-glass-border px-4 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-vestara-text-dim">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
          <button onClick={handleApplyDiff}
            className="rounded px-2 py-0.5 text-[10px] text-vestara-cyan hover:bg-vestara-cyan/10 transition-colors"
            title="Apply as edit">
            Apply
          </button>
          <button onClick={handleCopy}
            className="rounded px-2 py-0.5 text-[10px] text-vestara-text-dim hover:bg-vestara-glass hover:text-vestara-text transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-vestara-text">{code}</code>
      </pre>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-vestara-glass text-vestara-cyan px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-vestara-text font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="text-vestara-text">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-vestara-blue underline hover:text-vestara-cyan">$1</a>');
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const segments = useMemo(() => {
    const parts: Array<{ type: 'code' | 'text'; language?: string; code?: string; html?: string }> = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const text = content.slice(lastIndex, match.index);
        parts.push({ type: 'text', html: renderInlineMarkdown(escapeHtml(text)) });
      }
      parts.push({ type: 'code', language: match[1] || '', code: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      const text = content.slice(lastIndex);
      parts.push({ type: 'text', html: renderInlineMarkdown(escapeHtml(text)) });
    }

    return parts;
  }, [content]);

  return (
    <div className="prose prose-invert max-w-none">
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} language={seg.language || ''} code={seg.code || ''} />
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: seg.html || '' }} />
        ),
      )}
    </div>
  );
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
