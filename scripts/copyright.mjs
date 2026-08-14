/**
 * 文章出处 / 版权 callout 解析
 *
 * Notion 约定：文末放一个 callout，首行以「出处」或「版权」开头，例如：
 *
 *   📄 出处
 *   作者：Oscar Sykes
 *   原名：A brief history of instant coffee
 *   原文：https://worksinprogress.co/...
 *
 * 图标随意。字段标签宽松匹配；缺字段不报错，有什么用什么。
 */

const EMOJI_RE =
  /^[\s\u3000]*(?:[\u2190-\u2BFF\u2600-\u27BF\u2300-\u23FF\uE000-\uF8FF\u{1F000}-\u{1FAFF}]\s*)+/u;

const HEADER_RE = /^(出处|版权|原文出处|copyright|source)(\b|[：:\s]|$)/i;

const NEXT_FIELD =
  "(?:作者|文章原名|原文标题|原名|原题|原文链接|原文|链接|刊物|出版物|刊名|说明|Author|Title|URL|Link|Publication)\\s*[：:]";

function stripLeadingEmoji(text) {
  return String(text || "").replace(EMOJI_RE, "").trim();
}

function cleanValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[\s·|，,；;]+|[\s·|，,；;]+$/g, "")
    .trim();
}

export function isCopyrightHeader(line) {
  return HEADER_RE.test(stripLeadingEmoji(line));
}

function matchField(text, labels) {
  const label = labels
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(
    `(?:^|[\\n\\s·|；;：:])(?:${label})\\s*[：:]\\s*(.+?)(?=\\s*${NEXT_FIELD}|$)`,
    "is"
  );
  const match = text.match(re);
  return match ? cleanValue(match[1]) : "";
}

function extractUrl(text) {
  const markdown = text.match(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/);
  if (markdown) return markdown[2];

  const labeled = text.match(
    /(?:原文链接|原文|链接|URL|Link)\s*[：:]\s*(https?:\/\/[^\s)）>]+)/i
  );
  if (labeled) return labeled[1].replace(/[.,;；。]+$/, "");

  const bare = text.match(/https?:\/\/[^\s)）>\]]+/);
  return bare ? bare[0].replace(/[.,;；。]+$/, "") : "";
}

/**
 * 从一段纯文本解析出处字段。首行必须是「出处 / 版权」标题，否则返回 null。
 * 这样不会误伤「作者：姜峯楠……」这类作者简介 callout。
 */
export function parseCopyrightText(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/\r\n/g, "\n").trim();
  if (!text) return null;

  const lines = text
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trim());
  const nonempty = lines.filter(Boolean);
  if (!nonempty.length || !isCopyrightHeader(nonempty[0])) return null;

  const blob = nonempty.map(stripLeadingEmoji).join("\n");
  const author = matchField(blob, ["作者", "Author"]);
  const title = matchField(blob, [
    "文章原名",
    "原文标题",
    "原名",
    "原题",
    "Title",
  ]);
  const url = extractUrl(blob);
  let publication = matchField(blob, ["刊物", "出版物", "刊名", "Publication"]);

  if (!publication) {
    const first = stripLeadingEmoji(nonempty[0]);
    const rest = first.match(
      /^(?:出处|版权|原文出处|copyright|source)[：:]\s*(.+)$/i
    );
    if (rest) {
      const leftover = rest[1].trim();
      if (
        leftover &&
        !/^(作者|原名|文章原名|原文标题|原文链接|原文|链接|刊物|说明|Author|Title|URL)/i.test(
          leftover
        ) &&
        !/(作者|原名|原文|文章原名|刊物)[：:]/i.test(leftover)
      ) {
        publication = cleanValue(leftover);
      }
    }
  }

  if (!author && !title && !url && !publication) return null;

  const result = {};
  if (author) result.author = author;
  if (title) result.title = title;
  if (url) result.url = url;
  if (publication) result.publication = publication;
  return result;
}

function findBlockquoteGroups(markdown) {
  const lines = markdown.split("\n");
  const groups = [];
  let i = 0;
  let offset = 0;

  while (i < lines.length) {
    if (lines[i].startsWith(">")) {
      const start = offset;
      const buf = [];
      while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith(">")) {
          buf.push(line);
          offset += line.length + 1;
          i++;
          continue;
        }
        if (line.trim() === "") {
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === "") j++;
          if (j < lines.length && lines[j].startsWith(">")) {
            buf.push(line);
            offset += line.length + 1;
            i++;
            continue;
          }
        }
        break;
      }
      groups.push({ start, end: offset, text: buf.join("\n") });
    } else {
      offset += lines[i].length + 1;
      i++;
    }
  }

  return groups;
}

/**
 * 从 markdown 正文抽出最后一段出处引用块，并从正文删除。
 * 供 sync 兜底，以及本地已写出的 callout 二次处理。
 */
export function extractCopyrightFromMarkdown(markdown) {
  const source = String(markdown || "");
  const groups = findBlockquoteGroups(source);

  for (let i = groups.length - 1; i >= 0; i--) {
    const copyright = parseCopyrightText(groups[i].text);
    if (!copyright) continue;
    const next = `${source.slice(0, groups[i].start)}${source.slice(groups[i].end)}`;
    return {
      copyright,
      markdown: `${next.replace(/\n{3,}/g, "\n\n").trim()}\n`,
    };
  }

  return { copyright: null, markdown: source };
}
