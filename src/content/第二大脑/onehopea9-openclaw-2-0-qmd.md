---
title: 'onehopeA9：OpenClaw 记忆系统 2.0：先重做记忆结构，再用 qmd 做检索'
description: 'OpenClaw 刚用几天，真是惊为天人，但随着使用时间的增加，慢慢的它也会健忘，答非所问。 前几天写了一篇节省龙虾token的，有3万+浏览 如果准备长期使用龙虾，那么最好自己搭建一套记忆系统。 下面是我的OpenClaw 记忆系统 2.0：先用字节 OpenViking 思路搭架构，再把 qmd 插进去做检索加速（省 token + 提准确率） 这几天我把 Agent memory 做了次大改'
pubDate: '2026-02-19'
origin_date: '2026-02-19'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'onehopea9-openclaw-2-0-qmd'
source: notion
origin_author: 'onehopeA9'
origin_url: 'https://x.com/onehopeA9/status/2024465287588786465'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-81ee-930c-c38a50116ade'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:42.004Z'
---

OpenClaw 刚用几天，真是惊为天人，但随着使用时间的增加，慢慢的它也会健忘，答非所问。 前几天写了一篇节省龙虾token的，有3万+浏览 如果准备长期使用龙虾，那么最好自己搭建一套记忆系统。 下面是我的OpenClaw 记忆系统 2.0：先用字节 OpenViking 思路搭架构，再把 qmd 插进去做检索加速（省 token + 提准确率） 这几天我把 Agent memory 做了次大改： 不是只换一个检索工具，而是先把“记忆结构”重做，再把 qmd 当插件接入。 结果很直接：平时省 token、召回更稳、长期不健忘。 OpenViking 思路负责“怎么存、怎么管”，qmd 负责“怎么找得快找得准”。 前面只装 qmd有什么问题？ qmd 很强（本地、免费、快），但它主要解决“检索速度和质量”。 如果你的 memory 文件本身是乱堆、没有生命周期、没有层级，后面还是会越来越难管。 所以正确顺序是： 1. 先做结构化（L0/L1/L2 + TTL） 2. 再上 qmd 做检索引擎 最终目标架构如下： memory/ ├── .abstract # L0 根索引（目录级摘要） ├── https://t.co/CP8UkMfARP # 长期记忆（带 P0/P1/P2 标签） ├── https://t.co/Szm5mD6W29 # 工作缓冲区（上下文压缩前抢救） ├── insights/ │ ├── .abstract # L0 子目录索引 │ └── https://t.co/Kf0U4YTBGI # L1 提炼 ├── lessons/ │ ├── .abstract │ └── operational-lessons.jsonl ├── https://t.co/zSdfslDROk # L2 原始日志（日记） └── archive/ # 过期 P1/P2 第 0 步：定义两套规则（核心） 同时有两套系统： A) 检索分层（L0/L1/L2） • L0：.abstract（目录索引，100~300 tokens） • L1：总结提炼（周/月洞察、结构化 lessons） • L2：原始日志（每日对话/事件） B) 生命周期（P0/P1/P2） • P0：永久（身份、偏好、长期原则） • P1：90 天（活跃项目） • P2：30 天（短期临时信息） 这一步最关键： L 解决“怎么找”，P 解决“留多久”。 第 1 步：把 memory 目录改成分层结构 先创建基础目录和文件： mkdir -p memory/{insights,lessons,archive} touch memory/.abstract memory/SESSION-STATE.md 然后约定写入习惯： • 日常事件写 memory/YYYY-MM-DD.md（L2） • 每周/每月做提炼到 insights/*.md（L1） • 根和子目录都维护 .abstract（L0） 第 2 步：建立 .abstract 机制（L0） .abstract 文件建议包含： 1. 目录里有哪些主题 2. 每个主题对应哪些文件 3. 最近更新时间 4. 检索关键词（tags） 示例（memory/.abstract）： # memory index ## active topics - weather trading strategy (files: https://t.co/HXaPRfasFW, insights/2026-02.md) - reflex debug lessons (files: https://t.co/y94DoojWb3, lessons/operational-lessons.jsonl) - infra migration (files: https://t.co/By4w4zqgHI) ## retrieval hints - strategy, pnl, settlement - reflex, bug, timeout, retry - migration, mac mini, deploy ## recency - last updated: 2026-02-18 Agent 先读 .abstract，再决定读哪个具体文件。 从“全量读”变成“按需读”。 第 3 步：给 https://t.co/CP8UkMfARP 打 P0/P1/P2 标签 你可以用简单 frontmatter 或 inline tag，示例：

- [P0] 用户偏好：回复风格专业冷静，少废话 - [P1|expire:2026-05-01] 当前主线项目：XXX 协议重构 - [P2|expire:2026-03-10] 临时测试网 RPC 列表 再配一个 janitor 脚本（每天跑）： • 扫描 P1/P2 到期项 • 移动到 memory/archive/ • 更新 .abstract 第 4 步：接入 qmd（作为“检索插件”） 4.1 安装 qmd bun install -g github:tobi/qmd 首次运行会下载模型，之后可离线。 4.2 在 memory 上建 collection + embedding cd /你的/openclaw/workspace qmd collection add memory --name daily-logs --mask "**/*.md" qmd embed 4.3 日常查询（混合检索优先） qmd query "你要找的问题关键词" 第 5 步：把 qmd 配成 MCP 工具 在 mcporter.json（或你的 MCP 配置）里加： { "mcpServers": { "qmd": { "command": "/Users/你的用户名/.bun/bin/qmd", "args": ["mcp"] } } } 然后在 Agent 侧加一条检索策略： 1. 先读 memory/.abstract 2. 判断主题范围 3. 调 qmd query 获取 top-k 片段 4. 必要时再打开对应 L1/L2 原文 5. 回答后把新增关键信息写回 L2，并周期性提炼到 L1 第 6 步：给 Agent 一段“记忆检索协议”（可直接贴系统提示词） Memory Retrieval Protocol: 1) Always read memory/.abstract first. 2) Identify relevant topic + candidate files. 3) Use qmd hybrid search for targeted snippets. 4) Only open full files when snippets are insufficient. 5) Persist new important facts to daily log (L2). 6) Periodically compact L2 -> L1 and refresh .abstract. 7) Respect lifecycle tags P0/P1/P2 and archive expired items. 第 7 步：自动化（建议加 cron） 你至少配 3 个任务： 1. 每小时或每 2 小时：qmd embed 增量更新（或每天多次） 2. 每天凌晨：memory-janitor（处理 P1/P2 过期） 3. 每周一次：L2 → L1 compact + 刷新 .abstract 实测收益（你可以这么写） • 日常对话 token：通常降 5~10x • 回忆相关性：明显提升（先索引再检索） • 长期稳定性：不再“越跑越胖” • 可解释性：知道“为什么读这个文件”，排查也容易 常见坑Tips: 1. 只上 qmd，不做分层 → 前期爽，后面 memory 失控，召回噪声增大。 2. .abstract 太长 → L0 变 L2，失去“索引”意义。控制在精简摘要。 3. 不做 TTL → P1/P2 变相永久保存，系统会再次膨胀。 4. 不回写记忆 → 只会读不会写，系统不会进化。 真正省 token 的关键，不是“换个检索工具”， 而是把 memory 从“文档”升级成“文件系统”。 如果看完一脸懵，不要紧，扔给龙虾吧。
