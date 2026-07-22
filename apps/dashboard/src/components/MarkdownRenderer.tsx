import { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  code: string;
  inline?: boolean;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  const handleApplyDiff = useCallback(() => {
    window.dispatchEvent(new CustomEvent('opencode:apply-code', { detail: { language, code } }));
  }, [language, code]);

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-lg border border-vestara-glass-border bg-[#282c34]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            {language || 'code'}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
          <button onClick={handleApplyDiff}
            className="rounded px-2 py-0.5 text-[11px] text-vestara-cyan hover:bg-white/10 transition-colors"
            title="Apply as edit">
            Apply
          </button>
          <button onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            {copied ? (
              <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>Copied</>
            ) : (
              <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>
            )}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, padding: '1rem', background: '#282c34', fontSize: '0.8125rem', lineHeight: 1.6 }}
        showLineNumbers={code.split('\n').length > 1}
        lineNumberStyle={{ color: '#636d83', fontSize: '0.75rem', minWidth: '2.5em', paddingRight: '1em', userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', marginRight: '1em' }}
        wrapLines
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            if (match) {
              return <CodeBlock language={match[1]} code={codeString} />;
            }
            if (!match && typeof children === 'string' && !children.includes('\n')) {
              return (
                <code className="bg-[#282c34] text-[#e5c07b] px-1.5 py-0.5 rounded text-[0.8125em] font-mono border border-white/10" {...props}>
                  {children}
                </code>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          },
          pre({ children }) {
            return <>{children}</>;
          },
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-vestara-blue underline decoration-blue-500/30 hover:decoration-blue-500/60 hover:text-blue-400 transition-colors" {...props}>
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-lg border border-vestara-glass-border">
                <table className="min-w-full divide-y divide-vestara-glass-border text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-white/5">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-4 py-2 text-left font-semibold text-vestara-text text-xs uppercase tracking-wider">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2 text-vestara-text-muted border-t border-vestara-glass-border">{children}</td>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 border-l-[3px] border-vestara-gold/50 bg-vestara-gold/5 pl-4 py-1 pr-4 rounded-r-lg text-vestara-text-muted">
                {children}
              </blockquote>
            );
          },
          ul({ children, ...props }) {
            return <ul className="my-2 list-disc pl-6 space-y-1 text-vestara-text" {...props}>{children}</ul>;
          },
          ol({ children, ...props }) {
            return <ol className="my-2 list-decimal pl-6 space-y-1 text-vestara-text" {...props}>{children}</ol>;
          },
          li({ children, ...props }) {
            return <li className="leading-relaxed" {...props}>{children}</li>;
          },
          h1({ children, ...props }) {
            return <h1 className="mt-6 mb-3 text-xl font-bold text-vestara-text border-b border-vestara-glass-border pb-2" {...props}>{children}</h1>;
          },
          h2({ children, ...props }) {
            return <h2 className="mt-5 mb-2 text-lg font-bold text-vestara-text border-b border-vestara-glass-border pb-1" {...props}>{children}</h2>;
          },
          h3({ children, ...props }) {
            return <h3 className="mt-4 mb-2 text-base font-semibold text-vestara-text" {...props}>{children}</h3>;
          },
          h4({ children, ...props }) {
            return <h4 className="mt-3 mb-1 text-sm font-semibold text-vestara-text" {...props}>{children}</h4>;
          },
          p({ children }) {
            return <p className="my-2 leading-relaxed text-vestara-text">{children}</p>;
          },
          hr() {
            return <hr className="my-6 border-vestara-glass-border" />;
          },
          img({ src, alt }) {
            return <img src={src} alt={alt} className="my-3 max-w-full rounded-lg border border-vestara-glass-border" />;
          },
          input({ type, checked, ...props }) {
            if (type === 'checkbox') {
              return (
                <input type="checkbox" checked={checked} readOnly
                  className="mr-1.5 h-4 w-4 rounded border-vestara-glass-border bg-transparent accent-vestara-gold"
                  {...props} />
              );
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
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
