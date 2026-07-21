import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOpenCodeChat, type AttachedFile, type AgentMode } from '../hooks/useOpenCodeChat';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ChatSidebar, ChatSidebarToggle } from '../components/ChatSidebar';
import { ChatMessage, StreamingMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { CwdInput } from '../components/CwdInput';
import { DirectoryBrowser } from '../components/DirectoryBrowser';
import { SuggestionsPanel } from '../components/SuggestionsPanel';
import { MessageSkeleton } from '../components/LoadingSkeleton';
import { TokenUsageBar } from '../components/TokenUsageBar';
import { PinnedMessages } from '../components/PinnedMessages';

const CustomInstructionsDialog = lazy(() => import('../components/CustomInstructionsDialog').then(m => ({ default: m.CustomInstructionsDialog })));
const FallbackModelsEditor = lazy(() => import('../components/FallbackModelsEditor').then(m => ({ default: m.FallbackModelsEditor })));
const ChatTemplates = lazy(() => import('../components/ChatTemplates').then(m => ({ default: m.ChatTemplates })));
const MultiChatCompare = lazy(() => import('../components/MultiChatCompare').then(m => ({ default: m.MultiChatCompare })));

interface BrowserEntry { name: string; path: string; type: 'file' | 'directory' | 'symlink'; icon: string; }
interface Project { id: string; name: string; path: string | null; status: string; created_at: string; updated_at: string; }

const defaultModels = [
  { id: 'opencode/deepseek-v4-flash-free', name: 'DeepSeek V4 Flash (Free)' },
  { id: 'opencode/mimo-v2.5-free', name: 'Mimo V2.5 (Free)' },
  { id: 'opencode/nemotron-3-ultra-free', name: 'Nemotron 3 Ultra (Free)' },
  { id: 'opencode/north-mini-code-free', name: 'North Mini Code (Free)' },
  { id: 'opencode/big-pickle', name: 'Big Pickle' },
];

const agentOptions: { value: AgentMode; label: string }[] = [
  { value: 'build', label: 'Build' }, { value: 'plan', label: 'Plan' },
  { value: 'explore', label: 'Explore' }, { value: 'general', label: 'General' },
];

export function OpenCodePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const {
    chats, activeChatId, setActiveChatId, messages, loading, streamingContent,
    editingMessageId, setEditingMessageId, agent, setAgent, customInstructions, setCustomInstructions,
    webSearch, setWebSearch, fallbackModels, setFallbackModels, totalTokens, tokenPercentage, estimatedCost,
    pinnedIds, togglePin, handleReact, saveDraft,
    loadChats, loadMessages, createChat, deleteChat, sendMessage, cancelStream,
    exportChatAsMarkdown, exportChatAsJSON, importChatFromJSON, importChatFromMarkdown, startEdit,
  } = useOpenCodeChat(token);

  const [input, setInput] = useState('');
  const [model, setModel] = useState('opencode/deepseek-v4-flash-free');
  const [cwd, setCwd] = useState('/home/eddie/workspace');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserEntries, setBrowserEntries] = useState<BrowserEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [showFallbackEditor, setShowFallbackEditor] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [narrowMode, setNarrowMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const currentProject = useMemo(() => projects.find((p) => p.id === selectedProjectId) || null, [projects, selectedProjectId]);
  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId) || null, [chats, activeChatId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);

  useEffect(() => {
    Promise.all([loadChats().catch(() => {}), loadProjects()]).finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => { loadChats(selectedProjectId); }, [selectedProjectId]);

  useEffect(() => {
    if (activeChatId) {
      setChatLoading(true);
      loadMessages(activeChatId).then((r) => { if (r) { setModel(r.model); setCwd(r.cwd); } }).finally(() => setChatLoading(false));
      setEditingMessageId(null);
    }
  }, [activeChatId]);

  useEffect(() => {
    if (headerRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) setNarrowMode(entry.contentRect.width < 700);
      });
      resizeObserverRef.current.observe(headerRef.current);
    }
    return () => resizeObserverRef.current?.disconnect();
  }, []);

  const loadProjects = async () => {
    try { const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setProjects((await res.json()).projects || []); } catch {}
  };

  const handleCreateChat = useCallback(async () => { await createChat(model, cwd, selectedProjectId); }, [model, cwd, selectedProjectId, createChat]);

  const handleSend = useCallback(() => {
    sendMessage(input, model, cwd, selectedProjectId, attachedFiles, editingMessageId);
    setInput(''); setAttachedFiles([]); setEditingMessageId(null);
    saveDraft('');
  }, [input, model, cwd, selectedProjectId, attachedFiles, editingMessageId, sendMessage, saveDraft]);

  const handleEdit = useCallback((messageId: string, content: string) => {
    const lines = content.split('\n');
    const clean = lines.filter((l) => !l.startsWith('---') && !l.startsWith('File:') && !l.startsWith('```')).join('\n').trim() || content;
    setInput(clean); startEdit(messageId, content);
  }, [startEdit]);

  const handleSuggestionSelect = useCallback((p: string) => { setInput(p); }, []);
  const handleProjectChange = useCallback((id: string) => {
    const pid = id || null; setSelectedProjectId(pid);
    if (pid) { const p = projects.find((x) => x.id === pid); if (p?.path) setCwd(p.path); }
  }, [projects]);

  const handleAttachFiles = useCallback((files: AttachedFile[]) => {
    setAttachedFiles((prev) => { const existing = new Set(prev.map((f) => f.name)); return [...prev, ...files.filter((f) => !existing.has(f.name))]; });
  }, []);

  const handleRemoveFile = useCallback((name: string) => setAttachedFiles((prev) => prev.filter((f) => f.name !== name)), []);

  const handleImageAttach = useCallback((dataUrl: string, name: string) => {
    setAttachedFiles((prev) => [...prev, { name, path: name, content: dataUrl, size: dataUrl.length }]);
  }, []);

  const handleExportJSON = useCallback(() => {
    if (!activeChat) return;
    const json = exportChatAsJSON(activeChat, messages);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeChat.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [activeChat, messages, exportChatAsJSON]);

  const handleExportMarkdown = useCallback(() => {
    if (!activeChat) return;
    const md = exportChatAsMarkdown(activeChat, messages);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeChat.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`; a.click();
    URL.revokeObjectURL(url);
  }, [activeChat, messages, exportChatAsMarkdown]);

  const handleImport = useCallback(async () => {
    const el = document.createElement('input'); el.type = 'file'; el.accept = '.json,.md';
    el.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      try { const content = await file.text(); const id = file.name.endsWith('.json') ? await importChatFromJSON(content) : await importChatFromMarkdown(content); if (id) { setActiveChatId(id); loadChats(selectedProjectId); } } catch {}
    }; el.click();
  }, [importChatFromJSON, importChatFromMarkdown, loadChats, selectedProjectId, setActiveChatId]);

  const handleForkToAgent = useCallback(() => {
    if (!activeChat || messages.length === 0) return;
    const context = messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}`).join('\n\n');
    navigate(`/agents?context=${encodeURIComponent(context)}&source=opencode&chatId=${activeChat.id}`);
  }, [activeChat, messages, navigate]);

  const handleJumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleTemplateSelect = useCallback((t: any) => {
    setInput(t.prompt);
    if (t.model) setModel(t.model);
    if (t.agent) setAgent(t.agent as AgentMode);
    if (t.customInstructions) setCustomInstructions(t.customInstructions);
  }, []);

  const loadBrowserDir = useCallback(async (path: string) => {
    try {
      const ep = path.startsWith('~') ? path.replace('~', '/home/ai') : path;
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(ep)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setBrowserPath(d.path || ''); setBrowserEntries((d.entries || []).filter((e: BrowserEntry) => e.type === 'directory')); }
    } catch {}
  }, [token]);

  const openBrowser = useCallback((p?: string) => { loadBrowserDir(p || ''); setShowBrowser(true); }, [loadBrowserDir]);
  const selectBrowserDir = useCallback((p: string) => { setCwd(p); setShowBrowser(false); }, []);
  const handleCancelEdit = useCallback(() => { setEditingMessageId(null); setInput(''); }, [setEditingMessageId]);
  const handleSaveInstructions = useCallback((v: string) => setCustomInstructions(v), [setCustomInstructions]);
  const handleSaveFallbacks = useCallback((m: string[]) => setFallbackModels(m), [setFallbackModels]);
  const handleDraftSave = useCallback((v: string) => saveDraft(v), [saveDraft]);

  const hasMessages = messages.length > 0 || streamingContent;

  const narrowHeader = narrowMode ? (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-vestara-glass-border px-3 py-2">
      <ChatSidebarToggle show={showSidebar} onClick={() => setShowSidebar(!showSidebar)} />
      <span className="text-sm font-semibold text-vestara-text">OpenCode</span>
      <div className="flex flex-wrap items-center gap-1 ml-auto">
        <select value={agent} onChange={(e) => setAgent(e.target.value as AgentMode)} className="rounded border border-vestara-glass-border bg-vestara-bg px-1 py-0.5 text-[9px] text-vestara-text outline-none">{agentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <TokenUsageBar totalTokens={totalTokens} percentage={tokenPercentage} estimatedCost={estimatedCost} />
      </div>
    </div>
  ) : (
    <div ref={headerRef} className="flex items-center gap-1.5 border-b border-vestara-glass-border px-3 py-2 overflow-x-auto">
      <ChatSidebarToggle show={showSidebar} onClick={() => setShowSidebar(!showSidebar)} />
      <span className="text-sm font-semibold text-vestara-text shrink-0">OpenCode</span>

      <select value={agent} onChange={(e) => setAgent(e.target.value as AgentMode)} className="rounded border border-vestara-glass-border bg-vestara-bg px-1.5 py-0.5 text-[10px] text-vestara-text outline-none">{agentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>

      <button onClick={() => setWebSearch(!webSearch)} className={`rounded px-1.5 py-0.5 text-[10px] ${webSearch ? 'bg-vestara-blue/20 text-vestara-blue border border-vestara-blue/30' : 'text-vestara-text-dim border border-transparent hover:text-vestara-text'}`}>{webSearch ? '🔍' : '🌐'}</button>
      <button onClick={() => setShowInstructionsDialog(true)} className={`rounded px-1.5 py-0.5 text-[10px] ${customInstructions ? 'bg-vestara-gold/15 text-vestara-gold border border-vestara-gold/20' : 'text-vestara-text-dim border border-transparent hover:text-vestara-text'}`}>{customInstructions ? '📝' : '📄'}</button>
      <button onClick={() => setShowFallbackEditor(true)} className={`rounded px-1.5 py-0.5 text-[10px] ${fallbackModels.length > 0 ? 'bg-vestara-purple/15 text-vestara-purple border border-vestara-purple/20' : 'text-vestara-text-dim border border-transparent hover:text-vestara-text'}`}>{fallbackModels.length > 0 ? `⇄ ${fallbackModels.length}` : '⇄'}</button>
      <button onClick={() => setShowTemplates(true)} className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text border border-transparent" title="Templates">📋</button>
      {activeChat && <button onClick={() => setShowCompare(true)} className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text border border-transparent" title="Compare chats">⇔</button>}

      {activeChat && <div className="flex items-center gap-0.5">
        <button onClick={handleExportJSON} className="rounded px-1 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text">⤓J</button>
        <button onClick={handleExportMarkdown} className="rounded px-1 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text">⤓M</button>
      </div>}
      <button onClick={handleImport} className="rounded px-1 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text">⤓I</button>
      <PinnedMessages messages={messages} pinnedIds={pinnedIds} onTogglePin={togglePin} onJumpTo={handleJumpToMessage} />
      {activeChat && messages.length > 0 && <button onClick={handleForkToAgent} className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-cyan border border-transparent hover:border-vestara-cyan/20">🤖 Agent</button>}

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <TokenUsageBar totalTokens={totalTokens} percentage={tokenPercentage} estimatedCost={estimatedCost} />
        <span className="text-[10px] text-vestara-text-dim">Project:</span>
        <select value={selectedProjectId || ''} onChange={(e) => handleProjectChange(e.target.value)} className="w-24 rounded border border-vestara-glass-border bg-vestara-bg px-1.5 py-0.5 text-[10px] text-vestara-text outline-none"><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <span className="text-[10px] text-vestara-text-dim">cwd:</span>
        <CwdInput value={cwd} onChange={setCwd} token={token} onBrowse={() => openBrowser(cwd)} />
        <select value={model} onChange={(e) => setModel(e.target.value)} className="w-32 rounded border border-vestara-glass-border bg-vestara-bg px-1.5 py-0.5 text-[10px] text-vestara-text outline-none">{defaultModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="flex h-full gap-0 overflow-hidden rounded-lg border border-vestara-glass-border">
        <ChatSidebar chats={chats} activeChatId={activeChatId} onSelect={setActiveChatId} onCreate={handleCreateChat} onDelete={deleteChat} show={showSidebar} onToggle={() => setShowSidebar(false)} editingChatId={editingMessageId ? activeChatId : null} />

        <div className="flex flex-1 flex-col overflow-hidden bg-vestara-bg">
          {narrowHeader}

          <div ref={messagesContainerRef} className="flex-1 overflow-auto p-4">
            {initialLoading ? (
              <div className="space-y-4"><MessageSkeleton /><MessageSkeleton /></div>
            ) : !hasMessages ? (
              <SuggestionsPanel onSelect={handleSuggestionSelect} hasProject={!!currentProject} projectName={currentProject?.name} />
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} id={`msg-${msg.id}`}>
                    <ChatMessage message={msg} onEdit={msg.role === 'user' ? handleEdit : undefined} onReact={handleReact} isPinned={pinnedIds.has(msg.id)} onTogglePin={togglePin} isEditing={editingMessageId === msg.id} />
                  </div>
                ))}
                {loading && streamingContent && <StreamingMessage content={streamingContent} />}
                {loading && !streamingContent && <div className="flex justify-start"><div className="glass-sm flex items-center gap-2 px-4 py-2.5 text-sm text-vestara-blue"><span className="ai-active">●</span><span>Thinking...</span></div></div>}
                {chatLoading && !loading && <MessageSkeleton />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {editingMessageId && (
            <div className="flex items-center justify-between border-t border-vestara-glass-border bg-vestara-gold/5 px-4 py-1.5">
              <span className="text-[10px] text-vestara-gold">Editing message — sending will fork a new branch</span>
              <button onClick={handleCancelEdit} className="text-[10px] text-vestara-text-dim hover:text-vestara-text">Cancel</button>
            </div>
          )}

          <ChatInput value={input} onChange={(v) => { setInput(v); handleDraftSave(v); }} onSend={handleSend} onCancel={cancelStream} loading={loading} streaming={!!streamingContent} attachedFiles={attachedFiles} onAttachFiles={handleAttachFiles} onRemoveFile={handleRemoveFile} onAttachImage={handleImageAttach} editing={!!editingMessageId} />
        </div>

        <DirectoryBrowser show={showBrowser} path={browserPath} entries={browserEntries} onLoadDir={loadBrowserDir} onSelect={selectBrowserDir} onClose={() => setShowBrowser(false)} />

        <Suspense fallback={null}>
          {showInstructionsDialog && <CustomInstructionsDialog open={showInstructionsDialog} value={customInstructions} onSave={handleSaveInstructions} onClose={() => setShowInstructionsDialog(false)} />}
          {showFallbackEditor && <FallbackModelsEditor open={showFallbackEditor} models={fallbackModels} primaryModel={model} onSave={handleSaveFallbacks} onClose={() => setShowFallbackEditor(false)} />}
          {showTemplates && <ChatTemplates open={showTemplates} onSelect={handleTemplateSelect} currentPrompt={input} currentModel={model} currentAgent={agent} currentInstructions={customInstructions} onClose={() => setShowTemplates(false)} />}
          {showCompare && <MultiChatCompare open={showCompare} chats={chats} currentChatId={activeChatId} messages={messages} onLoadMessages={loadMessages} onClose={() => setShowCompare(false)} />}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
