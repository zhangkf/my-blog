#!/usr/bin/env node
/**
 * Notion → Astro Blog Sync Script
 *
 * Fetches child pages from configured Notion parent pages,
 * converts them to Markdown with Astro-compatible frontmatter,
 * and writes them to src/content/blog/notion/.
 *
 * Env vars:
 *   NOTION_API_KEY          – Notion integration secret
 *   NOTION_PARENT_PAGE_IDS  – comma-separated parent page IDs
 */

import { Client } from "@notionhq/client";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "src", "content", "blog", "notion");
const ASSETS_DIR = path.join(REPO_ROOT, "public", "notion-assets");

// ── Config ──────────────────────────────────────────────────────────
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PARENT_PAGE_IDS = (process.env.NOTION_PARENT_PAGE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (!NOTION_API_KEY) {
  console.error("❌ NOTION_API_KEY is required");
  process.exit(1);
}
if (PARENT_PAGE_IDS.length === 0) {
  console.error("❌ NOTION_PARENT_PAGE_IDS is required");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

// ── Helpers ─────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .replace(/^\d+\.\s*/, "") // strip leading "1. "
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function escapeYaml(str) {
  if (!str) return '""';
  // Wrap in single quotes, escape internal single quotes
  return `'${str.replace(/'/g, "''")}'`;
}

/** Fetch all blocks for a given block ID, handling pagination. */
async function fetchAllBlocks(blockId) {
  const blocks = [];
  let cursor = undefined;
  do {
    const resp = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

/** Fetch all child pages of a parent page. */
async function fetchChildPages(parentId) {
  const blocks = await fetchAllBlocks(parentId);
  return blocks.filter((b) => b.type === "child_page");
}

/** Download a file and save locally. Returns the local public path. */
async function downloadAsset(url, pageId, filename) {
  const dir = path.join(ASSETS_DIR, pageId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);

  // Skip if already downloaded
  if (fs.existsSync(filePath)) {
    return `/notion-assets/${pageId}/${filename}`;
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    const get = (targetUrl) => {
      https
        .get(targetUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            get(res.headers.location); // follow redirect
            return;
          }
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(`/notion-assets/${pageId}/${filename}`);
          });
        })
        .on("error", (err) => {
          fs.unlinkSync(filePath);
          console.warn(`⚠️ Failed to download ${url}: ${err.message}`);
          resolve(url); // fallback to original URL
        });
    };
    get(url);
  });
}

// ── Rich Text → Markdown ───────────────────────────────────────────

function richTextToMarkdown(richTextArray) {
  if (!richTextArray || richTextArray.length === 0) return "";
  return richTextArray
    .map((rt) => {
      let text = rt.plain_text || "";
      if (rt.annotations) {
        if (rt.annotations.bold) text = `**${text}**`;
        if (rt.annotations.italic) text = `*${text}*`;
        if (rt.annotations.strikethrough) text = `~~${text}~~`;
        if (rt.annotations.code) text = `\`${text}\``;
      }
      if (rt.href) text = `[${text}](${rt.href})`;
      return text;
    })
    .join("");
}

// ── Blocks → Markdown ──────────────────────────────────────────────

async function blocksToMarkdown(blocks, pageId, indent = "") {
  const lines = [];
  let numberedIndex = 0;

  for (const block of blocks) {
    const type = block.type;
    const data = block[type];

    // Reset numbered list counter when a different block type appears
    if (type !== "numbered_list_item") {
      numberedIndex = 0;
    }

    switch (type) {
      case "paragraph":
        lines.push(indent + richTextToMarkdown(data.rich_text));
        lines.push("");
        break;

      case "heading_1":
        lines.push(`${indent}# ${richTextToMarkdown(data.rich_text)}`);
        lines.push("");
        break;

      case "heading_2":
        lines.push(`${indent}## ${richTextToMarkdown(data.rich_text)}`);
        lines.push("");
        break;

      case "heading_3":
        lines.push(`${indent}### ${richTextToMarkdown(data.rich_text)}`);
        lines.push("");
        break;

      case "bulleted_list_item":
        lines.push(`${indent}- ${richTextToMarkdown(data.rich_text)}`);
        if (block.has_children) {
          const children = await fetchAllBlocks(block.id);
          const childMd = await blocksToMarkdown(children, pageId, indent + "  ");
          lines.push(childMd);
        }
        break;

      case "numbered_list_item":
        numberedIndex++;
        lines.push(`${indent}${numberedIndex}. ${richTextToMarkdown(data.rich_text)}`);
        if (block.has_children) {
          const children = await fetchAllBlocks(block.id);
          const childMd = await blocksToMarkdown(children, pageId, indent + "  ");
          lines.push(childMd);
        }
        break;

      case "to_do":
        const checked = data.checked ? "x" : " ";
        lines.push(`${indent}- [${checked}] ${richTextToMarkdown(data.rich_text)}`);
        break;

      case "toggle":
        lines.push(`${indent}<details>`);
        lines.push(`${indent}<summary>${richTextToMarkdown(data.rich_text)}</summary>`);
        lines.push("");
        if (block.has_children) {
          const children = await fetchAllBlocks(block.id);
          const childMd = await blocksToMarkdown(children, pageId, indent);
          lines.push(childMd);
        }
        lines.push(`${indent}</details>`);
        lines.push("");
        break;

      case "code":
        const lang = data.language === "plain text" ? "" : data.language || "";
        lines.push(`${indent}\`\`\`${lang}`);
        lines.push(indent + richTextToMarkdown(data.rich_text));
        lines.push(`${indent}\`\`\``);
        lines.push("");
        break;

      case "quote":
        const quoteText = richTextToMarkdown(data.rich_text);
        quoteText.split("\n").forEach((line) => {
          lines.push(`${indent}> ${line}`);
        });
        if (block.has_children) {
          const children = await fetchAllBlocks(block.id);
          const childMd = await blocksToMarkdown(children, pageId, indent + "> ");
          lines.push(childMd);
        }
        lines.push("");
        break;

      case "callout":
        const icon = data.icon?.emoji || "💡";
        lines.push(`${indent}> ${icon} ${richTextToMarkdown(data.rich_text)}`);
        if (block.has_children) {
          const children = await fetchAllBlocks(block.id);
          const childMd = await blocksToMarkdown(children, pageId, indent + "> ");
          lines.push(childMd);
        }
        lines.push("");
        break;

      case "divider":
        lines.push(`${indent}---`);
        lines.push("");
        break;

      case "image": {
        let imgUrl = "";
        if (data.type === "external") {
          imgUrl = data.external?.url || "";
        } else if (data.type === "file") {
          // Notion-hosted images have expiring URLs – download them
          const originalUrl = data.file?.url || "";
          const ext = originalUrl.split("?")[0].split(".").pop() || "png";
          const filename = `${block.id.replace(/-/g, "")}.${ext}`;
          imgUrl = await downloadAsset(originalUrl, pageId, filename);
        }
        const caption = richTextToMarkdown(data.caption);
        lines.push(`${indent}![${caption}](${imgUrl})`);
        lines.push("");
        break;
      }

      case "bookmark":
        const bmUrl = data.url || "";
        const bmCaption = richTextToMarkdown(data.caption);
        lines.push(`${indent}[${bmCaption || bmUrl}](${bmUrl})`);
        lines.push("");
        break;

      case "embed":
        lines.push(`${indent}[${data.url}](${data.url})`);
        lines.push("");
        break;

      case "table": {
        if (block.has_children) {
          const rows = await fetchAllBlocks(block.id);
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.type === "table_row") {
              const cells = row.table_row.cells.map((cell) => richTextToMarkdown(cell));
              lines.push(`${indent}| ${cells.join(" | ")} |`);
              if (i === 0) {
                lines.push(`${indent}| ${cells.map(() => "---").join(" | ")} |`);
              }
            }
          }
          lines.push("");
        }
        break;
      }

      case "child_page":
      case "child_database":
        // Skip nested pages/databases
        break;

      default:
        // Unsupported block type – add a comment
        if (data?.rich_text) {
          lines.push(indent + richTextToMarkdown(data.rich_text));
          lines.push("");
        }
        break;
    }
  }

  return lines.join("\n");
}

// ── Main Sync Logic ────────────────────────────────────────────────

async function syncPage(childBlock, parentTitle) {
  const pageId = childBlock.id;
  const title = childBlock.child_page.title;

  console.log(`  📄 Syncing: ${title}`);

  // Fetch page metadata for cover image and created_time
  const page = await notion.pages.retrieve({ page_id: pageId });
  const createdTime = page.created_time.split("T")[0]; // YYYY-MM-DD

  // Cover image
  let heroImage = "";
  if (page.cover) {
    if (page.cover.type === "external") {
      heroImage = page.cover.external.url;
    } else if (page.cover.type === "file") {
      const ext = page.cover.file.url.split("?")[0].split(".").pop() || "jpg";
      heroImage = await downloadAsset(page.cover.file.url, pageId, `cover.${ext}`);
    }
  }

  // Fetch and convert blocks
  const blocks = await fetchAllBlocks(pageId);
  const markdown = await blocksToMarkdown(blocks, pageId);

  // Extract description from first meaningful paragraph
  const firstPara = blocks.find(
    (b) => b.type === "paragraph" && b.paragraph.rich_text.length > 0
  );
  const description = firstPara
    ? richTextToMarkdown(firstPara.paragraph.rich_text)
        .replace(/[*_~`#\[\]]/g, "") // strip markdown formatting
        .substring(0, 200)
    : "";

  // Clean title (strip leading "N. " numbering)
  const cleanTitle = title.replace(/^\d+\.\s*/, "");

  // Build frontmatter
  const frontmatter = [
    "---",
    `title: ${escapeYaml(cleanTitle)}`,
    `description: ${escapeYaml(description)}`,
    `pubDate: '${createdTime}'`,
    heroImage ? `heroImage: ${escapeYaml(heroImage)}` : null,
    `source: notion`,
    `notion_id: '${pageId}'`,
    `notion_parent: ${escapeYaml(parentTitle)}`,
    `last_synced: '${new Date().toISOString()}'`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const content = `${frontmatter}\n\n${markdown.trim()}\n`;

  // Write file
  const slug = slugify(cleanTitle);
  const filename = `${slug}.md`;
  const filePath = path.join(OUTPUT_DIR, filename);

  // Only write if content changed
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    // Compare without last_synced line (it changes every run)
    const normalize = (s) => s.replace(/last_synced:.*\n/, "");
    if (normalize(existing) === normalize(content)) {
      console.log(`    ⏭️  No changes`);
      return { pageId, filename, changed: false };
    }
  }

  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`    ✅ Written: ${filename}`);
  return { pageId, filename, changed: true };
}

async function main() {
  console.log("🚀 Starting Notion → Blog sync...\n");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const allSyncedFiles = [];

  for (const parentId of PARENT_PAGE_IDS) {
    // Get parent page title
    const parentPage = await notion.pages.retrieve({ page_id: parentId });
    const parentTitle =
      parentPage.properties.title?.title?.map((t) => t.plain_text).join("") ||
      "Untitled";
    console.log(`📂 Parent: ${parentTitle} (${parentId})`);

    const childPages = await fetchChildPages(parentId);
    console.log(`   Found ${childPages.length} articles\n`);

    for (const child of childPages) {
      try {
        const result = await syncPage(child, parentTitle);
        allSyncedFiles.push(result);
      } catch (err) {
        console.error(`   ❌ Failed to sync "${child.child_page.title}": ${err.message}`);
      }
    }
    console.log("");
  }

  // Clean up: remove notion-generated files that no longer exist in Notion
  const syncedFilenames = new Set(allSyncedFiles.map((f) => f.filename));
  const existingFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".md"));

  for (const file of existingFiles) {
    if (!syncedFilenames.has(file)) {
      // Verify it's a notion-generated file before deleting
      const content = fs.readFileSync(path.join(OUTPUT_DIR, file), "utf-8");
      if (content.includes("source: notion")) {
        fs.unlinkSync(path.join(OUTPUT_DIR, file));
        console.log(`🗑️  Removed orphaned file: ${file}`);
      }
    }
  }

  const changedCount = allSyncedFiles.filter((f) => f.changed).length;
  console.log(`\n✨ Done! ${allSyncedFiles.length} articles synced, ${changedCount} changed.`);
}

main().catch((err) => {
  console.error("💥 Sync failed:", err);
  process.exit(1);
});
