import { useState, lazy, Suspense } from 'react';
import { formatRelativeTime } from './MarkdownRenderer';
import { MessageReactions } from './MessageReactions';
import { PinButton } from './PinnedMessages';

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })));
const DiffView = lazy(() => import('./DiffView').then((m) => ({ default: m.DiffView })));

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
  onReact?: (messageId: string, reaction: 'like' | 'dislike') => void;
  isPinned?: boolean;
  onTogglePin?: (messageId: string) => void;
  isEditing?: boolean;
  messageRef?: (el: HTMLDivElement | null) => void;
}

function ContentFallback() {
  return <div className="h-8 animate-pulse rounded bg-vestara-glass" />;
}

export function ChatMessage({ message, onEdit, onReact, isPinned, onTogglePin, isEditing, messageRef }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const hasDiff = !isUser && message.content.includes('```diff');

  return (
    <div ref={messageRef} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`group max-w-[80%] ${isUser ? '' : 'w-full'}`}>
        <div className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-vestara-gold/20 text-vestara-text' : 'glass-sm text-vestara-text'
        } ${isEditing ? 'ring-2 ring-vestara-gold/50' : ''} ${isPinned ? 'ring-1 ring-vestara-gold/30' : ''}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Suspense fallback={<ContentFallback />}>
              {hasDiff ? <DiffView content={message.content} /> : <MarkdownRenderer content={message.content} />}
            </Suspense>
          )}
        </div>

        <div className={`mt-1 flex items-center gap-1.5 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-vestara-text-dim/50">{formatRelativeTime(message.created_at)}</span>
          {message.model && <span className="max-w-[100px] truncate text-[9px] text-vestara-text-dim/40">{message.model}</span>}

          {isUser && onEdit && (
            <button onClick={() => onEdit(message.id, message.content)} className="hidden text-[10px] text-vestara-text-dim/40 hover:text-vestara-gold group-hover:inline transition-colors" title="Edit">Edit</button>
          )}

          {onTogglePin && <PinButton messageId={message.id} isPinned={!!isPinned} onToggle={onTogglePin} />}

          {copied ? (
            <span className="text-[10px] text-vestara-success">Copied!</span>
          ) : (
            <button onClick={handleCopy} className="hidden text-[10px] text-vestara-text-dim/40 hover:text-vestara-text group-hover:inline transition-colors" title="Copy">Copy</button>
          )}

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
  const MarkdownRendererLazy = lazy(() => import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })));

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[80%]">
        <div className="glass-sm rounded-lg px-4 py-2.5 text-sm leading-relaxed text-vestara-text">
          <Suspense fallback={<span className="ai-active">●</span>}>
            <MarkdownRendererLazy content={content} />
          </Suspense>
          <span className="inline-block h-4 w-1.5 ml-0.5 bg-vestara-blue animate-pulse" />
        </div>
      </div>
    </div>
  );
}
