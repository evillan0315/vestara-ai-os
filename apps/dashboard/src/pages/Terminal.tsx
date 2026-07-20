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
    // Welcome message
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

    // Add to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Add input line
    const inputLine: TerminalLine = {
      type: 'input',
      content: command,
      timestamp: new Date(),
    };
    setLines(prev => [...prev, inputLine]);

    // Handle built-in commands
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

    // Execute via API
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
    } catch (error) {
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
    <div className="min-h-screen bg-[#0a0a12] text-white p-6 flex flex-col">
      <div className="max-w-6xl mx-auto flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Terminal</h1>
            <p className="text-gray-400 mt-1">Execute commands on the system</p>
          </div>
          <button
            onClick={() => setLines([])}
            className="px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e] transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Terminal */}
        <div
          ref={terminalRef}
          className="flex-1 bg-[#0d0d18] border border-[#1e1e2e] rounded-lg p-4 font-mono text-sm overflow-y-auto min-h-[500px]"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${
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
            <span className="text-[#4a9eff]">ai@vestara:~$ </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-300 font-mono"
              disabled={isRunning}
              autoFocus
            />
            {isRunning && (
              <span className="text-yellow-400 animate-pulse">Running...</span>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Ctrl+L to clear | ↑/↓ for history</span>
          <span>{commandHistory.length} commands in history</span>
        </div>
      </div>
    </div>
  );
}
