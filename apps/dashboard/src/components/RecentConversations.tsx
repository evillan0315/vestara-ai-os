import { formatDistanceToNow } from '../utils/time';

interface Conversation {
  id: string;
  title: string;
  model_id?: string | null;
  updated_at: string;
}

interface RecentConversationsProps {
  conversations: Conversation[];
}

export function RecentConversations({ conversations }: RecentConversationsProps) {
  if (!conversations.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">Recent Conversations</h2>
        <a href="/chat" className="text-[10px] text-vestara-text-dim hover:text-vestara-gold transition-colors">Open chat</a>
      </div>
      <div className="space-y-1">
        {conversations.slice(0, 5).map((conv) => (
          <a
            key={conv.id}
            href={`/chat?conversation=${conv.id}`}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-vestara-glass group"
          >
            <span className="text-vestara-text-dim group-hover:text-vestara-text transition-colors truncate flex-1">
              {conv.title || 'Untitled'}
            </span>
            <span className="text-[10px] text-vestara-text-dim shrink-0">
              {formatDistanceToNow(new Date(conv.updated_at))}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
