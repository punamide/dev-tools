import { useState } from 'react';

const ta: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#020817', border: '1px solid #1e293b', borderRadius: '8px',
  padding: '12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', minHeight: '160px',
};

const btn = (color = '#4f46e5'): React.CSSProperties => ({
  padding: '8px 18px', background: color, color: '#fff', border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
});

export default function Base64Tool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);

  const run = (m: 'encode' | 'decode') => {
    setMode(m);
    if (!input.trim()) return;
    try {
      if (m === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))));
      }
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swap = () => {
    setInput(output);
    setOutput('');
    setError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Input</div>
        <textarea style={ta} value={input} onChange={e => setInput(e.target.value)} placeholder="Enter text to encode or Base64 to decode..." spellCheck={false} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={btn('#4f46e5')} onClick={() => run('encode')}>Encode to Base64</button>
          <button style={btn('#0891b2')} onClick={() => run('decode')}>Decode from Base64</button>
          <button style={{ ...btn('#1e293b'), color: '#94a3b8' }} onClick={() => { setInput(''); setOutput(''); setError(''); }}>Clear</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Output ({mode === 'encode' ? 'Base64 encoded' : 'Decoded text'})
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={{ ...btn('#1e293b'), color: '#94a3b8', fontSize: '12px', padding: '5px 10px' }} onClick={swap}>↕ Use as input</button>
            <button style={{ ...btn('#1e293b'), color: copied ? '#86efac' : '#94a3b8', fontSize: '12px', padding: '5px 10px' }} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
        </div>
        <textarea style={{ ...ta, color: output ? '#86efac' : '#475569' }} value={output || 'Output will appear here...'} readOnly spellCheck={false} />
        {output && (
          <div style={{ fontSize: '12px', color: '#475569' }}>
            {mode === 'encode' ? `Input: ${input.length} chars → Output: ${output.length} chars` : `Input: ${input.length} chars → Output: ${output.length} chars`}
          </div>
        )}
      </div>
    </div>
  );
}
