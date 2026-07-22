import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  sizeFormatted: string;
  modified: string;
  permissions: string;
  icon: string;
  extension: string;
}

interface TreeEntry extends FileEntry {
  children?: TreeEntry[];
  expanded?: boolean;
}

interface FileContent {
  path: string;
  content: string | null;
  size: number;
  sizeFormatted: string;
  modified: string;
  extension: string;
  isBinary: boolean;
  lineCount: number;
}

export default function FileManager() {
  const { token } = useAuth();
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [tree, setTree] = useState<TreeEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['']));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);
  const [modal, setModal] = useState<{ type: string; path?: string; entry?: FileEntry } | null>(null);
  const [modalInput, setModalInput] = useState('');
  const { addToast } = useToast();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadDir = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setCurrentPath(data.path || '');
      }
    } catch {}
  }, [token]);

  const loadTree = useCallback(async () => {
    try {
      const res = await fetch('/api/files/tree?depth=2', { headers });
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree || []);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    loadDir('');
    loadTree();
  }, [loadDir, loadTree]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
    setFileContent(null);
    setEditing(false);
    loadDir(path);
  };

  const openFile = async (entry: FileEntry) => {
    if (entry.type === 'directory') {
      navigateTo(entry.path);
      return;
    }
    setSelectedFile(entry);
    setEditing(false);
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(entry.path)}`, { headers });
      if (res.ok) {
        const data: FileContent = await res.json();
        setFileContent(data);
      }
    } catch {}
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: selectedFile.path, content: editContent }),
      });
      if (res.ok) {
        addToast('File saved');
        setEditing(false);
        loadDir(currentPath);
        openFile(selectedFile);
      } else {
        const data = await res.json();
        addToast(data.error || 'Save failed', 'error');
      }
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: FileEntry) => {
    try {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: entry.path }),
      });
      if (res.ok) {
        addToast(`Deleted ${entry.name}`);
        if (selectedFile?.path === entry.path) {
          setSelectedFile(null);
          setFileContent(null);
        }
        loadDir(currentPath);
      }
    } catch {}
    setModal(null);
  };

  const createItem = async () => {
    if (!modalInput.trim()) return;
    const fullPath = currentPath ? `${currentPath}/${modalInput}` : modalInput;
    try {
      const endpoint = modal?.type === 'mkdir' ? '/api/files/mkdir' : '/api/files/write';
      const body = modal?.type === 'mkdir'
        ? { path: fullPath }
        : { path: fullPath, content: '' };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        addToast(`Created ${modalInput}`);
        loadDir(currentPath);
        loadTree();
      }
    } catch {}
    setModal(null);
    setModalInput('');
  };

  const renameItem = async () => {
    if (!modalInput.trim() || !modal?.entry) return;
    const dir = dirname(modal.entry.path);
    const newPath = dir ? `${dir}/${modalInput}` : modalInput;
    try {
      const res = await fetch('/api/files/rename', {
        method: 'POST',
        headers,
        body: JSON.stringify({ from: modal.entry.path, to: newPath }),
      });
      if (res.ok) {
        addToast(`Renamed to ${modalInput}`);
        loadDir(currentPath);
        loadTree();
      }
    } catch {}
    setModal(null);
    setModalInput('');
  };

  const searchFiles = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/files/search?path=${encodeURIComponent(currentPath)}&query=${encodeURIComponent(searchQuery)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch {} finally { setIsSearching(false); }
  };

  const toggleTreeDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    loadTree();
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  const dirname = (p: string) => p.substring(0, p.lastIndexOf('/'));

  const isTextFile = (ext: string) => {
    const textExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.sh', '.py', '.rs', '.go', '.html', '.css', '.scss', '.yaml', '.yml', '.toml', '.env', '.gitignore', '.dockerfile', '.sql', '.xml', '.csv'];
    return textExts.includes(ext);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Tree sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-vestara-glass-border bg-vestara-surface/30 overflow-y-auto hidden md:block">
        <div className="p-3 border-b border-vestara-glass-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-vestara-text-dim mb-2">Explorer</p>
          <div className="flex gap-1">
            <button onClick={() => setModal({ type: 'file' })} className="flex-1 text-[10px] px-2 py-1 rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">+ File</button>
            <button onClick={() => setModal({ type: 'mkdir' })} className="flex-1 text-[10px] px-2 py-1 rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">+ Folder</button>
          </div>
        </div>
        <div className="p-1.5">
          <button onClick={() => navigateTo('')} className={`w-full text-left text-xs px-2 py-1 rounded flex items-center gap-1.5 ${currentPath === '' ? 'bg-vestara-gold/10 text-vestara-gold' : 'text-vestara-text-muted hover:bg-white/5'}`}>
            <span>🏠</span> ~
          </button>
          {tree.map((node) => (
            <TreeItem key={node.path} node={node} currentPath={currentPath} expandedDirs={expandedDirs} onToggle={toggleTreeDir} onNavigate={navigateTo} depth={0} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-vestara-glass-border bg-vestara-surface/20">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs overflow-x-auto flex-1 min-w-0">
            <button onClick={() => navigateTo('')} className="text-vestara-gold hover:underline whitespace-nowrap">~</button>
            {breadcrumbs.map((crumb, i) => {
              const path = breadcrumbs.slice(0, i + 1).join('/');
              return (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-vestara-text-dim">/</span>
                  <button onClick={() => navigateTo(path)} className="text-vestara-text-muted hover:text-vestara-text hover:underline whitespace-nowrap">{crumb}</button>
                </span>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchFiles()}
              placeholder="Search..."
              className="w-36 rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
            />
            <button onClick={searchFiles} disabled={isSearching} className="text-[10px] px-2 py-1 rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">
              {isSearching ? '...' : '🔍'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* File list */}
          <div className={`${selectedFile && !selectedFile.type ? 'w-1/2' : 'flex-1'} border-r border-vestara-glass-border overflow-y-auto transition-all`}>
            {searchResults.length > 0 ? (
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-vestara-gold/5 border-b border-vestara-glass-border">
                  <span className="text-xs text-vestara-gold">{searchResults.length} results</span>
                  <button onClick={() => setSearchResults([])} className="text-[10px] text-vestara-text-dim hover:text-vestara-text">Clear</button>
                </div>
                {searchResults.map((entry) => (
                  <FileRow key={entry.path} entry={entry} selected={selectedFile?.path === entry.path} onSelect={openFile} onContextMenu={(e, f) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, entry: f }); }} />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-vestara-text-dim">Empty directory</div>
            ) : (
              entries.map((entry) => (
                <FileRow key={entry.path} entry={entry} selected={selectedFile?.path === entry.path} onSelect={openFile} onContextMenu={(e, f) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, entry: f }); }} />
              ))
            )}
          </div>

          {/* File viewer/editor */}
          {selectedFile && selectedFile.type === 'file' && (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Viewer toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-vestara-glass-border bg-vestara-surface/20">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{selectedFile.icon}</span>
                  <span className="text-xs text-vestara-text font-medium truncate">{selectedFile.name}</span>
                  <span className="text-[10px] text-vestara-text-dim">{fileContent?.sizeFormatted}</span>
                  {fileContent && !fileContent.isBinary && (
                    <span className="text-[10px] text-vestara-text-dim">{fileContent.lineCount} lines</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {editing ? (
                    <>
                      <button onClick={saveFile} disabled={saving} className="text-[10px] px-2.5 py-1 rounded bg-vestara-gold/20 text-vestara-gold hover:bg-vestara-gold/30 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditing(false)} className="text-[10px] px-2.5 py-1 rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">Cancel</button>
                    </>
                  ) : (
                    <>
                      {fileContent && !fileContent.isBinary && isTextFile(selectedFile.extension) && (
                        <button onClick={() => { setEditContent(fileContent.content || ''); setEditing(true); }} className="text-[10px] px-2.5 py-1 rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">Edit</button>
                      )}
                      <button onClick={() => { const a = document.createElement('a'); a.href = `/api/files/download?path=${encodeURIComponent(selectedFile.path)}`; a.click(); }} className="text-[10px] px-2.5 py-1 rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">Download</button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              {editing ? (
                <textarea
                  ref={editorRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 w-full resize-none bg-vestara-bg p-4 text-xs text-vestara-text font-mono outline-none"
                  spellCheck={false}
                />
              ) : fileContent?.isBinary ? (
                <div className="flex-1 flex items-center justify-center text-sm text-vestara-text-dim">
                  Binary file ({fileContent.sizeFormatted})
                </div>
              ) : (
                <pre className="flex-1 overflow-auto p-4 text-xs text-vestara-text font-mono whitespace-pre-wrap">
                  {fileContent?.content || 'Loading...'}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-50 rounded-lg border border-vestara-glass-border bg-vestara-surface shadow-xl py-1 min-w-[140px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.entry.type === 'directory' && (
            <button onClick={() => { navigateTo(contextMenu.entry.path); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-vestara-text hover:bg-white/5">Open</button>
          )}
          {contextMenu.entry.type === 'file' && (
            <button onClick={() => { openFile(contextMenu.entry); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-vestara-text hover:bg-white/5">View</button>
          )}
          <button onClick={() => { setModal({ type: 'rename', entry: contextMenu.entry }); setModalInput(contextMenu.entry.name); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-vestara-text hover:bg-white/5">Rename</button>
          <hr className="border-vestara-glass-border my-1" />
          <button onClick={() => { setModal({ type: 'delete', entry: contextMenu.entry }); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10">Delete</button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="glass w-80 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-vestara-text mb-3">
              {modal.type === 'mkdir' ? 'New Folder' : modal.type === 'file' ? 'New File' : modal.type === 'rename' ? 'Rename' : `Delete ${modal.entry?.name}?`}
            </h3>
            {modal.type === 'delete' ? (
              <div className="flex gap-2 justify-end">
                <button onClick={() => setModal(null)} className="px-3 py-1.5 text-xs rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">Cancel</button>
                <button onClick={() => modal.entry && deleteEntry(modal.entry)} className="px-3 py-1.5 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (modal.type === 'rename' ? renameItem() : createItem())}
                  autoFocus
                  className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2 text-sm text-vestara-text outline-none focus:border-vestara-gold/50 font-mono mb-3"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setModal(null)} className="px-3 py-1.5 text-xs rounded bg-white/5 text-vestara-text-muted hover:bg-white/10">Cancel</button>
                  <button onClick={() => modal.type === 'rename' ? renameItem() : createItem()} className="px-3 py-1.5 text-xs rounded bg-vestara-gold/20 text-vestara-gold hover:bg-vestara-gold/30">Create</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FileRow({ entry, selected, onSelect, onContextMenu }: { entry: FileEntry; selected: boolean; onSelect: (e: FileEntry) => void; onContextMenu: (e: React.MouseEvent, f: FileEntry) => void }) {
  return (
    <button
      onClick={() => onSelect(entry)}
      onContextMenu={(e) => onContextMenu(e, entry)}
      className={`w-full text-left flex items-center gap-2 px-4 py-1.5 text-xs border-b border-vestara-glass-border/50 transition-colors ${
        selected ? 'bg-vestara-gold/10 text-vestara-gold' : 'text-vestara-text hover:bg-white/5'
      }`}
    >
      <span className="text-sm flex-shrink-0">{entry.icon}</span>
      <span className="truncate flex-1 font-mono">{entry.name}</span>
      {entry.type === 'directory' ? (
        <span className="text-[10px] text-vestara-text-dim">—</span>
      ) : (
        <span className="text-[10px] text-vestara-text-dim flex-shrink-0">{entry.sizeFormatted}</span>
      )}
      <span className="text-[10px] text-vestara-text-dim flex-shrink-0 w-20 text-right">{new Date(entry.modified).toLocaleDateString()}</span>
    </button>
  );
}

function TreeItem({ node, currentPath, expandedDirs, onToggle, onNavigate, depth }: { node: TreeEntry; currentPath: string; expandedDirs: Set<string>; onToggle: (p: string) => void; onNavigate: (p: string) => void; depth: number }) {
  const isExpanded = expandedDirs.has(node.path);
  const isActive = currentPath === node.path;

  return (
    <div>
      <button
        onClick={() => node.children && node.children.length > 0 ? onToggle(node.path) : onNavigate(node.path)}
        className={`w-full text-left text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isActive ? 'bg-vestara-gold/10 text-vestara-gold' : 'text-vestara-text-muted hover:bg-white/5'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.children && node.children.length > 0 && (
          <span className="text-[8px]">{isExpanded ? '▼' : '▶'}</span>
        )}
        <span>{isExpanded ? '📂' : '📁'}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} currentPath={currentPath} expandedDirs={expandedDirs} onToggle={onToggle} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
