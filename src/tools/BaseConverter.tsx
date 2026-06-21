import { useState, useCallback } from 'react';

// ── Conversion helpers ────────────────────────────────────────────────────────

const BASES = [
  { id: 'bin', label: 'Binary',      base: 2,  prefix: '0b', chars: /^[01]*$/, placeholder: '1010 1111' },
  { id: 'oct', label: 'Octal',       base: 8,  prefix: '0o', chars: /^[0-7]*$/, placeholder: '257' },
  { id: 'dec', label: 'Decimal',     base: 10, prefix: '',   chars: /^-?[0-9]*$/, placeholder: '175' },
  { id: 'hex', label: 'Hexadecimal', base: 16, prefix: '0x', chars: /^[0-9a-fA-F]*$/, placeholder: 'AF' },
] as const;
type BaseId = 'bin' | 'oct' | 'dec' | 'hex';

const COLORS: Record<BaseId, string> = { bin: '#86efac', oct: '#fcd34d', dec: '#a5b4fc', hex: '#f9a8d4' };

function fromBase(s: string, base: number): bigint | null {
  const clean = s.replace(/\s/g, '').toLowerCase();
  if (!clean || clean === '-') return null;
  try {
    if (base === 10) {
      if (!/^-?\d+$/.test(clean)) return null;
      return BigInt(clean);
    }
    if (!/^[0-9a-f]+$/.test(clean)) return null;
    return BigInt(parseInt(clean, base));
  } catch { return null; }
}

function toBase(n: bigint, base: number): string {
  if (n < 0n) {
    if (base === 10) return n.toString();
    return toBase(BigInt.asUintN(32, n), base);
  }
  return n.toString(base).toUpperCase();
}

function formatBin(s: string): string {
  return s.replace(/(.{4})/g, '$1 ').trim();
}

// ── Bit visualizer ────────────────────────────────────────────────────────────

function BitVisualizer({ value, bits }: { value: bigint | null; bits: 8 | 16 | 32 }) {
  const arr = Array.from({ length: bits }, (_, i) => {
    const bit = bits - 1 - i;
    return value !== null ? !!(value & (1n << BigInt(bit))) : null;
  });

  const groups: typeof arr[] = [];
  for (let i = 0; i < arr.length; i += 8) groups.push(arr.slice(i, i + 8));

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {groups.map((grp, gi) => (
        <div key={gi}>
          <div style={{ fontSize: '9px', color: '#334155', textAlign: 'center', marginBottom: '4px' }}>
            {bits - gi * 8 - 1}–{bits - gi * 8 - 8}
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {grp.map((bit, bi) => (
              <div key={bi} style={{
                width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, fontFamily: 'monospace',
                background: bit === null ? '#0d1526' : bit ? 'rgba(99,102,241,0.2)' : '#020817',
                border: `1px solid ${bit === null ? '#0d1526' : bit ? '#6366f1' : '#1e293b'}`,
                color: bit ? '#a5b4fc' : '#1e293b',
                transition: 'all 0.1s',
              }}>
                {bit === null ? '·' : bit ? '1' : '0'}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Quick values ──────────────────────────────────────────────────────────────

const QUICK = [
  { label: '0',      v: 0n },
  { label: '1',      v: 1n },
  { label: '127',    v: 127n },
  { label: '128',    v: 128n },
  { label: '255',    v: 255n },
  { label: '256',    v: 256n },
  { label: '1023',   v: 1023n },
  { label: '1024',   v: 1024n },
  { label: '65535',  v: 65535n },
  { label: '65536',  v: 65536n },
  { label: 'MAX I32', v: BigInt(2 ** 31 - 1) },
  { label: 'MAX U32', v: BigInt(2 ** 32 - 1) },
];

// ── Bitwise ops ───────────────────────────────────────────────────────────────

type Op = 'AND' | 'OR' | 'XOR' | 'NOT' | 'SHL' | 'SHR';

// ── Main component ────────────────────────────────────────────────────────────

export default function BaseConverter() {
  const [inputs, setInputs] = useState<Record<BaseId, string>>({ bin: '', oct: '', dec: '175', hex: '' });
  const [activeBase, setActiveBase] = useState<BaseId>('dec');
  const [bitWidth, setBitWidth] = useState<8 | 16 | 32>(16);
  const [opInput, setOpInput] = useState('');
  const [lastOp, setLastOp] = useState<string>('');
  const [customBase, setCustomBase] = useState('36');

  // The canonical value comes from whichever field the user last edited
  const currentValue = fromBase(inputs[activeBase].replace(/\s/g, ''), BASES.find(b => b.id === activeBase)!.base);

  const setFromValue = useCallback((v: bigint, source: BaseId) => {
    setActiveBase(source);
    const next: Record<BaseId, string> = { bin: '', oct: '', dec: '', hex: '' };
    for (const b of BASES) {
      next[b.id as BaseId] = b.id === 'bin' ? formatBin(toBase(v, 2)) : toBase(v, b.base);
    }
    setInputs(next);
  }, []);

  const handleInput = (id: BaseId, raw: string) => {
    const b = BASES.find(b => b.id === id)!;
    const clean = raw.replace(/\s/g, '');
    if (!b.chars.test(clean)) return;
    setActiveBase(id);
    const v = fromBase(clean, b.base);
    if (v !== null) {
      setFromValue(v, id);
    } else {
      setInputs(prev => ({ ...prev, [id]: id === 'bin' ? raw.replace(/[^01\s]/g, '') : raw }));
    }
  };

  const applyOp = (op: Op) => {
    if (currentValue === null) return;
    const other = fromBase(opInput.replace(/\s/g, ''), 10);
    let result: bigint;
    try {
      switch (op) {
        case 'NOT': result = BigInt.asIntN(32, ~currentValue); break;
        case 'SHL': result = currentValue << (other ?? 1n); break;
        case 'SHR': result = currentValue >> (other ?? 1n); break;
        case 'AND': if (other === null) return; result = currentValue & other; break;
        case 'OR':  if (other === null) return; result = currentValue | other; break;
        case 'XOR': if (other === null) return; result = currentValue ^ other; break;
        default: return;
      }
      setFromValue(result, 'dec');
      setLastOp(`${op}${other !== null ? ` ${other}` : ''} = ${result}`);
    } catch { setLastOp('Error: result too large'); }
  };

  // ASCII / Unicode
  const charCode = currentValue !== null && currentValue >= 0n && currentValue <= 0x10FFFFn ? Number(currentValue) : null;
  const char = charCode !== null ? String.fromCodePoint(charCode) : null;
  const isPrintable = charCode !== null && charCode >= 0x20 && charCode !== 0x7F;

  // Signed interpretation (32-bit two's complement)
  const signed32 = currentValue !== null ? BigInt.asIntN(32, currentValue) : null;
  const unsigned32 = currentValue !== null ? BigInt.asUintN(32, currentValue) : null;

  // Custom base
  const customN = Math.min(36, Math.max(2, parseInt(customBase, 10) || 10));
  const customOut = currentValue !== null && currentValue >= 0n ? currentValue.toString(customN).toUpperCase() : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Main base inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        {BASES.map(({ id, label, base, prefix, placeholder }) => {
          const bid = id as BaseId;
          const active = activeBase === bid && currentValue !== null;
          const color = COLORS[bid];
          return (
            <div key={id} style={{ background: '#0f172a', border: `1px solid ${active ? color + '50' : '#1e293b'}`, borderTop: `2px solid ${active ? color : '#1e293b'}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ fontSize: '10px', color: '#334155', fontFamily: 'monospace' }}>base {base}</span>
              </div>
              <div style={{ position: 'relative' }}>
                {prefix && (
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#334155', fontFamily: 'monospace', pointerEvents: 'none' }}>{prefix}</span>
                )}
                <input
                  value={inputs[bid]}
                  onChange={e => handleInput(bid, e.target.value)}
                  onFocus={() => setActiveBase(bid)}
                  placeholder={placeholder}
                  spellCheck={false}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#020817', border: `1px solid ${active ? color + '40' : '#1e293b'}`,
                    borderRadius: '8px', padding: `10px 10px 10px ${prefix ? `${prefix.length * 10 + 10}px` : '10px'}`,
                    color: active ? color : '#64748b', fontFamily: "'JetBrains Mono', monospace",
                    fontSize: bid === 'bin' ? '13px' : '16px', fontWeight: 600, outline: 'none', letterSpacing: bid === 'bin' ? '1px' : '0',
                  }}
                />
              </div>
              {/* Copy */}
              <button
                onClick={() => navigator.clipboard.writeText(inputs[bid])}
                style={{ alignSelf: 'flex-start', padding: '3px 10px', background: 'transparent', border: '1px solid #1e293b', color: '#334155', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>
                copy
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick values */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Quick Values</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {QUICK.map(({ label, v }) => (
            <button key={label} onClick={() => setFromValue(v, 'dec')}
              style={{ padding: '4px 12px', background: currentValue === v ? 'rgba(99,102,241,0.15)' : '#020817', border: `1px solid ${currentValue === v ? '#6366f1' : '#1e293b'}`, color: currentValue === v ? '#a5b4fc' : '#64748b', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bit visualizer */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bit View</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {([8, 16, 32] as const).map(w => (
              <button key={w} onClick={() => setBitWidth(w)} style={{ padding: '3px 10px', borderRadius: '5px', border: `1px solid ${bitWidth === w ? '#6366f1' : '#1e293b'}`, background: bitWidth === w ? 'rgba(99,102,241,0.15)' : 'transparent', color: bitWidth === w ? '#a5b4fc' : '#475569', cursor: 'pointer', fontSize: '12px' }}>
                {w}-bit
              </button>
            ))}
          </div>
          {currentValue !== null && (
            <span style={{ fontSize: '12px', color: '#334155', marginLeft: 'auto' }}>
              MSB → LSB
            </span>
          )}
        </div>
        <BitVisualizer value={currentValue !== null ? BigInt.asUintN(bitWidth, currentValue < 0n ? BigInt.asUintN(32, currentValue) : currentValue) : null} bits={bitWidth} />
      </div>

      {/* Properties + Bitwise ops */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Properties */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>Properties</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Decimal (signed)',   value: signed32 !== null ? String(signed32) : '—', color: '#a5b4fc' },
              { label: 'Decimal (unsigned)', value: unsigned32 !== null ? String(unsigned32) : '—', color: '#94a3b8' },
              { label: 'Bits set',           value: currentValue !== null ? String([...BigInt.asUintN(32, currentValue < 0n ? BigInt.asUintN(32, currentValue) : currentValue).toString(2)].filter(c => c === '1').length) : '—', color: '#86efac' },
              { label: 'Bit length',         value: currentValue !== null && currentValue >= 0n ? String(currentValue.toString(2).length) : '—', color: '#7dd3fc' },
              { label: 'Even / Odd',         value: currentValue !== null ? (currentValue % 2n === 0n ? 'Even' : 'Odd') : '—', color: '#fcd34d' },
              { label: 'Power of 2',         value: currentValue !== null && currentValue > 0n ? ((currentValue & (currentValue - 1n)) === 0n ? '✓ Yes' : '✗ No') : '—', color: '#fb923c' },
              {
                label: 'ASCII / Unicode',
                value: char
                  ? (isPrintable ? `'${char}'` : `U+${charCode!.toString(16).toUpperCase().padStart(4, '0')} (control)`)
                  : '—',
                color: '#f9a8d4',
              },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#020817', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: '#475569' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Custom base */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#475569' }}>Base</span>
              <input type="number" min={2} max={36} value={customBase} onChange={e => setCustomBase(e.target.value)}
                style={{ width: '52px', background: '#020817', border: '1px solid #1e293b', borderRadius: '5px', padding: '4px 8px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', outline: 'none' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#c4b5fd', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customOut}</span>
            </div>
          </div>
        </div>

        {/* Bitwise operations */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>Bitwise Operations</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#334155', marginBottom: '4px' }}>Operand (decimal)</div>
              <input value={opInput} onChange={e => setOpInput(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="e.g. 255"
                style={{ width: '100%', boxSizing: 'border-box', background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '7px 10px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '13px', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {(['AND', 'OR', 'XOR', 'SHL', 'SHR', 'NOT'] as Op[]).map(op => (
                <button key={op} onClick={() => applyOp(op)}
                  style={{ padding: '7px 4px', background: '#020817', border: '1px solid #1e293b', color: '#64748b', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#a5b4fc'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#64748b'; }}>
                  {op}
                </button>
              ))}
            </div>
            {lastOp && (
              <div style={{ background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#818cf8', fontFamily: 'monospace' }}>
                ← {lastOp}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#1e293b', lineHeight: '1.5' }}>
              AND, OR, XOR require an operand. NOT, SHL, SHR work on the current value (SHL/SHR use operand as shift amount, default 1).
            </div>
          </div>
        </div>
      </div>

      {/* Reference table */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>Quick Reference</span>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Dec', 'Hex', 'Oct', 'Bin', 'Char'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: '#334155', borderBottom: '1px solid #1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,32,48,65,97,127,128,255].map(n => (
                <tr key={n} onClick={() => setFromValue(BigInt(n), 'dec')} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0d1526')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '5px 12px', color: currentValue === BigInt(n) ? '#a5b4fc' : '#64748b', borderBottom: '1px solid #0d1526' }}>{n}</td>
                  <td style={{ padding: '5px 12px', color: currentValue === BigInt(n) ? '#f9a8d4' : '#475569', borderBottom: '1px solid #0d1526' }}>{n.toString(16).toUpperCase()}</td>
                  <td style={{ padding: '5px 12px', color: currentValue === BigInt(n) ? '#fcd34d' : '#475569', borderBottom: '1px solid #0d1526' }}>{n.toString(8)}</td>
                  <td style={{ padding: '5px 12px', color: currentValue === BigInt(n) ? '#86efac' : '#334155', borderBottom: '1px solid #0d1526' }}>{formatBin(n.toString(2))}</td>
                  <td style={{ padding: '5px 12px', color: '#64748b', borderBottom: '1px solid #0d1526' }}>
                    {n >= 0x20 && n < 0x7F ? String.fromCharCode(n) : n === 32 ? 'SP' : n === 127 ? 'DEL' : n < 32 ? `^${String.fromCharCode(n + 64)}` : '·'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
