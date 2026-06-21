import { useState, useCallback } from 'react';

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  if (h.length !== 6 && h.length !== 3) return null;
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360, sn = s / 100, ln = l / 100;
  if (sn === 0) { const v = Math.round(ln * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return [Math.round(hue2rgb(p, q, hn + 1/3) * 255), Math.round(hue2rgb(p, q, hn) * 255), Math.round(hue2rgb(p, q, hn - 1/3) * 255)];
}

const inp: React.CSSProperties = { background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' };

export default function ColorConverter() {
  const [hex, setHex] = useState('#6366f1');
  const [rgb, setRgb] = useState<[number, number, number]>([99, 102, 241]);
  const [hsl, setHsl] = useState<[number, number, number]>([239, 84, 67]);
  const [copied, setCopied] = useState('');

  const fromHex = useCallback((val: string) => {
    setHex(val);
    const r = hexToRgb(val);
    if (r) { setRgb(r); setHsl(rgbToHsl(...r)); }
  }, []);

  const fromRgb = useCallback((r: number, g: number, b: number) => {
    setRgb([r, g, b]);
    setHex(rgbToHex(r, g, b));
    setHsl(rgbToHsl(r, g, b));
  }, []);

  const fromHsl = useCallback((h: number, s: number, l: number) => {
    setHsl([h, s, l]);
    const r = hslToRgb(h, s, l);
    setRgb(r);
    setHex(rgbToHex(...r));
  }, []);

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(''), 2000);
  };

  const panel: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' };
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'block' };

  const colorRow = (label: string, value: string, copyVal: string, children: React.ReactNode) => (
    <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={lbl}>{label}</span>
        <button onClick={() => copy(copyVal)} style={{ padding: '4px 10px', background: '#1e293b', color: copied === copyVal ? '#86efac' : '#94a3b8', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>
          {copied === copyVal ? '✓' : 'Copy'}
        </button>
      </div>
      {children}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#818cf8', background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 12px' }}>{value}</div>
    </div>
  );

  const colorStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const hslStr = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Color preview */}
      <div style={{ ...panel, display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '12px', background: hex, border: '2px solid #1e293b', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9', marginBottom: '4px' }}>{hex.toUpperCase()}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>{colorStr}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>{hslStr}</div>
        </div>
        <input type="color" value={hex} onChange={e => fromHex(e.target.value)} style={{ width: 48, height: 48, borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent', padding: 0 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {colorRow('HEX', hex.toUpperCase(), hex.toUpperCase(),
          <input style={inp} value={hex} onChange={e => fromHex(e.target.value)} placeholder="#6366f1" spellCheck={false} />
        )}
        {colorRow('RGB', colorStr, colorStr,
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {(['R', 'G', 'B'] as const).map((c, i) => (
              <div key={c}>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px', fontFamily: 'monospace' }}>{c}</div>
                <input style={inp} type="number" min={0} max={255} value={rgb[i]} onChange={e => { const v = [...rgb] as [number,number,number]; v[i] = Number(e.target.value); fromRgb(...v); }} />
              </div>
            ))}
          </div>
        )}
        {colorRow('HSL', hslStr, hslStr,
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {(['H', 'S', 'L'] as const).map((c, i) => (
              <div key={c}>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px', fontFamily: 'monospace' }}>{c}{i > 0 ? '%' : '°'}</div>
                <input style={inp} type="number" min={0} max={i === 0 ? 360 : 100} value={hsl[i]} onChange={e => { const v = [...hsl] as [number,number,number]; v[i] = Number(e.target.value); fromHsl(...v); }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shades */}
      <div style={panel}>
        <span style={{ ...lbl, marginBottom: '12px', display: 'block' }}>Shades</span>
        <div style={{ display: 'flex', gap: '4px', height: '48px' }}>
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(l => {
            const shade = rgbToHex(...hslToRgb(hsl[0], hsl[1], l));
            return (
              <div key={l} title={`${shade} (L: ${l}%)`} onClick={() => fromHex(shade)} style={{ flex: 1, background: shade, borderRadius: '4px', cursor: 'pointer', position: 'relative', transition: 'transform 0.1s' }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(l => <div key={l} style={{ flex: 1, fontSize: '10px', color: '#334155', textAlign: 'center' }}>{l}%</div>)}
        </div>
      </div>
    </div>
  );
}
