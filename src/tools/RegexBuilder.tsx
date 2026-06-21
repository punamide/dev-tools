import { useState, useMemo, useId } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type TokenType =
  | 'literal' | 'any'
  | 'digit' | 'nonDigit' | 'word' | 'nonWord' | 'space' | 'nonSpace'
  | 'start' | 'end' | 'wordBoundary' | 'nonWordBoundary'
  | 'charSet' | 'negCharSet'
  | 'group' | 'nonCapGroup' | 'lookahead' | 'negLookahead'
  | 'alternation';

type Quant = '' | '?' | '*' | '+' | '{n}' | '{n,m}' | '{n,}';

interface Token {
  id: string;
  type: TokenType;
  value: string;
  quant: Quant;
  quantN: string;
  quantM: string;
  lazy: boolean;
}

// ── Regex logic ───────────────────────────────────────────────────────────────

function escRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function quantStr(t: Token): string {
  if (!t.quant) return '';
  let q = '';
  if (t.quant === '{n}') q = `{${t.quantN || '1'}}`;
  else if (t.quant === '{n,m}') q = `{${t.quantN || '1'},${t.quantM || '2'}}`;
  else if (t.quant === '{n,}') q = `{${t.quantN || '1'},}`;
  else q = t.quant;
  return q + (t.lazy && t.quant !== '' ? '?' : '');
}

function tokenToRegex(t: Token): string {
  const q = quantStr(t);
  switch (t.type) {
    case 'literal':          return (t.value.length > 1 && q) ? `(?:${escRe(t.value)})${q}` : `${escRe(t.value)}${q}`;
    case 'any':              return `.${q}`;
    case 'digit':            return `\\d${q}`;
    case 'nonDigit':         return `\\D${q}`;
    case 'word':             return `\\w${q}`;
    case 'nonWord':          return `\\W${q}`;
    case 'space':            return `\\s${q}`;
    case 'nonSpace':         return `\\S${q}`;
    case 'start':            return '^';
    case 'end':              return '$';
    case 'wordBoundary':     return '\\b';
    case 'nonWordBoundary':  return '\\B';
    case 'charSet':          return `[${t.value}]${q}`;
    case 'negCharSet':       return `[^${t.value}]${q}`;
    case 'group':            return `(${t.value})${q}`;
    case 'nonCapGroup':      return `(?:${t.value})${q}`;
    case 'lookahead':        return `(?=${t.value})`;
    case 'negLookahead':     return `(?!${t.value})`;
    case 'alternation':      return '|';
    default:                 return '';
  }
}

function tokenToExplanation(t: Token): string {
  const q = quantStr(t);
  const qs = q ? ` (${
    q === '?' ? 'zero or one' : q === '*' ? 'zero or more' : q === '+' ? 'one or more'
    : q.startsWith('{') ? `repeat ${q}` : q
  }${t.lazy ? ', lazy' : ''})` : '';
  switch (t.type) {
    case 'literal':         return `literal text "${t.value}"${qs}`;
    case 'any':             return `any character except newline${qs}`;
    case 'digit':           return `any digit [0-9]${qs}`;
    case 'nonDigit':        return `any non-digit${qs}`;
    case 'word':            return `any word character [a-zA-Z0-9_]${qs}`;
    case 'nonWord':         return `any non-word character${qs}`;
    case 'space':           return `any whitespace character${qs}`;
    case 'nonSpace':        return `any non-whitespace${qs}`;
    case 'start':           return 'start of string/line (^)';
    case 'end':             return 'end of string/line ($)';
    case 'wordBoundary':    return 'word boundary (\\b)';
    case 'nonWordBoundary': return 'non-word boundary (\\B)';
    case 'charSet':         return `one character from set [${t.value}]${qs}`;
    case 'negCharSet':      return `one character NOT in [${t.value}]${qs}`;
    case 'group':           return `capture group matching "${t.value}"${qs}`;
    case 'nonCapGroup':     return `non-capturing group matching "${t.value}"${qs}`;
    case 'lookahead':       return `positive lookahead — position followed by "${t.value}"`;
    case 'negLookahead':    return `negative lookahead — position NOT followed by "${t.value}"`;
    case 'alternation':     return 'OR — match left or right alternative';
    default:                return '';
  }
}

// ── Common quick-add patterns ─────────────────────────────────────────────────

const QUICK_PATTERNS: { label: string; desc: string; tokens: Omit<Token, 'id'>[] }[] = [
  {
    label: 'Email address',
    desc: 'user@example.com',
    tokens: [
      { type: 'charSet', value: '\\w.+\\-', quant: '+', quantN: '', quantM: '', lazy: false },
      { type: 'literal', value: '@', quant: '', quantN: '', quantM: '', lazy: false },
      { type: 'charSet', value: '\\w\\-', quant: '+', quantN: '', quantM: '', lazy: false },
      { type: 'literal', value: '\\.', quant: '', quantN: '', quantM: '', lazy: false },
      { type: 'charSet', value: '\\w.', quant: '+', quantN: '', quantM: '', lazy: false },
    ],
  },
  {
    label: 'URL (http/https)',
    desc: 'https://example.com',
    tokens: [
      { type: 'literal', value: 'https', quant: '', quantN: '', quantM: '', lazy: false },
      { type: 'literal', value: 's', quant: '?', quantN: '', quantM: '', lazy: false },
      { type: 'literal', value: '://', quant: '', quantN: '', quantM: '', lazy: false },
      { type: 'charSet', value: '\\w./\\-%', quant: '+', quantN: '', quantM: '', lazy: false },
    ],
  },
  {
    label: 'IPv4 Address',
    desc: '192.168.1.1',
    tokens: [
      { type: 'digit', value: '', quant: '{n,m}', quantN: '1', quantM: '3', lazy: false },
      { type: 'nonCapGroup', value: '\\.\\d{1,3}', quant: '{n}', quantN: '3', quantM: '', lazy: false },
    ],
  },
  {
    label: 'Hex color',
    desc: '#ff6b6b or #f6b',
    tokens: [
      { type: 'literal', value: '#', quant: '', quantN: '', quantM: '', lazy: false },
      { type: 'charSet', value: '0-9a-fA-F', quant: '{n,m}', quantN: '3', quantM: '6', lazy: false },
    ],
  },
  {
    label: 'Date YYYY-MM-DD',
    desc: '2026-06-21',
    tokens: [
      { type: 'digit', value: '', quant: '{n}', quantN: '4', quantM: '', lazy: false },
      { type: 'literal', value: '-', quant: '', quantN: '', quantM: '', lazy: false },
      { type: 'digit', value: '', quant: '{n}', quantN: '2', quantM: '', lazy: false },
      { type: 'literal', value: '-', quant: '', quantN: '', quantM: '', lazy: false },
      { type: 'digit', value: '', quant: '{n}', quantN: '2', quantM: '', lazy: false },
    ],
  },
  {
    label: 'Integer number',
    desc: '42 or -1000',
    tokens: [
      { type: 'literal', value: '-', quant: '?', quantN: '', quantM: '', lazy: false },
      { type: 'digit', value: '', quant: '+', quantN: '', quantM: '', lazy: false },
    ],
  },
];

// ── Token library ─────────────────────────────────────────────────────────────

type TokenDef = { type: TokenType; label: string; preview: string; defaultValue?: string; color: string; category: string; noQuant?: boolean };

const TOKEN_DEFS: TokenDef[] = [
  // Characters
  { type: 'literal',     label: 'Literal',    preview: 'abc',  defaultValue: '',     color: '#818cf8', category: 'Characters' },
  { type: 'any',         label: 'Any char',   preview: '.',    color: '#7dd3fc', category: 'Characters' },
  { type: 'digit',       label: 'Digit',      preview: '\\d',  color: '#86efac', category: 'Characters' },
  { type: 'nonDigit',    label: 'Non-digit',  preview: '\\D',  color: '#86efac', category: 'Characters' },
  { type: 'word',        label: 'Word char',  preview: '\\w',  color: '#a3e635', category: 'Characters' },
  { type: 'nonWord',     label: 'Non-word',   preview: '\\W',  color: '#a3e635', category: 'Characters' },
  { type: 'space',       label: 'Whitespace', preview: '\\s',  color: '#fb923c', category: 'Characters' },
  { type: 'nonSpace',    label: 'Non-space',  preview: '\\S',  color: '#fb923c', category: 'Characters' },
  // Anchors
  { type: 'start',       label: 'Start ^',    preview: '^',    color: '#f472b6', category: 'Anchors', noQuant: true },
  { type: 'end',         label: 'End $',      preview: '$',    color: '#f472b6', category: 'Anchors', noQuant: true },
  { type: 'wordBoundary',label: '\\b',        preview: '\\b',  color: '#f472b6', category: 'Anchors', noQuant: true },
  // Sets
  { type: 'charSet',     label: 'Char set',   preview: '[…]',  defaultValue: 'a-z', color: '#fcd34d', category: 'Sets' },
  { type: 'negCharSet',  label: 'Neg set',    preview: '[^…]', defaultValue: 'a-z', color: '#fca5a5', category: 'Sets' },
  // Groups
  { type: 'group',       label: 'Group (…)',  preview: '(…)',  defaultValue: '',    color: '#c4b5fd', category: 'Groups' },
  { type: 'nonCapGroup', label: '(?:…)',      preview: '(?:…)',defaultValue: '',    color: '#c4b5fd', category: 'Groups' },
  { type: 'lookahead',   label: '(?=…)',      preview: '(?=…)',defaultValue: '',    color: '#c4b5fd', category: 'Groups', noQuant: true },
  { type: 'negLookahead',label: '(?!…)',      preview: '(?!…)',defaultValue: '',    color: '#c4b5fd', category: 'Groups', noQuant: true },
  // Other
  { type: 'alternation', label: 'OR  |',      preview: '|',    color: '#94a3b8', category: 'Other', noQuant: true },
];

function defForType(type: TokenType): TokenDef { return TOKEN_DEFS.find(d => d.type === type)!; }

function makeToken(type: TokenType): Token {
  const def = defForType(type);
  return { id: Math.random().toString(36).slice(2), type, value: def.defaultValue ?? '', quant: '', quantN: '1', quantM: '2', lazy: false };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  panel:  { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' } as React.CSSProperties,
  lbl:    { fontSize: '11px', fontWeight: 600 as const, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px', display: 'block' },
  inp:    (w?: string) => ({ background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '6px 8px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', outline: 'none', width: w ?? '100%', boxSizing: 'border-box' } as React.CSSProperties),
};

const QUANT_OPTS: { v: Quant; label: string }[] = [
  { v: '',     label: 'once' },
  { v: '?',   label: '?' },
  { v: '*',   label: '*' },
  { v: '+',   label: '+' },
  { v: '{n}', label: '{n}' },
  { v: '{n,m}', label: '{n,m}' },
  { v: '{n,}', label: '{n,}' },
];

// ── Token card ────────────────────────────────────────────────────────────────

interface TokenCardProps {
  token: Token;
  index: number;
  total: number;
  onChange: (t: Token) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

function TokenCard({ token, index, total, onChange, onDelete, onMove }: TokenCardProps) {
  const def = defForType(token.type);
  const hasValue = ['literal','charSet','negCharSet','group','nonCapGroup','lookahead','negLookahead'].includes(token.type);
  const re = tokenToRegex(token);
  const expl = tokenToExplanation(token);

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      {/* Reorder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '8px' }}>
        <button onClick={() => onMove(-1)} disabled={index === 0} style={{ padding: '2px 5px', background: 'transparent', border: '1px solid #1e293b', borderRadius: '4px', color: index === 0 ? '#1e293b' : '#475569', cursor: index === 0 ? 'default' : 'pointer', fontSize: '10px' }}>▲</button>
        <button onClick={() => onMove(1)} disabled={index === total - 1} style={{ padding: '2px 5px', background: 'transparent', border: '1px solid #1e293b', borderRadius: '4px', color: index === total - 1 ? '#1e293b' : '#475569', cursor: index === total - 1 ? 'default' : 'pointer', fontSize: '10px' }}>▼</button>
      </div>

      {/* Main card */}
      <div style={{ flex: 1, background: '#020817', border: `1px solid ${def.color}30`, borderLeft: `3px solid ${def.color}`, borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: def.color, background: `${def.color}18`, padding: '2px 8px', borderRadius: '4px' }}>{def.preview}</span>
          <span style={{ fontSize: '12px', color: '#475569', flex: 1 }}>{def.label}</span>
          <button onClick={onDelete} style={{ padding: '2px 8px', background: 'transparent', border: '1px solid #dc262620', color: '#dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
        </div>

        {/* Value input */}
        {hasValue && (
          <input
            style={S.inp()}
            value={token.value}
            onChange={e => onChange({ ...token, value: e.target.value })}
            placeholder={token.type === 'literal' ? 'text to match' : token.type.includes('Set') ? 'a-z0-9' : 'inner pattern'}
            spellCheck={false}
          />
        )}

        {/* Quantifier */}
        {!def.noQuant && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#334155' }}>Repeat:</span>
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
              {QUANT_OPTS.map(q => (
                <button key={q.v}
                  onClick={() => onChange({ ...token, quant: q.v })}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: `1px solid ${token.quant === q.v ? '#6366f1' : '#1e293b'}`, background: token.quant === q.v ? 'rgba(99,102,241,0.15)' : 'transparent', color: token.quant === q.v ? '#a5b4fc' : '#334155', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }}>
                  {q.label || 'once'}
                </button>
              ))}
            </div>
            {(token.quant === '{n}' || token.quant === '{n,m}' || token.quant === '{n,}') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input style={S.inp('44px')} type="number" min={0} value={token.quantN} onChange={e => onChange({ ...token, quantN: e.target.value })} />
                {token.quant === '{n,m}' && <><span style={{ color: '#334155', fontSize: '12px' }}>–</span><input style={S.inp('44px')} type="number" min={0} value={token.quantM} onChange={e => onChange({ ...token, quantM: e.target.value })} /></>}
              </div>
            )}
            {token.quant && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: token.lazy ? '#818cf8' : '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={token.lazy} onChange={e => onChange({ ...token, lazy: e.target.checked })} style={{ accentColor: '#6366f1', width: '12px', height: '12px' }} />
                lazy
              </label>
            )}
          </div>
        )}

        {/* Result preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: def.color, background: `${def.color}12`, padding: '1px 8px', borderRadius: '4px' }}>{re || '…'}</span>
          <span style={{ fontSize: '11px', color: '#334155' }}>→ {expl}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegexBuilder() {
  const [tokens, setTokens] = useState<Token[]>([
    { id: 'b', type: 'word',    value: '',   quant: '+', quantN: '', quantM: '', lazy: false },
    { id: 'c', type: 'literal', value: '@',  quant: '', quantN: '', quantM: '', lazy: false },
    { id: 'd', type: 'charSet', value: '\\w\\-', quant: '+', quantN: '', quantM: '', lazy: false },
    { id: 'e', type: 'literal', value: '.',  quant: '', quantN: '', quantM: '', lazy: false },
    { id: 'f', type: 'word',    value: '',   quant: '+', quantN: '', quantM: '', lazy: false },
  ]);
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false });
  const [testInput, setTestInput] = useState('Send to alice@example.com or bob@test.org for more info.');
  const [copied, setCopied] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  const pattern = useMemo(() => tokens.map(tokenToRegex).join(''), [tokens]);
  const flagStr  = useMemo(() => Object.entries(flags).filter(([,v]) => v).map(([k]) => k).join(''), [flags]);

  const regex = useMemo(() => {
    try { return new RegExp(pattern, flagStr); } catch { return null; }
  }, [pattern, flagStr]);

  const isValid = regex !== null;

  // Highlighted test output
  const highlighted = useMemo(() => {
    if (!regex || !testInput) return [{ text: testInput, match: false }];
    const parts: { text: string; match: boolean }[] = [];
    let last = 0;
    const re = flags.g ? regex : new RegExp(regex.source, regex.flags + (flags.g ? '' : ''));
    for (const m of testInput.matchAll(new RegExp(pattern, 'g' + (flags.i ? 'i' : '') + (flags.m ? 'm' : '') + (flags.s ? 's' : '')))) {
      if (m.index! > last) parts.push({ text: testInput.slice(last, m.index), match: false });
      parts.push({ text: m[0], match: true });
      last = m.index! + m[0].length;
    }
    if (last < testInput.length) parts.push({ text: testInput.slice(last), match: false });
    return parts.length ? parts : [{ text: testInput, match: false }];
  }, [regex, testInput, pattern, flags]);

  const matchCount = useMemo(() => {
    if (!regex || !testInput) return 0;
    try { return [...testInput.matchAll(new RegExp(pattern, 'g' + (flags.i ? 'i' : '') + (flags.m ? 'm' : '') + (flags.s ? 's' : '')))]?.length ?? 0; } catch { return 0; }
  }, [regex, testInput, pattern, flags]);

  const addToken = (type: TokenType) => setTokens(t => [...t, makeToken(type)]);
  const updateToken = (id: string, updated: Token) => setTokens(t => t.map(x => x.id === id ? updated : x));
  const deleteToken = (id: string) => setTokens(t => t.filter(x => x.id !== id));
  const moveToken = (id: string, dir: -1 | 1) => setTokens(t => {
    const i = t.findIndex(x => x.id === id);
    const n = [...t];
    [n[i], n[i + dir]] = [n[i + dir], n[i]];
    return n;
  });

  const applyQuick = (toks: Omit<Token, 'id'>[]) =>
    setTokens(toks.map(t => ({ ...t, id: Math.random().toString(36).slice(2) })));

  const copy = () => { navigator.clipboard.writeText(`/${pattern}/${flagStr}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const cats = [...new Set(TOKEN_DEFS.map(d => d.category))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Regex display bar */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#140c2a)', border: `1px solid ${isValid ? 'rgba(99,102,241,0.3)' : 'rgba(220,38,38,0.4)'}`, borderRadius: '10px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: 700, color: isValid ? '#a5b4fc' : '#fca5a5', wordBreak: 'break-all', lineHeight: '1.6' }}>
              <span style={{ color: '#334155' }}>/</span>
              {tokens.map(t => {
                const def = defForType(t.type);
                return <span key={t.id} style={{ color: def.color }}>{tokenToRegex(t)}</span>;
              })}
              <span style={{ color: '#334155' }}>/{flagStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: isValid ? '#475569' : '#fca5a5', marginTop: '4px' }}>
              {isValid ? `${matchCount} match${matchCount !== 1 ? 'es' : ''} in test input` : '⚠ Invalid regex — fix token values'}
            </div>
          </div>

          {/* Flags */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['g','i','m','s'] as const).map(f => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px 10px', border: `1px solid ${flags[f] ? '#6366f1' : '#1e293b'}`, background: flags[f] ? 'rgba(99,102,241,0.12)' : 'transparent', borderRadius: '6px', fontSize: '12px', color: flags[f] ? '#a5b4fc' : '#334155' }}>
                <input type="checkbox" checked={flags[f]} onChange={e => setFlags(p => ({ ...p, [f]: e.target.checked }))} style={{ accentColor: '#6366f1', width: '12px', height: '12px' }} />
                /{f}
              </label>
            ))}
            <button onClick={copy} style={{ padding: '6px 14px', background: copied ? 'rgba(34,197,94,0.12)' : '#1e293b', color: copied ? '#86efac' : '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick patterns */}
      <div style={S.panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={S.lbl}>Quick Patterns</span>
          <button onClick={() => setShowQuick(p => !p)} style={{ fontSize: '11px', color: '#475569', background: 'transparent', border: 'none', cursor: 'pointer' }}>{showQuick ? 'hide' : 'show'}</button>
        </div>
        {showQuick && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {QUICK_PATTERNS.map(p => (
              <button key={p.label} title={p.desc} onClick={() => applyQuick(p.tokens)}
                style={{ padding: '6px 14px', background: '#020817', border: '1px solid #1e293b', color: '#64748b', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        {!showQuick && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {QUICK_PATTERNS.map(p => (
              <button key={p.label} title={p.desc} onClick={() => applyQuick(p.tokens)}
                style={{ padding: '5px 12px', background: '#020817', border: '1px solid #1e293b', color: '#64748b', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main layout: builder + tester */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Left: token builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Add token toolbar */}
          <div style={S.panel}>
            <span style={S.lbl}>Add Token</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cats.map(cat => (
                <div key={cat}>
                  <div style={{ fontSize: '10px', color: '#334155', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {TOKEN_DEFS.filter(d => d.category === cat).map(def => (
                      <button key={def.type} onClick={() => addToken(def.type)}
                        style={{ padding: '4px 10px', background: `${def.color}10`, border: `1px solid ${def.color}30`, color: def.color, borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {def.preview}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Token list */}
          <div style={S.panel}>
            <span style={S.lbl}>Pattern Blocks ({tokens.length})</span>
            {tokens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#334155', fontSize: '13px' }}>
                Add tokens above to start building your pattern
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tokens.map((t, i) => (
                  <TokenCard
                    key={t.id}
                    token={t}
                    index={i}
                    total={tokens.length}
                    onChange={updated => updateToken(t.id, updated)}
                    onDelete={() => deleteToken(t.id)}
                    onMove={dir => moveToken(t.id, dir)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: tester + breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Test input */}
          <div style={S.panel}>
            <span style={S.lbl}>Test Input</span>
            <textarea
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              rows={4}
              style={{ ...S.inp(), resize: 'vertical', lineHeight: '1.6', fontFamily: 'inherit', fontSize: '13px' }}
              placeholder="Type or paste text to test..."
            />
          </div>

          {/* Match highlights */}
          <div style={S.panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={S.lbl}>Matches</span>
              <span style={{ fontSize: '12px', color: matchCount > 0 ? '#86efac' : '#475569' }}>
                {isValid ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'invalid pattern'}
              </span>
            </div>
            <div style={{ background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.7', minHeight: '80px', wordBreak: 'break-all', color: '#475569' }}>
              {testInput ? highlighted.map((part, i) => (
                <span key={i} style={part.match ? { background: 'rgba(99,102,241,0.25)', color: '#c4b5fd', outline: '1px solid rgba(99,102,241,0.4)', borderRadius: '2px', padding: '0 1px' } : {}}>
                  {part.text}
                </span>
              )) : <span style={{ color: '#1e293b' }}>enter test input above</span>}
            </div>
          </div>

          {/* Pattern breakdown */}
          <div style={S.panel}>
            <span style={S.lbl}>Pattern Breakdown</span>
            {tokens.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#334155' }}>No tokens yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tokens.map((t, i) => {
                  const def = defForType(t.type);
                  const re = tokenToRegex(t);
                  const expl = tokenToExplanation(t);
                  return (
                    <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '6px 8px', background: '#020817', borderRadius: '6px', border: '1px solid #0d1526' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#1e293b', width: '16px', flexShrink: 0, paddingTop: '2px' }}>{i+1}</span>
                      <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: def.color, background: `${def.color}14`, padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>{re || '…'}</code>
                      <span style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>{expl}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
