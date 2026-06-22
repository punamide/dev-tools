# DevTools by PunamIDE

Free, open-source developer tools that run entirely in your browser. No signup. No tracking. No server-side processing.

**→ [tools.punamide.com](https://tools.punamide.com)**

---

## Tools

| Tool | Description | Link |
|------|-------------|------|
| **JSON Formatter** | Format, validate, and minify JSON with syntax error detection | [Open](https://tools.punamide.com/json-formatter) |
| **JWT Decoder** | Decode and inspect JWT token headers, payloads, and claims | [Open](https://tools.punamide.com/jwt-decoder) |
| **Regex Tester** | Test regular expressions with live match highlighting | [Open](https://tools.punamide.com/regex-tester) |
| **Regex Builder** | Build regex patterns visually with a token-based interface | [Open](https://tools.punamide.com/regex-builder) |
| **UUID Generator** | Generate UUID v4, v5, or bulk UUIDs with crypto-secure randomness | [Open](https://tools.punamide.com/uuid-generator) |
| **Base64 Encoder/Decoder** | Encode and decode Base64 strings with UTF-8 support | [Open](https://tools.punamide.com/base64) |
| **URL Encoder/Decoder** | Encode and decode URL components and query strings | [Open](https://tools.punamide.com/url-encoder) |
| **JSON → TypeScript + Zod** | Generate TypeScript interfaces and Zod schemas from JSON | [Open](https://tools.punamide.com/json-to-types) |
| **Cron Builder** | Build cron expressions visually with next-run preview | [Open](https://tools.punamide.com/cron-builder) |
| **Diff Checker** | Compare two text blocks and highlight line-level differences | [Open](https://tools.punamide.com/diff-checker) |
| **Unix Timestamp Converter** | Convert between Unix epoch timestamps and human-readable dates | [Open](https://tools.punamide.com/timestamp) |
| **Color Converter** | Convert between HEX, RGB, and HSL color formats | [Open](https://tools.punamide.com/color-converter) |
| **Number Base Converter** | Convert between binary, octal, decimal, and hexadecimal | [Open](https://tools.punamide.com/base-converter) |
| **Markdown Preview** | Write Markdown and preview rendered HTML output in real time | [Open](https://tools.punamide.com/markdown-preview) |
| **HTTP Status Codes** | Searchable reference for all HTTP response status codes | [Open](https://tools.punamide.com/http-status) |
| **package.json Analyzer** | Analyze dependencies, scripts, versions, and project health | [Open](https://tools.punamide.com/package-analyzer) |

---

## Why These Tools?

- **100% client-side** — All computation happens in your browser using native APIs (`crypto.randomUUID`, `crypto.subtle`, `RegExp`, `TextEncoder`). Nothing is transmitted to any server.
- **No accounts** — No login, no email, no cookies.
- **No telemetry** — Zero analytics, zero tracking scripts.
- **Fast** — Static HTML served from Cloudflare's edge network. Sub-50ms TTFB globally.
- **Accessible** — Keyboard-navigable, screen-reader compatible, proper ARIA labels.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro](https://astro.build) 5.x (Static Site Generation) |
| UI Components | [React](https://react.dev) 19 (island architecture) |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 |
| Language | TypeScript 5.9 |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com) |

Each tool page is pre-rendered at build time. React components hydrate client-side only where interactivity is needed — the page shell ships zero JavaScript.

---

## Local Development

```bash
# Prerequisites: Node.js 20+, pnpm 9+

# Install
pnpm install

# Dev server (http://localhost:4321)
pnpm dev

# Production build
pnpm build

# Preview build locally
pnpm preview
```

---

## Contributing

Found a bug? Want to suggest a new tool? [Open an issue](https://github.com/punamide/dev-tools/issues).

Pull requests are welcome for:
- Bug fixes
- Accessibility improvements
- New tool proposals (open an issue first to discuss)

---

## Related

- [PunamIDE](https://punamide.com) — AI-powered desktop IDE for Windows
- [@PunamIDE on X](https://x.com/PunamIDE) — Updates and announcements

---

## License

MIT
