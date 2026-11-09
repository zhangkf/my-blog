/**
 * 文章正文规范化（网站呈现层）
 *
 * 基准结构（见 src/content/AI/2026.md 的呈现）：页面 = 标题 + 中文正文 +
 * 文末出处（由 frontmatter origin_* 渲染）。Notion 是工作稿，保留双语
 * 对照、TL;DR、署名行；同步时在这里把正文收敛成网站结构：
 *
 *   1. 双语页（「## 原文」…「## 中文全文」）：只保留中文全文；前言里的
 *      英文原题与署名信息（作者 / 刊物 / 原文链接）抽出来回填 frontmatter。
 *   2. 开头杂质：TL;DR 引用块、署名行、重复的一级标题、「说明：」引用块、
 *      开头的分隔线 —— 移除，署名信息先抽走再删。
 *
 * 正文内部的英文引用、代码块、表格、图片不动；Notion 源头也不动。
 */

// 署名块里可能出现的字段标签（用于切分字段值边界）
const FIELD_LABELS = [
  "作者",
  "发表",
  "刊物",
  "来源",
  "发布于",
  "原文链接",
  "原文",
  "链接",
  "英文标题",
  "文章原名",
  "原文标题",
  "原名",
  "原题",
  "日期",
  "存档日期",
  "备注",
  "插图",
  "副题",
  "导语",
  "说明",
  "受访专家",
  "出处",
  "配图",
  "译者",
  "Author",
  "Title",
  "Publication",
  "URL",
  "Link",
];
const LABEL_ALT = FIELD_LABELS.map((l) =>
  l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
).join("|");

function cleanValue(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]*)\]\((?:https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s·|，,；;：:—-]+|[\s·|，,；;]+$/g, "")
    .trim();
}

function stripBlockDecor(text) {
  return String(text || "")
    .split("\n")
    .map((line) =>
      line
        .replace(/^>\s?/, "")
        .replace(/^\s*[-*•]\s+/, "")
        .trim()
    )
    .join("\n")
    .trim();
}

/** 从 markdown 文本里提取第一个链接 URL（markdown 链接优先，其次裸 URL）。 */
function extractFirstUrl(text) {
  const md = String(text || "").match(/\]\((https?:\/\/[^)\s]+)\)/);
  if (md) return md[1].replace(/%3E$/i, "");
  const bare = String(text || "").match(/https?:\/\/[^\s)）>\]]+/);
  return bare ? bare[0].replace(/[.,;；。]+$/, "").replace(/%3E$/i, "") : "";
}

function matchLabeledRaw(text, labels) {
  const alt = labels
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  // 标签两侧都可能有 markdown 加粗符（**作者**： / **作者：**），一律容忍
  const re = new RegExp(
    `(?:^|[\\s*|；;])((?:${alt}))\\s*\\**\\s*[：:]\\s*([\\s\\S]+?)(?=\\s*\\**\\s*(?:${LABEL_ALT})\\s*\\**\\s*[：:]|$)`
  );
  const m = text.match(re);
  return m ? m[2] : "";
}

function matchLabeled(text, labels) {
  return cleanValue(matchLabeledRaw(text, labels));
}

function trimPubDate(publication) {
  let pub = String(publication || "");
  // 「RAYON — ktklp.substack.com」→ 只留刊物名，去掉尾部的域名部分
  const dash = pub.match(/^(.+?)\s+[—–]\s+([\w.-]+\.[a-z]{2,}(?:\/\S*)?)$/i);
  if (dash) pub = dash[1];
  // 「《纽约时报》观点版 Guest Essay，2026-10-18」→ 去掉尾部日期
  return pub
    .replace(
      /[，,、]?\s*20\d{2}[-年]\d{1,2}(?:[-月]\d{1,2}日?)?(?:\s*\d{1,2}:\d{2}\s*(?:BST|CST|EST|PST|GMT)?)?(?:\s*[（(][^）)]*[）)])?[。.]?\s*$/,
      ""
    )
    .replace(/[，,、]\s*$/, "")
    .trim();
}

/**
 * 从一段署名文本里抽取出处字段。识别三种写法：
 *  1. 标签式：作者：X 发表：Y 链接：[url]（含 **作者**： / **作者：** 两种加粗位置）
 *  2. 行内式：作者 · 刊物 · 2026-04-02 · [原文](url)
 *  3. 逗号式：A.O. Scott, The New York Times Magazine, 2026-10-18 [url]
 * 抽不到返回 {}。
 */
export function parseBylineFields(rawText) {
  const text = stripBlockDecor(rawText);
  if (!text) return {};
  // URL 优先取「原文链接 / 链接 / 原文」标签段里的，其次才是全文第一个链接
  // （署名块里刊物主页链接可能排在文章链接前面，不能抢）
  let url = extractFirstUrl(matchLabeledRaw(text, ["原文链接", "链接", "URL", "Link"]));
  if (!url) url = extractFirstUrl(matchLabeledRaw(text, ["原文"]));
  if (!url) url = extractFirstUrl(text);
  const fields = {};
  if (url) fields.url = url;

  // 1) 标签式
  const author = matchLabeled(text, ["作者", "Author"]);
  let publication = matchLabeled(text, ["发表", "刊物", "来源", "发布于", "Publication"]);
  const title = matchLabeled(text, ["英文标题", "文章原名", "原文标题", "原名", "原题", "Title"]);
  if (author) fields.author = author;
  if (title) fields.title = title;
  // 「原文：」有两种用法：值是刊物名（NYT 风格）→ publication；
  // 值是带链接的原文标题（[英文原题](url)）→ title。二者别混。
  const yuanwenRaw = matchLabeledRaw(text, ["原文"]);
  const ywLink = yuanwenRaw.match(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/);
  if (ywLink && !/^https?:\/\//.test(ywLink[1])) {
    if (!fields.title) fields.title = cleanValue(ywLink[1]);
  } else {
    const yuanwen = cleanValue(yuanwenRaw);
    if (!publication && yuanwen && !/^https?:\/\//.test(yuanwen) && !yuanwen.includes("http")) {
      publication = yuanwen;
    }
  }
  if (publication) fields.publication = trimPubDate(publication);

  // 2) 行内式：Name · Pub · DATE · [原文](url)
  if (!fields.author || !fields.publication) {
    const line = text.split("\n").find((l) => l.includes("·"));
    if (line) {
      const segs = line.split("·").map((s) => s.trim());
      if (segs.length >= 3 && /20\d{2}-\d{2}-\d{2}/.test(segs[2])) {
        if (!fields.author) fields.author = cleanValue(segs[0]);
        if (!fields.publication) fields.publication = cleanValue(segs[1]);
      }
    }
  }

  // 3) 逗号式：Name, Publication, DATE … [url]
  if (!fields.author && url) {
    const noLink = text.replace(/\[[^\]]*\]\(https?:\/\/[^)\s]+\)/g, "").trim();
    const firstLine = noLink.split("\n")[0];
    const parts = firstLine.split(/,\s*/);
    if (parts.length >= 3 && /20\d{2}/.test(parts[2])) {
      fields.author = cleanValue(parts[0]);
      if (!fields.publication) fields.publication = cleanValue(parts[1]);
    }
  }

  return fields;
}

function splitBlocks(markdown) {
  return String(markdown || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function isTldrBlock(block) {
  return block.startsWith(">") && block.includes("TL;DR");
}

function isNoteQuoteBlock(block) {
  if (!block.startsWith(">")) return false;
  return /^说明\s*[：:]/.test(stripBlockDecor(block));
}

/** 一个块是否是署名块：能抽出 ≥2 个字段，或同时出现作者标签与来源类标签。 */
function bylineInfo(block) {
  if (block.startsWith("![")) return null; // 图片块的 alt 文本里可能有「作者：」，不是署名
  const fields = parseBylineFields(block);
  const n = Object.keys(fields).length;
  const text = stripBlockDecor(block);
  const hasAuthorLabel = /(作者|Author)\s*[：:]/.test(text);
  const hasSourceLabel = /(发表|刊物|来源|发布于|原文|链接)\s*[：:]/.test(text);
  if (n >= 2 || (hasAuthorLabel && hasSourceLabel)) return fields;
  // 行内式署名（作者 · 刊物 · 日期 · 原文链接）单独成块时也算
  if (n >= 1 && /·\s*20\d{2}-\d{2}-\d{2}\s*·/.test(text)) return fields;
  // 无链接的署名 / 译者注单行（作者 · 日期 · ……）：含「· 日期 ·」即认定
  if (!block.includes("\n") && block.length <= 140 && /·\s*20\d{2}-\d{2}-\d{2}\s*·/.test(text)) {
    const firstSeg = text.split("·")[0].trim();
    if (firstSeg && !fields.author && firstSeg.length <= 60) {
      fields.author = cleanValue(firstSeg);
    }
    return fields;
  }
  return null;
}

const HEAD_SCAN_BLOCKS = 8;

/**
 * 规范化正文。返回 { markdown, fields, dropped }：
 *  - fields：从前言 / 署名块抽到的出处字段（author/title/url/publication）
 *  - dropped：被移除的块（截断文本），供日志与干跑审查
 */
export function normalizeArticleBody(markdown, { title = "" } = {}) {
  let blocks = splitBlocks(markdown);
  const fields = {};
  const dropped = [];
  const merge = (f) => {
    for (const [k, v] of Object.entries(f || {})) {
      if (v && !fields[k]) fields[k] = v;
    }
  };

  // ── 1) 双语页：只保留「## 中文全文」之后的内容 ────────────────────
  const yuanwenIdx = blocks.findIndex((b) => /^##\s*原文\s*$/.test(b));
  const zhIdx = blocks.findIndex((b) => /^##\s*中文全文\s*$/.test(b));
  if (yuanwenIdx !== -1 && zhIdx > yuanwenIdx) {
    const preamble = blocks.slice(0, yuanwenIdx);
    for (const b of preamble) {
      const h1 = b.match(/^#\s+(.+)$/);
      // 双语前言里的一级标题是英文原题（页面标题是中文）；以拉丁字母为主才收
      if (h1 && !fields.title) {
        const t = cleanValue(h1[1]);
        const latin = (t.match(/[A-Za-z]/g) || []).length;
        const cjk = (t.match(/[一-鿿]/g) || []).length;
        if (latin > cjk) fields.title = t;
      }
      merge(bylineInfo(b) || parseBylineFields(b));
      dropped.push(b);
    }
    dropped.push(blocks[yuanwenIdx], blocks[zhIdx]);
    blocks = blocks.slice(zhIdx + 1);
  }

  // ── 2) 开头杂质清理（扫描前若干块） ──────────────────────────────
  const kept = [];
  let keptRealBlock = false;
  blocks.forEach((block, idx) => {
    if (idx >= HEAD_SCAN_BLOCKS) {
      kept.push(block);
      return;
    }
    if (isTldrBlock(block)) {
      dropped.push(block);
      return;
    }
    if (block === "---" && !keptRealBlock) {
      dropped.push(block);
      return;
    }
    if (/^#\s+/.test(block)) {
      // 一级标题在开头只会是与页面标题重复的原题 / 译题，直接移除；
      // 原题由署名块的「英文标题 / 原文」字段提供，不从这里猜
      dropped.push(block);
      return;
    }
    const byline = bylineInfo(block);
    if (byline) {
      merge(byline);
      dropped.push(block);
      return;
    }
    if (isNoteQuoteBlock(block)) {
      dropped.push(block);
      return;
    }
    keptRealBlock = true;
    kept.push(block);
  });

  return {
    markdown: kept.join("\n\n").trim(),
    fields,
    dropped,
  };
}

/** 取正文第一个普通段落的纯文本（做 description 用）。 */
export function firstParagraphText(markdown, maxLen = 200) {
  for (const block of splitBlocks(markdown)) {
    if (/^(#|>|```|---|\||!\[)/.test(block)) continue;
    if (/^([-*•]|\d+[.)])\s/.test(block) && block.length < 80) continue;
    const text = block
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_~`#]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 10) return text.substring(0, maxLen);
  }
  return "";
}
