# 好读 — Project Spec

> **高品质中文慢阅读策展产品**
> kaifengzhang.com

## Purpose

在 AI 让内容生产成本趋近于零的时代，「好读」为 35-50 岁知识工作者提供基于主编品味的高质量慢阅读。不是帮人选好文章——是定义读者应该看见什么世界。

核心价值：**把散乱的焦虑编织成可以理解的结构。**

## Roles

- **主编**：凯峰（选文 + 3-5 句视角评语 = 唯一不可自动化的环节）
- **AI 流水线**：翻译、提炼、排版、分发全自动
- **读者**：像凯峰一样的人——技术背景但不限于技术，在 AI 时代重新思考工作、身份、人生

## Product Model

**方案 B：主编模式——策展 + 你的一段话。**

```
选文(30min/篇) → 读 + 写3-5句评语(5min) → AI流水线(全自动)
                                              ├─ 网站文章
                                              ├─ 手机版 PDF
                                              └─ 摘要卡片图
```

每周产出：2-3 篇。每篇投入 35 分钟，每周总投入 70-105 分钟。

选题矩阵（人生结构）：
- 自我认知 × 健康 × 子女教育 × 父母养老 × 职场发展 × AI 趋势
- 每篇跨 2-4 个主题

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Astro 5.x (SSG) | Static site generation |
| Content Source | Notion API | `@notionhq/client` |
| Sync | `scripts/sync-notion.mjs` | Notion → Markdown + frontmatter |
| Hosting | Cloudflare Pages | Auto-deploy on push |
| CI/CD | GitHub Actions | `npm run sync` → build → push |
| Fonts | Google Fonts | Noto Serif SC (400/500/700) + Source Serif 4 |
| Design System | Kami | Warm parchment + ink blue + editorial serif |
| Domain | kaifengzhang.com | Cloudflare DNS |

### Key Dependencies

```json
{
  "astro": "^5.16.11",
  "@astrojs/mdx": "^4.3.13",
  "@astrojs/rss": "^4.0.15",
  "@astrojs/sitemap": "^3.7.0",
  "@notionhq/client": "^2.2.15",
  "sharp": "^0.34.3"
}
```

## Architecture

```
Notion (CMS)
  │
  ▼  GitHub Action (every 15min)
sync-notion.mjs
  │  ├─ Fetch pages via Notion API
  │  ├─ Convert blocks → Markdown
  │  ├─ slugify (English slugs via slug-map.json)
  │  ├─ Download images → /public/notion-assets/
  │  └─ Write frontmatter + .md → src/content/{category}/
  ▼
Astro Build (SSG)
  │  ├─ glob loader per category (notion-categories.json)
  │  ├─ [category]/[...slug].astro → article pages
  │  ├─ [category]/index.astro → category listing
  │  ├─ index.astro → homepage (all posts, date desc)
  │  └─ BaseHead.astro → shared <head>, dark mode script
  ▼
Cloudflare Pages (CDN)
  └─ kaifengzhang.com
```

### Directory Structure

```
my-blog/
├── openspec/              # This spec
│   ├── project.md
│   └── changes/
├── scripts/
│   ├── sync-notion.mjs    # Notion → Astro sync engine
│   └── slug-map.json      # Chinese title → English slug mapping
├── src/
│   ├── components/
│   │   ├── BaseHead.astro  # <head>: fonts, meta, dark mode JS
│   │   ├── Header.astro    # Nav bar (categories from manifest)
│   │   └── Footer.astro
│   ├── content/
│   │   ├── AI/             # Articles (English slug filenames)
│   │   ├── Agent/
│   │   └── 健康/            # Dir name = Notion category name
│   ├── layouts/
│   │   └── BlogPost.astro
│   ├── pages/
│   │   ├── index.astro          # Homepage
│   │   ├── about.astro
│   │   └── [category]/
│   │       ├── index.astro      # Category listing
│   │       └── [...slug].astro  # Article page + paged mode
│   ├── styles/
│   │   └── global.css           # Kami design system + dark mode
│   ├── content.config.ts        # Dynamic collection registration
│   └── notion-categories.json   # Category dir → URL slug mapping
├── public/
│   └── notion-assets/           # Downloaded Notion images
├── astro.config.mjs
└── package.json
```

## Design System: Kami

暖纸底 · 墨蓝调 · 衬线体 · 编辑节奏

### Light Mode (default)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#f5f4ed` | Warm parchment background |
| `--accent` | `#1B365D` | Ink blue — links, headings, tags |
| `--accent-dark` | `#12243f` | Link hover |
| `--accent-light` | `#2d5a8e` | Secondary accent |
| `--black` | `44, 36, 22` | Headings (rgb) |
| `--gray-dark` | `92, 84, 67` | Body text (rgb) |
| `--gray` | `138, 126, 107` | Muted text (rgb) |
| `--gray-light` | `228, 224, 214` | Borders, code bg (rgb) |

### Dark Mode (auto: 19:30-07:00 Beijing time)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#1a1816` | Warm near-black |
| `--accent` | `#8FAFD4` | Desaturated ink blue |
| `--black` | `232, 224, 208` | Headings (rgb) |
| `--gray-dark` | `208, 200, 184` | Body text — 13.2:1 contrast (AAA) |
| `--gray` | `160, 152, 136` | Muted text |
| `--gray-light` | `58, 53, 48` | Borders, code bg |

Dark mode activation: inline `<script>` in `<head>` checks `new Date().toLocaleString('en-US', {timeZone:'Asia/Shanghai'})`. Class `dark-mode` on `<html>`. No FOUC.

CJK dark mode: `font-weight: 500` (prevents halation on dense Chinese strokes). Images: `brightness(0.88) saturate(0.85)`, hover restores.

### Semantic Border Variables

Hardcoded `rgba(27,54,93,...)` replaced with semantic tokens that auto-adapt:

| Variable | Light | Dark |
|----------|-------|------|
| `--border-strong` | `rgba(27,54,93, 0.25)` | `rgba(160,152,136, 0.3)` |
| `--border-mid` | `rgba(27,54,93, 0.12)` | `rgba(160,152,136, 0.15)` |
| `--border-light` | `rgba(27,54,93, 0.1)` | `rgba(160,152,136, 0.12)` |
| `--border-faint` | `rgba(27,54,93, 0.08)` | `rgba(160,152,136, 0.08)` |
| `--surface-hover` | `rgba(27,54,93, 0.04)` | `rgba(160,152,136, 0.06)` |

### Typography

| Property | Desktop | Mobile |
|----------|---------|--------|
| Font | Noto Serif SC, Source Serif 4, Georgia | Same |
| Body size | 18px | `clamp(16px, 15px + 0.5vw, 18px)` |
| Line height | 1.9 | 1.85 |
| CJK chars/line | ~22-26 | ~18-22 (WCAG CJK guideline) |

## Features

### F1: Notion Content Sync

**Status:** ✅ Shipped

- `sync-notion.mjs` fetches child pages from Notion parent pages
- Recursively discovers category → article structure
- Converts Notion blocks to Markdown (headings, lists, code, images, tables, toggles, callouts, bookmarks)
- Downloads Notion-hosted images locally (expiring URLs → persistent assets)
- Series ordering: titles with `N. ` prefix get minute-offset timestamps for correct desc sort
- Orphan cleanup: removes files/dirs no longer in Notion
- Writes `notion-categories.json` manifest for Astro

### F2: English URL Slugs

**Status:** ✅ Shipped

- Article slugs: English-only titles use auto-slugify; Chinese titles look up `scripts/slug-map.json`
- Category slugs: `CATEGORY_SLUG_MAP` in sync script (健康 → health)
- 3-5 words, hyphen-separated, unique across all articles
- Adding new Chinese articles: add mapping to `slug-map.json` before sync

### F3: Paged Reading Mode (Mobile)

**Status:** ✅ Shipped

CSS multi-column layout + programmatic `scrollLeft` for book-like horizontal page flip.

- **Activation**: default ON for all mobile browsers (≤720px). Toggle button 📖/📜 in top-right corner.
- **Swipe**: touch events — horizontal swipe >35px threshold
- **Tap zones**: left 25% = prev page, right 25% = next page
- **Page indicator**: fixed bottom bar showing `3 / 12`
- **Content protection**: `break-inside: avoid` on images, code, blockquotes, figures, tables; `break-after: avoid` on headings
- **Orientation**: auto-remeasure on resize/orientation change
- **WeChat compatibility**: defaults to ON even when localStorage is unavailable. Only deactivates if user explicitly toggled off (`localStorage 'haodu-paged' === '0'`).
- **Smooth scroll**: custom rAF-based ease-out cubic, no dependency on `scroll-behavior: smooth`

### F4: Responsive CJK Typography

**Status:** ✅ Shipped

- Adaptive font size via `clamp()` — proportional to viewport width
- `text-size-adjust: 100%` — disables Android Chrome font inflation
- Consistent ~18-22 Chinese chars per line across 360px-430px devices

### F5: Auto Dark Mode

**Status:** ✅ Shipped

- Time-based: 19:30-07:00 Beijing time (Asia/Shanghai)
- Warm Kami Dark palette — not cold gray
- CJK font-weight bump (400→500)
- Image desaturation with hover restore
- Smooth transition (0.4s ease on background-color and color)
- No manual toggle — fires on page load

## Content Pipeline

```
Notion page (authored by 凯峰)
  │
  ▼ sync-notion.mjs (GitHub Action, every 15min)
  │
  ├─ slug-map.json lookup (Chinese title → English slug)
  ├─ notion-categories.json (category dir → URL slug)
  ├─ Download cover images + inline images
  └─ Write .md with frontmatter:
       title, description, pubDate, heroImage,
       category, source, notion_id, last_synced
  │
  ▼ Astro build (on push)
  │
  └─ Static HTML → Cloudflare Pages
```

## Source Monitoring

8 sources tracked via `blogwatcher-cli` (RSS/HTML scrape):

| Source | Method | Topics |
|--------|--------|--------|
| Tim Ferriss | RSS | Health × Self-optimization |
| Exponential View | RSS | AI × Society × Economy |
| Lenny's Newsletter | RSS | Career × Identity × AI |
| Ozan Varol | RSS | Mental models × Self |
| Peter Attia | RSS | Health × Longevity |
| Stratechery | RSS | AI × Business strategy |
| 阮一峰 Weekly | Atom | Tech-humanities crossover |
| Paul Graham | HTML scrape | Self × Education × Career |

Additional sources (manual): Oliver Burkeman, Ted Gioia, 地心引力, 事不过三, 产品沉思录, 万维钢.

Full source table: `~/.hermes/projects/hao-du-sources.md`

## Constraints

### Technical
- Static site only (SSG) — no server-side runtime
- Notion as sole CMS — no database
- Must work in WeChat in-app browser (X5 WebView)
- Must work across iOS Safari, Android Chrome, Samsung Internet
- No JavaScript frameworks (vanilla JS only for interactive features)

### Business
- 凯峰 is Microsoft FTE — side project, ≤2 hours/week
- No paid subscriptions yet (free launch phase)
- Copyright: translated content from paid sources (Stratechery etc.) needs rights framework

### Design
- Kami design language is non-negotiable — warm, editorial, not tech-cold
- Chinese typography takes priority over Latin
- Mobile reading experience is primary (most readers open links in WeChat/mobile)

## Out of Scope (Current Phase)

- User accounts / authentication
- Comments / social features
- Payment / subscription billing
- Email newsletter
- Native app
- Multi-language support (Chinese only)
- SEO optimization beyond basic meta tags
- Analytics / tracking

## Quality Standards

### Definition of Done
- [ ] Builds successfully (`npm run build`)
- [ ] All URLs are English slugs (no Chinese in URLs)
- [ ] Works in mobile Safari, Chrome, WeChat WebView
- [ ] Dark mode renders correctly (test after 19:30 Beijing time)
- [ ] Paged mode activates by default on mobile
- [ ] No hardcoded colors — all via CSS variables
- [ ] Images optimized (Notion assets downloaded locally)
- [ ] Commit message follows Conventional Commits

### Naming Conventions
- Files: kebab-case (`microsoft-ai-strategy.md`)
- CSS variables: `--kebab-case`
- JS variables: camelCase
- Commits: `feat:`, `fix:`, `sync:`, `refactor:`

## Success Criteria

| Milestone | Timeframe | Metric |
|-----------|-----------|--------|
| Self-excitement | 1 month (4 issues) | 凯峰's two friends proactively share ≥2 articles |
| Organic reach | 2 months (8 issues) | Strangers find 好读 via shares |
| Sustainability | 3 months (12 issues) | 凯峰 wants to keep doing it |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Copyright issues with translated content | Medium | High | Establish rights framework before scaling |
| WeChat WebView breaks features | Medium | Medium | Test every feature in WeChat; fallback gracefully |
| Topic drift (too tech, not enough human) | High | Medium | Track which topics get shared; adjust |
| Burnout (overcommit time) | Low | High | Hard cap at 2-3 articles/week, AI does all non-editorial work |
| Employer conflict (Microsoft compliance) | Low | High | Use personal identity; no Microsoft content |

## Backlog

### P0 — Next
- [ ] OG card image generation (social preview when links shared)
- [ ] 划选分享 + 金句卡片生成 (selection → shareable quote card)

### P1 — Soon
- [ ] Tufte-style sidenotes (主编评语 as marginalia)
- [ ] 鼓掌按钮 (Medium-style clap with confetti)
- [ ] Reading time estimate ("☕ 8 分钟 · 适合一杯手冲的时间")

### P2 — Later
- [ ] Scrollytelling for special features
- [ ] Reading Wrapped (年度阅读报告, Spotify Wrapped style)
- [ ] RSS feed for readers (already has `/rss.xml`, needs promotion)
- [ ] PDF generation pipeline (WeasyPrint)
- [ ] 小红书 card format for distribution

## Changelog

| Date | Commit | Change |
|------|--------|--------|
| 2026-06-10 | `709e6f8` | fix: default paged mode ON for all mobile (WeChat fix) |
| 2026-06-10 | `502d216` | feat: English slugs for all URLs |
| 2026-06-10 | `1ee2a66` | feat: auto dark mode (19:30-07:00 Beijing time) |
| 2026-06-10 | `7fb8437` | fix: paged-mode toggle moved to top-right |
| 2026-06-09 | `d97247c` | fix: adaptive mobile font size + Android font inflation |
| 2026-06-09 | `c6aea62` | feat: paged reading mode (mobile book-flip) |
| 2026-06-07 | `23caede` | feat: Kami design system |
| 2026-06-07 | `d47f9dc` | feat: distinct category label colors |
| 2026-05-xx | initial | Astro blog + Notion sync pipeline |
