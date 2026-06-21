import { useState } from 'react';

function b64Decode(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return atob(padded);
  } catch {
    throw new Error('Invalid Base64');
  }
}

function decodeJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token must have 3 parts (header.payload.signature)');
  const header = JSON.parse(b64Decode(parts[0]));
  const payload = JSON.parse(b64Decode(parts[1]));
  return { header, payload, signature: parts[2] };
}

const panel: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  padding: '16px',
};

const label: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
};

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<{ header: object; payload: object; signature: string } | null>(null);
  const [error, setError] = useState('');

  const decode = () => {
    const t = token.trim();
    if (!t) return;
    try {
      setResult(decodeJwt(t));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  };

  const payload = result?.payload as Record<string, unknown> | null;
  const exp = payload?.exp as number | undefined;
  const isExpired = exp ? exp < Date.now() / 1000 : null;
  const expDate = exp ? new Date(exp * 1000).toLocaleString() : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={panel}>
        <div style={label}>JWT Token</div>
        <textarea
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste your JWT token here... eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.6', resize: 'vertical', outline: 'none' }}
          spellCheck={false}
        />
        <button
          onClick={decode}
          style={{ marginTop: '10px', padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
        >
          Decode
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px' }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <>
          {exp !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: isExpired ? 'rgba(220,38,38,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${isExpired ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
              <span style={{ fontSize: '16px' }}>{isExpired ? '⛔' : '✅'}</span>
              <span style={{ fontSize: '13px', color: isExpired ? '#fca5a5' : '#86efac' }}>
                Token is {isExpired ? 'EXPIRED' : 'VALID'} — expires {expDate}
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={panel}>
              <div style={{ ...label, color: '#818cf8' }}>Header</div>
              <pre style={{ margin: 0, background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.6', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(result.header, null, 2)}
              </pre>
            </div>
            <div style={panel}>
              <div style={{ ...label, color: '#34d399' }}>Payload</div>
              <pre style={{ margin: 0, background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#6ee7b7', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.6', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            </div>
          </div>

          <div style={panel}>
            <div style={{ ...label, color: '#f59e0b' }}>Signature</div>
            <div style={{ background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#fcd34d', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', wordBreak: 'break-all', lineHeight: '1.6' }}>
              {result.signature}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '8px' }}>⚠ The signature is not verified — this tool only decodes the token, it does not validate it.</div>
          </div>
        </>
      )}
    </div>
  );
}
