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
const CONTENT_DIR = path.join(REPO_ROOT, "src", "content");
const ASSETS_DIR = path.join(REPO_ROOT, "public", "notion-assets");
const MANIFEST_PATH = path.join(REPO_ROOT, "src", "notion-categories.json");

// ── Config ──────────────────────────────────────────────────────────
const NOTION_API_KEY = process.env.NOTION_API_KEY;
// Optional: if not set, auto-discover all pages shared with the Integration
const PARENT_PAGE_IDS_ENV = (process.env.NOTION_PARENT_PAGE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (!NOTION_API_KEY) {
  console.error("❌ NOTION_API_KEY is required");
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

async function syncPage(childBlock, parentTitle, categoryDir) {
  const pageId = childBlock.id;
  const title = childBlock.child_page.title;

  console.log(`  📄 Syncing: ${title}`);

  // Fetch page metadata for cover image and created_time
  const page = await notion.pages.retrieve({ page_id: pageId });
  let createdTime = page.created_time.split("T")[0]; // YYYY-MM-DD

  // ── Series ordering ──────────────────────────────────────────────
  // Titles starting with "N. " (e.g. "1. Thin Harness" or "7. Complexity")
  // are part of a numbered series. To display them in reverse order
  // (latest number first), we add the sequence number as a minute offset
  // to the creation timestamp. This way 7→newest, 1→oldest within the
  // same base date, and normal time-descending sort produces 7,6,5…1.
  const seqMatch = title.match(/^(\d+)\.\s/);
  if (seqMatch) {
    const seqNum = parseInt(seqMatch[1], 10);
    // Add seqNum minutes so higher numbers sort later (= appear first in desc order)
    const dt = new Date(page.created_time);
    dt.setMinutes(dt.getMinutes() + seqNum);
    createdTime = dt.toISOString().split("T")[0] + "T" + dt.toISOString().split("T")[1].slice(0, 5);
  }

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

  // Use original title as-is (preserve numbering for series articles)
  const cleanTitle = title;

  // Build frontmatter
  const frontmatter = [
    "---",
    `title: ${escapeYaml(cleanTitle)}`,
    `description: ${escapeYaml(description)}`,
    `pubDate: '${createdTime}'`,
    heroImage ? `heroImage: ${escapeYaml(heroImage)}` : null,
    `category: ${escapeYaml(parentTitle)}`,
    `source: notion`,
    `notion_id: '${pageId}'`,
    `notion_parent: ${escapeYaml(parentTitle)}`,
    `last_synced: '${new Date().toISOString()}'`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const content = `${frontmatter}\n\n${markdown.trim()}\n`;

  // Write file to category directory under src/content/
  const outputDir = path.join(CONTENT_DIR, categoryDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const slug = slugify(cleanTitle);
  const filename = `${slug}.md`;
  const relPath = path.join(categoryDir, filename);
  const filePath = path.join(outputDir, filename);

  // Only write if content changed
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    const normalize = (s) => s.replace(/last_synced:.*\n/, "");
    if (normalize(existing) === normalize(content)) {
      console.log(`    ⏭️  No changes`);
      return { pageId, relPath, changed: false };
    }
  }

  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`    ✅ Written: ${relPath}`);
  return { pageId, relPath, changed: true };
}

/** Check if a page's children are articles or sub-categories. */
async function isCategory(pageId) {
  const blocks = await fetchAllBlocks(pageId);
  const childPages = blocks.filter((b) => b.type === "child_page");
  if (childPages.length === 0) return false;
  // If child pages themselves have child pages, this is a category hub
  // Otherwise, the child pages are articles (leaf pages)
  // Heuristic: check the first child page
  const firstChild = childPages[0];
  const firstChildBlocks = await fetchAllBlocks(firstChild.id);
  const hasNestedPages = firstChildBlocks.some((b) => b.type === "child_page");
  return hasNestedPages;
}

/**
 * Recursively discover category → articles structure.
 * Returns array of { parentTitle, childPages[] }
 */
async function discoverArticles(pageId, parentTitle) {
  const blocks = await fetchAllBlocks(pageId);
  const childPages = blocks.filter((b) => b.type === "child_page");

  if (childPages.length === 0) return [];

  // Check if children are sub-categories or leaf articles
  const firstChildBlocks = await fetchAllBlocks(childPages[0].id);
  const childrenAreCategories = firstChildBlocks.some((b) => b.type === "child_page");

  if (childrenAreCategories) {
    // Children are sub-categories – recurse into each
    const results = [];
    for (const child of childPages) {
      const subTitle = child.child_page.title;
      const subResults = await discoverArticles(child.id, subTitle);
      results.push(...subResults);
    }
    return results;
  } else {
    // Children are leaf articles
    return [{ parentTitle, childPages }];
  }
}

async function main() {
  console.log("🚀 Starting Notion → Blog sync...\n");

  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  // Auto-discover parent pages if not explicitly configured
  let parentPageIds = PARENT_PAGE_IDS_ENV;
  if (parentPageIds.length === 0) {
    console.log("🔍 No NOTION_PARENT_PAGE_IDS set, auto-discovering pages...\n");
    const searchResp = await notion.search({
      filter: { value: "page", property: "object" },
      page_size: 100,
    });
    parentPageIds = searchResp.results
      .filter((p) => p.parent?.type === "workspace" && !p.in_trash)
      .map((p) => p.id);
    console.log(`   Found ${parentPageIds.length} top-level page(s)\n`);
  }

  if (parentPageIds.length === 0) {
    console.log("⚠️ No pages found. Make sure pages are shared with the Integration.");
    return;
  }

  const allSyncedFiles = [];
  const activeCategoryDirs = new Set();

  for (const parentId of parentPageIds) {
    const parentPage = await notion.pages.retrieve({ page_id: parentId });
    const topTitle =
      parentPage.properties.title?.title?.map((t) => t.plain_text).join("") ||
      "Untitled";
    console.log(`📂 Root: ${topTitle} (${parentId})`);

    // Discover nested structure (supports both flat and nested layouts)
    const groups = await discoverArticles(parentId, topTitle);

    for (const { parentTitle, childPages } of groups) {
      const categoryDir = parentTitle; // Use Notion subcategory name as directory name
      console.log(`\n  📁 Category: ${parentTitle} → notion/${categoryDir}/ (${childPages.length} articles)`);
      activeCategoryDirs.add(categoryDir);
      for (const child of childPages) {
        try {
          const result = await syncPage(child, parentTitle, categoryDir);
          allSyncedFiles.push(result);
        } catch (err) {
          console.error(`   ❌ Failed to sync "${child.child_page.title}": ${err.message}`);
        }
      }
    }
    console.log("");
  }

  // Clean up: remove files/dirs that no longer exist in Notion
  const syncedRelPaths = new Set(allSyncedFiles.map((f) => f.relPath));

  // Protected directories that should never be touched
  const protectedDirs = new Set(["blog", "readings"]);

  // Clean up orphaned files within active category dirs
  for (const catDir of activeCategoryDirs) {
    const catPath = path.join(CONTENT_DIR, catDir);
    if (!fs.existsSync(catPath)) continue;
    const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const relPath = path.join(catDir, file);
      if (!syncedRelPaths.has(relPath)) {
        const content = fs.readFileSync(path.join(catPath, file), "utf-8");
        if (content.includes("source: notion")) {
          fs.unlinkSync(path.join(catPath, file));
          console.log(`🗑️  Removed orphaned file: ${relPath}`);
        }
      }
    }
  }

  // Remove Notion-created category directories that no longer exist
  // Read previous manifest to know which dirs were created by this script
  let previousCategories = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      previousCategories = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")).map((c) => c.dir);
    } catch {}
  }
  for (const dir of previousCategories) {
    if (!activeCategoryDirs.has(dir) && !protectedDirs.has(dir)) {
      const dirPath = path.join(CONTENT_DIR, dir);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true });
        console.log(`🗑️  Removed old category directory: ${dir}/`);
      }
    }
  }

  // Write categories manifest for Astro to consume
  const categoriesManifest = [...activeCategoryDirs].map((dir) => ({
    dir,
    slug: dir.toLowerCase().replace(/\s+/g, "-"),
  }));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(categoriesManifest, null, 2), "utf-8");
  console.log(`\n📋 Categories manifest: ${categoriesManifest.map((c) => c.dir).join(", ")}`);

  const changedCount = allSyncedFiles.filter((f) => f.changed).length;
  console.log(`\n✨ Done! ${allSyncedFiles.length} articles synced, ${changedCount} changed.`);
}

main().catch((err) => {
  console.error("💥 Sync failed:", err);
  process.exit(1);
});
