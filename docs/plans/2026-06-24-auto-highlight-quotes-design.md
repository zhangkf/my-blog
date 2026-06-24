# 自动高亮金句功能设计

> 日期：2026-06-24
> 目的：在文章渲染时自动挑出若干「金句」高亮，点击高亮句直达金句卡预览。

## 背景与目标

现有 `QuoteCard.astro` 已支持「划选文字 → 弹气泡 → 生成 Canvas 金句卡分享」。
但完全依赖用户主动划选，发现率低。

本功能在渲染后的文章里**自动高亮**部分金句（点状下划线），实现：

1. **丰富阅读视觉层次**——点状下划线作为编辑感装饰，增强文章渲染体验。
2. **暗示可点击**——高亮是「可点」的视觉 affordance，引导用户发现金句卡功能。

点击高亮金句 → 直达金句卡预览（复用 `QuoteCard.openCard`）。

## 架构（与现有 QuoteCard 解耦集成）

金句卡生成逻辑在 `QuoteCard.astro` 的 `openCard(quote)` 内，原为 IIFE 私有。
最小侵入集成：

- `QuoteCard.astro` 顶部加 CustomEvent 监听：
  ```js
  document.addEventListener('haodu:quote', e => { if (e.detail?.quote) openCard(e.detail.quote); });
  ```
- 新建 `HighlightQuotes.astro`：扫描 DOM → 包裹高亮 → 点击时分发 `haodu:quote` 事件。
- 两条路径独立：划选手动流程（`selectionchange` → 气泡）与自动高亮流程（事件直达）互不干扰。

## 金句挑选算法（客户端运行期，不动 Markdown / Notion 同步）

文章渲染后扫描 `.prose` 内 `<p>`，分三级候选：

| 级别 | 来源 | 说明 |
|---|---|---|
| **A 级** | 整段加粗段落（`<p><strong>…</strong></p>`，strong 覆盖全段） | 作者明确强调的核心句，最强候选 |
| **B 级** | 段内行内 `<strong>` 文本（长度 12–60 字，排除太短术语型加粗） | 行内强调 |
| **C 级** | 前两级不足时，按段落位置在该段挑长度适中（15–50 字）的完整句子 | 均匀分布补足 |

**分布节奏**：目标「每 3–5 段一句」。

- 从 A 级候选按段落顺序取；相邻两句间隔 <3 段则跳过后一句（避免过密）。
- 间隔 >5 段且无加粗候选时，用 C 级在该空隙补一句。
- 每篇文章高亮设软上限（6–8 句），避免长文满屏高亮稀释效果。

## 视觉

对被选金句用 `<mark>` 包裹（语义化、不破坏排版），加 class `haodu-quote`：

```css
.prose mark.haodu-quote {
  background: none;
  color: inherit;                        /* 文字不变色，保持阅读节奏 */
  text-decoration: underline dotted var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 5px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s;
}
.prose mark.haodu-quote:hover {
  background-color: var(--surface-accent);  /* hover 轻微底纹反馈 */
}
```

墨蓝点下划线随 `--accent` 自动切换亮/暗色；文字不变色，hover 时一抹淡底纹作二次确认。

## 交互

`HighlightQuotes.astro` 给每个 `mark` 绑定 click：

```js
mark.addEventListener('click', e => {
  e.stopPropagation();                   // 不触发翻页模式 tap-zone 翻页
  try { window.getSelection().removeAllRanges(); } catch (err) {}  // 清残留选区，避免触发划选气泡
  document.dispatchEvent(new CustomEvent('haodu:quote', { detail: { quote: mark.textContent } }));
});
```

直达金句卡预览，跳过中间气泡。

## 边界情况

1. **与划选气泡协调**：两条路径独立；点击高亮时主动清选区，避免残留触发气泡。
2. **翻页模式（移动端）**：`<mark>` 行内元素正常跨列；`stopPropagation` 保证点高亮不误触 tap-zone 翻页；金句跨页边界无妨，点哪边都在当前页触发。
3. **保留 `<strong>` 语义**：不替换 `<strong>`，在其外再包 `<mark>`（`<mark><strong>…</strong></mark>`），保留加粗视觉效果 + 叠加点状下划线。
4. **运行时机**：`DOMContentLoaded` 后、`.prose` 存在时执行；两段 inline 脚本按文档顺序执行，事件监听器先于分发注册。
5. **可关闭性**：暂不加开关。高亮为被动装饰、点击为主动行为，不打扰阅读。

## 文件改动清单

| 文件 | 改动 |
|---|---|
| `src/components/QuoteCard.astro` | 顶部加 `haodu:quote` 事件监听（~3 行），其余不动 |
| `src/components/HighlightQuotes.astro` | **新建**：扫描 + 包裹 + 点击分发，含 `<style>` |
| `src/pages/[category]/[...slug].astro` | 在 `<QuoteCard />` 后引入 `<HighlightQuotes />` |

不碰 Markdown、不碰 Notion 同步、不碰翻页逻辑。
