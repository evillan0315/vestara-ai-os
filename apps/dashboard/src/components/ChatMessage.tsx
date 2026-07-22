import { useState, lazy, Suspense } from 'react';
import { formatRelativeTime } from './MarkdownRenderer';
import { MessageReactions } from './MessageReactions';
import { PinButton } from './PinnedMessages';

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })));
const DiffView = lazy(() => import('./DiffView').then((m) => ({ default: m.DiffView })));
const StreamingMarkdownRenderer = lazy(() => import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })));

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
}

interface ChatMessageProps {
  message: Message;
  onEdit?: (messageId: string, content: string) => void;
  onReact?: (messageId: string, reaction: 'like' | 'dislike' | null) => void;
  isPinned?: boolean;
  onTogglePin?: (messageId: string) => void;
  isEditing?: boolean;
  messageRef?: (el: HTMLDivElement | null) => void;
}

function ContentFallback() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 w-3/4 rounded bg-white/10" />
      <div className="h-3 w-1/2 rounded bg-white/10" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-vestara-gold to-vestara-gold-light text-[10px] font-bold text-vestara-bg">
      U
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-vestara-blue to-vestara-purple text-white">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M18 10a6 6 0 0 1-12 0" />
        <path d="M4 18c2-2 5.3-3 8-3s6 1 8 3" />
        <path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    </div>
  );
}

export function ChatMessage({ message, onEdit, onReact, isPinned, onTogglePin, isEditing, messageRef }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const hasDiff = !isUser && message.content.includes('```diff');

  return (
    <div ref={messageRef} className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : ''} ${isPinned ? 'pinned-anchor' : ''}`}>
      <div className="flex shrink-0 pt-1">
        {isUser ? <UserAvatar /> : <AssistantAvatar />}
      </div>

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[calc(100%-2.5rem)]`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-semibold text-vestara-text-muted">
            {isUser ? 'You' : 'Vestara'}
          </span>
          {message.model && (
            <span className="max-w-[120px] truncate rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-vestara-text-dim">
              {message.model}
            </span>
          )}
          <span className="text-[10px] text-vestara-text-dim/40">
            {formatRelativeTime(message.created_at)}
          </span>
        </div>

        <div className={`relative rounded-xl border px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm border-vestara-gold/20 bg-gradient-to-br from-vestara-gold/15 to-vestara-gold/5 text-vestara-text'
            : 'rounded-tl-sm border-vestara-glass-border bg-vestara-surface text-vestara-text'
        } ${isEditing ? 'ring-2 ring-vestara-gold/50' : ''} ${isPinned ? 'ring-1 ring-vestara-gold/30' : ''}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Suspense fallback={<ContentFallback />}>
              {hasDiff ? <DiffView content={message.content} /> : <MarkdownRenderer content={message.content} />}
            </Suspense>
          )}
        </div>

        <div className={`mt-1 flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          {isUser && onEdit && (
            <button onClick={() => onEdit(message.id, message.content)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim/60 hover:text-vestara-gold hover:bg-vestara-gold/10 transition-colors"
              title="Edit">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}

          <button onClick={handleCopy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim/60 hover:text-vestara-text hover:bg-white/5 transition-colors"
            title="Copy">
            {copied ? (
              <><svg className="h-3 w-3 text-vestara-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>Copied</>
            ) : (
              <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>
            )}
          </button>

          {onTogglePin && <PinButton messageId={message.id} isPinned={!!isPinned} onToggle={onTogglePin} />}

          {!isUser && onReact && <MessageReactions messageId={message.id} onReact={onReact} />}
        </div>
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 pt-1">
        <AssistantAvatar />
      </div>

      <div className="flex flex-col items-start max-w-[calc(100%-2.5rem)]">
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-semibold text-vestara-text-muted">Vestara</span>
          <span className="rounded bg-vestara-blue/15 px-1.5 py-0.5 text-[10px] font-medium text-vestara-blue">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-vestara-blue animate-pulse" />
              Streaming
            </span>
          </span>
        </div>

        <div className="rounded-xl rounded-tl-sm border border-vestara-glass-border bg-vestara-surface px-4 py-2.5 text-sm leading-relaxed text-vestara-text">
          <Suspense fallback={<ContentFallback />}>
            <StreamingMarkdownRenderer content={content} />
          </Suspense>
          <span className="inline-block h-4 w-1.5 ml-0.5 bg-vestara-blue animate-blink rounded-sm" />
        </div>
      </div>
    </div>
  );
}
