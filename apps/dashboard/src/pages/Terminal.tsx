import { useEffect, useRef, useState } from 'react';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLines([
      {
        type: 'output',
        content: 'Vestara AI OS Terminal v0.1.0',
        timestamp: new Date(),
      },
      {
        type: 'output',
        content: 'Type "help" for available commands.\n',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    const inputLine: TerminalLine = {
      type: 'input',
      content: command,
      timestamp: new Date(),
    };
    setLines(prev => [...prev, inputLine]);

    const cmd = command.trim().toLowerCase();

    if (cmd === 'clear') {
      setLines([]);
      setInput('');
      return;
    }

    if (cmd === 'help') {
      const helpText = `Available commands:
  help        Show this help message
  clear       Clear terminal
  status      Show Vestara service status
  models      List available AI models
  whoami      Show current user
  date        Show current date/time
  echo <msg>  Print message
  ps          Show running processes
  df          Show disk usage
  free        Show memory usage
  uname       Show system information`;
      setLines(prev => [...prev, { type: 'output', content: helpText, timestamp: new Date() }]);
      setInput('');
      return;
    }

    if (cmd === 'whoami') {
      setLines(prev => [...prev, { type: 'output', content: 'ai', timestamp: new Date() }]);
      setInput('');
      return;
    }

    if (cmd === 'date') {
      setLines(prev => [...prev, { type: 'output', content: new Date().toString(), timestamp: new Date() }]);
      setInput('');
      return;
    }

    if (cmd.startsWith('echo ')) {
      const msg = command.slice(5);
      setLines(prev => [...prev, { type: 'output', content: msg, timestamp: new Date() }]);
      setInput('');
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch('/api/system/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      if (response.ok) {
        const data = await response.json() as { stdout: string; stderr: string; exitCode: number };
        if (data.stdout) {
          setLines(prev => [...prev, { type: 'output', content: data.stdout, timestamp: new Date() }]);
        }
        if (data.stderr) {
          setLines(prev => [...prev, { type: 'error', content: data.stderr, timestamp: new Date() }]);
        }
        if (data.exitCode !== 0 && !data.stderr) {
          setLines(prev => [...prev, { type: 'error', content: `Exit code: ${data.exitCode}`, timestamp: new Date() }]);
        }
      } else {
        setLines(prev => [...prev, { type: 'error', content: 'Command execution failed', timestamp: new Date() }]);
      }
    } catch {
      setLines(prev => [...prev, { type: 'error', content: 'Failed to execute command', timestamp: new Date() }]);
    } finally {
      setIsRunning(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="-m-6 h-[calc(100vh+3rem)] flex flex-col bg-[#0a0a12] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e] shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Terminal</h1>
          <p className="text-xs text-gray-400">Execute commands on the system</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:inline">
            {commandHistory.length} commands
          </span>
          <button
            onClick={() => setLines([])}
            className="px-3 py-1.5 text-sm bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e] transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap break-all ${
            line.type === 'input' ? 'text-[#4a9eff]' :
            line.type === 'error' ? 'text-red-400' :
            'text-gray-300'
          }`}>
            {line.type === 'input' && (
              <span className="text-[#4a9eff]">ai@vestara:~$ </span>
            )}
            {line.content}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center mt-1">
          <span className="text-[#4a9eff] shrink-0">ai@vestara:~$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent outline-none text-gray-300 font-mono"
            disabled={isRunning}
            autoFocus
          />
          {isRunning && (
            <span className="text-yellow-400 animate-pulse shrink-0">Running...</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-[#1e1e2e] text-xs text-gray-500 shrink-0">
        <span>Ctrl+L clear | ↑/↓ history</span>
        <span className="hidden sm:inline">Vestara Terminal v0.1.0</span>
      </div>
    </div>
  );
}
