---
title: 'timyangnet：搭建个人知识库时的入库、翻译与维护痛点'
description: 'Andrej Karpathy 分享的 LLM 知识库一体化的构建方法确实给我带来很多启发。 回到实际操作中，说说我在处理个人知识库中碰到一些非常磨人的问题和痛点： 1. 入库的摩擦力： 看到不错的文字内容或者网页，很难做到一键转换 Markdown 入库（我用 GitHub 私有仓库）。经常要做一些复制粘贴的零碎工作。虽然有人觉得通过 Skill 可以一行命令实现，但这种通过 agent 抓取、'
pubDate: '2026-04-03'
origin_date: '2026-04-03'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'timyangnet'
source: notion
origin_author: 'timyangnet'
origin_url: 'https://x.com/timyangnet/status/2039958789022212308'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-8123-95d6-c03741a7995f'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:37.801Z'
---

Andrej Karpathy 分享的 LLM 知识库一体化的构建方法确实给我带来很多启发。 回到实际操作中，说说我在处理个人知识库中碰到一些非常磨人的问题和痛点： 1. 入库的摩擦力： 看到不错的文字内容或者网页，很难做到一键转换 Markdown 入库（我用 GitHub 私有仓库）。经常要做一些复制粘贴的零碎工作。虽然有人觉得通过 Skill 可以一行命令实现，但这种通过 agent 抓取、分析然后再转换成 markdown 的流程，实际运行速度通常比手动复制粘贴还要慢得多，尤其在等着文档做进一步处理时，效率很低，另外还有一定失败率。 2. 翻译的低效： 如果要经常看英文文档，想翻译成中文最方便的自然是 Chrome 自带翻译，但其翻译质量一般。更好的翻译质量又很难做到一键实现，大模型 Web 端的翻译还经常莫名其妙地“丢段落”。 3. AI 对话的沉淀： 跟 AI 对话经常产生不少对自己非常有价值的信息，但目前也做不到自动入库，还是得靠复制粘贴这种碎活。 4. 图片的尴尬地位： 图片在大模型世界里像是个另类，大部分情况 LLM 对图片视而不见。但从知识库角度看，“一图胜千言”，图片对人的价值巨大。目前没有特别好的图片处理方法，导致图片入库积极性大大降低。
