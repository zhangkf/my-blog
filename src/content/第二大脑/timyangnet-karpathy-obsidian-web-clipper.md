---
title: 'timyangnet：实践 Karpathy 工作流：用 Obsidian Web Clipper 降低个人知识库入库摩擦'
description: '随着 Andrej Karpathy 分享的 LLM 知识库工作流火起来，这几天不少人都在疯狂搭建个人知识库。 我也试了下他提到的 Obsidian Web Clipper 插件，基本解决了我之前说的一键入库需求。 我没用 Obsidian 自带 Sync，而是直接把剪藏的内容存到 GitHub 仓库的 clipping 目录下。本地处理速度飞快，通常不到 1 秒就完成。 不过默认用网页 titl'
pubDate: '2026-04-05'
origin_date: '2026-04-05'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'timyangnet-karpathy-obsidian-web-clipper'
source: notion
origin_author: 'timyangnet'
origin_url: 'https://x.com/timyangnet/status/2040584842883334506'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-817e-af50-cde1316703fb'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:36.538Z'
---

随着 Andrej Karpathy 分享的 LLM 知识库工作流火起来，这几天不少人都在疯狂搭建个人知识库。 我也试了下他提到的 Obsidian Web Clipper 插件，基本解决了我之前说的一键入库需求。 我没用 Obsidian 自带 Sync，而是直接把剪藏的内容存到 GitHub 仓库的 clipping 目录下。本地处理速度飞快，通常不到 1 秒就完成。 不过默认用网页 title 作为文件名实在太乱了：有的带特殊符号，有的格式不统一（比如 X 推文只显示用户名，如图）。 插件支持配置第三方模型在 clip 时预处理文件名，我试了用内容关键词自动生成文件名，效果很好，文件名终于规范统一了。 但缺点也很明显：LLM 处理要等 3 秒以上，慢的时候 7-8 秒甚至超时。 于是我放弃了在插件端处理，而是把文件名规范化逻辑移到了后续的 Agent 预处理 workflow 里： - 如果文件名不规范，预处理脚本先自动改成临时文件名； - 在做索引和 summary 时，如果检测到临时文件名，就根据已生成的 summary 内容提取 3-5 个核心关键词，自动重命名为规范文件名。 - 顺便把文件再次归档到合适目录下，避免 clipping 不断膨胀 完美解决，体验丝滑。 你也在玩 LLM 知识库这个 workflow 吗？欢迎交流优化思路～
