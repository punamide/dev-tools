import { useState, useMemo } from 'react';

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false });
  const [testStr, setTestStr] = useState('');

  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('');

  const { matches, error, highlighted } = useMemo(() => {
    if (!pattern || !testStr) return { matches: [], error: '', highlighted: testStr };
    try {
      const re = new RegExp(pattern, flagStr);
      const ms: RegExpExecArray[] = [];
      if (flags.g) {
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(testStr)) !== null) {
          ms.push(m);
          if (m[0].length === 0) re.lastIndex++;
        }
      } else {
        const m = re.exec(testStr);
        if (m) ms.push(m);
      }
      return { matches: ms, error: '', highlighted: testStr };
    } catch (e) {
      return { matches: [], error: (e as Error).message, highlighted: testStr };
    }
  }, [pattern, flagStr, testStr, flags.g]);

  const panel: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' };
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'block' };

  const renderHighlighted = () => {
    if (!matches.length || !testStr) return <span style={{ color: '#475569' }}>Matches will be highlighted here...</span>;
    const parts: React.ReactNode[] = [];
    let last = 0;
    for (const m of matches) {
      if (m.index > last) parts.push(<span key={`t-${last}`} style={{ color: '#94a3b8' }}>{testStr.slice(last, m.index)}</span>);
      parts.push(<mark key={`m-${m.index}`} style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '2px', padding: '0 1px' }}>{m[0]}</mark>);
      last = m.index + m[0].length;
    }
    if (last < testStr.length) parts.push(<span key="t-end" style={{ color: '#94a3b8' }}>{testStr.slice(last)}</span>);
    return parts;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={panel}>
        <span style={lbl}>Pattern</span>
        <div style={{ display: 'flex', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
          <span style={{ background: '#1e293b', color: '#475569', padding: '10px 12px', fontFamily: 'monospace', fontSize: '16px', userSelect: 'none' }}>/</span>
          <input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="your-pattern-here"
            style={{ flex: 1, background: '#020817', border: 'none', padding: '10px 12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', outline: 'none' }}
            spellCheck={false}
          />
          <span style={{ background: '#1e293b', color: '#475569', padding: '10px 12px', fontFamily: 'monospace', fontSize: '16px', userSelect: 'none' }}>/{flagStr}</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
          {(Object.keys(flags) as Array<keyof typeof flags>).map(f => (
            <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: flags[f] ? '#818cf8' : '#475569' }}>
              <input type="checkbox" checked={flags[f]} onChange={() => setFlags(p => ({ ...p, [f]: !p[f] }))} style={{ accentColor: '#4f46e5' }} />
              <code style={{ fontSize: '12px' }}>{f}</code>
              <span style={{ color: '#334155' }}>— {f === 'g' ? 'global' : f === 'i' ? 'case insensitive' : f === 'm' ? 'multiline' : 'dot all'}</span>
            </label>
          ))}
        </div>
        {error && <div style={{ marginTop: '10px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px', padding: '8px 12px', color: '#fca5a5', fontSize: '13px', fontFamily: 'monospace' }}>⚠ {error}</div>}
      </div>

      <div style={panel}>
        <span style={lbl}>Test String</span>
        <textarea
          value={testStr}
          onChange={e => setTestStr(e.target.value)}
          placeholder="Enter text to test against the pattern..."
          rows={5}
          style={{ width: '100%', boxSizing: 'border-box', background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none' }}
          spellCheck={false}
        />
      </div>

      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={lbl}>Matches</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: matches.length ? '#818cf8' : '#475569', background: matches.length ? 'rgba(99,102,241,0.1)' : 'transparent', padding: '2px 10px', borderRadius: '999px' }}>
            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
        <div style={{ background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.8', minHeight: '80px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {renderHighlighted()}
        </div>
        {matches.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {matches.map((m, i) => (
              <div key={i} style={{ background: '#1e293b', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#475569' }}>#{i + 1}</span>
                <span style={{ color: '#a5b4fc', flex: 1 }}>{JSON.stringify(m[0])}</span>
                <span style={{ color: '#475569' }}>index: {m.index}</span>
                {m.length > 1 && <span style={{ color: '#6ee7b7' }}>groups: [{m.slice(1).map(g => JSON.stringify(g)).join(', ')}]</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
