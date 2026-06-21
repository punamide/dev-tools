import { useState, useMemo } from 'react';
import { diffLines, type Change } from 'diff';

const SAMPLE_A = `function greet(name) {
  const message = "Hello, " + name;
  console.log(message);
  return message;
}

const result = greet("World");`;

const SAMPLE_B = `function greet(name: string): string {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
}

const result = greet("Developer");
console.log(result);`;

export default function DiffChecker() {
  const [left, setLeft] = useState(SAMPLE_A);
  const [right, setRight] = useState(SAMPLE_B);

  const changes: Change[] = useMemo(() => diffLines(left, right), [left, right]);

  const added = changes.filter(c => c.added).reduce((a, c) => a + (c.count ?? 0), 0);
  const removed = changes.filter(c => c.removed).reduce((a, c) => a + (c.count ?? 0), 0);
  const unchanged = changes.filter(c => !c.added && !c.removed).reduce((a, c) => a + (c.count ?? 0), 0);

  const ta: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#020817', border: '1px solid #1e293b', borderRadius: '8px',
    padding: '12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px', lineHeight: '1.7', resize: 'none', outline: 'none', minHeight: '200px',
  };

  const panel: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' };
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' };

  const clear = () => { setLeft(''); setRight(''); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#86efac', background: 'rgba(34,197,94,0.08)', padding: '4px 10px', borderRadius: '6px' }}>+{added} added</span>
          <span style={{ fontSize: '13px', color: '#fca5a5', background: 'rgba(220,38,38,0.08)', padding: '4px 10px', borderRadius: '6px' }}>−{removed} removed</span>
          <span style={{ fontSize: '13px', color: '#64748b', background: '#0f172a', padding: '4px 10px', borderRadius: '6px' }}>{unchanged} unchanged</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={clear} style={{ padding: '6px 12px', background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={panel}>
          <div style={lbl}>Original</div>
          <textarea style={ta} value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text..." spellCheck={false} />
        </div>
        <div style={panel}>
          <div style={lbl}>Modified</div>
          <textarea style={ta} value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text..." spellCheck={false} />
        </div>
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Diff Output
        </div>
        {changes.length === 0 || (left === '' && right === '') ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#334155', fontSize: '14px' }}>Enter text in both fields to see the diff</div>
        ) : left === right ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#22c55e', fontSize: '14px' }}>✓ Files are identical — no differences found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {changes.map((change, i) => {
              const lines = change.value.split('\n');
              const hasTrailingNewline = change.value.endsWith('\n');
              const displayLines = hasTrailingNewline ? lines.slice(0, -1) : lines;
              return displayLines.map((line, j) => (
                <div
                  key={`${i}-${j}`}
                  style={{
                    display: 'flex',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    lineHeight: '1.7',
                    background: change.added ? 'rgba(34,197,94,0.06)' : change.removed ? 'rgba(220,38,38,0.06)' : 'transparent',
                    borderLeft: `3px solid ${change.added ? '#22c55e' : change.removed ? '#dc2626' : 'transparent'}`,
                  }}
                >
                  <span style={{ color: change.added ? '#22c55e' : change.removed ? '#dc2626' : '#334155', padding: '0 10px', userSelect: 'none', flexShrink: 0, minWidth: '20px', textAlign: 'center' }}>
                    {change.added ? '+' : change.removed ? '−' : ' '}
                  </span>
                  <span style={{ color: change.added ? '#86efac' : change.removed ? '#fca5a5' : '#64748b', padding: '0 12px 0 4px', flex: 1, whiteSpace: 'pre' }}>
                    {line}
                  </span>
                </div>
              ));
            })}
          </div>
        )}
      </div>
    </div>
  );
}
