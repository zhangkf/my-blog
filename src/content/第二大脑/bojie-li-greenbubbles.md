---
title: 'bojie_li：用微信聊天记录搭建个人知识库（greenbubbles）'
description: '2026 年了，让 Agent 访问微信聊天记录仍然是一件很麻烦的事情。我做了一个 CLI 小工具 greenbubbles（绿泡泡），可以让 Agent 随时连上微信桌面版的数据库，实时访问聊天记录。'
pubDate: '2026-10-01'
origin_date: '2026-10-01'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'bojie-li-greenbubbles'
source: notion
origin_author: 'bojie_li'
origin_url: 'https://x.com/bojie_li/status/2105672165257286073'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-81e6-bd12-ffb8c99248d5'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:29.263Z'
---

2026 年了，让 Agent 访问微信聊天记录仍然是一件很麻烦的事情。我做了一个 CLI 小工具 greenbubbles（绿泡泡），可以让 Agent 随时连上微信桌面版的数据库，实时访问聊天记录。

我也开源了自己用来整理微信聊天记录的 skill，目前已经形成了一个庞大的个人知识库，涵盖个人生活、工作的方方面面，感觉 AI 已经掌握了我的所有经历和小心思（这些信息太敏感了，我都不敢截图）

不知道为什么现在大多数的工具都是把微信数据库拷贝出来，再导出成自己的格式，其实微信本身的数据库 schema 就挺好的，只要用 greenbubbles-acquire 获取到密码，然后直接连上就行了啊。

好像我还没宣传就有了 78 个 star……欢迎 star & 提 issue
