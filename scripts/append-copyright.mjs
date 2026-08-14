#!/usr/bin/env node
/**
 * 给 Notion 文章文末追加「出处」callout。
 *
 * 用法：
 *   NOTION_API_KEY=... node scripts/append-copyright.mjs          # 预览
 *   NOTION_API_KEY=... node scripts/append-copyright.mjs --apply  # 写入
 */

import { Client } from "@notionhq/client";

const APPLY = process.argv.includes("--apply");
const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  console.error("❌ NOTION_API_KEY is required");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

/** 已核对原文的在线文章。如何存在已有 callout，不列入。 */
const ARTICLES = [
  {
    title: "速溶咖啡的诞生",
    pageId: "36445fd1-9f92-8030-8aaf-c6cb9be21ec1",
    publication: "Works in Progress",
    originTitle: "A brief history of instant coffee",
    author: "Oscar Sykes, Benjamin Stubbing",
    url: "https://worksinprogress.co/issue/a-brief-history-of-instant-coffee/",
  },
  {
    title: "特德姜：不，人工智能并没有意识",
    pageId: "38045fd1-9f92-8076-8401-e7f6494bf3c6",
    publication: "The Atlantic",
    originTitle: "No, Artificial Intelligence Is Not Conscious",
    author: "Ted Chiang",
    url: "https://www.theatlantic.com/philosophy/2026/06/no-artificial-intelligence-is-not-conscious/687378/",
  },
  {
    title: "2026 年技术工作者的感受",
    pageId: "39745fd1-9f92-80f7-9690-ebd0c8267012",
    publication: "Lenny's Newsletter",
    originTitle: "How tech workers are feeling in 2026: a workforce splitting in two",
    author: "Lenny Rachitsky, Noam Segal",
    url: "https://www.lennysnewsletter.com/p/how-tech-workers-are-feeling-in-2026",
  },
  {
    title: "Dan Koe：如何在 AI 大规模替代中幸存",
    pageId: "38845fd1-9f92-8007-8848-ce3105640837",
    publication: "The Koe Letter",
    originTitle: "How to survive AI mass replacement (and escape wage slavery)",
    author: "Dan Koe",
    url: "https://letters.thedankoe.com/p/how-to-survive-ai-mass-replacement",
  },
  {
    title: "Dan Koe：2026人生重置协议",
    pageId: "38745fd1-9f92-8037-8a0c-c0715e1c1b22",
    publication: "The Koe Letter",
    originTitle: "How to fix your entire life in 1 day",
    author: "Dan Koe",
    url: "https://letters.thedankoe.com/p/how-to-fix-your-entire-life-in-1",
  },
  {
    title: "AI 工作悲伤——席卷科技工作者的无名心理危机",
    pageId: "37745fd1-9f92-80c8-a4c9-d34f7209e237",
    originTitle: "AI Job Grief: The Unnamed Psychological Crisis Hitting Tech Workers",
    author: "Jack Maguire",
    url: "https://jackmaguire.org/blog/ai-job-grief/",
  },
  {
    title: "时间旅行指南",
    pageId: "39145fd1-9f92-80d0-a8cf-c68c3a5d301d",
    publication: "Medium",
    originTitle: "How to Time Travel",
    author: "Brian Chesky",
    url: "https://medium.com/@bchesky/how-to-time-travel-b604096d5ed0",
  },
  {
    title: "个人贡献者工作成为新的职业优势",
    pageId: "39245fd1-9f92-803a-acb2-d27c4a30fad4",
    publication: "Elena's Growth Scoop",
    originTitle: "IC work is the new career flex",
    author: "Elena Verna",
    url: "https://www.elenaverna.com/p/ic-work-is-the-new-career-flex",
  },
  {
    title: "公司本质上就是一张算法图谱",
    pageId: "37645fd1-9f92-80a2-8c45-cc9d7d2be606",
    originTitle: "Companies Are Just a Graph of Algorithms",
    author: "Daniel Miessler",
    url: "https://danielmiessler.com/blog/companies-graph-of-algorithms",
  },
  {
    title: "对闭合的强迫性追求",
    pageId: "39845fd1-9f92-8056-94d3-d7e780c67798",
    originTitle: "Compulsion To Closure",
    author: "Joan Tollifson",
    url: "https://www.awakin.org/v2/read/view.php?tid=2602",
  },
  {
    title: "成年友谊的无声哀伤",
    pageId: "39145fd1-9f92-8021-964f-d1c4795980e8",
    publication: "The Times of India",
    originTitle: "The quiet grief of adult friendship",
    author: "Pranav Jain",
    url: "https://timesofindia.indiatimes.com/blogs/civil-irony/the-quiet-grief-of-adult-friendship/",
  },
  {
    title: "我们别再谈人工智能了",
    pageId: "3ba45fd1-9f92-806c-bf7e-e60747f8ff57",
    publication: "The Imperfectionist",
    originTitle: "Let's stop talking about A.I.",
    author: "Oliver Burkeman",
    note: "中文由好读整理，版权归原作者。原文来自作者邮件通讯。",
  },
  {
    title: "末日并未临近",
    pageId: "38045fd1-9f92-801a-8b34-c376b263c7d2",
    publication: "The Imperfectionist",
    originTitle: "The end isn't nigh",
    author: "Oliver Burkeman",
    note: "中文由好读整理，版权归原作者。原文来自作者邮件通讯。",
  },
  {
    title: "现实总在不断展现",
    pageId: "39845fd1-9f92-807b-b5fe-f0928bfc93d1",
    publication: "The Imperfectionist",
    originTitle: "Reality just keeps unfolding",
    author: "Oliver Burkeman",
    note: "中文由好读整理，版权归原作者。原文来自作者邮件通讯。",
  },
  {
    title: "那么，下一Token预测将我们置于何地？",
    pageId: "37745fd1-9f92-8076-a48c-e2b35ec2ca86",
    publication: "POP RDI; RET;",
    originTitle: "So, Where Does Next-Token Prediction Leave Us?",
    author: "0x5FC3",
    url: "https://pop.rdi.sh/where-does-next-token-prediction-leave-us/",
  },
];

function textBlock(content) {
  return { type: "text", text: { content } };
}

function bullet(content) {
  return {
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [textBlock(content)],
    },
  };
}

function buildCallout(article) {
  const items = [];
  if (article.publication) items.push(bullet(`刊物：${article.publication}`));
  if (article.originTitle) items.push(bullet(`原名：${article.originTitle}`));
  if (article.author) items.push(bullet(`作者：${article.author}`));
  if (article.url) items.push(bullet(`原文：${article.url}`));
  items.push(
    bullet(
      `说明：${article.note || "中文由好读整理，版权归原作者"}`
    )
  );

  return {
    type: "callout",
    callout: {
      rich_text: [textBlock("出处")],
      icon: { type: "emoji", emoji: "✍️" },
      children: items,
    },
  };
}

async function fetchAllBlocks(blockId) {
  const blocks = [];
  let cursor;
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

function blockPlain(block) {
  const data = block[block.type] || {};
  return (data.rich_text || []).map((t) => t.plain_text).join("");
}

async function hasCopyrightCallout(pageId) {
  const blocks = await fetchAllBlocks(pageId);
  for (const block of blocks) {
    if (block.type !== "callout") continue;
    const head = blockPlain(block).trim();
    if (/^(出处|版权|原文出处|copyright|source)([：:\s]|$)/i.test(head)) return true;
  }
  return false;
}

async function main() {
  console.log(APPLY ? "写入模式\n" : "预览模式（加 --apply 才会写入）\n");

  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of ARTICLES) {
    try {
      if (await hasCopyrightCallout(article.pageId)) {
        console.log(`⏭️  已有出处：${article.title}`);
        skipped += 1;
        continue;
      }

      console.log(`➕ ${article.title}`);
      console.log(`   作者 ${article.author}`);
      console.log(`   原名 ${article.originTitle}`);
      console.log(`   原文 ${article.url}`);

      if (APPLY) {
        await notion.blocks.children.append({
          block_id: article.pageId,
          children: [buildCallout(article)],
        });
        console.log("   ✅ 已追加");
        written += 1;
      }
    } catch (err) {
      failed += 1;
      console.error(`   ❌ ${article.title}: ${err.message}`);
    }
  }

  console.log(
    `\n完成：写入 ${written}，跳过 ${skipped}，失败 ${failed}，待处理 ${ARTICLES.length - skipped - written - failed}`
  );
}

main();
