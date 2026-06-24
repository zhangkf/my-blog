# 加粗金句高亮功能设计

> 日期：2026-06-24（初版为自动挑选算法，后改为「加粗即金句」编辑控制方案）
> 目的：在文章里把编辑/作者加粗的句子高亮，点击直达金句卡预览。

## 背景与目标

现有 `QuoteCard.astro` 支持「划选文字 → 弹气泡 → 生成金句卡分享」。
本功能让编辑通过「在 Notion 里加粗」来指定金句，文章渲染时自动给所有加粗句
配墨蓝点状下划线，点击直达金句卡预览。

**金句质量由编辑（第一读者）控制，不做任何算法挑选/分布补足。**
（初版曾用「整段加粗优先 + 每 3-5 段补一句」的启发式算法，
 编辑认为算法可能选出非金句，故改为纯编辑控制。）

## 编辑约定

在 Notion 里把金句加粗：
- 原作者已加粗的句子（作者强调）
- 编辑作为第一读者认为重要的句子

sync 流程会把加粗转成 Markdown `**…**` → 渲染成 `<strong>`。
本组件识别所有 `<strong>` 即金句。

## 架构（与现有 QuoteCard 解耦集成）

- `QuoteCard.astro` 监听 `haodu:quote` 事件，收到即 `openCard(quote)`。
- `HighlightQuotes.astro`：扫描 `.prose` 内 `<strong>`/`<b>` → 包成 `<mark>`
  → 点击时分发 `haodu:quote` 事件。
- 两条路径独立：划选手动流程与加粗高亮流程互不干扰。

## 高亮规则

- 收集 `.prose` 内所有 `<strong>` / `<b>`。
- 跳过标题（`h1`–`h6`）内的加粗——那是标题样式，不当金句。
- 跳过 `.article-header` 区域。
- **跳过过短的加粗**（去掉首尾标点/空白后 <12 字）——视为术语/标签
  （如「.env」「原文链接」「Level 0」「算法图谱」），不当金句。
- 整段加粗与段内加粗短语**不区别对待**，一律同样高亮。
- 用 `<mark>` 包住 `<strong>`（`<mark><strong>…</strong></mark>`），
  保留加粗视觉效果，叠加点状下划线。

## 视觉

```css
.prose mark.haodu-quote {
  background: none;
  color: inherit;                        /* 文字不变色，保持阅读节奏 */
  text-decoration: underline dotted var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 5px;
  cursor: pointer;
}
.prose mark.haodu-quote:hover {
  background-color: var(--surface-accent);  /* hover 轻微底纹反馈 */
}
@media (hover: none) {
  .prose mark.haodu-quote:active { background-color: var(--surface-accent); }
}
```

墨蓝点下划线随 `--accent` 自动切换亮/暗色；文字不变色，hover 一抹淡底纹作二次确认。

## 交互

点击高亮 → 分发 `haodu:quote` 事件 → QuoteCard 直达金句卡预览（跳过气泡）。
`stopPropagation` 避免误触翻页模式 tap-zone；主动清选区避免触发划选气泡。

## 边界情况

1. **与划选气泡协调**：两条路径独立；点击高亮时主动清选区。
2. **翻页模式（移动端）**：`<mark>` 行内元素正常跨列；`stopPropagation`
   保证点高亮不误触 tap-zone 翻页。
3. **保留 `<strong>` 语义**：不替换 `<strong>`，在其外再包 `<mark>`，
   保留加粗视觉效果 + 叠加点状下划线。
4. **运行时机**：`DOMContentLoaded` 后、`.prose` 存在时执行。

## 部署契约（重要）

本仓库部署在 Vercel，监听 GitHub `main` 分支自动部署。
**本地 commit 后必须 `git push`，否则线上不会更新。**

## 文件改动清单

| 文件 | 改动 |
|---|---|
| `src/components/QuoteCard.astro` | 顶部加 `haodu:quote` 事件监听（~5 行） |
| `src/components/HighlightQuotes.astro` | 扫描 `<strong>` → 包 `<mark>` → 点击分发 |
| `src/pages/[category]/[...slug].astro` | 在 `<QuoteCard />` 后引入 `<HighlightQuotes />` |
