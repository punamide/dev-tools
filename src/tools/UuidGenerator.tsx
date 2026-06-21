import { useState, useEffect, useCallback } from 'react';

const NAMESPACES = {
  DNS:  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL:  '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID:  '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
};

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const h = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

async function generateV5(namespace: string, name: string): Promise<string> {
  const nsBytes = uuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(nsBytes.length + nameBytes.length);
  input.set(nsBytes);
  input.set(nameBytes, nsBytes.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', input));
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return bytesToUuid(hash.slice(0, 16));
}

function genV4(): string {
  return crypto.randomUUID();
}

const btn = (color: string, textColor = '#fff'): React.CSSProperties => ({
  padding: '8px 18px', background: color, color: textColor, border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'opacity 0.15s',
});

const panel: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px',
};

const uuidBox: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '22px',
  fontWeight: 700,
  color: '#a5b4fc',
  background: '#020817',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  padding: '20px 24px',
  letterSpacing: '1px',
  wordBreak: 'break-all',
  lineHeight: '1.5',
};

export default function UuidGenerator() {
  const [tab, setTab] = useState<'v4' | 'v5' | 'bulk'>('v4');

  // V4 state
  const [v4, setV4] = useState(() => genV4());
  const [v4Copied, setV4Copied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // V5 state
  const [nsKey, setNsKey] = useState<keyof typeof NAMESPACES>('DNS');
  const [customNs, setCustomNs] = useState('');
  const [useCustomNs, setUseCustomNs] = useState(false);
  const [v5Name, setV5Name] = useState('');
  const [v5Result, setV5Result] = useState('');
  const [v5Copied, setV5Copied] = useState(false);
  const [v5Error, setV5Error] = useState('');

  // Bulk state
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkList, setBulkList] = useState<string[]>([]);
  const [bulkCopied, setBulkCopied] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setV4(genV4()), 1000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const refreshV4 = useCallback(() => setV4(genV4()), []);

  const copyV4 = () => {
    navigator.clipboard.writeText(v4);
    setV4Copied(true);
    setTimeout(() => setV4Copied(false), 2000);
  };

  const generateV5 = async () => {
    const ns = useCustomNs ? customNs : NAMESPACES[nsKey];
    if (!ns || !v5Name.trim()) { setV5Error('Please provide both a namespace and a name.'); return; }
    try {
      uuidToBytes(ns); // validate format
      const result = await generateV5(ns, v5Name);
      setV5Result(result);
      setV5Error('');
    } catch {
      setV5Error('Invalid namespace UUID format.');
    }
  };

  const copyV5 = () => {
    navigator.clipboard.writeText(v5Result);
    setV5Copied(true);
    setTimeout(() => setV5Copied(false), 2000);
  };

  const generateBulk = () => {
    const list = Array.from({ length: Math.min(Math.max(1, bulkCount), 100) }, () => genV4());
    setBulkList(list);
    setBulkCopied(false);
  };

  const copyBulk = () => {
    navigator.clipboard.writeText(bulkList.join('\n'));
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2000);
  };

  const copyOne = (idx: number) => {
    navigator.clipboard.writeText(bulkList[idx]);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const tabs = [
    { key: 'v4', label: 'V4 Random' },
    { key: 'v5', label: 'V5 SHA-1' },
    { key: 'bulk', label: 'Bulk Generate' },
  ] as const;

  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'block' };
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 20px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.15s',
              background: tab === t.key ? '#4f46e5' : 'transparent',
              color: tab === t.key ? '#fff' : '#64748b',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* V4 Tab */}
      {tab === 'v4' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={panel}>
            <span style={{ ...lbl, color: '#818cf8' }}>Generated UUID v4</span>
            <div style={uuidBox}>{v4}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={btn('#4f46e5')} onClick={refreshV4}>↻ Generate New</button>
              <button style={btn(v4Copied ? '#16a34a' : '#1e293b', v4Copied ? '#fff' : '#94a3b8')} onClick={copyV4}>
                {v4Copied ? '✓ Copied!' : 'Copy'}
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: '8px', fontSize: '13px', color: autoRefresh ? '#818cf8' : '#475569' }}>
                <input type="checkbox" checked={autoRefresh} onChange={() => setAutoRefresh(p => !p)} style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }} />
                Auto-refresh (1s)
              </label>
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
            <span style={lbl}>About UUID v4</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Format', value: '8-4-4-4-12 hex characters' },
                { label: 'Version bits', value: 'Bits 12–15 of 3rd group = 0100' },
                { label: 'Variant bits', value: 'Bits 6–7 of 4th group = 10' },
                { label: 'Randomness', value: '122 bits of entropy' },
                { label: 'Collision risk', value: '~1 in 5.3 × 10³⁶' },
                { label: 'Source', value: 'crypto.randomUUID()' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* UUID anatomy breakdown */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
            <span style={lbl}>UUID Anatomy</span>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', letterSpacing: '0.5px', display: 'flex', flexWrap: 'wrap', gap: '2px', alignItems: 'center' }}>
              {v4.split('-').map((part, i) => {
                const colors = ['#a5b4fc', '#7dd3fc', '#86efac', '#fcd34d', '#f9a8d4'];
                const labels = ['time_low', 'time_mid', 'ver+rand', 'var+rand', 'node'];
                return (
                  <span key={i}>
                    {i > 0 && <span style={{ color: '#334155', margin: '0 2px' }}>-</span>}
                    <span title={labels[i]} style={{ color: colors[i], background: `${colors[i]}18`, padding: '2px 4px', borderRadius: '4px' }}>{part}</span>
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
              {['#a5b4fc', '#7dd3fc', '#86efac', '#fcd34d', '#f9a8d4'].map((c, i) => {
                const labels = ['Random (32 bits)', 'Random (16 bits)', 'Version + Random (16 bits)', 'Variant + Random (16 bits)', 'Random (48 bits)'];
                return <span key={c} style={{ fontSize: '12px', color: c }}>● {labels[i]}</span>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* V5 Tab */}
      {tab === 'v5' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={panel}>
            <span style={lbl}>Namespace</span>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {(Object.keys(NAMESPACES) as Array<keyof typeof NAMESPACES>).map(k => (
                <button
                  key={k}
                  onClick={() => { setNsKey(k); setUseCustomNs(false); }}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: `1px solid ${!useCustomNs && nsKey === k ? '#6366f1' : '#1e293b'}`,
                    background: !useCustomNs && nsKey === k ? 'rgba(99,102,241,0.12)' : '#020817',
                    color: !useCustomNs && nsKey === k ? '#a5b4fc' : '#64748b',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  }}
                >
                  {k}
                </button>
              ))}
              <button
                onClick={() => setUseCustomNs(true)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: `1px solid ${useCustomNs ? '#6366f1' : '#1e293b'}`,
                  background: useCustomNs ? 'rgba(99,102,241,0.12)' : '#020817',
                  color: useCustomNs ? '#a5b4fc' : '#64748b',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                }}
              >
                Custom
              </button>
            </div>

            {useCustomNs ? (
              <input style={{ ...inp, marginBottom: '12px' }} value={customNs} onChange={e => setCustomNs(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false} />
            ) : (
              <div style={{ background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '13px', color: '#4b5563', marginBottom: '12px' }}>
                {NAMESPACES[nsKey]}
              </div>
            )}

            <span style={lbl}>Name</span>
            <input style={inp} value={v5Name} onChange={e => setV5Name(e.target.value)} placeholder={nsKey === 'DNS' ? 'example.com' : nsKey === 'URL' ? 'https://example.com/page' : 'Enter a name...'} spellCheck={false} />

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button style={btn('#4f46e5')} onClick={generateV5}>Generate UUID v5</button>
            </div>

            {v5Error && <div style={{ marginTop: '10px', color: '#fca5a5', fontSize: '13px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px', padding: '8px 12px' }}>⚠ {v5Error}</div>}
          </div>

          {v5Result && (
            <div style={panel}>
              <span style={{ ...lbl, color: '#34d399' }}>Generated UUID v5</span>
              <div style={uuidBox}>{v5Result}</div>
              <button style={{ ...btn(v5Copied ? '#16a34a' : '#1e293b', v5Copied ? '#fff' : '#94a3b8'), marginTop: '12px' }} onClick={copyV5}>
                {v5Copied ? '✓ Copied!' : 'Copy'}
              </button>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                ✓ UUID v5 is deterministic — the same namespace + name will always produce <strong style={{ color: '#64748b' }}>the same UUID</strong>.
              </div>
            </div>
          )}

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
            <span style={lbl}>About UUID v5</span>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.7' }}>
              UUID v5 is generated from a <strong style={{ color: '#64748b' }}>namespace UUID</strong> and a <strong style={{ color: '#64748b' }}>name</strong> using SHA-1 hashing.
              Unlike v4, the same inputs always produce the same UUID — making it ideal for stable identifiers derived from known values
              (e.g. hashing a domain name or a URL into a UUID).
            </p>
          </div>
        </div>
      )}

      {/* Bulk Tab */}
      {tab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={panel}>
            <span style={lbl}>Count</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                min={1}
                max={100}
                value={bulkCount}
                onChange={e => setBulkCount(Math.min(100, Math.max(1, Number(e.target.value))))}
                style={{ ...inp, width: '100px' }}
              />
              <span style={{ fontSize: '13px', color: '#475569' }}>UUIDs (max 100)</span>
              <div style={{ flex: 1 }} />
              {[5, 10, 25, 50, 100].map(n => (
                <button key={n} onClick={() => setBulkCount(n)} style={{ padding: '6px 12px', background: bulkCount === n ? 'rgba(99,102,241,0.12)' : '#1e293b', color: bulkCount === n ? '#a5b4fc' : '#64748b', border: `1px solid ${bulkCount === n ? '#6366f1' : 'transparent'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>{n}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button style={btn('#4f46e5')} onClick={generateBulk}>Generate {bulkCount} UUIDs</button>
              {bulkList.length > 0 && (
                <button style={btn(bulkCopied ? '#16a34a' : '#1e293b', bulkCopied ? '#fff' : '#94a3b8')} onClick={copyBulk}>
                  {bulkCopied ? `✓ Copied ${bulkList.length}!` : `Copy All (${bulkList.length})`}
                </button>
              )}
            </div>
          </div>

          {bulkList.length > 0 && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {bulkList.length} UUIDs Generated
                </span>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {bulkList.map((uuid, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #0d1526', gap: '12px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '11px', color: '#334155', fontFamily: 'monospace', minWidth: '28px' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#94a3b8', letterSpacing: '0.5px' }}>{uuid}</span>
                    <button
                      onClick={() => copyOne(i)}
                      style={{ padding: '3px 10px', background: 'transparent', border: '1px solid #1e293b', color: copiedIdx === i ? '#86efac' : '#334155', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}
                    >
                      {copiedIdx === i ? '✓' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#334155', fontSize: '14px' }}>
              Click "Generate" to create a batch of UUIDs
            </div>
          )}
        </div>
      )}
    </div>
  );
}
