import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PkgJson {
  name?: string; version?: string; description?: string; license?: string;
  main?: string; module?: string; types?: string; author?: string | { name?: string };
  repository?: string | { url?: string; type?: string };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  keywords?: string[];
  private?: boolean;
  workspaces?: string[];
  [k: string]: unknown;
}

type DepKind = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
interface DepEntry { name: string; version: string; kind: DepKind; }

// ── Version range logic ───────────────────────────────────────────────────────

function classifyVersion(v: string): { label: string; color: string; desc: string } {
  if (!v || v === '*' || v === 'latest' || v === 'x')
    return { label: 'any', color: '#fca5a5', desc: '⚠ Matches any version — may be unstable' };
  if (v.startsWith('^'))
    return { label: 'compatible', color: '#86efac', desc: `^ — allows minor and patch updates (${v})` };
  if (v.startsWith('~'))
    return { label: 'approximate', color: '#7dd3fc', desc: `~ — allows patch updates only (${v})` };
  if (v.startsWith('>=') || v.startsWith('>') || v.startsWith('<') || v.startsWith('<='))
    return { label: 'range', color: '#fcd34d', desc: `range — explicit bounds (${v})` };
  if (/^\d/.test(v))
    return { label: 'exact', color: '#c4b5fd', desc: `exact — pinned to ${v}, no auto-updates` };
  if (v.startsWith('workspace:') || v.startsWith('file:') || v.startsWith('link:'))
    return { label: 'local', color: '#fb923c', desc: `local reference (${v})` };
  if (v.startsWith('git') || v.includes('github.com') || v.includes('#'))
    return { label: 'git', color: '#f472b6', desc: `git source (${v})` };
  return { label: 'other', color: '#94a3b8', desc: v };
}

// ── Script icons ──────────────────────────────────────────────────────────────

function scriptIcon(name: string): string {
  if (/^(build|compile|bundle)/.test(name)) return '🔨';
  if (/^(dev|start|serve|watch)/.test(name)) return '▶';
  if (/^(test|spec|jest|vitest|mocha)/.test(name)) return '✓';
  if (/^(lint|eslint|prettier|format)/.test(name)) return '✦';
  if (/^(deploy|publish|release)/.test(name)) return '🚀';
  if (/^(clean|purge)/.test(name)) return '🧹';
  if (/^(type|tsc|typecheck)/.test(name)) return 'TS';
  if (/^(gen|generate|codegen)/.test(name)) return '⚡';
  if (/^(db|migrate|seed)/.test(name)) return '🗄';
  return '›';
}

// ── Sample ───────────────────────────────────────────────────────────────────

const SAMPLE = JSON.stringify({
  name: "my-app",
  version: "2.1.0",
  description: "A full-stack web application",
  license: "MIT",
  author: "Jane Dev <jane@example.com>",
  private: true,
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview",
    test: "vitest run",
    "test:watch": "vitest",
    lint: "eslint src --ext .ts,.tsx",
    typecheck: "tsc --noEmit",
    "db:push": "drizzle-kit push"
  },
  dependencies: {
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.22.0",
    axios: "^1.6.7",
    "date-fns": "^3.3.1",
    zustand: "^4.5.1",
    "react-query": "^5.24.1",
    clsx: "^2.1.0"
  },
  devDependencies: {
    typescript: "~5.4.2",
    vite: "^5.1.4",
    "@vitejs/plugin-react": "^4.2.1",
    vitest: "0.34.6",
    eslint: "^8.57.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "drizzle-kit": "*",
    tailwindcss: "^4.0.0",
    autoprefixer: "^10.4.18"
  },
  peerDependencies: {
    react: ">=18.0.0"
  },
  engines: {
    node: ">=20.0.0"
  }
}, null, 2);

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  panel:   { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' } as React.CSSProperties,
  lbl:     { fontSize: '11px', fontWeight: 600 as const, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' } as React.CSSProperties,
  badge:   (color: string): React.CSSProperties => ({ fontSize: '10px', fontWeight: 600, color, background: `${color}1a`, border: `1px solid ${color}30`, borderRadius: '4px', padding: '1px 6px', flexShrink: 0 }),
  mono:    { fontFamily: "'JetBrains Mono', monospace" } as React.CSSProperties,
};

const KIND_META: Record<DepKind, { label: string; short: string; color: string }> = {
  dependencies:         { label: 'Dependencies',         short: 'dep',  color: '#818cf8' },
  devDependencies:      { label: 'Dev Dependencies',     short: 'dev',  color: '#7dd3fc' },
  peerDependencies:     { label: 'Peer Dependencies',    short: 'peer', color: '#86efac' },
  optionalDependencies: { label: 'Optional Dependencies',short: 'opt',  color: '#fb923c' },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function PackageAnalyzer() {
  const [raw, setRaw] = useState(SAMPLE);
  const [input, setInput] = useState(SAMPLE);
  const [error, setError] = useState('');
  const [depSearch, setDepSearch] = useState('');
  const [depFilter, setDepFilter] = useState<'all' | DepKind>('all');
  const [scriptSearch, setScriptSearch] = useState('');
  const [parsed, setParsed] = useState<PkgJson | null>(() => JSON.parse(SAMPLE));

  const parse = () => {
    try {
      const p = JSON.parse(input);
      setParsed(p);
      setRaw(input);
      setError('');
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const loadSample = () => { setInput(SAMPLE); setRaw(SAMPLE); setParsed(JSON.parse(SAMPLE)); setError(''); };

  // ── Derived data ──────────────────────────────────────────────────────────

  const depEntries: DepEntry[] = useMemo(() => {
    if (!parsed) return [];
    const kinds: DepKind[] = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    return kinds.flatMap(kind =>
      Object.entries(parsed[kind] ?? {}).map(([name, version]) => ({ name, version: version as string, kind }))
    );
  }, [parsed]);

  const depCounts = useMemo(() => {
    const counts: Record<DepKind, number> = { dependencies: 0, devDependencies: 0, peerDependencies: 0, optionalDependencies: 0 };
    depEntries.forEach(d => counts[d.kind]++);
    return counts;
  }, [depEntries]);

  const filteredDeps = useMemo(() => depEntries.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(depSearch.toLowerCase()) || d.version.toLowerCase().includes(depSearch.toLowerCase());
    const matchesFilter = depFilter === 'all' || d.kind === depFilter;
    return matchesSearch && matchesFilter;
  }), [depEntries, depSearch, depFilter]);

  const scripts = useMemo(() => Object.entries(parsed?.scripts ?? {}), [parsed]);
  const filteredScripts = useMemo(() =>
    scripts.filter(([name, cmd]) =>
      name.toLowerCase().includes(scriptSearch.toLowerCase()) ||
      cmd.toLowerCase().includes(scriptSearch.toLowerCase())
    ), [scripts, scriptSearch]);

  const insights = useMemo(() => {
    if (!parsed) return [];
    const msgs: { level: 'ok' | 'warn' | 'info'; text: string }[] = [];
    const optionalFields = ['description', 'license', 'author', 'repository', 'keywords'];
    for (const f of optionalFields) {
      if (!parsed[f]) msgs.push({ level: 'warn', text: `Missing field: "${f}"` });
    }
    if (parsed.license) msgs.push({ level: 'ok', text: `License: ${parsed.license}` });
    if (parsed.private) msgs.push({ level: 'info', text: 'Package is private (won\'t be published to npm)' });
    if (parsed.workspaces) msgs.push({ level: 'info', text: `Monorepo workspace with ${Array.isArray(parsed.workspaces) ? parsed.workspaces.length : '?'} workspace patterns` });
    if (parsed.engines) msgs.push({ level: 'info', text: `Engine requirements: ${Object.entries(parsed.engines).map(([k,v]) => `${k} ${v}`).join(', ')}` });

    const wildcards = depEntries.filter(d => d.version === '*' || d.version === 'latest');
    if (wildcards.length) msgs.push({ level: 'warn', text: `${wildcards.length} package(s) use * or "latest" — no version pinning: ${wildcards.map(d => d.name).join(', ')}` });

    const exacts = depEntries.filter(d => /^\d/.test(d.version) && !d.version.startsWith('>='));
    if (exacts.length) msgs.push({ level: 'info', text: `${exacts.length} package(s) pinned to exact versions (no auto-updates)` });

    const gitDeps = depEntries.filter(d => d.version.startsWith('git') || d.version.includes('github.com') || d.version.includes('#'));
    if (gitDeps.length) msgs.push({ level: 'warn', text: `${gitDeps.length} package(s) installed from git — may not be stable: ${gitDeps.map(d=>d.name).join(', ')}` });

    const total = depEntries.length;
    if (total > 60) msgs.push({ level: 'warn', text: `High dependency count (${total} total) — consider auditing for unused packages` });
    else if (total > 30) msgs.push({ level: 'info', text: `${total} total dependencies` });
    else msgs.push({ level: 'ok', text: `Reasonable dependency count (${total} total)` });

    if (!parsed.scripts?.test) msgs.push({ level: 'warn', text: 'No "test" script defined' });
    else msgs.push({ level: 'ok', text: 'Test script defined' });

    if (!parsed.scripts?.build && !parsed.scripts?.compile) msgs.push({ level: 'info', text: 'No "build" or "compile" script' });

    return msgs;
  }, [parsed, depEntries]);

  const totalDeps = depEntries.length;
  const maxCount = Math.max(...Object.values(depCounts), 1);
  const authorStr = typeof parsed?.author === 'object' ? parsed.author?.name ?? '' : parsed?.author ?? '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Input panel */}
      <div style={S.panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={S.lbl}>Paste package.json</span>
          <button onClick={loadSample} style={{ fontSize: '11px', color: '#475569', background: 'transparent', border: '1px solid #1e293b', borderRadius: '5px', padding: '3px 10px', cursor: 'pointer' }}>Load sample</button>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={8}
          spellCheck={false}
          style={{ width: '100%', boxSizing: 'border-box', background: '#020817', border: `1px solid ${error ? '#dc2626' : '#1e293b'}`, borderRadius: '8px', padding: '12px', color: '#94a3b8', ...S.mono, fontSize: '12px', resize: 'vertical', outline: 'none', lineHeight: '1.6' }}
          placeholder='Paste your package.json here...'
        />
        {error && <div style={{ marginTop: '6px', color: '#fca5a5', fontSize: '12px' }}>⚠ {error}</div>}
        <button
          onClick={parse}
          style={{ marginTop: '10px', padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
        >
          Analyze
        </button>
      </div>

      {parsed && (
        <>
          {/* Overview stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Package', value: parsed.name ?? '(unnamed)', sub: parsed.version ?? '—' },
              { label: 'License', value: parsed.license ?? 'not set', sub: parsed.private ? 'private' : 'public' },
              { label: 'Scripts', value: scripts.length, sub: 'defined' },
              { label: 'Dependencies', value: depCounts.dependencies, sub: 'production' },
              { label: 'Dev Deps', value: depCounts.devDependencies, sub: 'development' },
              { label: 'Total Deps', value: totalDeps, sub: 'all kinds' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: typeof value === 'number' ? '22px' : '14px', fontWeight: 700, color: '#e2e8f0', ...S.mono, lineHeight: '1.2' }}>{String(value)}</div>
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Package meta */}
          {(parsed.description || authorStr || parsed.keywords?.length) && (
            <div style={S.panel}>
              <span style={S.lbl}>About</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {parsed.description && <div style={{ fontSize: '13px', color: '#94a3b8' }}>{parsed.description}</div>}
                {authorStr && <div style={{ fontSize: '12px', color: '#475569' }}>Author: <span style={{ color: '#64748b' }}>{authorStr}</span></div>}
                {parsed.engines && <div style={{ fontSize: '12px', color: '#475569' }}>Engines: <span style={{ color: '#64748b', ...S.mono }}>{Object.entries(parsed.engines).map(([k,v])=>`${k} ${v}`).join(', ')}</span></div>}
                {parsed.keywords?.length && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {parsed.keywords.map(kw => <span key={kw} style={{ fontSize: '11px', color: '#64748b', background: '#1e293b', borderRadius: '4px', padding: '2px 8px' }}>{kw}</span>)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dependency bars */}
          <div style={S.panel}>
            <span style={S.lbl}>Dependency Breakdown</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(Object.entries(KIND_META) as [DepKind, typeof KIND_META[DepKind]][]).map(([kind, meta]) => {
                const count = depCounts[kind];
                if (!count && kind !== 'dependencies') return null;
                const pct = (count / Math.max(totalDeps, 1)) * 100;
                return (
                  <div key={kind}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: meta.color }}>{meta.label}</span>
                      <span style={{ fontSize: '12px', color: '#475569', ...S.mono }}>{count} package{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ background: '#020817', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: '4px', transition: 'width 0.4s ease', minWidth: count ? '4px' : '0' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Version type legend */}
            <div style={{ marginTop: '16px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: '#334155', marginBottom: '8px' }}>Version range types across all deps:</div>
              {(() => {
                const groups: Record<string, number> = {};
                depEntries.forEach(d => { const c = classifyVersion(d.version); groups[c.label] = (groups[c.label] ?? 0) + 1; });
                return Object.entries(groups).map(([label, count]) => {
                  const color = classifyVersion(depEntries.find(d => classifyVersion(d.version).label === label)!.version).color;
                  return (
                    <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '12px', fontSize: '12px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                      <span style={{ color: '#475569' }}>{label}</span>
                      <span style={{ color, ...S.mono }}>{count}</span>
                    </span>
                  );
                });
              })()}
            </div>
          </div>

          {/* Scripts */}
          {scripts.length > 0 && (
            <div style={S.panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={S.lbl}>Scripts ({scripts.length})</span>
                <input
                  value={scriptSearch}
                  onChange={e => setScriptSearch(e.target.value)}
                  placeholder="Search scripts..."
                  style={{ flex: 1, background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '5px 10px', color: '#e2e8f0', fontSize: '12px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {filteredScripts.map(([name, cmd]) => (
                  <div key={name} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 10px', background: '#020817', borderRadius: '6px', border: '1px solid #0d1526' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0d1526')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#020817')}>
                    <span style={{ fontSize: '14px', width: '20px', flexShrink: 0 }}>{scriptIcon(name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#a5b4fc', ...S.mono }}>{name}</div>
                      <div style={{ fontSize: '12px', color: '#475569', ...S.mono, marginTop: '2px', wordBreak: 'break-all' }}>{cmd}</div>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(`pnpm run ${name}`)}
                      title="Copy run command"
                      style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #1e293b', color: '#334155', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', flexShrink: 0 }}>
                      copy
                    </button>
                  </div>
                ))}
                {filteredScripts.length === 0 && <div style={{ fontSize: '12px', color: '#334155', padding: '8px' }}>No scripts match.</div>}
              </div>
            </div>
          )}

          {/* Dependencies table */}
          <div style={S.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={S.lbl}>All Dependencies ({totalDeps})</span>
              <input
                value={depSearch}
                onChange={e => setDepSearch(e.target.value)}
                placeholder="Search packages..."
                style={{ flex: 1, minWidth: '140px', background: '#020817', border: '1px solid #1e293b', borderRadius: '6px', padding: '5px 10px', color: '#e2e8f0', fontSize: '12px', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                {(['all', 'dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const).map(f => {
                  const meta = f === 'all' ? null : KIND_META[f];
                  const count = f === 'all' ? totalDeps : depCounts[f];
                  if (f !== 'all' && !count) return null;
                  return (
                    <button key={f} onClick={() => setDepFilter(f)}
                      style={{ padding: '4px 10px', borderRadius: '5px', border: `1px solid ${depFilter === f ? (meta?.color ?? '#6366f1') : '#1e293b'}`, background: depFilter === f ? `${meta?.color ?? '#6366f1'}1a` : 'transparent', color: depFilter === f ? (meta?.color ?? '#a5b4fc') : '#334155', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}>
                      {f === 'all' ? `All (${count})` : `${meta?.short} (${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxHeight: '420px', overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 80px 32px', gap: '8px', padding: '6px 10px', fontSize: '10px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: '#0f172a' }}>
                <span>Package</span><span>Version Range</span><span>Type</span><span>Range Kind</span><span></span>
              </div>
              {filteredDeps.map(dep => {
                const meta = KIND_META[dep.kind];
                const vc = classifyVersion(dep.version);
                return (
                  <div key={`${dep.kind}-${dep.name}`}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 80px 32px', gap: '8px', alignItems: 'center', padding: '7px 10px', background: '#020817', borderRadius: '4px', border: '1px solid #0d1526' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0d1526')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#020817')}>
                    <span style={{ fontSize: '13px', color: '#e2e8f0', ...S.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dep.name}>{dep.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', ...S.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={vc.desc}>{dep.version}</span>
                    <span style={S.badge(meta.color)}>{meta.short}</span>
                    <span style={S.badge(vc.color)}>{vc.label}</span>
                    <a href={`https://npmjs.com/package/${dep.name}`} target="_blank" rel="noopener noreferrer"
                      title="Open on npm"
                      style={{ color: '#334155', fontSize: '12px', textDecoration: 'none', textAlign: 'center' }}>
                      ↗
                    </a>
                  </div>
                );
              })}
              {filteredDeps.length === 0 && <div style={{ fontSize: '12px', color: '#334155', padding: '16px' }}>No packages match.</div>}
            </div>
          </div>

          {/* Insights */}
          <div style={S.panel}>
            <span style={S.lbl}>Insights & Warnings ({insights.length})</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {insights.map((ins, i) => {
                const [icon, color] = ins.level === 'ok' ? ['✓', '#86efac'] : ins.level === 'warn' ? ['⚠', '#fcd34d'] : ['ℹ', '#7dd3fc'];
                return (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 12px', background: '#020817', border: `1px solid ${color}18`, borderLeft: `3px solid ${color}`, borderRadius: '6px' }}>
                    <span style={{ color, fontSize: '13px', flexShrink: 0, width: '16px' }}>{icon}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>{ins.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
