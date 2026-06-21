import { useState, useCallback } from 'react';

const btn = (variant: 'primary' | 'secondary' | 'danger') => ({
  padding: '6px 14px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'opacity 0.15s',
  background: variant === 'primary' ? '#4f46e5' : variant === 'danger' ? '#dc2626' : '#1e293b',
  color: variant === 'secondary' ? '#94a3b8' : '#fff',
});

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const format = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  }, [input, indent]);

  const minify = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  }, [input]);

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => { setInput(''); setOutput(''); setError(''); };

  const panel: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minHeight: 0,
  };

  const label: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const ta: React.CSSProperties = {
    flex: 1,
    background: '#020817',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '12px',
    color: '#e2e8f0',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none',
    minHeight: '300px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button style={btn('primary')} onClick={format}>Format</button>
        <button style={btn('secondary')} onClick={minify}>Minify</button>
        <select
          value={indent}
          onChange={e => setIndent(Number(e.target.value))}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '6px 10px', fontSize: '13px' }}
        >
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
          <option value={1}>1 tab</option>
        </select>
        <div style={{ flex: 1 }} />
        <button style={btn('secondary')} onClick={copy}>{copied ? '✓ Copied!' : 'Copy Output'}</button>
        <button style={btn('danger')} onClick={clear}>Clear</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px', fontFamily: 'monospace' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
        <div style={panel}>
          <div style={label}>Input JSON</div>
          <textarea
            style={ta}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'{\n  "paste": "your json here"\n}'}
            spellCheck={false}
          />
        </div>
        <div style={panel}>
          <div style={label}>Output</div>
          <textarea
            style={{ ...ta, color: output ? '#86efac' : '#475569' }}
            value={output || (error ? '' : 'Formatted output will appear here...')}
            readOnly
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
