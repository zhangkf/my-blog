# Copilot instructions for this repository

这是「好读」中文慢阅读策展站点：Astro 5 静态站点，内容源来自 Notion，同步后生成 Markdown 内容并由 Cloudflare Pages 部署。

## Commands

所有命令都从仓库根目录运行：

| Command | Purpose |
| --- | --- |
| `npm install` / `npm ci` | 安装依赖；CI 使用 `npm ci` |
| `npm run dev` | 启动 Astro 本地开发服务器（默认 `localhost:4321`） |
| `npm run build` | 生产构建到 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm run sync` | 运行 Notion → Markdown 同步，需要 `NOTION_API_KEY`，可选 `NOTION_PARENT_PAGE_IDS` |
| `npm run test:e2e` | 运行 Playwright 移动端翻页回归测试，覆盖 Mobile Chrome、Mobile Safari/WebKit、WeChat WebView 近似 UA |
| `npm run test:e2e -- --project "Mobile Safari" tests/e2e/paged-reading.spec.ts` | 只跑 WebKit/iOS Safari 近似环境的翻页测试 |
| `npm run test:e2e -- --project "Mobile Chrome" tests/e2e/paged-reading.spec.ts` | 只跑 Android Chrome 近似环境的翻页测试 |
| `npm run astro -- --help` | 查看 Astro CLI 命令 |

当前 `package.json` 没有 lint 脚本，也没有单元测试框架配置；不要臆造 `npm test` 或 `npm run lint`。

## Architecture

- 内容管线：Notion 页面由 `.github/workflows/sync-notion.yml` 每 15 分钟或手动触发同步，执行 `node scripts/sync-notion.mjs`。脚本发现 Notion 父页/分类/文章，转换 block 为 Markdown，下载 Notion 托管图片到 `public/notion-assets/`，写入 `src/content/{category}/`，并更新 `src/notion-categories.json`。
- 分类和路由由 `src/notion-categories.json` 驱动。`src/content.config.ts` 读取该 manifest，为每个分类 slug 动态注册 Astro content collection；页面通过 `getCollection(slug)` 聚合内容。
- 主要路由：`src/pages/index.astro` 汇总所有分类文章并按 `pubDate` 倒序排列；`src/pages/[category]/index.astro` 是分类列表；`src/pages/[category]/[...slug].astro` 渲染文章页；`src/pages/rss.xml.js` 汇总所有分类生成 RSS。
- URL 结构：分类 URL 使用 manifest 里的英文 `slug`（例如 `健康` → `health`），文章 URL 使用 Markdown 文件名/collection id。中文标题的英文文章 slug 由 `scripts/slug-map.json` 提供，`scripts/sync-notion.mjs` 中的 `CATEGORY_SLUG_MAP` 维护分类映射。
- 站点级元信息在 `src/consts.ts`；`src/components/BaseHead.astro` 引入全局样式、字体、canonical/RSS/OG metadata，并在 `<head>` 内用 inline script 根据北京时间 19:30-07:00 加 `html.dark-mode`，避免亮暗切换闪烁。
- 移动阅读体验在文章页内实现：`[...slug].astro` 使用 vanilla JS + CSS multi-column 提供移动端默认开启的翻页模式，使用 `localStorage` 的 `haodu-paged` 仅记录用户显式关闭；实现要兼容 WeChat in-app browser。
- 翻页模式有 Playwright 回归测试在 `tests/e2e/paged-reading.spec.ts`；修改分页测量、滚动、移动端 CSS 或文章页结构后，应至少跑对应的 Mobile Chrome 和 Mobile Safari 项目。

## Project-specific conventions

- 面向读者的内容、标题、描述和 UI 文案以中文为主；URL slug 保持英文、短横线分隔。
- 内容目录名等于 Notion 分类名，可以是中文；路由层使用 `src/notion-categories.json` 中的英文 slug，不要直接从目录名拼 URL。
- 新增中文标题文章时，先在 `scripts/slug-map.json` 增加 3-5 个词的英文 slug 映射；新增分类时，同步更新 `scripts/sync-notion.mjs` 的 `CATEGORY_SLUG_MAP`，否则会退回目录名的小写形式。
- Notion 同步生成的 frontmatter 字段包括 `title`、`description`、`pubDate`、`heroImage`、`category`、`source`、`notion_id`、`notion_parent`、`last_synced`；`src/content.config.ts` 的 schema 需要与这些字段保持一致。
- `last_synced` 会频繁变化；同步脚本比较内容时会忽略该字段。不要把只由 `last_synced` 引起的差异当成实质内容变更。
- `public/notion-assets/` 是持久化 Notion 图片的位置；不要依赖 Notion file URL 长期可用。
- 设计系统是 Kami：暖纸底、墨蓝强调色、中文衬线阅读体验。新增样式优先使用 `src/styles/global.css` 中的 CSS 变量（如 `--accent`、`--border-*`、`--surface-*`），避免硬编码蓝色/边框色。
- 中文排版和移动端优先级高于桌面端；`global.css` 已处理 CJK 字号、行高、Android font inflation 和暗色模式字重。
- 交互功能保持 Astro + vanilla JS；当前项目没有 React/Vue/Svelte 等客户端框架。
- Playwright 的 WeChat 项目只是 Android WebView/微信 UA 近似测试，不能替代真机微信 X5 WebView 冒烟测试。
- GitHub Action 自动提交 Notion 同步内容，提交信息使用 `sync: update blog content from Notion` 并带 Copilot co-author trailer。
