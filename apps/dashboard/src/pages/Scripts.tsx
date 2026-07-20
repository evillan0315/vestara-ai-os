import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Script {
  name: string;
  filename: string;
  description: string;
  usage: string;
  size: number;
}

interface ScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const SCRIPT_CATEGORIES: Record<string, string[]> = {
  'Build': ['build-ssd', 'build-deb', 'build-iso', 'build-repo'],
  'Deploy': ['deploy', 'install', 'upgrade'],
  'Maintain': ['backup'],
};

const getScriptCategory = (name: string) => {
  for (const [cat, scripts] of Object.entries(SCRIPT_CATEGORIES)) {
    if (scripts.includes(name)) return cat;
  }
  return 'Other';
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case 'Build': return 'text-amber-400 bg-amber-400/10';
    case 'Deploy': return 'text-green-400 bg-green-400/10';
    case 'Maintain': return 'text-blue-400 bg-blue-400/10';
    default: return 'text-vestara-text-muted bg-white/5';
  }
};

export default function Scripts() {
  const { token } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scriptContent, setScriptContent] = useState('');
  const [args, setArgs] = useState('');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const outputRef = useRef<HTMLPreElement>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    loadScripts();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const loadScripts = async () => {
    try {
      const res = await fetch('/api/scripts', { headers });
      if (res.ok) {
        const data = await res.json();
        setScripts(data.scripts);
      }
    } catch {} finally { setLoading(false); }
  };

  const selectScript = async (script: Script) => {
    setSelectedScript(script);
    setOutput('');
    setExitCode(null);
    setArgs('');
    try {
      const res = await fetch(`/api/scripts/${script.name}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setScriptContent(data.content || '');
      }
    } catch {}
  };

  const runScript = async () => {
    if (!selectedScript) return;
    setRunning(true);
    setOutput('');
    setExitCode(null);

    try {
      const argsList = args.trim() ? args.trim().split(/\s+/) : [];
      const res = await fetch(`/api/scripts/${selectedScript.name}/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ args: argsList }),
      });

      const data: ScriptResult = await res.json();
      setOutput(data.stdout + (data.stderr ? '\n--- STDERR ---\n' + data.stderr : ''));
      setExitCode(data.exitCode);
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : 'Failed to run script'}`);
      setExitCode(1);
    } finally {
      setRunning(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vestara-text">Scripts</h1>
        <p className="text-sm text-vestara-text-muted">Run build, deploy, and maintenance scripts</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Script list */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Available Scripts</h2>
          {loading ? (
            <p className="text-xs text-vestara-text-dim">Loading...</p>
          ) : (
            <div className="space-y-1">
              {scripts.map((script) => {
                const cat = getScriptCategory(script.name);
                return (
                  <button
                    key={script.name}
                    onClick={() => selectScript(script)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                      selectedScript?.name === script.name
                        ? 'bg-vestara-gold/10 border border-vestara-gold/30'
                        : 'border border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-vestara-text font-medium">{script.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCategoryColor(cat)}`}>
                        {cat}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-vestara-text-dim line-clamp-1">{script.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Script detail + runner */}
        <div className="lg:col-span-2 space-y-4">
          {selectedScript ? (
            <>
              {/* Info card */}
              <div className="glass p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-vestara-text">{selectedScript.filename}</h3>
                    <p className="text-sm text-vestara-text-muted">{selectedScript.description}</p>
                  </div>
                  <span className="text-xs text-vestara-text-dim">{formatSize(selectedScript.size)}</span>
                </div>

                <div className="mb-3 rounded-lg bg-vestara-bg p-3">
                  <p className="text-[10px] text-vestara-text-dim mb-1">Usage</p>
                  <code className="text-xs text-vestara-gold font-mono">{selectedScript.usage}</code>
                </div>

                {/* Args input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="Arguments (e.g. --output /tmp)"
                    className="flex-1 rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50 font-mono"
                  />
                  <button
                    onClick={runScript}
                    disabled={running}
                    className="btn-gold px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {running ? 'Running...' : 'Run'}
                  </button>
                </div>
              </div>

              {/* Source code */}
              <div className="glass overflow-hidden">
                <div className="flex items-center justify-between border-b border-vestara-glass-border px-4 py-2">
                  <span className="text-xs text-vestara-text-muted">Source Code</span>
                  <span className="text-[10px] text-vestara-text-dim">{selectedScript.filename}</span>
                </div>
                <pre className="max-h-64 overflow-auto p-4 text-xs text-vestara-text font-mono whitespace-pre-wrap">
                  {scriptContent || 'Loading...'}
                </pre>
              </div>

              {/* Output */}
              {(output || running) && (
                <div className="glass overflow-hidden">
                  <div className="flex items-center justify-between border-b border-vestara-glass-border px-4 py-2">
                    <span className="text-xs text-vestara-text-muted">Output</span>
                    {exitCode !== null && (
                      <span className={`text-[10px] font-mono ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        exit {exitCode}
                      </span>
                    )}
                    {running && (
                      <span className="flex items-center gap-1.5 text-[10px] text-vestara-gold">
                        <span className="h-1.5 w-1.5 rounded-full bg-vestara-gold animate-pulse" />
                        Running...
                      </span>
                    )}
                  </div>
                  <pre
                    ref={outputRef}
                    className="max-h-80 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap text-vestara-text"
                  >
                    {output || 'Executing...'}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="glass flex h-64 items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-vestara-text-muted">Select a script to view details and run it</p>
                <p className="mt-1 text-xs text-vestara-text-dim">{scripts.length} scripts available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
