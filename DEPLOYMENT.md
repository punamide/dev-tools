# DevTools — Deployment & Tech Stack Guide

> **Live URL target:** tools.punamide.com  
> **16 browser-based developer tools. No backend, no database, no tracking.**

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | [Astro](https://astro.build) | 5.x |
| UI library | [React](https://react.dev) | 19.x |
| Language | TypeScript | 5.9 |
| Styling | [Tailwind CSS](https://tailwindcss.com) | 4.x (via `@tailwindcss/vite`) |
| Markdown rendering | [marked](https://marked.js.org) | latest |
| Diff algorithm | [diff](https://github.com/kpdecker/jsdiff) | latest |
| Package manager | pnpm (workspace monorepo) | 9+ |
| Build target | Static Site Generation (SSG) | — |
| Hosting | Cloudflare Pages | — |

### Why this stack?

- **Astro SSG** — Each tool page is pre-rendered to a static HTML shell at build time. React components hydrate client-side only (`client:load`), giving near-instant first paint with no server round-trips.
- **React 19** — All 16 tool components are pure React with local state only. No global state manager needed.
- **Tailwind CSS 4** — Loaded via the `@tailwindcss/vite` Vite plugin, zero config required.
- **No backend** — All computation (hashing, regex, base conversion, cron scheduling, etc.) runs entirely in the user's browser using native browser APIs (`crypto.subtle`, `crypto.randomUUID`, `TextEncoder`, etc.).

---

## Project Structure

```
artifacts/dev-tools/
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # Dark sidebar nav, page shell
│   ├── pages/
│   │   ├── index.astro           # Home grid (all tools)
│   │   ├── json-formatter.astro
│   │   ├── jwt-decoder.astro
│   │   ├── base64.astro
│   │   ├── url-encoder.astro
│   │   ├── color-converter.astro
│   │   ├── regex-tester.astro
│   │   ├── regex-builder.astro
│   │   ├── markdown-preview.astro
│   │   ├── http-status.astro
│   │   ├── diff-checker.astro
│   │   ├── timestamp.astro
│   │   ├── uuid-generator.astro
│   │   ├── cron-builder.astro
│   │   ├── package-analyzer.astro
│   │   ├── json-to-types.astro
│   │   └── base-converter.astro
│   ├── tools/                    # React components (one per tool)
│   │   ├── JsonFormatter.tsx
│   │   ├── JwtDecoder.tsx
│   │   ├── Base64Tool.tsx
│   │   ├── UrlEncoder.tsx
│   │   ├── ColorConverter.tsx
│   │   ├── RegexTester.tsx
│   │   ├── RegexBuilder.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── HttpStatus.tsx
│   │   ├── DiffChecker.tsx
│   │   ├── TimestampConverter.tsx
│   │   ├── UuidGenerator.tsx
│   │   ├── CronBuilder.tsx
│   │   ├── PackageAnalyzer.tsx
│   │   ├── JsonToTypes.tsx
│   │   └── BaseConverter.tsx
│   └── global.css                # Base styles + font imports
├── astro.config.mjs              # Astro config (React + Tailwind integrations)
├── tsconfig.json                 # TypeScript config
├── package.json
└── DEPLOYMENT.md                 # This file
```

---

## The 16 Tools

| # | Tool | Path | Key Browser APIs used |
|---|------|------|-----------------------|
| 1 | JSON Formatter | `/json-formatter` | — |
| 2 | JWT Decoder | `/jwt-decoder` | `atob` |
| 3 | Base64 Encode/Decode | `/base64` | `btoa`, `atob`, `TextEncoder` |
| 4 | URL Encode/Decode | `/url-encoder` | `encodeURIComponent`, `decodeURIComponent` |
| 5 | Color Converter | `/color-converter` | Canvas 2D context |
| 6 | Regex Tester | `/regex-tester` | `RegExp`, `matchAll` |
| 7 | Visual Regex Builder | `/regex-builder` | `RegExp`, `matchAll` |
| 8 | Markdown Preview | `/markdown-preview` | `marked` library |
| 9 | HTTP Status Codes | `/http-status` | — |
| 10 | Diff Checker | `/diff-checker` | `diff` library |
| 11 | Timestamp Converter | `/timestamp` | `Date` |
| 12 | UUID Generator | `/uuid-generator` | `crypto.randomUUID`, `crypto.subtle` (SHA-1 for v5) |
| 13 | CRON Expression Builder | `/cron-builder` | — |
| 14 | package.json Analyzer | `/package-analyzer` | — |
| 15 | JSON → TypeScript + Zod | `/json-to-types` | — |
| 16 | Number Base Converter | `/base-converter` | `BigInt`, `crypto.subtle` |

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install dependencies

```bash
# From the workspace root
pnpm install

# Or from inside the artifact directory
cd artifacts/dev-tools
pnpm install
```

### Start dev server

```bash
# From workspace root (recommended)
pnpm --filter @workspace/dev-tools run dev

# Or directly
cd artifacts/dev-tools
pnpm dev
```

The dev server starts on `http://localhost:4321` (or the `PORT` env var if set).

### Type check

```bash
pnpm --filter @workspace/dev-tools run typecheck
```

### Build for production

```bash
pnpm --filter @workspace/dev-tools run build
```

Output is written to `artifacts/dev-tools/dist/public/`.

---

## Deploying to Cloudflare Pages

### Option A — Connect GitHub repo (recommended)

1. Push this repository to GitHub.
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select your repository and configure:

   | Setting | Value |
   |---------|-------|
   | **Framework preset** | None (or Astro) |
   | **Build command** | `pnpm --filter @workspace/dev-tools run build` |
   | **Build output directory** | `artifacts/dev-tools/dist/public` |
   | **Root directory** | `/` (workspace root, not the artifact subdirectory) |
   | **Node.js version** | `20` |

4. Click **Save and Deploy**. Cloudflare will install pnpm automatically via corepack.

> **Tip:** If Cloudflare can't find pnpm, add an environment variable `COREPACK_ENABLE_STRICT=0` and set the build command to `npm install -g pnpm && pnpm --filter @workspace/dev-tools run build`.

### Option B — Direct upload (Wrangler CLI)

```bash
# Install Wrangler
npm install -g wrangler

# Build first
pnpm --filter @workspace/dev-tools run build

# Deploy
wrangler pages deploy artifacts/dev-tools/dist/public \
  --project-name=dev-tools \
  --branch=main
```

### Option C — Drag-and-drop (quickest test)

1. Build locally: `pnpm --filter @workspace/dev-tools run build`
2. Go to Cloudflare Dashboard → Pages → your project → **Deployments** → **Upload assets**.
3. Drag the entire `artifacts/dev-tools/dist/public/` folder.

---

## Custom Domain Setup (tools.punamide.com)

1. In Cloudflare Dashboard → Pages → your project → **Custom domains** → **Set up a custom domain**.
2. Enter `tools.punamide.com`.
3. Cloudflare will ask you to add a CNAME record. Since you're already on Cloudflare DNS:
   - Go to **DNS** → **Records** → **Add record**
   - Type: `CNAME`
   - Name: `tools`
   - Target: `<your-project-name>.pages.dev`
   - Proxy status: **Proxied** (orange cloud)
4. SSL/TLS is handled automatically by Cloudflare — no certificates to manage.

> If your domain is **not** on Cloudflare, add a CNAME at your registrar pointing `tools.punamide.com` → `<your-project-name>.pages.dev`. SSL will still be provisioned automatically.

---

## Environment Variables

**None required.** All tools run entirely in the browser. There are no API keys, secrets, or server-side configuration.

---

## Build Configuration Reference

### `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  outDir: './dist/public',
  server: {
    port: Number(process.env.PORT ?? 4321),
    host: true,
  },
});
```

### `package.json` scripts

```json
{
  "scripts": {
    "dev":       "astro dev",
    "build":     "astro build",
    "preview":   "astro preview",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Adding a New Tool

1. **Create the React component** in `src/tools/YourTool.tsx`.
2. **Create the Astro page** in `src/pages/your-tool.astro`:
   ```astro
   ---
   import Layout from '../layouts/Layout.astro';
   import YourTool from '../tools/YourTool';
   ---
   <Layout title="Your Tool" description="One-line description.">
     <YourTool client:load />
   </Layout>
   ```
3. **Register it** in `src/layouts/Layout.astro` (sidebar nav) and `src/pages/index.astro` (home grid).
4. No build step needed — Astro's dev server picks it up immediately.

---

## Performance Notes

- All pages are **pre-rendered at build time** (Astro SSG). First load is a static HTML file.
- React components are **island-hydrated** (`client:load`) — only the tool component ships JavaScript, not the entire page shell.
- No external requests at runtime. No CDN fonts (font stack is system monospace).
- Total JS bundle per page: ~40–80 KB gzipped (React 19 + the tool component).
- Cloudflare Pages serves from **300+ edge locations** globally — sub-50ms TTFB worldwide.

---

## License

MIT — use freely, fork freely.
