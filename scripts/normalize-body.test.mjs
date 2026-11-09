import assert from "node:assert/strict";
import test from "node:test";
import {
  firstParagraphText,
  normalizeArticleBody,
  parseBylineFields,
} from "./normalize-body.mjs";

test("双语页：只留中文全文，前言署名抽成字段", () => {
  const md = [
    "> 💡 TL;DR：一位教授的激进观点。附英文原文。",
    "# I Teach at a Business School. It's Time to Shut Them Down.",
    "**作者**：Chris Marquis（Christopher Marquis），剑桥大学教授 **发表**：《纽约时报》观点版 Guest Essay，2026-10-18 **链接**：[https://www.nytimes.com/2026/10/18/opinion/x.html](https://www.nytimes.com/2026/10/18/opinion/x.html) **备注**：英文原文 + 中文全文翻译。",
    "---",
    "## 原文",
    "This fall, another cohort has arrived at business schools.",
    "---",
    "## 中文全文",
    "今年秋天，又一批年轻人来到商学院。",
    "他们想学的东西很明确。",
  ].join("\n\n");
  const { markdown, fields } = normalizeArticleBody(md, { title: "NYT：商学院" });
  assert.equal(
    markdown,
    "今年秋天，又一批年轻人来到商学院。\n\n他们想学的东西很明确。"
  );
  assert.equal(fields.title, "I Teach at a Business School. It's Time to Shut Them Down.");
  assert.equal(fields.url, "https://www.nytimes.com/2026/10/18/opinion/x.html");
  assert.match(fields.author, /Chris Marquis/);
  assert.match(fields.publication, /纽约时报/);
  assert.doesNotMatch(fields.publication, /2026-10-18/);
});

test("行内署名：TL;DR 与署名行被移除，字段齐全", () => {
  const md = [
    "> 💡 TL;DR：把资料丢进 raw/ 目录，让 LLM 编译成 wiki。",
    "Andrej Karpathy · X · 2026-04-02 · [原文](https://x.com/karpathy/status/2039805659525644595)",
    "---",
    "最近发现一件特别好使的事：用 LLM 搭个人知识库。",
  ].join("\n\n");
  const { markdown, fields } = normalizeArticleBody(md, {});
  assert.equal(markdown, "最近发现一件特别好使的事：用 LLM 搭个人知识库。");
  assert.equal(fields.author, "Andrej Karpathy");
  assert.equal(fields.publication, "X");
  assert.equal(fields.url, "https://x.com/karpathy/status/2039805659525644595");
});

test("引用式署名（NYT 风格）：抽出原题/作者/链接并移除", () => {
  const md = [
    "> 💡 TL;DR：中年想长寿的 9 件事。",
    "# 中年做这 9 件事，专家说能提高长寿概率",
    "> 原文：The New York Times（Well 栏目） 英文标题：9 Things Experts Wish You'd Do in Midlife to Increase Longevity 作者：Dana G. Smith（达娜·G·史密斯） 日期：2026年7月28日 原文链接：[https://www.nytimes.com/2026/07/28/well/longevity.html](https://www.nytimes.com/2026/07/28/well/longevity.html) 受访专家：玛吉·拉赫曼",
    "---",
    "## 导语",
    "中年你如何对待自己的身体，会影响未来几十年。",
  ].join("\n\n");
  const { markdown, fields } = normalizeArticleBody(md, {});
  assert.match(markdown, /^## 导语/);
  assert.equal(fields.author, "Dana G. Smith（达娜·G·史密斯）");
  assert.equal(
    fields.title,
    "9 Things Experts Wish You'd Do in Midlife to Increase Longevity"
  );
  assert.equal(fields.url, "https://www.nytimes.com/2026/07/28/well/longevity.html");
  assert.match(fields.publication, /New York Times/);
});

test("逗号式署名（A.O. Scott）：抽出作者与刊物", () => {
  const fields = parseBylineFields(
    "A.O. Scott, The New York Times Magazine, 2026-10-18（10月25日刊，第20页） [https://www.nytimes.com/2026/10/18/magazine/john-berger-attention.html](https://www.nytimes.com/2026/10/18/magazine/john-berger-attention.html)"
  );
  assert.equal(fields.author, "A.O. Scott");
  assert.equal(fields.publication, "The New York Times Magazine");
  assert.match(fields.url, /john-berger-attention/);
});

test("列表式署名（katie lowe）：发布于与原文链接分开", () => {
  const fields = parseBylineFields(
    "- **作者：** katie lowe\n- **发布于：** RAYON — [ktklp.substack.com](https://ktklp.substack.com/)\n- **日期：** 2026年8月19日\n- **原文：** <[https://ktklp.substack.com/p/do-you-really-want-a-slow-life>](https://ktklp.substack.com/p/do-you-really-want-a-slow-life%3E)"
  );
  assert.equal(fields.author, "katie lowe");
  assert.equal(fields.publication, "RAYON");
  assert.equal(fields.url, "https://ktklp.substack.com/p/do-you-really-want-a-slow-life");
});

test("干净正文不被误伤：英文引用与代码块保留", () => {
  const md = [
    "第一段中文正文，讲一个概念。",
    "> The important thing to remember is that it does not matter how you got the idea.",
    "```javascript\nGenerate new product ideas with the following requirements.\n```",
    "最后一段中文。",
  ].join("\n\n");
  const { markdown, dropped } = normalizeArticleBody(md, {});
  assert.equal(markdown, md);
  assert.equal(dropped.length, 0);
});

test("firstParagraphText 跳过标题与引用块", () => {
  const md = [
    "# 标题",
    "> 💡 TL;DR：摘要。",
    "真正的第一段正文，长度足够被选中作为描述文本。",
  ].join("\n\n");
  assert.equal(firstParagraphText(md), "真正的第一段正文，长度足够被选中作为描述文本。");
});
