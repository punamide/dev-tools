import { useState, useMemo } from 'react';

// ── Core types ─────────────────────────────────────────────────────────────────

type JVal = string | number | boolean | null | JVal[] | JObj;
type JObj = { [k: string]: JVal };

// ── Utilities ─────────────────────────────────────────────────────────────────

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function toPascal(s: string) { return s.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase()); }
function safeKey(k: string) { return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`; }

// Smart string inference
function smartZodString(v: string): string {
  if (/^[\w.+%-]+@[\w-]+\.[\w.]+$/.test(v)) return 'z.string().email()';
  if (/^https?:\/\/\S+/.test(v)) return 'z.string().url()';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return 'z.string().uuid()';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) return 'z.string().datetime()';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'z.string().date()';
  return 'z.string()';
}
function smartTsString(_v: string): string { return 'string'; } // TS doesn't have runtime string subtypes

// Merge array of objects: union all keys, track which are optional
function mergeObjs(items: JObj[]): { merged: JObj; optional: Set<string>; } {
  const allKeys = new Set<string>();
  items.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
  const optional = new Set<string>();
  for (const k of allKeys) {
    const appearsInAll = items.every(item => k in item);
    if (!appearsInAll) optional.add(k);
  }
  const merged: JObj = {};
  for (const k of allKeys) {
    const nonNull = items.find(item => item[k] !== null && item[k] !== undefined);
    merged[k] = nonNull ? nonNull[k] : null;
  }
  return { merged, optional };
}

// ── TypeScript generation ─────────────────────────────────────────────────────

function tsType(
  val: JVal,
  name: string,
  defs: Map<string, string>,
  keyword: 'interface' | 'type',
  exportKw: boolean,
  smartStr: boolean,
  optional: Set<string> = new Set()
): string {
  if (val === null) return 'null';
  if (typeof val === 'string') return smartTsString(val);
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';

  if (Array.isArray(val)) {
    if (!val.length) return 'unknown[]';
    const objs = val.filter((v): v is JObj => v !== null && typeof v === 'object' && !Array.isArray(v));
    const prims = val.filter(v => v === null || typeof v !== 'object' || Array.isArray(v));
    const types = new Set<string>();
    if (objs.length) {
      const { merged, optional: opt } = mergeObjs(objs);
      buildTsType(merged, name, defs, keyword, exportKw, smartStr, opt);
      types.add(name);
    }
    prims.forEach(p => types.add(tsType(p, name + 'Item', defs, keyword, exportKw, smartStr)));
    const arr = [...types];
    return arr.length === 1 ? `${arr[0]}[]` : `(${arr.join(' | ')})[]`;
  }

  if (typeof val === 'object') {
    buildTsType(val, name, defs, keyword, exportKw, smartStr, optional);
    return name;
  }
  return 'unknown';
}

function buildTsType(
  obj: JObj,
  name: string,
  defs: Map<string, string>,
  keyword: 'interface' | 'type',
  exportKw: boolean,
  smartStr: boolean,
  optional: Set<string> = new Set()
): void {
  if (defs.has(name)) return;
  defs.set(name, ''); // prevent infinite recursion

  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const childName = name + toPascal(k);
    const isOpt = optional.has(k);
    const type = tsType(v, childName, defs, keyword, exportKw, smartStr);
    // nullable: if field was missing in some items and we set it to null
    const nullable = v === null && optional.has(k);
    const finalType = nullable ? `${type === 'null' ? 'unknown' : type} | null` : type;
    lines.push(`  ${safeKey(k)}${isOpt ? '?' : ''}: ${finalType};`);
  }

  const exp = exportKw ? 'export ' : '';
  let def: string;
  if (keyword === 'interface') {
    def = `${exp}interface ${name} {\n${lines.join('\n')}\n}`;
  } else {
    def = `${exp}type ${name} = {\n${lines.join('\n')}\n};`;
  }
  defs.set(name, def);
}

function generateTs(json: JVal, rootName: string, keyword: 'interface' | 'type', exportKw: boolean, smartStr: boolean): string {
  const defs = new Map<string, string>();

  if (json === null || typeof json !== 'object') {
    const simple = tsType(json, rootName, defs, keyword, exportKw, smartStr);
    return `${exportKw ? 'export ' : ''}type ${rootName} = ${simple};`;
  }

  if (Array.isArray(json)) {
    const t = tsType(json, rootName + 'Item', defs, keyword, exportKw, smartStr);
    const exp = exportKw ? 'export ' : '';
    const extra = [...defs.values()].filter(Boolean).join('\n\n');
    const root = `${exp}type ${rootName} = ${t.includes('[]') ? t : `${t}[]`};`;
    return [extra, root].filter(Boolean).join('\n\n');
  }

  buildTsType(json, rootName, defs, keyword, exportKw, smartStr);
  // Output nested types first, root last
  const entries = [...defs.entries()].filter(([,v]) => Boolean(v));
  const rootEntry = entries.find(([k]) => k === rootName);
  const rest = entries.filter(([k]) => k !== rootName);
  return [...rest.map(([,v]) => v), rootEntry?.[1] ?? ''].filter(Boolean).join('\n\n');
}

// ── Zod schema generation ─────────────────────────────────────────────────────

function zodType(
  val: JVal,
  name: string,
  defs: Map<string, string>,
  smartStr: boolean,
  optional: Set<string> = new Set()
): string {
  if (val === null) return 'z.null()';
  if (typeof val === 'string') return smartStr ? smartZodString(val) : 'z.string()';
  if (typeof val === 'number') return Number.isInteger(val) ? 'z.number().int()' : 'z.number()';
  if (typeof val === 'boolean') return 'z.boolean()';

  if (Array.isArray(val)) {
    if (!val.length) return 'z.array(z.unknown())';
    const objs = val.filter((v): v is JObj => v !== null && typeof v === 'object' && !Array.isArray(v));
    const prims = val.filter(v => v === null || typeof v !== 'object' || Array.isArray(v));
    const types = new Set<string>();
    if (objs.length) {
      const { merged, optional: opt } = mergeObjs(objs);
      buildZodSchema(merged, name, defs, smartStr, opt);
      types.add(`${name}Schema`);
    }
    prims.forEach(p => types.add(zodType(p, name + 'Item', defs, smartStr)));
    const arr = [...types];
    const inner = arr.length === 1 ? arr[0] : `z.union([${arr.join(', ')}])`;
    return `z.array(${inner})`;
  }

  if (typeof val === 'object') {
    buildZodSchema(val, name, defs, smartStr, optional);
    return `${name}Schema`;
  }
  return 'z.unknown()';
}

function buildZodSchema(
  obj: JObj,
  name: string,
  defs: Map<string, string>,
  smartStr: boolean,
  optional: Set<string> = new Set()
): void {
  if (defs.has(name)) return;
  defs.set(name, '');

  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const childName = name + toPascal(k);
    const isOpt = optional.has(k);
    const nullable = v === null && isOpt;
    let zt = zodType(v, childName, defs, smartStr);
    if (nullable && zt === 'z.null()') zt = 'z.unknown()';
    if (nullable) zt = `${zt}.nullable()`;
    if (isOpt) zt = `${zt}.optional()`;
    lines.push(`  ${safeKey(k)}: ${zt},`);
  }

  defs.set(name, [
    `export const ${name}Schema = z.object({`,
    lines.join('\n'),
    `});`,
    ``,
    `export type ${name} = z.infer<typeof ${name}Schema>;`,
  ].join('\n'));
}

function generateZod(json: JVal, rootName: string, smartStr: boolean): string {
  const defs = new Map<string, string>();
  const header = `import { z } from 'zod';`;

  if (json === null || typeof json !== 'object') {
    const zt = zodType(json, rootName, defs, smartStr);
    return `${header}\n\nexport const ${rootName}Schema = ${zt};\n\nexport type ${rootName} = z.infer<typeof ${rootName}Schema>;`;
  }

  if (Array.isArray(json)) {
    const itemName = rootName + 'Item';
    const zt = zodType(json, itemName, defs, smartStr);
    const extra = [...defs.values()].filter(Boolean).join('\n\n');
    return [header, extra, `export const ${rootName}Schema = z.array(${zt.replace('[]', '')});\n\nexport type ${rootName} = z.infer<typeof ${rootName}Schema>;`].filter(Boolean).join('\n\n');
  }

  buildZodSchema(json as JObj, rootName, defs, smartStr);
  const entries = [...defs.entries()].filter(([,v]) => Boolean(v));
  const rootEntry = entries.find(([k]) => k === rootName);
  const rest = entries.filter(([k]) => k !== rootName);
  const body = [...rest.map(([,v]) => v), rootEntry?.[1] ?? ''].filter(Boolean).join('\n\n');
  return `${header}\n\n${body}`;
}

// ── Samples ───────────────────────────────────────────────────────────────────

const SAMPLES: { label: string; json: string }[] = [
  {
    label: 'User profile',
    json: JSON.stringify({
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
      active: true,
      avatarUrl: 'https://example.com/alice.jpg',
      createdAt: '2024-01-15T10:30:00Z',
      profile: {
        bio: 'Software engineer at Acme Corp',
        location: 'San Francisco, CA',
        website: 'https://alice.dev',
      },
      roles: ['admin', 'user'],
      tags: [
        { id: 1, name: 'typescript' },
        { id: 2, name: 'react' },
      ],
      metadata: null,
    }, null, 2),
  },
  {
    label: 'API response',
    json: JSON.stringify({
      success: true,
      data: {
        items: [
          { id: 'abc123', title: 'First post', published: true, views: 1024 },
          { id: 'def456', title: 'Draft post', published: false, views: 0 },
        ],
        pagination: {
          page: 1,
          perPage: 20,
          total: 142,
          hasNextPage: true,
        },
      },
      error: null,
    }, null, 2),
  },
  {
    label: 'Config file',
    json: JSON.stringify({
      server: {
        host: '0.0.0.0',
        port: 3000,
        ssl: false,
        timeout: 30000,
      },
      database: {
        url: 'postgres://localhost:5432/mydb',
        poolSize: 10,
        ssl: false,
        migrations: { dir: './migrations', table: '_migrations' },
      },
      features: {
        darkMode: true,
        analytics: false,
        betaFeatures: ['ai-suggestions', 'bulk-export'],
      },
      version: '1.0.0',
    }, null, 2),
  },
  {
    label: 'E-commerce product',
    json: JSON.stringify({
      sku: 'PROD-001',
      name: 'Premium Wireless Headphones',
      price: 129.99,
      currency: 'USD',
      inStock: true,
      inventory: 47,
      categories: ['electronics', 'audio'],
      images: [
        { url: 'https://cdn.shop.com/prod-001-main.jpg', alt: 'Front view', primary: true },
        { url: 'https://cdn.shop.com/prod-001-side.jpg', alt: 'Side view', primary: false },
      ],
      specs: {
        weight: '250g',
        batteryLife: '30h',
        connectivity: 'Bluetooth 5.2',
        colors: ['black', 'white', 'midnight-blue'],
      },
      rating: { average: 4.7, count: 2318 },
      createdAt: '2024-03-10T00:00:00Z',
    }, null, 2),
  },
];

// ── UI component ──────────────────────────────────────────────────────────────

const S = {
  panel: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' } as React.CSSProperties,
  lbl: { fontSize: '11px', fontWeight: 600 as const, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px', display: 'block' },
  code: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.7', color: '#94a3b8', whiteSpace: 'pre' as const },
};

function CodeBlock({ code, label, lang }: { code: string; label: string; lang: 'ts' | 'zod' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // Simple syntax highlight
  const highlighted = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // keywords
    .replace(/\b(export|import|interface|type|const|from|infer|typeof)\b/g, '<span style="color:#c084fc">$1</span>')
    // types / z. methods
    .replace(/\b(string|number|boolean|null|unknown|void)\b/g, '<span style="color:#7dd3fc">$1</span>')
    .replace(/\bz\.(string|number|boolean|null|array|object|union|unknown|infer|optional|email|url|uuid|datetime|date|int|nullable)\(\)?/g, (m) => `<span style="color:#86efac">${m}</span>`)
    // string literals
    .replace(/'([^']+)'/g, `<span style="color:#fcd34d">'$1'</span>`)
    // numbers
    .replace(/\b(\d+)\b/g, '<span style="color:#fb923c">$1</span>')
    // comments
    .replace(/(\/\/.*)/g, '<span style="color:#334155">$1</span>');

  const color = lang === 'ts' ? '#818cf8' : '#86efac';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
        <button onClick={copy} style={{ padding: '3px 10px', background: copied ? 'rgba(34,197,94,0.12)' : '#1e293b', color: copied ? '#86efac' : '#475569', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div style={{ flex: 1, background: '#020817', border: `1px solid ${color}20`, borderTop: `2px solid ${color}`, borderRadius: '8px', overflow: 'auto', padding: '14px 16px', ...S.code }}
        dangerouslySetInnerHTML={{ __html: highlighted }} />
    </div>
  );
}

export default function JsonToTypes() {
  const [json, setJson] = useState(SAMPLES[0].json);
  const [rootName, setRootName] = useState('User');
  const [keyword, setKeyword] = useState<'interface' | 'type'>('interface');
  const [exportKw, setExportKw] = useState(true);
  const [smartStr, setSmartStr] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'split' | 'ts' | 'zod'>('split');

  const { tsOutput, zodOutput } = useMemo(() => {
    try {
      const parsed: JVal = JSON.parse(json);
      setError('');
      return {
        tsOutput: generateTs(parsed, rootName, keyword, exportKw, smartStr),
        zodOutput: generateZod(parsed, rootName, smartStr),
      };
    } catch (e: unknown) {
      setError((e as Error).message);
      return { tsOutput: '', zodOutput: '' };
    }
  }, [json, rootName, keyword, exportKw, smartStr]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>

      {/* Top bar: options */}
      <div style={{ ...S.panel, display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <span style={S.lbl}>Root Name</span>
          <input value={rootName} onChange={e => setRootName(toPascal(e.target.value) || 'Root')}
            style={{ background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '6px 10px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', outline: 'none', width: '140px' }} />
        </div>
        <div>
          <span style={S.lbl}>Keyword</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['interface', 'type'] as const).map(k => (
              <button key={k} onClick={() => setKeyword(k)} style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${keyword === k ? '#6366f1' : '#1e293b'}`, background: keyword === k ? 'rgba(99,102,241,0.15)' : '#020817', color: keyword === k ? '#a5b4fc' : '#475569', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace' }}>{k}</button>
            ))}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: exportKw ? '#a5b4fc' : '#475569', cursor: 'pointer' }}>
          <input type="checkbox" checked={exportKw} onChange={e => setExportKw(e.target.checked)} style={{ accentColor: '#6366f1' }} />
          export keyword
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: smartStr ? '#86efac' : '#475569', cursor: 'pointer' }}>
          <input type="checkbox" checked={smartStr} onChange={e => setSmartStr(e.target.checked)} style={{ accentColor: '#22c55e' }} />
          smart string inference
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {(['split', 'ts', 'zod'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${view === v ? '#6366f1' : '#1e293b'}`, background: view === v ? 'rgba(99,102,241,0.15)' : 'transparent', color: view === v ? '#a5b4fc' : '#475569', cursor: 'pointer', fontSize: '12px' }}>
              {v === 'split' ? '⊟ split' : v === 'ts' ? 'TS only' : 'Zod only'}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '16px', flex: 1 }}>

        {/* Left: JSON input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={S.panel}>
            <span style={S.lbl}>Sample JSON</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {SAMPLES.map(s => (
                <button key={s.label} onClick={() => { setJson(s.json); setRootName(toPascal(s.label.split(' ')[0])); }}
                  style={{ padding: '4px 10px', background: json === s.json ? 'rgba(99,102,241,0.12)' : '#020817', border: `1px solid ${json === s.json ? '#6366f1' : '#1e293b'}`, color: json === s.json ? '#a5b4fc' : '#475569', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...S.panel, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={S.lbl}>JSON Input</span>
            <textarea
              value={json}
              onChange={e => setJson(e.target.value)}
              spellCheck={false}
              style={{ flex: 1, minHeight: '400px', width: '100%', boxSizing: 'border-box', background: '#020817', border: `1px solid ${error ? '#dc2626' : '#1e293b'}`, borderRadius: '8px', padding: '12px', color: '#94a3b8', ...S.code, resize: 'vertical', outline: 'none' }}
            />
            {error && <div style={{ marginTop: '6px', color: '#fca5a5', fontSize: '12px' }}>⚠ {error}</div>}
          </div>
        </div>

        {/* Right: output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '500px' }}>
          {error ? (
            <div style={{ ...S.panel, color: '#fca5a5', fontSize: '13px' }}>Fix the JSON error to generate types.</div>
          ) : view === 'split' ? (
            <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
              <CodeBlock code={tsOutput} label="TypeScript Interface" lang="ts" />
              <CodeBlock code={zodOutput} label="Zod Schema" lang="zod" />
            </div>
          ) : view === 'ts' ? (
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <CodeBlock code={tsOutput} label="TypeScript Interface" lang="ts" />
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <CodeBlock code={zodOutput} label="Zod Schema" lang="zod" />
            </div>
          )}

          {/* Feature info */}
          <div style={{ ...S.panel, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[
                { label: 'Nested objects', desc: 'Each nested object → named interface', color: '#818cf8' },
                { label: 'Array merging', desc: 'Object arrays merge keys, marks optional', color: '#7dd3fc' },
                { label: 'Null handling', desc: 'null → type | null + .nullable()', color: '#86efac' },
                smartStr ? { label: 'Smart strings', desc: 'Detects email, URL, UUID, datetime', color: '#fcd34d' } : null,
              ].filter(Boolean).map(f => f && (
                <div key={f.label} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', color: f.color }}>✓</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: f.color }}>{f.label}</div>
                    <div style={{ fontSize: '11px', color: '#334155' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
