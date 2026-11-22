---
title: 'geekbb：second-brain-cloudflare：自托管、多工具共享的开源记忆层'
description: '这个好，一个开源内存层，让 Claude、ChatGPT、Cursor 和 Codex 共享一个大脑。 主要是它部署在 Cloudflare Workers 上，把记忆放在你自己 Cloudflare 账号里，对外走 MCP，数据落在用户自己的 D1、Vectorize、KV 与 Workers AI，强调语义检索而非字面匹配。个人规模可在 Cloudflare 免费额度内。'
pubDate: '2026-06-28'
origin_date: '2026-06-28'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'geekbb-second-brain-cloudflare'
source: notion
origin_author: 'geekbb'
origin_url: 'https://x.com/geekbb/status/2071222081358799250'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-8138-b29d-cabb5134ebf7'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:31.444Z'
---

这个好，一个开源内存层，让 Claude、ChatGPT、Cursor 和 Codex 共享一个大脑。 主要是它部署在 Cloudflare Workers 上，把记忆放在你自己 Cloudflare 账号里，对外走 MCP，数据落在用户自己的 D1、Vectorize、KV 与 Workers AI，强调语义检索而非字面匹配。个人规模可在 Cloudflare 免费额度内。

Replies: 28 · Reposts: 49 · Likes: 280 · Views: 27.2K

## Replies

### Steven Mathern (@StevenMathern) · [2026-06-29](https://x.com/StevenMathern/status/2071608262026277084)

interesting. does it allow chatgpt to tell codex to write files? i have many many files, folders, etc chatgpt wants to create. and then needs to make each of those files better, ie merge, de-dupe, etc. 200 chats have ‘different memories’ of what content goes into the files

Likes: 1 · Views: 143

### Trevyon | HLN (@hlntre) · [2026-06-29](https://x.com/hlntre/status/2071527766873264146)

Nice

Likes: 1 · Views: 121

### Wousp (@qi9098) · [2026-06-28](https://x.com/qi9098/status/2071370296095895581)

这个开源内存层的思路很对，Claude、ChatGPT、Cursor、Codex 之间能共享记忆，长期工作流会顺很多。不过跑 Agent 不光要解决记不记得住，还要解决跑不跑得稳。Codex 长任务一旦接进 workflow，token 供应、延迟和上游稳定性就会变成下一层问题。我这篇刚好把这笔账拆了一遍

> Quoting Wousp (@qi9098) · [2026-06-25](https://x.com/qi9098/status/2069970430962667596)

Likes: 1 · Views: 638
