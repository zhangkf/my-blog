---
title: 'Shann³：比较 LLM Wiki 与 GBrain：两种正在兴起的第二大脑框架'
description: '译注：原文无标题，标题为译者代拟。'
pubDate: '2026-06-30'
origin_date: '2026-06-30'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'shann-llm-wiki-gbrain'
source: notion
origin_author: 'Shann³'
origin_url: 'https://x.com/shannholmberg/status/2071890884040499660'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-81e1-b07d-eb42d2d8ed30'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:46.036Z'
---

*译注：原文无标题，标题为译者代拟。*

---

一座简单的 LLM Wiki 和 GBrain 比起来，是什么关系。

第二大脑正在快速走红，它是当下 AI 和智能体最关键的能力来源之一——你给智能体的上下文，决定了它能做多好。

我在用的两个框架是 LLM Wiki 和 GBrain。这篇讲它们的异同，以及怎么一起用。

往底层看，它们是同一个想法——Karpathy 的 LLM Wiki：把原始材料编译成互链的 Markdown 页面给你的智能体读，而不是每次都从头跑一遍 RAG（检索增强生成）。

两者都摄入你的材料、从里面建出一张图、回答时给出引用。所以真正的问题是：差别到底在哪。

**LLM Wiki 就是 Markdown 加你的智能体：**

> 它读你的材料，写出互链的页面

> 你提问，它读这些页面来回答

> 你靠跑「检查」保持它的健康

> 没有数据库，只有文件，和一个用户

它很好用，Karpathy 甚至自己指出了它会在哪里开始崩坏：

> 更新多了之后，综合会漂移

> wiki 变大，上下文成本水涨船高

> 一条错误的论断可能随着时间硬化成「事实」

**GBrain 就是同一座 wiki，外加一台为这些毛病量身定做的引擎：**

> 更好的检索——向量加图谱加重排器，代替智能体自己读页面

> 跑在 Postgres 上，规模可以远超你一个人读得完的量

> 24/7 的循环自动富化和修复 wiki，不用手动检查

> 每个答案都带出处，并诚实注明它还不知道什么

> 多用户，权限按人和团队划分

**什么时候用哪个：**

> 小项目用 LLM Wiki，先把智能体将来要用的上下文收集和存起来。等项目长大，直接把 wiki 灌进 GBrain。

> 一致、多人共享的东西用 GBrain——公司的大脑、客户的大脑，尤其是人一多之后。

所以这不是 wiki 对抗 brain：同一座 wiki，小项目你自己跑，规模化交给引擎跑。

从简单开始，等文件装不下了再搬到 GBrain。
