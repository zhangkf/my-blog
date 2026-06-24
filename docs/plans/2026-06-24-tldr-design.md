# TL;DR 策展总结功能设计

> 日期：2026-06-24
> 目的：让编辑在文章正文顶部用约定 callout 写一句话总结（TL;DR），
> 渲染成「好读」策展样式块，并可作为最高优先金句一键分享。

## 背景与目标

「好读」是个人策展阅读应用，现有社交货币路径集中在「读者摘金句 → 分享」。
本功能强化**策展权威层**：让「好读为什么选这篇」本身成为可见、可分享的策展信号，
把策展者的判断（一句话总结）变成读者转发时传递的品味背书。

与现有金句功能（`QuoteCard` + `HighlightQuotes`）解耦共存：
TL;DR 是编辑主动写的一句话总结，质量最高，优先级最高。

## 落地路径选择

**路径 A（采用）：正文约定 callout**

sync 脚本（`scripts/sync-notion.mjs`）已把 Notion callout 转成 markdown 引用块
`> {icon} {text}`（见 `sync-notion.mjs:284-293`）。编辑只需在文章正文顶部放一个
💡 callout，内容以 `TL;DR：` 开头，sync 不用改、schema 不用改。

**为什么不选路径 B（Notion 页面属性 → frontmatter）**：
现有文章是普通 child_page 结构，加属性需建 database，编辑操作不如写 callout 自然；
且路径 A 的改动面最小，列表页暂用现有 `description` 顶着，够用。

## 编辑约定

在 Notion 文章正文最上方放一个 callout 块：
- 图标用 **💡**（宽松匹配下非强制）
- 内容以 **`TL;DR：`** 开头，后面跟一句话总结（建议 20-40 字）

sync 转成：
```markdown
> 💡 TL;DR：一句话总结这篇文章的核心。
```

## 识别规则（宽松匹配）

渲染端（纯客户端）扫 `.prose` 内所有 `<blockquote>`，找第一个满足条件的：

1. 取其纯文本，trim 后去掉开头的 emoji（`💡` 或任意 emoji）与空白
2. 不区分大小写匹配，以 `tldr` / `tl;dr` / `tl，dr`（兼容中文逗号误打）开头即命中
3. 命中后**停止扫描**，一篇只处理第一个 tldr
4. 没命中则静默退出（老文章不受影响，可渐进补写）

## 架构

- `Tldr.astro`：扫 `.prose` 内 `<blockquote>` → 命中则套策展样式 →
  清理前缀文字 → 点击分发 `haodu:quote` 事件（复用 `QuoteCard`）。
- 与 `HighlightQuotes` 互不干扰：一个改 blockquote，一个改 strong。
- 纯客户端、无 props、无 UI 元素、无 SSR 改动。

## 文本清理

命中的块行内含 `💡 TL;DR：实际内容`，渲染时：
- 把 `TL;DR：` 前缀连同 emoji、冒号从可见文本删掉
- 真正的总结内容留下
- `TL;DR` 改用右上角 CSS 小标签呈现（不占正文行）

## 视觉

```
┌─────────────────────────────────────┐
│                              TL;DR  │  ← 墨蓝小标签，右上角
│ 令牌资本不替代人力资本，反而让它更值钱 │  ← 正文，左侧墨蓝竖线
└─────────────────────────────────────┘
```

- 左侧 3px 墨蓝竖线（`border-left`）
- 淡墨蓝底纹（`var(--surface-accent)`）
- `TL;DR` 墨蓝小字标签浮右上角
- 整块可点（cursor pointer + hover 反馈），点击出金句卡

```css
.prose .haodu-tldr {
  position: relative;
  border-left: 3px solid var(--accent);
  background-color: var(--surface-accent);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.prose .haodu-tldr:hover { background-color: var(--surface-hover); }
.prose .haodu-tldr::after {
  content: "TL;DR";
  position: absolute; top: 0.4em; right: 0.6em;
  color: var(--accent); font-size: 0.7em; font-weight: 600;
  letter-spacing: 0.05em; opacity: 0.7;
}
```

## 交互

点击 tldr 块 → 分发 `haodu:quote` 事件 → `QuoteCard` 直达金句卡预览。
`tldr` 这句话质量最高，作为「策展者一句话总结」直接成为最高优先的可分享金句。
`stopPropagation` 避免误触翻页模式 tap-zone。

## 与金句高亮的协调

`HighlightQuotes` 扫 `<strong>`/`<b>`。tldr 块内若有加粗词，
会出现「墨蓝点下划线 + 整块可点」叠加。处理：Tldr 组件给块加 class 后，
CSS 层面禁用块内 `mark.haodu-quote` 的点状下划线，点击行为交给整块，
不碰 `HighlightQuotes` 逻辑，纯 CSS 隔离：

```css
.prose .haodu-tldr mark.haodu-quote {
  text-decoration: none;
  cursor: pointer;
}
```

## 边界情况

1. **宽松匹配**：只看去掉 emoji/空白后是否 `TL;DR` 开头，图标不强制、大小写不敏感。
2. **一篇一个**：只处理第一个命中的 blockquote，其余忽略。
3. **没写 tldr 的老文章**：静默退出，渐进补写。
4. **翻页模式**：blockquote 有 `break-inside: avoid`，不跨页切割，自然兼容；
   点击需 `stopPropagation` 避免误触 tap-zone。
5. **执行时机**：`DOMContentLoaded` 后、`.prose` 存在时执行。

## 部署契约

本仓库部署在 Vercel，监听 GitHub `main` 分支自动部署。
**本地 commit 后必须 `git push`，否则线上不会更新。**

## 文件改动清单

| 文件 | 改动 |
|---|---|
| `src/components/Tldr.astro` | 新增：扫 blockquote → 套样式 → 清前缀 → 点击分发 |
| `src/pages/[category]/[...slug].astro` | 在 `<HighlightQuotes />` 后引入 `<Tldr />` |
