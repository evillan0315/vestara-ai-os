import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ScriptDocs {
  summary: string;
  description: string;
  prerequisites: string[];
  options: { flag: string; description: string }[];
  examples: string[];
  outputs: string[];
  notes: string[];
}

interface Script {
  name: string;
  filename: string;
  description: string;
  usage: string;
  size: number;
  category: 'build' | 'deploy' | 'maintain';
  docs?: ScriptDocs;
}

interface ScriptDetail extends Script {
  content: string;
}

interface ScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  build: 'Build',
  deploy: 'Deploy',
  maintain: 'Maintain',
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case 'build': return 'text-amber-400 bg-amber-400/10';
    case 'deploy': return 'text-green-400 bg-green-400/10';
    case 'maintain': return 'text-blue-400 bg-blue-400/10';
    default: return 'text-vestara-text-muted bg-white/5';
  }
};

export default function Scripts() {
  const { token } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<ScriptDetail | null>(null);
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
    setOutput('');
    setExitCode(null);
    setArgs('');
    try {
      const res = await fetch(`/api/scripts/${script.name}`, { headers });
      if (res.ok) {
        const data: ScriptDetail = await res.json();
        setSelectedScript(data);
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

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-vestara-blue text-lg">Loading scripts...</div>
      </div>
    );
  }

if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-vestara-blue text-lg">Loading scripts...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 md:p-6">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-vestara-text">Scripts</h1>
        <p className="text-sm text-vestara-text-muted">Run build, deploy, and maintenance scripts</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 flex-1 min-h-0">
        {/* Script list */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Available Scripts</h2>
          {loading ? (
            <p className="text-xs text-vestara-text-dim">Loading...</p>
          ) : (
            <div className="space-y-1">
              {scripts.map((script) => {
                const cat = script.category || 'maintain';
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
                        {CATEGORY_LABELS[cat] || cat}
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
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-vestara-text">{selectedScript.filename}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCategoryColor(selectedScript.category || 'maintain')}`}>
                        {CATEGORY_LABELS[selectedScript.category || 'maintain']}
                      </span>
                    </div>
                    <p className="text-sm text-vestara-text-muted mt-1">{selectedScript.docs?.summary || selectedScript.description}</p>
                  </div>
                  <span className="text-xs text-vestara-text-dim">{formatSize(selectedScript.size)}</span>
                </div>

                {/* Full description */}
                {selectedScript.docs?.description && (
                  <p className="text-xs text-vestara-text-dim mb-4 leading-relaxed">{selectedScript.docs.description}</p>
                )}

                {/* Usage examples */}
                {selectedScript.docs?.examples && selectedScript.docs.examples.length > 0 && (
                  <div className="mb-3 rounded-lg bg-vestara-bg p-3">
                    <p className="text-[10px] text-vestara-text-dim mb-1.5">Usage</p>
                    {selectedScript.docs.examples.map((ex, i) => (
                      <code key={i} className="block text-xs text-vestara-gold font-mono mb-0.5">{ex}</code>
                    ))}
                  </div>
                )}

                {/* Prerequisites */}
                {selectedScript.docs?.prerequisites && selectedScript.docs.prerequisites.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-vestara-text-dim mb-1.5">Prerequisites</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedScript.docs.prerequisites.map((dep, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-vestara-text-dim border border-vestara-glass-border">{dep}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Options */}
                {selectedScript.docs?.options && selectedScript.docs.options.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-vestara-text-dim mb-1.5">Options</p>
                    <div className="space-y-1">
                      {selectedScript.docs.options.map((opt, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <code className="text-vestara-gold font-mono whitespace-nowrap">{opt.flag}</code>
                          <span className="text-vestara-text-dim">{opt.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outputs */}
                {selectedScript.docs?.outputs && selectedScript.docs.outputs.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-vestara-text-dim mb-1.5">Outputs</p>
                    <div className="space-y-0.5">
                      {selectedScript.docs.outputs.map((out, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs">
                          <span className="text-green-400 mt-0.5">→</span>
                          <code className="text-vestara-text font-mono text-[11px]">{out}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedScript.docs?.notes && selectedScript.docs.notes.length > 0 && (
                  <div className="mb-3 rounded-lg bg-amber-400/5 border border-amber-400/20 p-3">
                    <p className="text-[10px] text-amber-400 mb-1.5">Notes</p>
                    <ul className="space-y-0.5">
                      {selectedScript.docs.notes.map((note, i) => (
                        <li key={i} className="text-[11px] text-vestara-text-dim flex items-start gap-1.5">
                          <span className="text-amber-400/60 mt-0.5">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Args input + Run */}
                <div className="flex gap-2 mt-4">
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
                  {selectedScript.content || 'Loading...'}
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
