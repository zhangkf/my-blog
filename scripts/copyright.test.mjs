import assert from "node:assert/strict";
import test from "node:test";
import {
  extractCopyrightFromMarkdown,
  isCopyrightHeader,
  parseCopyrightText,
} from "./copyright.mjs";

test("识别出处标题，忽略普通作者简介", () => {
  assert.equal(isCopyrightHeader("📄 出处"), true);
  assert.equal(isCopyrightHeader("版权"), true);
  assert.equal(isCopyrightHeader("Source:"), true);
  assert.equal(
    parseCopyrightText("作者：姜峯楠（Ted Chiang），居于美国太平洋西北地区的华裔作家。"),
    null
  );
});

test("解析标准多行 callout", () => {
  const parsed = parseCopyrightText(`📄 出处
作者：Oscar Sykes, Benjamin Stubbing
原名：A brief history of instant coffee
原文：https://worksinprogress.co/issue/a-brief-history-of-instant-coffee/`);

  assert.deepEqual(parsed, {
    author: "Oscar Sykes, Benjamin Stubbing",
    title: "A brief history of instant coffee",
    url: "https://worksinprogress.co/issue/a-brief-history-of-instant-coffee/",
  });
});

test("解析单行分隔写法与 markdown 链接", () => {
  const parsed = parseCopyrightText(
    "出处：作者：姜峯楠 · 文章原名：Why A.I. Isn't Conscious · 原文：[阅读](https://example.com/ai)"
  );
  assert.equal(parsed.author, "姜峯楠");
  assert.equal(parsed.title, "Why A.I. Isn't Conscious");
  assert.equal(parsed.url, "https://example.com/ai");
});

test("出处后可带刊物名", () => {
  const parsed = parseCopyrightText(`出处：Works in Progress
作者：Oscar Sykes
原文链接：https://worksinprogress.co/issue/a-brief-history-of-instant-coffee/`);
  assert.equal(parsed.publication, "Works in Progress");
  assert.equal(parsed.author, "Oscar Sykes");
});

test("识别刊物字段标签", () => {
  const parsed = parseCopyrightText(`出处
刊物：Raptitude
原名：How to Exist
作者：David Cain
原文：https://www.raptitude.com/2026/07/how-to-exist/
说明：中文由好读整理，版权归原作者`);
  assert.equal(parsed.publication, "Raptitude");
  assert.equal(parsed.author, "David Cain");
  assert.equal(parsed.title, "How to Exist");
  assert.equal(parsed.url, "https://www.raptitude.com/2026/07/how-to-exist/");
});

test("缺少部分字段仍然成立", () => {
  const parsed = parseCopyrightText("版权\n作者：张凯峰");
  assert.deepEqual(parsed, { author: "张凯峰" });
});

test("只有标题没有字段则忽略", () => {
  assert.equal(parseCopyrightText("出处"), null);
});

test("从正文抽出出处块并删除", () => {
  const md = `正文第一段。

> 💡 TL;DR：一句话。

正文第二段。

> 📄 出处
> 作者：Oscar Sykes
> 原名：A brief history of instant coffee
> 原文：https://worksinprogress.co/issue/a-brief-history-of-instant-coffee/
`;
  const { copyright, markdown } = extractCopyrightFromMarkdown(md);
  assert.equal(copyright.author, "Oscar Sykes");
  assert.equal(copyright.title, "A brief history of instant coffee");
  assert.match(markdown, /正文第二段/);
  assert.doesNotMatch(markdown, /出处/);
  assert.match(markdown, /TL;DR/);
});

test("多段出处时取最后一段", () => {
  const md = `> 出处
> 作者：旧作者

正文

> 出处
> 作者：新作者
> 原文：https://example.com/new
`;
  const { copyright } = extractCopyrightFromMarkdown(md);
  assert.equal(copyright.author, "新作者");
  assert.equal(copyright.url, "https://example.com/new");
});
