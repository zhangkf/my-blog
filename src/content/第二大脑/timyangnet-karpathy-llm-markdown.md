---
title: 'timyangnet：实测 Karpathy 的 LLM 知识库玩法：两层 Markdown 架构与实操细节'
description: '花了半天时间实测 Andrej Karpathy 提到的 LLM 知识库玩法，分享一些实操细节： 【架构设计】 我采用了简单的 2 层 Markdown 结构，完全没用 Embedding 工具。我觉得在文件数量 < 1,000 的规模下，这种“纯文本编译”的思路完全够用。 1. 索引层 (wiki/index.md)： 核心索引文件。每一行对应一个文件，包含：Path | Summary | T'
pubDate: '2026-04-04'
origin_date: '2026-04-04'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'timyangnet-karpathy-llm-markdown'
source: notion
origin_author: 'timyangnet'
origin_url: 'https://x.com/timyangnet/status/2040271533973938399'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-8151-a673-f1fab8e48d67'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:37.111Z'
---

花了半天时间实测 Andrej Karpathy 提到的 LLM 知识库玩法，分享一些实操细节： 【架构设计】 我采用了简单的 2 层 Markdown 结构，完全没用 Embedding 工具。我觉得在文件数量 < 1,000 的规模下，这种“纯文本编译”的思路完全够用。 1. 索引层 (wiki/index.md)： 核心索引文件。每一行对应一个文件，包含：Path | Summary | Tags。 2. 摘要层 (wiki/document.summary.md)： 由 LLM 根据原文增量构建的摘要文件。 3. （舍弃项）： Claude Code 曾建议增加一个 Tag/Topic 索引，但考虑到 Tag 过于稀疏且文件方式维护复杂，被我 Pass 掉了。 【工作流】 - 数据入库： 索引项目文档 →→ 写入 index.md →→ 构建 Summary。 - 检索逻辑： 1. 搜索某 Topic 时，LLM 先加载 index.md 获取相关文件列表。 2. LLM 读取相关文件的 Summary，判断是否需要进一步加载“原文”。 【实测效果】 我导入了某个研究领域的数篇文章，让 LLM 针对其中一个观点输出论证。 在关键词文件命中不多（< 10）的情况下，输出非常有条理。它不是简单的 grep 组合，而是完全按照逻辑重新组织过的观点，通常能给出 3 到 4 个核心要点，不知道这个试验是否属于 Andrej 说的合成数据的玩法。 【一个意外发现】 输出结果中居然包含了一个还没被 index.md 索引的文件内容，并用它辅助了观点。推测是因为该文件之前被加载过，信息存在于 Claude Code 的 memory 文件中 😂 【后续】接下来会继续增加库的容量，等关注领域积累到上百个文件后再观察效果。 目前的原理非常简单，有兴趣的朋友也自己去尝试下，低成本跑通自己的 agent 知识库。
