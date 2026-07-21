import { useState } from 'react';

interface MessageReactionsProps {
  messageId: string;
  onReact: (messageId: string, reaction: 'like' | 'dislike') => void;
}

export function MessageReactions({ messageId, onReact }: MessageReactionsProps) {
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleReact = (type: 'like' | 'dislike') => {
    const newReaction = reaction === type ? null : type;
    setReaction(newReaction);
    onReact(messageId, type);
    if (type === 'dislike' || newReaction === null) {
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    }
  };

  return (
    <span className="inline-flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => handleReact('like')}
        className={`text-[10px] transition-colors ${
          reaction === 'like' ? 'text-vestara-success' : 'text-vestara-text-dim/40 hover:text-vestara-success'
        }`}
        title="Helpful"
      >
        👍
      </button>
      <button
        onClick={() => handleReact('dislike')}
        className={`text-[10px] transition-colors ${
          reaction === 'dislike' ? 'text-vestara-error' : 'text-vestara-text-dim/40 hover:text-vestara-error'
        }`}
        title="Not helpful"
      >
        👎
      </button>
      {showFeedback && reaction === 'dislike' && (
        <span className="text-[8px] text-vestara-text-dim">Feedback noted</span>
      )}
    </span>
  );
}
