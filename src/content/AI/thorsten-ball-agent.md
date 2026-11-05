---
title: 'Thorsten Ball：我如何与 Agent 一起工作'
description: '作者：Thorsten Ball（Amp / Sourcegraph） 发表：X 长文，2026-10-25 链接：https://x.com/thorstenball/status/2114386050638336082(https://x.com/thorstenball/status/2114386050638336082) 说明：原文为 X Article，标题下副题「... as of '
pubDate: '2026-11-05'
category: 'AI'
archived: false
route_category: 'ai'
route_slug: 'thorsten-ball-agent'
source: notion
notion_id: '40f45fd1-9f92-8191-8694-c51de81f60de'
notion_parent: 'AI'
last_synced: '2026-11-05T03:12:49.304Z'
---

> 💡 TL;DR：Amp 的 Thorsten Ball 把发给朋友们的私信总结成文：用最新模型、给足上下文、让智能体自己验证——与 Agent 共事是一门手艺。3 分钟读完。

# How I work with Agents

**作者**：Thorsten Ball（Amp / Sourcegraph） **发表**：X 长文，2026-10-25 **链接**：[https://x.com/thorstenball/status/2114386050638336082](https://x.com/thorstenball/status/2114386050638336082) **说明**：原文为 X Article，标题下副题「... as of October 2026」。以下为英文原文 + 中文全文翻译。

---

## 原文

Finally summarized what I've been sending to friends in DMs

**How I work with Agents** 3 min read ... as of October 2026.

**Use the latest and greatest models.** Everything else is potentially a waste of time. If a model is wrong 10% of the time, you don't know which 10%, so you end up making multiple attempts. When do you really want to hire a generalist who's 50% cheaper but also randomly 20% dumber? Who's still using Opus 4.5? Exactly.

**Stop worrying about accumulating slop.** "It'll turn your codebase into an unmaintainable mess." Maybe that was true six months ago. Now? I'm not convinced it adds slop. And even if it does, I'm not convinced the result is unmaintainable.

**Prompt the What, not the How.** Describe What you want, not How you'd do it. You'll often get better results. "Make the bytecode compiler and VM AS FAST AS YOU CAN. Do not stop until it's 2x faster." "Here's how it should work in the end"

**Make the whole SDLC legible to the agent.** What stopped hallucinations? Tool calls. They let agents touch our reality. If the agent can't see something, it makes it up. So let it run what it builds end to end, let it read production logs, deploy, watch the rollout, cut the release, flip the flag, triage the bug report and email the customer. Anything you can see, the agent should see too.

**Give it tools for the SDLC.** We have custom plugins for bug reports, emailing users, "Is our system healthy?" and granting feature flags.

**Eval agentic knowledge.** Knowledge piles up in the codebase: AGENTS.md files, skills, scripts, docs. But do agents actually use it? Spawn five blind agents, control vs. treatment, and find out. Agents are really, really good at running experiments.

**Local dev feels yucky now.** Each agent should be able to install and run whatever it needs to get job done. Easy in remote machines, yucky in local dev. Hard to not run into resource conflicts locally when you want agents testing stuff end to end.

**Don't iterate with the agent. Let it build tools to iterate.** Not "let's try this. ... ah no, let's try that." Instead: "Generate 20 variations and a little page that lets me combine and test them." Not only applies to solution space, but also problem space: "Give me 4 theories on why this is slow, then check all four."

**Ask for irrefutable proof.** Biggest game changer. Agents are really good at producing proof: end-to-end walkthroughs, demo videos, before/after numbers. You have to build up trust and an instinct for this. Put "this is not evidence" in your AGENTS.md.

**Don't wait for your agents. Let them wait on you.** If you worry about TTFT, you're probably doing something wrong. Lean into async. Give them bigger tasks, be more ambitious. Batch instead of back and forth.

**Automation/schedules/wake-up/heartbeat are killer feature.** Didn't realize it, but missed it dearly once it was off. Use it all the time. "Check the logs in 2hrs." "Let me know once this is live" "Check every day at 9am".

**Stop manually managing context.** Every thought you spend wondering about "is it using 300k or 380k tokens?" is wasted time. Compaction works incredibly well. Don't manage context by hand. One thread = one task. Some threads are 46 messages, some are 3,714.

**Threads are your company memory.** (In Amp) "Why did we do this?" The more team uses Amp the more knowledge multiplies. Threads are connected to git commits. Game changer. Avoids duplicate work.

**Don't let agents write for humans.** Except: debugging steps, incident reports, some docs. Mechanical stuff where human on the other end doesn't matter that much.

**Review only code with high blast radius.** There are <5 central files -- those I review. Database migrations, yes. Closure vs. class, a neater type, variable names, even duplication: I don't care anymore. Does it work? Do I understand it at the arrows-in-a-diagram level? Did the agent test it end to end? Can I change it in a month? If yes, might review code.

---

## 中文全文

终于把我一直在私信里发给朋友们的内容，整理成一篇了。

**我如何和 Agent 一起工作** 三分钟读完……截至 2026 年 10 月。

**用最新、最强的模型。** 其他选择都可能是在浪费时间。如果一个模型有 10% 的时候是错的，而你并不知道错的是哪 10%，结果就是你得反复重试。你什么时候会真的想雇一个便宜 50%、但会随机笨 20% 的万金油？现在还有谁在用 Opus 4.5？就是这个道理。

**别再担心攒垃圾（slop）。** “它会把你的代码库变成没法维护的一团乱麻。”这话也许六个月前是对的。现在？我不信它会产生垃圾。就算产生了，我也不信结果就没法维护。

**提要求时说“要什么”，别说“怎么做”。** 描述你想要的结果，而不是你会怎么实现。通常效果更好。“把这个字节码编译器和虚拟机做得尽可能快。不做到 2 倍速不许停。”“最终它应该是这样运作的。”

**让整个软件开发生命周期对 agent 可见。** 是什么止住了幻觉？是工具调用。工具让 agent 能碰到我们的现实。agent 看不见的东西，它就会编。所以让它把自己造的东西端到端跑一遍，让它读生产日志、部署、盯发布、切版本、翻功能开关、处理 bug 报告、给客户发邮件。你能看见的，agent 都应该能看见。

**给它做 SDLC 的工具。** 我们做了自定义插件：查 bug 报告、给用户发邮件、“我们系统健康吗”、开关功能开关。

**评估 agent 的知识使用。** 知识会在代码库里越堆越多：AGENTS.md、skills、脚本、文档。但 agent 真的用了吗？放五个不知情的 agent，一个对照组一个实验组，去看结果。agent 特别擅长跑实验。

**本地开发现在很恶心。** 每个 agent 都应该能装上、跑起它干活需要的任何东西。在远程机器上很轻松，在本地很恶心。你想让 agent 端到端测东西的时候，本地很难不撞上资源冲突。

**别和 agent 一起迭代，让它造工具去迭代。** 不是“试试这个……啊不行，再试试那个”。而是：“生成 20 个变体，再给我一个小页面，让我能组合和测试它们。”这不只适用于解的空间，也适用于问题的空间：“给我四个它为什么慢的假说，然后把四个都验一遍。”

**要不可辩驳的证据。** 这是最大的改变。agent 特别会造证据：端到端走查、演示视频、改动前后的数字。你得建立信任，也得养出直觉。把“这不算证据”写进你的 AGENTS.md。

**别等你的 agent，让它们等你。** 如果你还在担心 TTFT（首个 token 的延迟），你多半做错了什么。往异步上靠。给它们更大的任务，更有野心一点。批量处理，别来回对话。

**自动化 / 定时 / 唤醒 / 心跳是杀手级功能。** 我以前没意识到，一旦关掉就极其想念。我一直在用。“两小时后查一下日志。”“上线了告诉我。”“每天早上九点查一次。”

**别再手动管上下文。** 你花在“它现在用了 30 万还是 38 万 token”上的每一个念头，都是浪费。压缩（compaction）效果好得惊人。别手工管上下文。一个线程 = 一个任务。有的线程 46 条消息，有的 3714 条。

**线程就是你的公司记忆。**（在 Amp 里）“我们当初为什么这么做？”团队用得越多，知识就复利越多。线程是连着 git commit 的。这是游戏规则改变者。能避免重复劳动。

**别让 agent 写给人看的东西。** 例外：调试步骤、事故报告、部分文档。那些机械性的、对面那个人不太在乎的东西。

**只审查爆炸半径大的代码。** 有不到五个核心文件，那些我会看。数据库迁移，会看。用闭包还是用类、更优雅的类型、变量名、甚至重复代码：我已经不在乎了。它能跑吗？我能在“图上的箭头”这个层面理解它吗？agent 端到端测过吗？一个月后我还能改它吗？都能，那也许我会去 review 代码。
