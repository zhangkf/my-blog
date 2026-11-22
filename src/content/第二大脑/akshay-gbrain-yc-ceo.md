---
title: 'Akshay 🚀：GBrain 到底是什么：YC CEO 给自己的智能体造的大脑'
description: '译注：原文无标题，标题为译者代拟。'
pubDate: '2026-05-13'
origin_date: '2026-05-13'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'akshay-gbrain-yc-ceo'
source: notion
origin_author: 'Akshay 🚀'
origin_url: 'https://x.com/akshay_pachaar/status/2054288847417340044'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-81d5-8e9c-f1c1c2e2b650'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:47.615Z'
---

*译注：原文无标题，标题为译者代拟。*

---

GBrain 到底是什么？（Y Combinator CEO 的个人智能体大脑）

你见过的每一个智能体记忆工具，解决的都是同一个简单问题：存事实，取事实。

GBrain 解决的是另一件事。它给你的智能体一套**自己接线、自我丰富、你不在用的时候也在复利**的知识系统。这就是它跟 Mem0、Zep、LangMem，或者一个 CLAUDE.md 文件有本质不同的原因。

智能体记忆的标准做法是基于向量的：把记忆存成嵌入（embedding），按语义相似度取回，循环结束。有些工具在这上面加一层知识图谱。

GBrain 把这个模型整个翻了过来。**真相之源是一个 Markdown 文件夹**。一个人一页，一家公司一页，一个概念一页。每一页都遵循同样的两段结构：

**编译真相**在上半部分：你当前最好的理解，随着新证据到来不断改写。

**时间线**在下半部分：一条只增不删的证据链，永远不被编辑。

这不是「带 Markdown 导出的向量库」。**Markdown 本身就是记录系统。**你可以在 VS Code 里打开它、亲手编辑，gbrain sync 会接住这些改动。

接下来是让它能复利的部分。每次写入页面，GBrain 都会抽取实体引用，建立带类型的关系链接：works_at（就职）、invested_in（投资）、founded（创立）、attended（参加）、advises（顾问）。全部确定性规则，全部基于正则，零 LLM 调用。知识图谱在每一次写入时自己接线，一个 token 都不花。

于是当你问「谁在 Acme AI 工作？」或「Bob 这个季度投了什么？」，智能体走的是图谱，而不是依赖向量相似度（这类关系型查询恰恰是向量的弱项）。

**搜索层**叠加了约 20 种确定性技术协同工作：意图分类、多查询扩展、向量搜索、关键词搜索、倒数排名融合、余弦重打分、编译真相加权、反向链接排序。每一层都接住其他层漏掉的。

但真正的解锁是**复利循环**。GBrain 有一个信号探测器，每条消息都会触发，在后台捕捉实体。某个人被提到一次？给他建一个占位页。跨不同来源被提到三次？启动网络富化。开完一场会？跑完整条流水线。

智能体还会在夜间运行一个**梦境周期**：扫描对话、补全缺失的实体、修复断掉的引用、合并记忆。你一觉醒来，大脑已经比睡前更聪明了。

这和那些只存你明确让它存的东西的记忆系统，有根本的不同。Garry Tan（Y Combinator 总裁兼 CEO）造它是为了跑他自己真实在用的智能体。它自带 34 个技能，跑在内嵌的 PGLite 上（无需服务器，2 秒就绪），并且可以作为 MCP 服务器接给 Claude Code、Cursor 和 Windsurf。

GBrain：[github.com/garrytan/gbrain](https://github.com/garrytan/gbrain)
