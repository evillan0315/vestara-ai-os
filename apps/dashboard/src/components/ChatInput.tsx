import { useRef, useEffect, useCallback, useState } from 'react';
import { VoiceInput } from './VoiceInput';
import { SlashCommands } from './SlashCommands';

interface AttachedFile {
  name: string;
  path: string;
  content: string;
  size: number;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  loading: boolean;
  streaming: boolean;
  attachedFiles: AttachedFile[];
  onAttachFiles: (files: AttachedFile[]) => void;
  onRemoveFile: (name: string) => void;
  onAttachImage?: (dataUrl: string, name: string) => void;
  editing?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onCancel,
  loading,
  streaming,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  onAttachImage,
  editing,
  placeholder = 'Ask OpenCode to write, refactor, or explain code...',
  disabled,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showSlash, setShowSlash] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      onSend();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      onChange(value + '\n');
    }
    if (e.key === 'Escape' && loading) {
      e.preventDefault();
      onCancel();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      onChange('');
    }
    if (e.key === 'Tab' && value.startsWith('/')) {
      e.preventDefault();
      onChange(value + ' ');
    }
  }, [onSend, onCancel, loading, onChange, value]);

  useEffect(() => {
    if (!loading && !streaming) {
      inputRef.current?.focus();
    }
  }, [loading, streaming]);

  const handleFilePick = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: AttachedFile[] = [];

    for (const file of Array.from(fileList)) {
      if (file.type.startsWith('image/') && onAttachImage) {
        const reader = new FileReader();
        reader.onload = () => onAttachImage(reader.result as string, file.name);
        reader.readAsDataURL(file);
        continue;
      }
      try {
        const content = await file.text();
        newFiles.push({ name: file.name, path: file.name, content, size: file.size });
      } catch (err) {
        console.error(`Failed to read file ${file.name}:`, err);
      }
    }

    if (newFiles.length > 0) onAttachFiles(newFiles);
  }, [onAttachFiles, onAttachImage]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !onAttachImage) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => onAttachImage(reader.result as string, `pasted_${Date.now()}.png`);
        reader.readAsDataURL(file);
      }
    }
  }, [onAttachImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFilePick(e.dataTransfer.files);
  }, [handleFilePick]);

  const handleVoiceResult = useCallback((text: string) => {
    onChange(value ? value + ' ' + text : text);
  }, [value, onChange]);

  const handleSlashSelect = useCallback((text: string) => {
    onChange(text);
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div
      className={`border-t border-vestara-glass-border p-4 transition-colors ${dragOver ? 'bg-vestara-gold/5' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachedFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-1.5 rounded-md border border-vestara-glass-border bg-vestara-glass px-2 py-1">
              <span className="text-[10px] text-vestara-text-dim">{f.name.endsWith('.png') || f.name.endsWith('.jpg') ? '🖼️' : '📄'}</span>
              <span className="max-w-[120px] truncate text-[10px] text-vestara-text-muted">{f.name}</span>
              <span className="text-[9px] text-vestara-text-dim/50">{(f.size / 1024).toFixed(0)}KB</span>
              <button onClick={() => onRemoveFile(f.name)} className="ml-0.5 text-[10px] text-vestara-text-dim hover:text-red-400 leading-none">&times;</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value); setShowSlash(e.target.value.startsWith('/')); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={editing ? 'Edit message...' : placeholder}
            className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2.5 pr-32 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
            disabled={disabled || loading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <VoiceInput onResult={handleVoiceResult} disabled={loading} />
            <button onClick={() => fileInputRef.current?.click()} className="rounded px-1 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text transition-colors" title="Attach files">📎</button>
            <span className="text-[8px] text-vestara-text-dim/30">Enter</span>
          </div>
          <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFilePick(e.target.files)} className="hidden" accept="*/*" />
          <SlashCommands value={value} onSelect={handleSlashSelect} onClose={() => setShowSlash(false)} />
        </div>

        {loading || streaming ? (
          <button onClick={onCancel} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors">Stop</button>
        ) : (
          <button onClick={onSend} disabled={disabled || !value.trim()} className={`btn-gold px-4 py-2.5 text-sm disabled:opacity-50 ${editing ? 'bg-amber-500 hover:bg-amber-400' : ''}`}>
            {editing ? 'Update' : 'Send'}
          </button>
        )}
      </div>

      {dragOver && (
        <div className="mt-2 rounded-lg border-2 border-dashed border-vestara-gold/30 bg-vestara-gold/5 py-3 text-center text-xs text-vestara-gold">
          Drop files or images to attach as context
        </div>
      )}
    </div>
  );
}
