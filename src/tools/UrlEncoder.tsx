import { useState } from 'react';

const ta: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#020817', border: '1px solid #1e293b', borderRadius: '8px',
  padding: '12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace",
  fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', minHeight: '140px',
};

export default function UrlEncoder() {
  const [input, setInput] = useState('');
  const [encoded, setEncoded] = useState('');
  const [decoded, setDecoded] = useState('');
  const [error, setError] = useState('');
  const [copiedEnc, setCopiedEnc] = useState(false);
  const [copiedDec, setCopiedDec] = useState(false);

  const run = () => {
    if (!input.trim()) return;
    setError('');
    try {
      setEncoded(encodeURIComponent(input));
    } catch (e) {
      setEncoded('');
    }
    try {
      setDecoded(decodeURIComponent(input));
    } catch (e) {
      setDecoded('Could not decode — input may not be valid URL-encoded text');
    }
  };

  const clear = () => { setInput(''); setEncoded(''); setDecoded(''); setError(''); };

  const copy = (val: string, set: (v: boolean) => void) => {
    navigator.clipboard.writeText(val);
    set(true);
    setTimeout(() => set(false), 2000);
  };

  const panel: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' };
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={panel}>
        <div style={lbl}>Input</div>
        <textarea style={ta} value={input} onChange={e => setInput(e.target.value)} placeholder={'Enter text or URL-encoded string...\n\nhttps://example.com/search?q=hello world&lang=en'} spellCheck={false} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={run} style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            Encode &amp; Decode
          </button>
          <button onClick={clear} style={{ padding: '8px 14px', background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...lbl, color: '#818cf8' }}>URL Encoded</div>
            <button onClick={() => copy(encoded, setCopiedEnc)} style={{ padding: '4px 10px', background: '#1e293b', color: copiedEnc ? '#86efac' : '#94a3b8', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>{copiedEnc ? '✓' : 'Copy'}</button>
          </div>
          <textarea style={{ ...ta, color: encoded ? '#a5b4fc' : '#475569', minHeight: '120px' }} value={encoded || 'Encoded output...'} readOnly spellCheck={false} />
        </div>
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...lbl, color: '#34d399' }}>URL Decoded</div>
            <button onClick={() => copy(decoded, setCopiedDec)} style={{ padding: '4px 10px', background: '#1e293b', color: copiedDec ? '#86efac' : '#94a3b8', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>{copiedDec ? '✓' : 'Copy'}</button>
          </div>
          <textarea style={{ ...ta, color: decoded ? '#6ee7b7' : '#475569', minHeight: '120px' }} value={decoded || 'Decoded output...'} readOnly spellCheck={false} />
        </div>
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 16px' }}>
        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', fontWeight: 600 }}>Quick reference</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[['Space', '%20'], ['/', '%2F'], ['?', '%3F'], ['=', '%3D'], ['&', '%26'], ['#', '%23'], ['+', '%2B'], ['@', '%40'], [':', '%3A']].map(([char, enc]) => (
            <span key={char} style={{ display: 'inline-flex', gap: '4px', fontSize: '12px', fontFamily: 'monospace', background: '#1e293b', padding: '2px 8px', borderRadius: '4px' }}>
              <span style={{ color: '#94a3b8' }}>{char}</span>
              <span style={{ color: '#475569' }}>→</span>
              <span style={{ color: '#818cf8' }}>{enc}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
