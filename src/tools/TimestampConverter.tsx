import { useState, useEffect } from 'react';

const panel: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' };
const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'block' };
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', outline: 'none' };

export default function TimestampConverter() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [tsInput, setTsInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [tsResult, setTsResult] = useState('');
  const [dateResult, setDateResult] = useState('');
  const [copiedNow, setCopiedNow] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const convertTs = () => {
    const n = Number(tsInput);
    if (!tsInput || isNaN(n)) { setDateResult('Invalid timestamp'); return; }
    const ms = tsInput.length >= 13 ? n : n * 1000;
    const d = new Date(ms);
    setDateResult(
      `Local:   ${d.toLocaleString()}\nUTC:     ${d.toUTCString()}\nISO:     ${d.toISOString()}\nRelative: ${relativeTime(d)}`
    );
  };

  const convertDate = () => {
    if (!dateInput) return;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) { setTsResult('Invalid date'); return; }
    setTsResult(
      `Seconds:      ${Math.floor(d.getTime() / 1000)}\nMilliseconds: ${d.getTime()}`
    );
  };

  const relativeTime = (d: Date): string => {
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 0) return `in ${relSuffix(-diff)}`;
    if (diff < 5) return 'just now';
    return `${relSuffix(diff)} ago`;
  };

  const relSuffix = (s: number): string => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    if (s < 31536000) return `${Math.floor(s/86400)}d`;
    return `${Math.floor(s/31536000)}y`;
  };

  const copyNow = () => {
    navigator.clipboard.writeText(String(now));
    setCopiedNow(true);
    setTimeout(() => setCopiedNow(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Live clock */}
      <div style={{ ...panel, background: 'linear-gradient(135deg,#0f172a,#1a1040)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <span style={lbl}>Current Unix Timestamp</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '-1px' }}>
            {now}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{new Date().toUTCString()}</span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>ms: {Date.now()}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={copyNow} style={{ padding: '8px 14px', background: '#1e293b', color: copiedNow ? '#86efac' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            {copiedNow ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Timestamp → Date */}
        <div style={panel}>
          <span style={lbl}>Timestamp → Date</span>
          <input style={inp} value={tsInput} onChange={e => setTsInput(e.target.value)} placeholder="1718000000 (seconds or ms)" />
          <button onClick={convertTs} style={{ marginTop: '10px', padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Convert</button>
          {dateResult && (
            <pre style={{ marginTop: '12px', background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#6ee7b7', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.8', whiteSpace: 'pre-wrap', margin: 0 }}>
              {dateResult}
            </pre>
          )}
        </div>

        {/* Date → Timestamp */}
        <div style={panel}>
          <span style={lbl}>Date → Timestamp</span>
          <input style={inp} type="datetime-local" value={dateInput} onChange={e => setDateInput(e.target.value)} />
          <button onClick={convertDate} style={{ marginTop: '10px', padding: '8px 16px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Convert</button>
          {tsResult && (
            <pre style={{ marginTop: '12px', background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.8', whiteSpace: 'pre-wrap', margin: 0 }}>
              {tsResult}
            </pre>
          )}
        </div>
      </div>

      {/* Common timestamps */}
      <div style={panel}>
        <span style={lbl}>Common Timestamps</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            ['Unix Epoch', 0],
            ['Y2K', 946684800],
            ['Now', now],
            ['1 hour ago', now - 3600],
            ['Yesterday', now - 86400],
            ['1 week ago', now - 604800],
          ].map(([label, ts]) => (
            <button
              key={label}
              onClick={() => { setTsInput(String(ts)); }}
              style={{ padding: '6px 12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
