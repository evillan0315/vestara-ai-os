import { useState, useMemo } from 'react';

interface Chat {
  id: string;
  title: string;
  model: string;
  cwd: string;
  created_at: string;
  updated_at: string;
}

type GroupBy = 'none' | 'project' | 'date' | 'model';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  show: boolean;
  onToggle: () => void;
  editingChatId?: string | null;
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  if (days < 30) return 'This Month';
  return 'Older';
}

export function ChatSidebar({ chats, activeChatId, onSelect, onCreate, onDelete, show, onToggle, editingChatId }: ChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const filtered = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter((c) => c.title.toLowerCase().includes(q) || c.cwd?.toLowerCase().includes(q));
  }, [chats, search]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { '': filtered } as Record<string, Chat[]>;

    const groups: Record<string, Chat[]> = {};
    for (const chat of filtered) {
      let key = '';
      switch (groupBy) {
        case 'date': key = getDateGroup(chat.updated_at); break;
        case 'model': key = chat.model.split('/').pop() || chat.model; break;
        case 'project': key = chat.cwd?.split('/').pop() || 'No project'; break;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(chat);
    }
    return groups;
  }, [filtered, groupBy]);

  const sortedGroups = useMemo(() => {
    return Object.entries(grouped).sort(([a], [b]) => {
      if (!a) return -1;
      if (!b) return 1;
      const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      return a.localeCompare(b);
    });
  }, [grouped]);

  const renderChatItem = (chat: Chat) => {
    const isActive = activeChatId === chat.id;
    const isEditingBranch = editingChatId === chat.id;

    return (
      <div key={chat.id} onClick={() => onSelect(chat.id)}
        className={`group flex cursor-pointer items-start justify-between border-b border-vestara-glass-border px-3 py-2 transition-colors ${
          isActive ? 'bg-vestara-gold/10 text-vestara-text' : 'text-vestara-text-muted hover:bg-vestara-glass hover:text-vestara-text'
        } ${isEditingBranch ? 'ring-1 ring-vestara-gold/30' : ''}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {isEditingBranch && <span className="shrink-0 text-[9px] text-vestara-gold">⑂</span>}
            <span className="block truncate text-xs font-medium">{chat.title}</span>
            {isEditingBranch && <span className="shrink-0 rounded bg-vestara-gold/15 px-1 py-0.5 text-[8px] text-vestara-gold uppercase">edit</span>}
            <span className="shrink-0 text-[8px] text-vestara-text-dim/40">{(chat.model || '').split('/').pop()}</span>
          </div>
          {chat.cwd && <span className="mt-0.5 block truncate text-[10px] font-mono text-vestara-text-dim">{chat.cwd}</span>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }} className="hidden text-vestara-text-dim hover:text-red-400 group-hover:inline-block text-xs leading-none mt-0.5">&times;</button>
      </div>
    );
  };

  return (
    <div className={`flex flex-col border-r border-vestara-glass-border bg-vestara-surface/30 transition-all duration-200 ${show ? 'w-64' : 'w-0 overflow-hidden'}`}>
      <div className="flex items-center justify-between border-b border-vestara-glass-border p-3">
        <span className="text-sm font-semibold text-vestara-text">Chats</span>
        <div className="flex items-center gap-1">
          <button onClick={onToggle} className="rounded px-1.5 py-0.5 text-xs text-vestara-text-muted hover:text-vestara-text">&times;</button>
          <button onClick={onCreate} className="rounded px-1.5 py-0.5 text-base leading-none text-vestara-text-muted hover:text-vestara-gold">+</button>
        </div>
      </div>

      <div className="border-b border-vestara-glass-border px-3 py-2 space-y-1.5">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats..."
          className="w-full rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
        />
        <div className="flex gap-1">
          {(['none', 'date', 'model', 'project'] as GroupBy[]).map((g) => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${
                groupBy === g ? 'bg-vestara-gold/15 text-vestara-gold' : 'text-vestara-text-dim hover:text-vestara-text'
              }`}
            >{g === 'none' ? 'All' : g}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-vestara-text-dim">{search ? 'No matches' : 'No chats yet'}</p>
        ) : groupBy === 'none' ? (
          filtered.map(renderChatItem)
        ) : (
          sortedGroups.map(([group, items]) => (
            <div key={group}>
              <div className="sticky top-0 z-10 bg-vestara-surface/80 backdrop-blur px-3 py-1.5 border-b border-vestara-glass-border">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-vestara-text-dim">{group}</span>
                <span className="ml-2 text-[8px] text-vestara-text-dim/50">{items.length}</span>
              </div>
              {items.map(renderChatItem)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ChatSidebarToggle({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded px-1.5 py-0.5 text-xs text-vestara-text-muted hover:text-vestara-text" title={show ? 'Hide' : 'Show'}>
      {show ? '\u2039' : '\u203A'}
    </button>
  );
}
