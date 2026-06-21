import { useState, useMemo } from 'react';
import { marked } from 'marked';

const SAMPLE = `# Hello, Markdown!

Write your **markdown** on the left and see the *rendered preview* on the right.

## Features

- **Bold**, *italic*, and \`inline code\`
- [Links](https://example.com)
- Images and more

## Code Blocks

\`\`\`typescript
const greet = (name: string): string => {
  return \`Hello, \${name}!\`;
};

console.log(greet('World'));
\`\`\`

## Tables

| Tool | Description |
|------|-------------|
| JSON Formatter | Format and validate JSON |
| JWT Decoder | Decode JWT tokens |
| Regex Tester | Test regex patterns |

> This is a blockquote. It renders beautifully!

---

### Task List

- [x] Build the dev tools site
- [x] Add Markdown preview
- [ ] Deploy to Cloudflare Pages
`;

export default function MarkdownPreview() {
  const [input, setInput] = useState(SAMPLE);
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    try {
      return marked(input, { breaks: true, gfm: true }) as string;
    } catch {
      return '<p style="color:#fca5a5">Error rendering markdown</p>';
    }
  }, [input]);

  const copy = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => setInput('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Write Markdown, see HTML preview live</span>
        <div style={{ flex: 1 }} />
        <button onClick={copy} style={{ padding: '6px 12px', background: '#1e293b', color: copied ? '#86efac' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>{copied ? '✓ Copied' : 'Copy Markdown'}</button>
        <button onClick={clear} style={{ padding: '6px 12px', background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
        {/* Input */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Markdown</div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ flex: 1, background: '#020817', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.7', resize: 'none', outline: 'none', minHeight: '500px' }}
            placeholder="Write your Markdown here..."
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview</div>
          <div
            style={{ flex: 1, overflowY: 'auto', padding: '4px' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      <style>{`
        [dangerouslySetInnerHTML] h1, [dangerouslySetInnerHTML] h2 { display: none }
        .markdown-preview h1 { font-size: 1.75rem; font-weight: 700; color: #f1f5f9; margin: 1rem 0 0.5rem; border-bottom: 1px solid #1e293b; padding-bottom: 0.5rem; }
        .markdown-preview h2 { font-size: 1.4rem; font-weight: 600; color: #e2e8f0; margin: 1rem 0 0.5rem; border-bottom: 1px solid #1e293b; padding-bottom: 0.4rem; }
        .markdown-preview h3 { font-size: 1.1rem; font-weight: 600; color: #cbd5e1; margin: 0.75rem 0 0.25rem; }
        .markdown-preview p { color: #94a3b8; margin: 0.5rem 0; line-height: 1.7; font-size: 14px; }
        .markdown-preview a { color: #818cf8; text-decoration: underline; }
        .markdown-preview code { background: #1e293b; color: #86efac; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .markdown-preview pre { background: #020817; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; overflow-x: auto; margin: 0.75rem 0; }
        .markdown-preview pre code { background: transparent; padding: 0; color: #e2e8f0; font-size: 13px; line-height: 1.6; }
        .markdown-preview ul, .markdown-preview ol { color: #94a3b8; padding-left: 1.5rem; margin: 0.5rem 0; font-size: 14px; }
        .markdown-preview li { margin: 0.25rem 0; line-height: 1.7; }
        .markdown-preview blockquote { border-left: 3px solid #4f46e5; margin: 0.75rem 0; padding: 0.5rem 1rem; background: rgba(99,102,241,0.05); border-radius: 0 8px 8px 0; }
        .markdown-preview blockquote p { color: #64748b; }
        .markdown-preview hr { border: none; border-top: 1px solid #1e293b; margin: 1rem 0; }
        .markdown-preview table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 13px; }
        .markdown-preview th { background: #1e293b; color: #94a3b8; padding: 8px 12px; text-align: left; font-weight: 600; border: 1px solid #334155; }
        .markdown-preview td { color: #64748b; padding: 8px 12px; border: 1px solid #1e293b; }
        .markdown-preview strong { color: #e2e8f0; font-weight: 600; }
        .markdown-preview em { color: #a5b4fc; font-style: italic; }
      `}</style>

      <div
        className="markdown-preview"
        style={{ display: 'none' }}
      />
    </div>
  );
}
