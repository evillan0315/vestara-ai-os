import { useEffect, useRef, useState, useCallback } from 'react';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

const VESTARA_COMMANDS = [
  { cmd: 'vestara status', desc: 'Show service status' },
  { cmd: 'vestara start', desc: 'Start services' },
  { cmd: 'vestara stop', desc: 'Stop services' },
  { cmd: 'vestara logs', desc: 'View logs' },
  { cmd: 'vestara chat', desc: 'Start AI chat' },
  { cmd: 'vestara models', desc: 'List AI models' },
  { cmd: 'vestara config --list', desc: 'Show config' },
  { cmd: 'vestara upgrade', desc: 'Upgrade Vestara' },
];

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [cwd, setCwd] = useState('~');
  const [showVestaraMenu, setShowVestaraMenu] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines((prev) => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    addLine('system', 'Vestara AI OS Terminal v0.1.0');
    addLine('system', 'Type "help" for commands, or use the ⚡ menu for Vestara CLI.\n');
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const execShell = async (command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    const res = await fetch('/api/system/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (!res.ok) return { stdout: '', stderr: 'Request failed', exitCode: 1 };
    return res.json();
  };

  const execVestara = async (args: string): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return execShell(`vestara ${args}`);
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    addLine('input', command);

    const cmd = command.trim();

    // Built-in commands
    if (cmd === 'clear') {
      setLines([]);
      setInput('');
      return;
    }

    if (cmd === 'help') {
      addLine('output', `Built-in commands:
  help              Show this help
  clear             Clear terminal (Ctrl+L)
  pwd               Print working directory
  whoami            Current user
  date              Current date/time
  echo <msg>        Print message

Vestara CLI (⚡ menu or type "vestara <cmd>"):
  vestara status    Service status
  vestara start     Start services
  vestara stop      Stop services
  vestara logs      View logs
  vestara chat      AI chat session
  vestara models    List AI models
  vestara config    Show/set config
  vestara upgrade   Upgrade Vestara

System commands:
  ps, df, free, uname, top, etc.
  Any shell command works.`);
      setInput('');
      return;
    }

    if (cmd === 'pwd') {
      addLine('output', cwd.replace('~', '/home/eddie'));
      setInput('');
      return;
    }

    if (cmd === 'whoami') {
      const { stdout } = await execShell('whoami');
      addLine('output', stdout.trim() || 'unknown');
      setInput('');
      return;
    }

    if (cmd === 'date') {
      addLine('output', new Date().toString());
      setInput('');
      return;
    }

    if (cmd.startsWith('echo ')) {
      addLine('output', command.slice(5));
      setInput('');
      return;
    }

    if (cmd === 'cd' || cmd === 'cd ~') {
      setCwd('~');
      addLine('output', '');
      setInput('');
      return;
    }

    if (cmd.startsWith('cd ')) {
      const dir = command.slice(3).trim();
      const { stdout, exitCode } = await execShell(`cd ${dir} && pwd`);
      if (exitCode === 0) {
        const path = stdout.trim();
        setCwd(path.replace('/home/eddie', '~'));
      } else {
        addLine('error', `cd: no such file or directory: ${dir}`);
      }
      setInput('');
      return;
    }

    setIsRunning(true);

    try {
      // Vestara commands
      if (cmd === 'vestara' || cmd.startsWith('vestara ')) {
        const args = cmd === 'vestara' ? '' : cmd.slice(8);
        const { stdout, stderr, exitCode } = await execVestara(args || '--help');
        if (stdout) addLine('output', stdout);
        if (stderr) addLine('error', stderr);
        if (exitCode !== 0 && !stderr) addLine('error', `Exit code: ${exitCode}`);
      } else {
        // Shell command
        const { stdout, stderr, exitCode } = await execShell(cmd);
        if (stdout) addLine('output', stdout);
        if (stderr) addLine('error', stderr);
        if (exitCode !== 0 && !stdout && !stderr) addLine('error', `Exit code: ${exitCode}`);
      }
    } catch {
      addLine('error', 'Failed to execute command');
    } finally {
      setIsRunning(false);
      setInput('');
    }
  };

  const runVestaraQuick = async (cmd: string) => {
    setShowVestaraMenu(false);
    setInput('');
    addLine('input', cmd);
    setIsRunning(true);
    try {
      const { stdout, stderr, exitCode } = await execVestara(cmd.replace('vestara ', ''));
      if (stdout) addLine('output', stdout);
      if (stderr) addLine('error', stderr);
      if (exitCode !== 0 && !stdout && !stderr) addLine('error', `Exit code: ${exitCode}`);
    } catch {
      addLine('error', 'Failed to execute vestara command');
    } finally {
      setIsRunning(false);
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
    } else if (e.key === 'Escape') {
      setShowVestaraMenu(false);
    }
  };

  const getPromptColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-vestara-gold';
      case 'error': return 'text-red-400';
      case 'system': return 'text-vestara-blue';
      default: return 'text-vestara-text';
    }
  };

  return (
    <div className="h-full flex flex-col bg-vestara-bg text-vestara-text">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-vestara-glass-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-vestara-text">Terminal</h1>
          <span className="text-[10px] text-vestara-text-dim hidden sm:inline">{cwd}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Vestara quick menu */}
          <div className="relative">
            <button
              onClick={() => setShowVestaraMenu(!showVestaraMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-vestara-gold/10 border border-vestara-gold/30 rounded-lg text-vestara-gold hover:bg-vestara-gold/20 transition-colors"
            >
              ⚡ Vestara
            </button>
            {showVestaraMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-vestara-surface border border-vestara-glass-border rounded-lg shadow-xl py-1">
                {VESTARA_COMMANDS.map((vc) => (
                  <button
                    key={vc.cmd}
                    onClick={() => runVestaraQuick(vc.cmd)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-vestara-glass transition-colors"
                  >
                    <span className="text-vestara-gold font-mono">{vc.cmd}</span>
                    <span className="text-vestara-text-dim ml-2">{vc.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-[10px] text-vestara-text-dim hidden sm:inline">
            {commandHistory.length} cmds
          </span>
          <button
            onClick={() => setLines([])}
            className="px-2.5 py-1.5 text-xs bg-vestara-glass border border-vestara-glass-border rounded-lg hover:bg-vestara-surface transition-colors text-vestara-text-dim"
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
          <div key={i} className={`whitespace-pre-wrap break-all ${getPromptColor(line.type)}`}>
            {line.type === 'input' && (
              <span className="text-vestara-gold">vestara@ai:{cwd}$ </span>
            )}
            {line.content}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center mt-1">
          <span className="text-vestara-gold shrink-0">vestara@ai:{cwd}$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent outline-none text-vestara-text font-mono"
            disabled={isRunning}
            autoFocus
          />
          {isRunning && (
            <span className="text-vestara-gold animate-pulse shrink-0 text-xs">running...</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-vestara-glass-border text-[10px] text-vestara-text-dim shrink-0">
        <span>Ctrl+L clear | ↑↓ history | ⚡ Vestara CLI</span>
        <span className="hidden sm:inline">Vestara Terminal v0.1.0</span>
      </div>
    </div>
  );
}
