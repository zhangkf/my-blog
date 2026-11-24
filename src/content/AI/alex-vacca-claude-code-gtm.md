---
title: 'Alex Vacca：用 Claude Code 给公司建一颗大脑：GTM 十步完整指南'
description: '译者注：文中提示词和示例文件已译为中文，可直接粘贴给 Claude 使用；Shell 命令、文件路径与状态键名（exclude / hold / suppress / proceed）保留英文。截图为原文远程链接。'
pubDate: '2026-11-23'
origin_date: '2026-11-23'
category: 'AI'
archived: false
route_category: 'ai'
route_slug: 'alex-vacca-claude-code-gtm'
source: notion
origin_author: '*Alex Vacca'
origin_url: 'https://x.com/itsalexvacca/status/2124958066215153831'
origin_publication: 'X Article'
notion_id: '42245fd1-9f92-8145-a965-d2021ae2132a'
notion_parent: 'AI'
last_synced: '2026-11-24T05:17:18.117Z'
---

*译者注：文中提示词和示例文件已译为中文，可直接粘贴给 Claude 使用；Shell 命令、文件路径与状态键名（exclude / hold / suppress / proceed）保留英文。截图为原文远程链接。*

---

让 Claude 经手 GTM（go-to-market，市场进入，本文指销售外联）的任何一个环节，却不给它一颗「公司大脑」，它就是在瞎猜。

市面上大多数 AI 外联（outbound，主动触达潜在客户）都是一本正经的胡说八道，因为人们拿着一条好提示词，底下却没有任何数据。什么都没加载，Claude 递给你的，就是一篇维基百科式的泛泛之谈。

公司大脑就是那份数据：一个私有代码仓库，里面是一堆纯文本文件，装着你的团队关于销售的全部所知——谁合适、谁不合适、判断是怎么做出来的。Claude 回答之前，先读它们。

我们整个代理机构都跑在 Claude Code 上。做了 275 多个外联项目之后，我们才把这些东西写下来。在此之前，它们散落在通话记录和笔记里。

这篇指南用十个步骤帮你建起自己的公司大脑，提示词都给你，围绕一个 GTM 决策展开：这个客户，这周该不该给它发邮件？

做完之后，你手上会有：

- 一套写下来的规则，说清谁合适、谁不合适
- 一个「不发邮件」状态，留给现有客户和进行中的订单
- 一个「暂缓」状态，留给证据过时或缺失的客户
- 一套流程，把一次纠正变成一条规则
- 一个五客户的测试，每月重跑一遍
![](https://pbs.twimg.com/media/HX1ZHnbbAAAXlPF.png)

## 第一步：给大脑建一个私有仓库

你需要三样东西：Claude Code；一个 GitHub 账号，装上 [cli.github.com](http://cli.github.com/) 提供的 GitHub 命令行工具；还有 Fireflies，或者任何能给你通话转写文本的工具。

打开终端，建出大脑的目录。

```bash
mkdir company-brain && cd company-brain && git init -q
mkdir -p context notes/calls sources clients/_template test
touch CLAUDE.md context/proposals.md
```

![](https://pbs.twimg.com/media/HX1ZSLRasAAKwWI.jpg)

给大脑一个团队都够得着的家。登录 GitHub，告诉 git 你是谁，然后创建私有仓库。gh auth login 会问几个问题，一路保持默认，再在浏览器里输入那个一次性验证码就行。

```bash
gh auth login
git config --global user.name "Your Name"
git config --global user.email "you@company.com"
gh repo create company-brain --private --source=. --remote=origin
```

在 GitHub 上打开仓库的 Settings，进 Collaborators，把团队成员加进来。他们接受邀请后，运行 gh repo clone YOU/company-brain，之后用 git pull 拉取更新。

**收入团队赖以工作的东西，别只放在某个人的本地文件夹里。** 密码和 API 密钥也不要进仓库。

## 第二步：挑一个团队反复解释的决策

九月我说过，那种因为「看起来酷」才搭起来的团队「第二大脑」，都是噪音。所以，从一个真实工作环节所依赖的决策开始。

把你这个月回答过两遍的问题写下来，对每一个问一句：**有什么东西依赖着它？**

![](https://pbs.twimg.com/media/HX1ZdFrakAAXIxB.jpg)

留下那个每周都会冒出来、而且一个人能很快核对的决策。

在 company-brain 目录里打开 claude。它会问你是否信任这个文件夹，默认选中的是「No, exit」，所以先按下方向键。然后把你列的清单贴进去，说「Save this as context/decisions.md」。这篇指南里的大部分文件，都是这么存的。

![](https://pbs.twimg.com/media/HX1ZiAYbYAA_fa0.jpg)

我们在这篇指南里用的，就是第一行那条。整张清单都依赖它，而且销售负责人随手就能核对任何一个客户。

## 第三步：把知识从人的脑子里掏出来

知识藏在三个地方：你的人，你的通话，还有你已经在做的那些纠正。

**一、人。** 让 Claude 去访谈最懂这项工作的人。

```
访谈我，一次问一个问题，从「一个客户进入我们的名单」
讲到「这笔生意作为合格商机进了 CRM」。
每一步记下：负责人、用的工具、输入、输出、每周花多少小时、
它卡在什么上面。
先别提任何新工具、智能体或自动化的想法。
把结果存到 notes/interview.md，带上我的名字和日期。
```

我们那次示例运行里，Claude 问的第一个问题是：

```
问题 1：想一想最近一个进入你们名单的客户。
是谁加进来的？加进来的理由是什么？
```

**二、通话。** Fireflies 运行着一个 MCP 服务器（MCP 是让 Claude 连接外部工具的标准协议），Claude 能连上它，搜你的会议记录。输入 /exit 退出，然后把这个服务器加上。

![*这个地址在 Fireflies 的 MCP 页面上*](https://pbs.twimg.com/media/HX1Z7aYbwAAuo7n.jpg)

```bash
claude mcp add --transport http --scope project \
  fireflies https://api.fireflies.ai/mcp
```

![](https://pbs.twimg.com/media/HX1aD13acAAeE1y.jpg)

再次打开 claude，选「Use this MCP server」。默认是不用它直接继续，所以先按两下上方向键。

![](https://pbs.twimg.com/media/HX1aIF9bwAAMPtO.jpg)

输入 /mcp，选 fireflies，登录。--scope project 会把这个连接存进仓库，你一推送，团队就都有了。每个人各自确认一次，用各自的 Fireflies 账号登录。

如果你用的是别的工具，把每份转写文本导出成文本文件，放进 notes/calls/。不管哪种，接下来都跑这一条。

```
读上个月的通话转写（Fireflies 或 notes/calls/）。
用买家的原话列出所有问题和异议，并统计每个出现了多少次。
存到 notes/questions.md，做成一张我在终端里能读的表，
宽度不超过 80 个字符。
```

![](https://pbs.twimg.com/media/HX1aLn4awAA8PUq.jpg)

**三、纠正。** 当你把一个客户从名单里删掉，写下为什么；当你改了开场白，点明你修正的是哪个假设。两者都记在 notes/corrections.md。

每条记录都带上谁说的、哪天说的。

## 第四步：写下什么合适、什么不合适、什么还不知道

把规则分成四类：资格条件、排除条件、优先级、未知项。然后对每一条说清楚：什么才算证据。

「有销售团队」需要员工记录来证明；招聘信号能让一个客户往上排，但一条排除条件仍然压过它；缺失的字段就留在未知里，直到有证据为止。

让 Claude 写初稿。

```
读 notes/ 下的所有内容。起草 context/icp.md，分四部分：
资格条件、排除条件、优先级、未知项。
每条规则都写明什么算证据，并注明它出自哪条笔记。
凡是撑不住的，来问我。
```

在我们的示例里，它回了 10 个问题，第一个是：「多小的团队才算数？1 个销售、4 个 SDR（销售开发代表）、还是 6 个销售？」回答完，再把初稿砍成下面这个样子。这个示例针对的是卖给 B2B 软件公司的外联支持服务。

```
# context/icp.md（ICP：理想客户画像；示例）
eligibility（资格条件）:
  sells B2B software:  官网写明了产品和买家
  has a sales team:    现有员工记录显示公司雇有销售负责人
                       和销售代表
  runs outbound:       销售页面之外的证据
exclusions（排除条件）:  卖外联服务的代理机构
priority（优先级）:      正在招 SDR，让合格客户往上排
unknowns（未知项）:      证据缺失，先搁置待查

statuses（状态）:
  exclude（排除）:  不满足某项必要条件
  hold（暂缓）:     证据缺失或互相矛盾
  suppress（屏蔽）: 现有客户、进行中的商机或联系限制
  proceed（放行）:  资格条件和时效检查都通过

排除条件压过优先级。状态旁边写明原因。
```

![](https://pbs.twimg.com/media/HX1afByaoAAGPxk.jpg)

再加几个你拒掉的客户，附上理由。它们告诉 Claude，线划在哪里。

## 第五步：给 Claude 一页地图

CLAUDE.md 就是地图。Claude Code 每次开会话，一开始就读它。把下面这段贴给 Claude，说「Save this as CLAUDE.md」。

```markdown
# CLAUDE.md

目标：为客户带来更多合格商机和收入

按任务找文件：
- 评估一个客户        -> `context/icp.md`
- 两个信息源打架      -> `context/sources.md`
- 有人纠正你          -> `context/proposals.md`
- 做某个客户的活      -> 先看 `clients/[name]/context.md`

没有一句「是」，绝不发送、不花额度、不改记录。
改规则：先提提案，拿到「是」再落地。
缺事实：明说你没找到什么。
```

把目标换成你自己的。proposals.md 一开始是空的，第八步会把它填上。

地图只是指引。凡是要发邮件、花钱、改记录的操作，都在 .claude/settings.json 里加一条「先问」或「禁止」的权限规则。

地图长大时，守住三条规则：

- 控制在 200 行以内。Claude 官方文档给的也是这个数。
- 每次会话都要用的事实，放地图里。流程放进技能（skill），技能的全文只在使用时才加载。
- 文件路径用反引号包起来。路径前面加 @，每次会话都会加载整个文件。
现在确认 Claude 真读到它了。输入 /exit，重新打开 claude，再输入 /context all，在 Memory files 下面找 CLAUDE.md。

![](https://pbs.twimg.com/media/HX1asVibIAEYYpU.jpg)

## 第六步：趁两个信息源还没打架，先给它们排好序

两个工具会用两种方式描述同一个客户。趁 Claude 还没照着上季度的笔记写完 40 封邮件，先把「谁说了算」的规则写下来。

```
# context/sources.md（示例顺序，自己定）

1. CRM 里已成交的订单
2. 近期的通话转写
3. 该客户的 context.md
4. 活动结果
5. 演示文稿和旧笔记

两个信息源打架时，排在前面的赢。
输的那个，标上它的文件名和日期。
客户状态，每次都以 CRM 为准。
```

![](https://pbs.twimg.com/media/HX1a0hhbUAAST32.jpg)

用两个打架的文件测一下。把已成交的订单导出到 sources/，再在旁边放一份旧演示文稿。

![](https://pbs.twimg.com/media/HX1a7AabIAAsZug.jpg)

```
我们瞄准的公司规模是多大？sources/ 里有冲突时按
context/sources.md 处理。告诉我哪个源赢了、哪个输了、为什么。
```

我们的示例运行是这样回答的（有删节）：

```
公司规模：45 到 80 人，依据是我们已成交的订单。
赢：sources/crm-closed-won.csv（context/sources.md 里排第 1）
输：sources/sales-deck-2025-02.md（排第 5，演示文稿和旧笔记）
    它说「只做企业级，1,000 人以上」。已标记。
```

它还标出 icp.md 里还没有规模规则。输入 /exit，保存工作，推上去。

```bash
git add -A
git commit -m "First version: map, ICP, sources"
git push -u origin HEAD
```

![](https://pbs.twimg.com/media/HX1baXcaUAAA3Hy.jpg)

## 第七步：每个客户、每个产品，各占一个文件夹

给每一个都配上自己的上下文、自己的历史，还有自己的 API 密钥——密钥放在仓库外面。它们之间什么能流动，由你决定。

在一个混装的文件夹里，客户 2 的定位可以悄无声息地出现在客户 1 的文案里，不会有任何报错来提醒你。

我的联合创始人 Kenny Damian 用一个终端管着 15 个客户文件夹。来一个新客户，我们就复制文件夹、改写一个文件。空白模板在我们的[免费公开仓库](https://github.com/Frontal-so/gtm-os)里。

![*github.com/Frontal-so/gtm-os，客户空白模板*](https://pbs.twimg.com/media/HX1bhS2bkAAgR8I.jpg)

下载下来，然后每个客户复制一份。

```bash
curl -fsSL https://raw.githubusercontent.com/Frontal-so/gtm-os/main/clients/_template/context.md -o clients/_template/context.md
cp -r clients/_template clients/client-2
```

![](https://pbs.twimg.com/media/HX1bqPUaEAAndDw.jpg)

企业内部团队，按产品线或细分市场来分。

我用的检验方法是：打开第 15 个文件夹，和打开第 2 个相比，成本差多少？如果差不多，说明是软件在替你交付。

## 第八步：每一次纠正，都送回造成它的那一层

修好犯错的那一层，之后的每一封邮件，都会带着这次修复。

七种症状告诉你该修哪一层。先修最早坏掉的那层。

```
一个客户的细节出现在另一个客户的输出里   -> 文件夹（第七步）
忘了你上周说过的话                       -> CLAUDE.md（第五步）
自信满满却错了                           -> 信息源顺序（第六步）
同样的步骤你反复重打                     -> 写一个技能
读起来没问题，CRM 说的却是另一回事       -> 实时数据
这活你还在手工做                         -> 做一个智能体
跑完了，没人知道改了什么                 -> 做一份结果日志
```

这篇指南覆盖前三条；技能你今天就能写；后三条是以后的事。

我们的 ABM（基于目标客户的营销）负责人 Ivan Falco 定了一条规矩：智能体永远不改写自己的规则。它提交一份提案，由人确认，改动生效并记入日志。

![](https://pbs.twimg.com/media/HX1bzixboAA5uRH.jpg)

来看一次完整的纠正。第四步的示例规则列出了什么能证明「有销售团队」，但没说「在招的岗位」不算证据，而招聘信号就排在它下面几行。再次打开 claude，输入这段。

```
来自销售负责人的纠正：有一个客户被判为放行，理由是它在招
SDR。在招岗位不能证明已存在销售团队。在 context/proposals.md
里提交一份提案，包含：提案、文件、改动、证据、负责人、是否批准。
```

地图告诉 Claude：先提案，然后等着。Claude Code 在这个文件夹里改文件是不用问的，所以要检查一下 icp.md 还没被动过。然后回答：「是，批准。标上今天的日期，应用改动并提交。」

![*提案，以及支撑它的笔记*](https://pbs.twimg.com/media/HX1b9e4asAABQHw.jpg)

![](https://pbs.twimg.com/media/HX1cD8EbwAAAbNs.jpg)

## 第九步：拿五个你熟悉的客户测一遍

挑五个客户，在 Claude 跑**之前**，先把你期望的判断写下来。

```
合适                        放行
商业模式属于排除项          排除
证据缺失                    暂缓
现有客户                    屏蔽
信号过时                    你自己的规则（我们：暂缓）
```

把这些存成 test/expected.csv，两列：account 和 expected。再把你对每个客户的所知放进 test/accounts.csv，带上信息源和日期。一行长这样。

```
account,what we know,source and date
oakrow.example,"官网写明卖 B2B 物流软件。销售经理和 4 个
SDR 在职。2025 年 3 月的一篇博客描述了它的外联团队。
CRM：无记录。","官网与员工记录 2026-11-18, 博客 2025-03-11,
CRM 2026-11-20"
```

![](https://pbs.twimg.com/media/HX1cg9takAA6Yck.jpg)

输入 /exit，重新打开 claude，让第一轮从一个干净的会话开始。

```
读 context/icp.md。对 test/accounts.csv 里的 5 个客户，各返回
exclude、hold、suppress 或 proceed，附上证据和理由。缺少必要
证据即为 hold。不要打开 test/expected.csv 或任何之前的运行记录。
记下你用的是哪些文件版本。结果存到 test/run-1.csv，列为
account, actual, evidence, rule。
```

判断和理由都要打分。答案对了、理由错了，算错。

再在两个新会话里各跑一次，分别存成 run-2.csv 和 run-3.csv，然后把三次答案并排放进 test/runs.csv。

在我们的示例里，四个客户三次结果都一样。第五个，oakrow，第一轮放行，第二、三轮暂缓。

它关于外联的唯一证据，是 2025 年 3 月的一篇博客，而我们的规则没有设时效上限。Claude 在三轮里都标出了这个缺口。修复只需要一份提案、一行字。

![](https://pbs.twimg.com/media/HX1cqsybwAAyy0v.jpg)

把那一行加进文件后，我们又跑了两遍。两遍都说暂缓，两遍都引用了新加的那行。

![](https://pbs.twimg.com/media/HX1c0jYboAAiO3D.jpg)

**同一个客户出现两个答案，说明缺一条规则。** 团队每发现一次新的失误，就加进测试清单。

输入 /exit，全部推上去，让团队都能拿到。

```bash
git add -A && git commit -m "Clients, proposals, test" && git push
```

## 第十步：每月 5 号，做一次清扫

我们的内容系统会记录每次会话，到了 5 号，它会标出那些反复被重写的东西。销售大脑也做同样的检查。

两件事：

- 对地图和其他 Claude 指令运行 /doctor prompt-audit，再对规则运行 /doctor prompt-audit context。你会得到一份报告，列出过时或互相冲突的指令；你不开口，它什么都不改。
- 把第九步的五个客户重跑一遍。
![*需要 Claude Code 2.1.283 或更新版本*](https://pbs.twimg.com/media/HX1c9viaMAAo7Wc.jpg)

![](https://pbs.twimg.com/media/HX1dIX7bsAAZ2mi.png)

每季度一次，用新近的通话重建核心文件。

## 现在，打开大脑的开关

1. 仓库建好，设为私有
2. 选定一个决策
3. 访谈、通话、纠正都进了 notes/
4. icp.md 里每条规则都有证据标准
5. CLAUDE.md 不到 200 行，/context all 里能看到它
6. 信息源排好序，并在一次冲突上测过
7. 每个客户或产品一个文件夹
8. 一次纠正已提案、批准、提交
9. 五个客户、三轮运行，每一处差异都追溯到一条规则
10. 每月 5 号进了日历
来看一个客户，从问题到答案的全过程。

![](https://pbs.twimg.com/media/HX1dONIakAAWzU6.png)

Frontal 服务过 300 多家 B2B 公司。做得成的和做不成的，差距主要在于有没有人把东西写下来——远比买了什么工具要紧。

**你的团队这个月回答过两遍的问题，是哪一个？**

想在你自己的工具里建好这套东西？去 [frontal.so](https://frontal.so/?utm_source=twitter&utm_medium=organic&utm_campaign=post&utm_content=alex) 预约一次通话。
