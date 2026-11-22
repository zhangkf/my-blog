---
title: 'Shann³：向量嵌入如何让 GBrain 比普通 LLM Wiki 更聪明'
description: '译注：原文无标题，标题为译者代拟。'
pubDate: '2026-07-01'
origin_date: '2026-07-01'
category: '第二大脑'
archived: false
route_category: '第二大脑'
route_slug: 'shann-gbrain-llm-wiki'
source: notion
origin_author: 'Shann³'
origin_url: 'https://x.com/shannholmberg/status/2072305977802772599'
origin_publication: 'X（Twitter）'
notion_id: '42045fd1-9f92-8151-a66e-d9c3ff92d600'
notion_parent: '第二大脑'
last_synced: '2026-11-22T02:02:45.342Z'
---

*译注：原文无标题，标题为译者代拟。*

---

向量嵌入（embedding）怎么让 GBrain 比一座普通的 LLM Wiki 更聪明。

普通的 LLM Wiki 靠匹配你输入的词来找页面。措辞对不上，就找不到对的页面。GBrain 加上了向量嵌入模型，这才是真正的升级。

把它想象成一张**意义地图**。

向量嵌入把每一页变成这张地图上的一个点。意思相同的东西会落在同一个街区，哪怕它们用的词完全不同。

所以当你问「退款怎么处理」，你的问题也会变成一个点，恰好落在名叫「拒付政策」的那一页旁边——因为它们说的是同一件事。「refund」这个词根本不必出现。

回答的时候，GBrain 抓取地图上离问题最近的那些点。那就是你要的页面，排好序、带出处，不管它们有没有用跟你一样的词。

这就是全部的领先之处：关键词 wiki 需要那个词出现，向量嵌入按意思找到它。

我用的是 OpenAI 的 text-embedding-3-large。每 100 万 token 0.13 美元，给 10 万页建图大约 10 美元。让你整个大脑可以按意义检索，这个价钱便宜得很。

wiki 负责装知识。向量嵌入模型负责让它找得到——不管规模多大。

低于 1 万页的 wiki 其实用不着 GBrain 的嵌入，但一旦超过这个量级，找东西的准确率会明显上一个台阶。
