---
title: 'lanshu：OpenHuman 与 OpenViking：把 LLM Wiki / 个人数据做成助手与上下文基础设施'
description: '做个最近比较火的 OpenHuman、OpenViking 初步分析。 这两个名字容易被放在一起讲，但本质上不算同类型产品。 OpenHuman 偏个人 AI 助手体验。 OpenViking 偏 Agent 的上下文基础设施。 先说 OpenHuman。 OpenHuman 其实可以直接理解成：把 Karpathy 提过的 LLM Knowledge Base / Obsidian Wiki 思'
pubDate: '2026-05-18'
origin_date: '2026-05-18'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'lanshu-openhuman-openviking-llm-wiki'
source: notion
origin_author: 'lanshu'
origin_url: 'https://x.com/lanshu/status/2056278808475627928'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-8119-9b87-e1c92e844a09'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:32.117Z'
---

做个最近比较火的 OpenHuman、OpenViking 初步分析。 这两个名字容易被放在一起讲，但本质上不算同类型产品。 OpenHuman 偏个人 AI 助手体验。 OpenViking 偏 Agent 的上下文基础设施。 先说 OpenHuman。 OpenHuman 其实可以直接理解成：把 Karpathy 提过的 LLM Knowledge Base / Obsidian Wiki 思路，往个人 AI 助手方向产品化。 它的重点不是再做一个聊天框，而是把你的个人数据接进来：Gmail、Notion、GitHub、Slack、Calendar、Drive 等，通过 OAuth 自动抓取，然后压缩、整理、写入 Memory Tree，最后落成本地的 LLM Wiki / Obsidian Vault。 这个 LLM Wiki 是核心。 邮件、聊天、文档、日程、项目记录，不再只是散落在不同 SaaS 里的数据，而是被整理成一套可搜索、可引用、可持续更新的 Markdown 知识库。 人可以打开看，Agent 也可以读取。 所以 OpenHuman 想解决的是个人 AI 的上下文问题： 它要知道你最近在做什么项目，和谁沟通过，哪些任务还没完成，哪些资料以后会反复用到。 再加上桌面 UI、语音、Meet agent、通知、工具调用，它更像一个个人 AI 工作台。 再看 OpenViking。 OpenViking 的方向更底层。它做的是 Agent context database。 普通 RAG 的路径大家很熟：文档切 chunk，做 embedding，向量库 top-k，塞回 prompt。 OpenViking 也做 chunking 和 embedding，但它先把资源、记忆、技能、会话统一组织成 `viking://` 虚拟文件系统。 比如： `viking://resources` 管资料 `viking://user/memories` 管用户记忆 `viking://agent/skills` 管 Agent 技能 `viking://session` 管会话历史 然后每个节点会有 L0、L1、L2 三层： L0 是摘要，用来快速判断相关性。 L1 是概览，用来判断结构和是否值得深入。 L2 是原文细节，需要时再读取。 查询时，它会先用 embedding 做向量定位，再结合目录递归检索、rerank、过滤和上下文预算，把更合适的内容交给 Agent。 所以 OpenViking 的价值在于：它把“记忆”从一堆扁平 chunk，变成了 Agent 可以浏览、检索、压缩、更新的一套上下文文件系统。 它更适合放在 OpenClaw、Hermes、Codex、Claude Code 或自研 Agent 后面，作为长期记忆和上下文后端。 为什么我觉得这两个值得放一起比较？ 因为它们都在回答同一个问题： Agent 怎么获得长期、稳定、可维护的上下文？ OpenHuman 的答案是产品化： 把个人数据接进来，做成桌面 AI 助手和 LLM Wiki。 OpenViking 的答案是基础设施化： 把 Agent 需要的资料、记忆、技能、会话，做成可检索的 context database。 一个更靠近用户体验。 一个更靠近 Agent 底座。
