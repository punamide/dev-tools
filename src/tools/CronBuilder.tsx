import { useState, useMemo, useCallback } from 'react';

// ── Cron parsing & next-run logic ─────────────────────────────────────────────

function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();
  for (const part of field.split(',')) {
    if (part === '*') { for (let i = min; i <= max; i++) values.add(i); }
    else if (part.includes('/')) {
      const [range, step] = part.split('/');
      const s = parseInt(step, 10);
      const from = range === '*' ? min : parseInt(range.split('-')[0], 10);
      const to = range.includes('-') ? parseInt(range.split('-')[1], 10) : max;
      for (let i = from; i <= to && i <= max; i += s) values.add(i);
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= b; i++) values.add(i);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n)) values.add(n);
    }
  }
  return [...values].sort((a, b) => a - b);
}

function getNextRuns(expr: string, count = 5): Date[] | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  try {
    const [minP, hourP, domP, monP, dowP] = parts;
    const mins   = parseField(minP,  0, 59);
    const hours  = parseField(hourP, 0, 23);
    const doms   = parseField(domP,  1, 31);
    const months = parseField(monP,  1, 12);
    const dows   = parseField(dowP,  0, 6);
    const domStar = domP === '*';
    const dowStar = dowP === '*';

    const results: Date[] = [];
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);

    let safety = 0;
    while (results.length < count && safety++ < 800000) {
      if (!months.includes(d.getMonth() + 1)) {
        d.setMonth(d.getMonth() + 1); d.setDate(1); d.setHours(0); d.setMinutes(0); continue;
      }
      const domOk = domStar ? true : doms.includes(d.getDate());
      const dowOk = dowStar ? true : dows.includes(d.getDay());
      const dayOk = (domStar || dowStar) ? (domOk && dowOk) : (domOk || dowOk);
      if (!dayOk) { d.setDate(d.getDate() + 1); d.setHours(0); d.setMinutes(0); continue; }
      if (!hours.includes(d.getHours())) { d.setHours(d.getHours() + 1); d.setMinutes(0); continue; }
      if (!mins.includes(d.getMinutes())) { d.setMinutes(d.getMinutes() + 1); continue; }
      results.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1);
    }
    return results;
  } catch { return null; }
}

// ── Human-readable description ────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function describeField(field: string, type: 'minute'|'hour'|'dom'|'month'|'dow'): string {
  if (field === '*') return type === 'minute' ? 'every minute' : type === 'hour' ? 'every hour' : type === 'dom' ? 'every day' : type === 'month' ? 'every month' : 'every day of week';
  if (field.startsWith('*/')) {
    const n = field.slice(2);
    return `every ${n} ${type === 'minute' ? 'minutes' : type === 'hour' ? 'hours' : type === 'dom' ? 'days' : type === 'month' ? 'months' : 'days'}`;
  }
  if (field.includes('-')) {
    const [a, b] = field.split('-');
    if (type === 'month') return `${MONTHS[+a-1]} through ${MONTHS[+b-1]}`;
    if (type === 'dow') return `${DAYS[+a]} through ${DAYS[+b]}`;
    return `${a} through ${b}`;
  }
  if (field.includes(',')) {
    const vals = field.split(',');
    if (type === 'month') return vals.map(v => MONTHS[+v-1]).join(', ');
    if (type === 'dow') return vals.map(v => DAYS[+v]).join(', ');
    return vals.join(', ');
  }
  if (type === 'month') return MONTHS[+field-1] ?? field;
  if (type === 'dow') return DAYS[+field] ?? field;
  return `at ${type === 'hour' ? field + ':00' : field}`;
}

function describeExpression(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid expression';
  const [min, hour, dom, month, dow] = parts;

  const sentences: string[] = [];

  // Time part
  if (min === '*' && hour === '*') sentences.push('Every minute');
  else if (min === '*') sentences.push(`Every minute of ${describeField(hour, 'hour')}`);
  else if (hour === '*') sentences.push(`At minute ${min} of every hour`);
  else if (min.startsWith('*/')) sentences.push(`${describeField(min, 'minute')}, at ${describeField(hour, 'hour')}`);
  else sentences.push(`At ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`);

  // Day part
  const domStar = dom === '*', dowStar = dow === '*';
  if (!domStar && !dowStar) sentences.push(`on day ${describeField(dom, 'dom')} of the month or on ${describeField(dow, 'dow')}`);
  else if (!domStar) sentences.push(`on day ${describeField(dom, 'dom')} of the month`);
  else if (!dowStar) sentences.push(`on ${describeField(dow, 'dow')}`);

  // Month part
  if (month !== '*') sentences.push(`in ${describeField(month, 'month')}`);

  return sentences.join(', ') + '.';
}

// ── Field builder state ───────────────────────────────────────────────────────

type FieldMode = 'every' | 'step' | 'specific' | 'range';
interface FieldState { mode: FieldMode; step: string; specific: number[]; rangeFrom: string; rangeTo: string; }

function fieldToExpr(field: FieldState, min: number, max: number): string {
  switch (field.mode) {
    case 'every': return '*';
    case 'step': return `*/${field.step || '1'}`;
    case 'specific': return field.specific.length ? field.specific.sort((a,b)=>a-b).join(',') : '*';
    case 'range': return `${field.rangeFrom || min}-${field.rangeTo || max}`;
  }
}

const defaultField = (): FieldState => ({ mode: 'every', step: '1', specific: [], rangeFrom: '', rangeTo: '' });

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  panel: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' } as React.CSSProperties,
  lbl: { fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'block' } as React.CSSProperties,
  inp: { background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', outline: 'none', width: '80px' } as React.CSSProperties,
  chip: (active: boolean): React.CSSProperties => ({ padding: '4px 10px', borderRadius: '5px', border: `1px solid ${active ? '#6366f1' : '#1e293b'}`, background: active ? 'rgba(99,102,241,0.15)' : '#020817', color: active ? '#a5b4fc' : '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }),
  modeTab: (active: boolean): React.CSSProperties => ({ padding: '5px 12px', borderRadius: '5px', border: 'none', background: active ? '#4f46e5' : 'transparent', color: active ? '#fff' : '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }),
};

// ── Field card component ──────────────────────────────────────────────────────

interface FieldCardProps {
  label: string;
  sublabel: string;
  expr: string;
  field: FieldState;
  onChange: (f: FieldState) => void;
  min: number;
  max: number;
  names?: string[];
}

function FieldCard({ label, sublabel, expr, field, onChange, min, max, names }: FieldCardProps) {
  const modes: FieldMode[] = ['every', 'step', 'specific', 'range'];
  const modeLabels: Record<FieldMode, string> = { every: 'Every', step: 'Step', specific: 'Specific', range: 'Range' };

  const toggleSpecific = (n: number) => {
    const s = field.specific.includes(n) ? field.specific.filter(x => x !== n) : [...field.specific, n];
    onChange({ ...field, specific: s });
  };

  return (
    <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#475569' }}>{sublabel}</div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '2px', background: '#020817', borderRadius: '7px', padding: '3px' }}>
        {modes.map(m => (
          <button key={m} style={S.modeTab(field.mode === m)} onClick={() => onChange({ ...field, mode: m })}>
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {/* Mode inputs */}
      {field.mode === 'every' && <div style={{ fontSize: '12px', color: '#334155' }}>Fires every {label.toLowerCase()}.</div>}

      {field.mode === 'step' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
          Every <input style={S.inp} type="number" min={1} max={max} value={field.step} onChange={e => onChange({ ...field, step: e.target.value })} /> {label.toLowerCase()}(s)
        </div>
      )}

      {field.mode === 'specific' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
            <button key={n} style={S.chip(field.specific.includes(n))} onClick={() => toggleSpecific(n)}>
              {names ? names[n - min] : n}
            </button>
          ))}
        </div>
      )}

      {field.mode === 'range' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
          From <input style={S.inp} type="number" min={min} max={max} value={field.rangeFrom} onChange={e => onChange({ ...field, rangeFrom: e.target.value })} placeholder={String(min)} />
          to <input style={S.inp} type="number" min={min} max={max} value={field.rangeTo} onChange={e => onChange({ ...field, rangeTo: e.target.value })} placeholder={String(max)} />
        </div>
      )}

      {/* Resulting expression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: '#334155' }}>Value:</span>
        <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{expr}</code>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const PRESETS: Array<{ label: string; expr: string; desc: string }> = [
  { label: 'Every minute',  expr: '* * * * *',      desc: 'Fires 60× per hour' },
  { label: 'Every 5 min',   expr: '*/5 * * * *',    desc: 'Fires 12× per hour' },
  { label: 'Every 15 min',  expr: '*/15 * * * *',   desc: 'Fires 4× per hour' },
  { label: 'Every 30 min',  expr: '*/30 * * * *',   desc: 'Twice per hour' },
  { label: 'Hourly',        expr: '0 * * * *',       desc: 'Top of every hour' },
  { label: 'Daily at midnight', expr: '0 0 * * *',  desc: 'Once per day' },
  { label: 'Daily at noon', expr: '0 12 * * *',     desc: 'Every day at 12:00' },
  { label: 'Weekdays 9am',  expr: '0 9 * * 1-5',    desc: 'Mon–Fri, 9:00' },
  { label: 'Weekly Sunday', expr: '0 0 * * 0',      desc: 'Every Sunday midnight' },
  { label: 'Monthly 1st',   expr: '0 0 1 * *',      desc: '1st of every month' },
  { label: 'Quarterly',     expr: '0 0 1 */3 *',    desc: 'Jan/Apr/Jul/Oct 1st' },
  { label: 'Yearly Jan 1',  expr: '0 0 1 1 *',      desc: 'New Year\'s midnight' },
];

function exprToFields(expr: string): [FieldState, FieldState, FieldState, FieldState, FieldState] | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return parts.map(p => {
    if (p === '*') return { ...defaultField(), mode: 'every' as FieldMode };
    if (p.match(/^\*\/\d+$/)) return { ...defaultField(), mode: 'step' as FieldMode, step: p.split('/')[1] };
    if (p.match(/^\d+-\d+$/)) { const [a,b] = p.split('-'); return { ...defaultField(), mode: 'range' as FieldMode, rangeFrom: a, rangeTo: b }; }
    if (p.match(/^[\d,]+$/)) return { ...defaultField(), mode: 'specific' as FieldMode, specific: p.split(',').map(Number) };
    return defaultField();
  }) as [FieldState, FieldState, FieldState, FieldState, FieldState];
}

export default function CronBuilder() {
  const [rawExpr, setRawExpr] = useState('0 9 * * 1-5');
  const [fields, setFields] = useState<[FieldState,FieldState,FieldState,FieldState,FieldState]>(() =>
    exprToFields('0 9 * * 1-5') ?? [defaultField(),defaultField(),defaultField(),defaultField(),defaultField()]
  );
  const [rawMode, setRawMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateField = useCallback((idx: number, f: FieldState) => {
    const next = [...fields] as typeof fields;
    next[idx] = f;
    setFields(next);
    const expr = next.map((fs, i) => {
      const [min, max] = [[0,59],[0,23],[1,31],[1,12],[0,6]][i];
      return fieldToExpr(fs, min, max);
    }).join(' ');
    setRawExpr(expr);
  }, [fields]);

  const applyRaw = () => {
    const parsed = exprToFields(rawExpr);
    if (parsed) setFields(parsed);
  };

  const applyPreset = (expr: string) => {
    setRawExpr(expr);
    const parsed = exprToFields(expr);
    if (parsed) setFields(parsed);
  };

  const fieldExprs = useMemo(() =>
    fields.map((fs, i) => {
      const [min, max] = [[0,59],[0,23],[1,31],[1,12],[0,6]][i];
      return fieldToExpr(fs, min, max);
    }), [fields]);

  const description = useMemo(() => {
    try { return describeExpression(rawExpr); } catch { return 'Invalid expression'; }
  }, [rawExpr]);

  const nextRuns = useMemo(() => getNextRuns(rawExpr, 5), [rawExpr]);

  const copy = () => { navigator.clipboard.writeText(rawExpr); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const isValid = nextRuns !== null;

  const fieldDefs = [
    { label: 'Minute', sublabel: '0–59', min: 0, max: 59 },
    { label: 'Hour', sublabel: '0–23', min: 0, max: 23 },
    { label: 'Day of Month', sublabel: '1–31', min: 1, max: 31 },
    { label: 'Month', sublabel: '1–12', min: 1, max: 12, names: MONTHS },
    { label: 'Day of Week', sublabel: '0=Sun, 6=Sat', min: 0, max: 6, names: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Expression bar */}
      <div style={{ ...S.panel, background: 'linear-gradient(135deg,#0f172a,#140c2a)', border: '1px solid rgba(99,102,241,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            {rawMode ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={rawExpr}
                  onChange={e => setRawExpr(e.target.value)}
                  onBlur={applyRaw}
                  onKeyDown={e => e.key === 'Enter' && applyRaw()}
                  style={{ flex: 1, background: '#020817', border: `1px solid ${isValid ? '#6366f1' : '#dc2626'}`, borderRadius: '8px', padding: '12px 16px', color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, letterSpacing: '2px', outline: 'none' }}
                  spellCheck={false}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                {fieldExprs.map((fe, i) => (
                  <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: i < 2 ? '22px' : '20px', fontWeight: 700, color: ['#a5b4fc','#7dd3fc','#86efac','#fcd34d','#f9a8d4'][i] }}>
                    {fe}{i < 4 && <span style={{ color: '#1e293b', margin: '0 2px' }}> </span>}
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '8px' }}>{description}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setRawMode(p => !p)} style={{ padding: '8px 14px', background: rawMode ? 'rgba(99,102,241,0.15)' : '#1e293b', color: rawMode ? '#a5b4fc' : '#64748b', border: `1px solid ${rawMode ? '#6366f1' : 'transparent'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              {rawMode ? 'Visual mode' : 'Edit raw'}
            </button>
            <button onClick={copy} style={{ padding: '8px 14px', background: copied ? 'rgba(34,197,94,0.12)' : '#1e293b', color: copied ? '#86efac' : '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div style={S.panel}>
        <span style={S.lbl}>Common Presets</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {PRESETS.map(p => (
            <button
              key={p.expr}
              title={p.desc}
              onClick={() => applyPreset(p.expr)}
              style={{ padding: '6px 12px', background: rawExpr === p.expr ? 'rgba(99,102,241,0.15)' : '#020817', border: `1px solid ${rawExpr === p.expr ? '#6366f1' : '#1e293b'}`, color: rawExpr === p.expr ? '#a5b4fc' : '#64748b', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Field builders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {fieldDefs.map((fd, i) => (
          <FieldCard
            key={fd.label}
            label={fd.label}
            sublabel={fd.sublabel}
            expr={fieldExprs[i]}
            field={fields[i]}
            onChange={f => updateField(i, f)}
            min={fd.min}
            max={fd.max}
            names={fd.names}
          />
        ))}
      </div>

      {/* Next run times */}
      <div style={S.panel}>
        <span style={S.lbl}>Next 5 Scheduled Runs</span>
        {!isValid ? (
          <div style={{ color: '#fca5a5', fontSize: '13px' }}>⚠ Could not compute next runs — check the expression.</div>
        ) : nextRuns && nextRuns.length === 0 ? (
          <div style={{ color: '#f59e0b', fontSize: '13px' }}>No upcoming runs found (expression may be too infrequent).</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {nextRuns?.map((d, i) => {
              const now = Date.now();
              const diff = d.getTime() - now;
              const rel = diff < 60000 ? 'in <1 min'
                : diff < 3600000 ? `in ${Math.round(diff/60000)} min`
                : diff < 86400000 ? `in ${Math.round(diff/3600000)}h`
                : `in ${Math.round(diff/86400000)}d`;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 14px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#334155', width: '20px' }}>#{i+1}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#94a3b8', flex: 1 }}>
                    {d.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: '12px', color: '#4f46e5', background: 'rgba(99,102,241,0.1)', padding: '2px 10px', borderRadius: '999px', flexShrink: 0 }}>{rel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Format reference */}
      <div style={S.panel}>
        <span style={S.lbl}>Cron Format Reference</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            { field: 'minute', range: '0–59', color: '#a5b4fc' },
            { field: 'hour', range: '0–23', color: '#7dd3fc' },
            { field: 'day', range: '1–31', color: '#86efac' },
            { field: 'month', range: '1–12', color: '#fcd34d' },
            { field: 'weekday', range: '0–6', color: '#f9a8d4' },
          ].map(({ field, range, color }) => (
            <div key={field} style={{ background: '#020817', border: `1px solid ${color}28`, borderTop: `2px solid ${color}`, borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color }}>{field}</div>
              <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>{range}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {[
            ['*', 'Any value'],
            ['*/N', 'Every N units'],
            ['a-b', 'Range from a to b'],
            ['a,b,c', 'Specific values'],
            ['a-b/N', 'Range with step'],
            ['0', 'Exact value (zero)'],
          ].map(([pat, desc]) => (
            <div key={pat} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
              <code style={{ fontFamily: 'monospace', color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '4px', minWidth: '64px', textAlign: 'center' }}>{pat}</code>
              <span style={{ color: '#475569' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
