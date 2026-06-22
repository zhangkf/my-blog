---
title: 'Hermes Agent 完整指南'
description: '原文链接：https://x.com/i/status/2054564519280804028(https://x.com/i/status/2054564519280804028)  
作者：Akshay 🚀 (@akshaypachaar)'
pubDate: '2026-05-18'
heroImage: 'https://app.notion.com/images/page-cover/hudsonRiverSchool_theOxbow.jpg'
category: 'Agent'
source: notion
notion_id: '36445fd1-9f92-80b9-abeb-e15c17180d56'
notion_parent: 'Agent'
last_synced: '2026-06-22T02:36:41.877Z'
---

**原文链接**：[https://x.com/i/status/2054564519280804028](https://x.com/i/status/2054564519280804028)  
**作者**：Akshay 🚀 (@akshay_pachaar)

> 理解并定制 Hermes Agent 所需的一切。自进化技能、三层记忆、GEPA 优化，以及构建 1 到 10 个为你 24/7 工作的智能体。

Hermes Agent 在两个月内获得了超过 90,000 个 GitHub 星标。开发者们正在悄然构建个人 AI 智能体，它们能学习你的工作流、记住你的上下文，并 24/7 全天候运行。

你使用过的每一个 AI 智能体都有同一个问题：会话一结束，它就把一切都忘了。

你的编码偏好、你纠正过三次的项目约定、昨天花了 10 分钟才搞定的修复方案……全部消失。下次会话，你又得从头开始。

Nous Research 的 Hermes Agent 采取了根本不同的方法。它内置了一个学习循环，能够：

- 跨会话记住内容
- 编写自己的可复用技能
- 在后台对技能进行修剪
- 通过一个名为 GEPA 的进化引擎离线验证技能
没有其他开源智能体能同时结合这三者。甚至 OpenClaw 也不例外。

本指南将讲解这个学习循环是如何工作的、每一层记忆的作用，以及如何从零开始配置一切。

到最后，你将在自己的机器上拥有三个完全隔离的智能体：一个程序员（使用你的 Claude 代码）、一个深度研究员和一个设计师，每个都有自己的个性、记忆、技能和 Telegram 机器人。

来看看吧：

整个设置只需几分钟，而且这里的所有内容都可以在你自己的硬件上复现。

注意：本指南中的所有插图均由 Pixel 设计，它就是你将在文末学会构建的 Hermes 智能体之一。阅读时请留意这些插图。

让我们开始吧！

## **如何阅读本文**

分为两部分：先理论，后实践。

时间紧？直接跳到「快速上手」部分。命令可以独立使用。

但理论部分值得花时间。了解技能如何自进化、记忆如何组合、何时需要 GEPA，这些知识能让你从「把 Hermes 当成带笔记的聊天机器人」变成「让它真正产生复利效应」。

本文内容概览：

- Hermes Agent 到底是什么（定位 + 与 OpenClaw 的对比）
- 它的构建方式（一张图看懂架构）
- 记忆之前：智能体是谁？（SOUL.md，身份层）
- 记忆系统（三层，三种速度）
- 自进化技能（智能体自己编写的剧本 + Curator）
- GEPA（离线技能优化）
- 快速上手（安装、Telegram、第一个智能体）
- 运行多个智能体（档案、三个角色、定时摘要）
- 根据需求定制智能体
## **Hermes 是什么，以及它在架构上与众不同的地方**

一句话定位：一个使用时间越长就越强大的智能体。

让这一点真正实现的是，三个通常分离的能力被整合在一个框架中：运行时技能学习、持久的多层记忆，以及可选的权重训练流水线。没有其他开源智能体同时提供这三者。

开源生态中最接近的对比是 OpenClaw。两者都支持持久化和消息友好，但架构选择完全相反。

Kilo 博客的一段话说得很好：「Hermes 在一个学习型智能体外面包装了一个网关。OpenClaw 则是在一个消息网关里面包装了一个智能体。」

## **它的构建方式**

在理解学习循环之前，你需要先对 Hermes 的结构有一个基本认识。

一切都通过 run_agent.py 中的单个 AIAgent 类流动。CLI、消息网关、批处理运行器、IDE 集成：它们都是通向同一个核心智能体的入口。

这正是平台无关故事真正成立的原因。

核心循环是 ReAct 风格且同步的。构建系统提示、检查是否需要压缩、发起可中断的 API 调用、执行任何工具调用、再次循环。

几个后面会用到的关键细节：

- 智能体可以在六个不同的地方运行命令：本地终端、Docker、SSH、Modal、Daytona 或 Singularity。代码相同，只需改配置。无需改动任何其他东西，就能把执行从笔记本移到云端 GPU 服务器。
- 它几乎可以与任何模型配合使用。一个翻译层将任何提供商通过三种 API 格式之一进行路由。这就是为什么你可以用一条命令从 Claude 切换到 GPT、Gemini 或本地 Ollama，而不会出任何问题。
- 智能体对每个任务有 90 轮的硬性上限。没有这个上限，卡在循环中的智能体（重试失败的 API、反复读取同一个文件）会悄无声息地烧光你的额度。子智能体共享同一预算，因此失控的委托链也无法绕过。
这些是基础框架。现在进入有趣的部分。

## **记忆之前：智能体是谁？**

在讨论记忆和自进化技能之前，有一层位于两者之上的东西：身份。

记忆是智能体知道什么。技能是它如何做事。但两者都没有告诉你它出现时「是谁」。没有身份层，每个智能体感觉都像是同一个智能体戴着不同的帽子。

Hermes 用一个文件解决了这个问题：**SOUL.md**。

它位于 `~/.hermes/SOUL.md`，在系统提示中占据第 1 个位置，在其他任何内容加载之前。它定义了智能体的个性、语气、沟通风格和硬性限制。

SOUL.md 是手写且静态的。你写一次，随着时间微调，它在每个项目和每次会话中都保持一致。如果文件缺失，Hermes 会回退到内置的默认身份。

为什么这对自改进的故事很重要？因为后面发生的一切（智能体写入的记忆、它创建的技能、它整合知识的方式）都是通过这个身份的镜头发生的。

SOUL.md 是固定的框架。记忆和技能是它里面的活动部件。

## **记忆系统：三层，三种速度**

Hermes 没有单一的「记忆」。它有三层，每一层针对不同的用途设计。

### **第 1 层：两个极小的 Markdown 文件**

核心是存储在磁盘上的两个文件：

- **MEMORY.md**（最多 2,200 字符）：保存智能体关于你的环境、项目约定、工具怪癖和经验教训的笔记。
- **USER.md**（最多 1,375 字符）：保存你的个人资料：姓名、沟通偏好、技能水平以及需要避免的事项。
两者在会话开始时作为冻结快照注入系统提示。如果智能体在会话中写了一个新的记忆条目，该更改会立即持久化到磁盘，但要到下一次会话才会出现在系统提示中。

当记忆接近满（约 80% 容量，会在系统提示头部以百分比显示）时，智能体必须进行整合。

它将相关条目合并成更密集、信息量更大的版本，从而只保留有用的信息。

### **第 2 层：全文会话搜索**

每一次对话（CLI 和消息）都存储在 SQLite 中，支持全文搜索。智能体可以从这里搜索过去数周的对话。

权衡很清楚：第 1 层始终在上下文中，但容量很小。第 2 层容量无限，但需要主动搜索加上 LLM 总结。

关键事实放在记忆里。其余的按需搜索。

### **第 3 层：外部记忆提供商（8 个插件）**

为了更深层的持久记忆，Hermes 提供了 8 个可插拔的提供商，与内置记忆并行运行（绝不替换它）。同一时间只能激活一个。

当任何外部提供商激活时，Hermes 会在每次轮次前自动预取相关记忆，每次响应后同步对话轮次，并在会话结束时提取记忆。

## **自进化技能：智能体自己编写剧本**

记忆处理事实。技能处理流程。

技能是带有 YAML 前置事项的 Markdown 文件，充当智能体的过程记忆：不是它知道什么，而是它如何做事。

以下是技能的结构（略）：

为了保持 token 成本低，技能使用渐进式披露：

- **Level 0**：智能体只看到名称 + 描述（完整目录约 3k tokens）
- **Level 1**：当它真正需要某个技能时，才加载完整技能内容
- **Level 2**：它可以深入技能内的特定参考文件
**自改进循环**。

这是核心差异化所在。智能体使用 skill_manage 工具自主创建自己的技能。技能创建的触发条件包括：

- 智能体完成一个复杂任务（5+ 次工具调用）
- 它遇到错误或死胡同并找到了可行的路径
- 用户纠正了它的做法
- 它发现了一个非平凡的工作流
循环的工作方式是这样的：智能体遇到问题 → 通过试错解决 → 将成功的做法保存为 SKILL.md 文件 → 下次遇到类似问题时，它加载该技能并遵循已验证的流程，而不是从头重新发现方法。

该工具支持六种操作：create、patch（有针对性的修复，推荐，因为 token 效率高）、edit（完全重写）、delete、write_file 和 remove_file。

**Curator：技能的垃圾回收**。

如果没有维护，智能体创建的技能会堆积如山。你最终会得到几十个狭窄、重叠的剧本，它们浪费 token 并污染目录。

Curator 是一个后台维护系统，负责处理这个问题。它通过非活动检查运行（不是 cron 守护进程）：如果距离上次运行已经过去 7 天，并且智能体已经闲置 2 小时以上，一个后台 fork 的智能体会启动，使用自己的提示缓存，绝不触碰活跃对话。

它分为两个阶段运行：

1. 自动转换（确定性的，不使用 LLM）：30 天未使用的技能变为过时。90 天未使用的技能会被归档。
2. LLM 审查（最多 8 次迭代）：一个 fork 的智能体会审查所有智能体创建的技能，并逐个决定是保留、修补、合并还是归档。
两个重要约束：

- Curator 绝不会触碰捆绑或从 hub 安装的技能。只处理智能体自己编写的。
- 它绝不会自动删除。最坏的结果是归档到 `~/.hermes/skills/.archive/`，可以用一条命令恢复。
在每次 Curator 运行之前，Hermes 会对整个 skills 目录进行 tar.gz 快照。回滚只需一条命令，而且回滚本身也是可逆的。

你也可以使用 `hermes curator pin <skill>` 固定关键技能，保护它们不被归档和删除。修补和编辑仍然可以进行，因此智能体可以在不要求你先取消固定的情况下改进固定技能。

## **GEPA：使用执行轨迹离线进化技能**

这里开始变得有趣了。

智能体内的学习循环（技能创建 + Curator）有一个已知的弱点：

智能体倾向于自我表扬。它几乎总是认为自己表现得很好，即使实际上并没有。社区反馈已经证实了这一点。

同一个自动生成技能的系统，也可能用更差的版本覆盖手动自定义。

这就是 GEPA 发挥作用的地方。

GEPA（Genetic-Pareto Prompt Evolution，遗传-帕累托提示进化）不是内置在 Hermes 运行时中的。它位于一个伴随仓库（NousResearch/hermes-agent-self-evolution）中，作为离线优化流水线运行。作为 ICLR 2026 Oral 论文发表，MIT 许可。

核心思想：与其问智能体「你做得好吗？」，GEPA 会读取执行轨迹来理解为什么事情失败，然后通过进化搜索提出有针对性的改进。

流水线：

1. 从 Hermes 仓库读取当前技能
2. 生成评估数据集（通过 Claude Opus 的合成测试用例、来自 SQLite 的真实会话历史，或手动整理的黄金集）
3. 运行 GEPA 优化器：读取执行轨迹 → 理解失败点 → 生成候选变体
4. 使用 LLM-as-judge 评分 + 评分标准评估候选（不是二元通过/失败）
5. 应用约束门：完整测试套件必须 100% 通过，技能保持在 15KB 以下，缓存兼容性得到保留，语义目的不漂移
6. 最佳变体作为对 Hermes 仓库的 PR 提交。绝不是直接提交。
不需要 GPU。一切都通过 API 调用运行。成本：每次优化运行大约 2-10 美元。

这可以先跳过，但当你遇到瓶颈，又不想花时间和金钱进行微调（RL/GRPO）时，它非常有效。

更多细节请查看仓库：[https://github.com/NousResearch/hermes-agent-self-evolution](https://github.com/NousResearch/hermes-agent-self-evolution)

我最近写了一篇关于 GEPA 的文章。它是在转向完整微调或基于 RL 的微调之前值得尝试的绝佳替代方案。

简单总结一下：

SOUL.md 设置身份。运行时循环捕获经验。Curator 保持库的整洁。GEPA 确保库里的内容真正有效。

理论部分到此结束。现在让我们在你的机器上运行它。

## **快速上手**

Linux、macOS 或 WSL2。安装程序自带 Python 3.11+。8GB RAM 对于基于 API 的使用就足够了。

一行安装命令：

```
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

运行设置向导。它会引导你完成提供商、API 密钥、模型和工具的选择：

```
hermes setup
```

在终端开始聊天：

```
hermes
```

连接到 Telegram：

如果你想从手机而不是终端与智能体对话，可以把它指向一个 Telegram 机器人。

从 @BotFather 获取 bot token（运行 /newbot），然后从 @userinfobot 获取你的 Telegram 用户 ID。

完成！你就拥有了一个可用的智能体：

## **~/.hermes/ 里面有什么？**

安装完成后，你的 home 目录会多出一个新文件夹。

了解这个布局很重要，因为你使用 Hermes 所做的所有事情都会触及其中一条路径。

几个值得仔细看的文件：

- **config.yaml** 是所有非秘密配置的唯一真相来源。模型选择、终端后端、工具启用、MCP 服务器都住在这里。使用 `hermes config edit` 编辑，或用 `hermes config set <key> <value>` 逐个设置。
- **.env** 保存你的秘密。API 密钥、bot token、密码。Hermes 会自动把看起来像秘密的值路由到这里。
- **SOUL.md** 是系统提示中的第 1 个槽位，在其他一切之前。身份层，前面已经介绍过。
- **skills/** 是整个学习循环所在的地方。智能体创建的每个技能，以及你安装的所有内容，都会落在这里。
- **state.db** 是支撑会话搜索的 SQLite 数据库。WAL 模式安全，FTS5 索引。这就是「我们三周前讨论过什么？」真正起作用的原因。
你不会手动编辑其中的大部分。但了解布局能让其他一切都变得清晰。

## **添加新技能**

Hermes 维护着自己的官方 Skills Hub，包含 687 个技能，横跨 18 个类别。细分如下：

- 87 个内置技能，随智能体一起提供
- 79 个可选技能，可按需启用
- 16 个来自 Anthropic（frontend-design、pdf、pptx、docx、mcp-builder 等）
- 505 个来自 LobeHub（更广泛的社区贡献）
你也可以将任何 GitHub 仓库添加为自定义 tap：

```
hermes skills add-tap https://github.com/yourname/your-skills
```

这就是你如何在团队间共享技能或维护自己的私有集合的方式。

## **从 1 个扩展到 10 个智能体**

一个智能体已经够用了。多个专业化智能体才是 Hermes 的有趣之处。

Hermes 有一个一流的功能来实现这一点，叫 **profiles**（档案）。每个档案都是一个完全隔离的 Hermes 实例，拥有自己的 config、记忆、技能、会话和 SOUL.md。它们默认不共享任何东西。

我们将设置三个：设计师、程序员和研究员。

创建团队：

```
hermes profile create designer --clone
hermes profile create programmer --clone
hermes profile create researcher --clone
```

- `-clone` 会复制你默认档案的 config 和 .env 作为起点。
给每个智能体一个自己的 Telegram bot

每个档案都需要从 BotFather 获取自己的 bot。Telegram 每个 token 只允许一个连接，因此共享会出问题。

用 BotFather 运行三次 /newbot 并保存三个 token。然后为每个档案运行一次网关向导：

```
hermes --profile designer gateway setup
hermes --profile programmer gateway setup
hermes --profile researcher gateway setup
```

设置与普通智能体完全相同，你可以在 Bot Father 中再次创建新 bot 并将它们连接到各自的智能体。

通过 SOUL.md 给每个智能体赋予个性

这就是智能体真正变得不同的地方。编辑每个档案的 SOUL.md。

设计师（`~/.hermes/profiles/designer/SOUL.md`）示例：

```
You are Pixel, a world-class visual designer and illustrator.
Your taste is clean, modern, slightly playful with strong typography and intentional use of negative space.
You always ask clarifying questions about style references before generating.
You output both the final image prompt and a short rationale.
You never use clipart or generic stock styles unless explicitly asked.
```

程序员（`~/.hermes/profiles/programmer/SOUL.md`）示例：

```
You are a senior staff engineer. You are pragmatic, concise, and obsessed with clean code and developer experience.
You always explain trade-offs. You prefer small, testable changes over big refactors.
When using Claude Code, you clearly separate planning from execution.
You write excellent commit messages and keep PRs small.
```

研究员（`~/.hermes/profiles/researcher/SOUL.md`）示例：

```
You are a deep researcher. You synthesize information from multiple sources, cite everything, and surface the most important insights.
You are skeptical of hype and always look for primary sources and data.
Every daily digest must be actionable and under 800 words.
You proactively surface connections between topics the user cares about.
```

## **定制程序员：通过 Claude Code 路由执行**

如果程序员不只是自己写代码，而是把执行委托给 Claude Code CLI，会更有意思。Hermes 负责编排，Claude Code 负责文件编辑、运行命令、管理 git。Hermes 读取结果并决定下一步。

这也是我在我的 Claude Max 订阅上运行它的方式。不需要单独的 API 密钥。Claude Code 会自动使用 Max 凭证。

启动一个会话并发送这条激活提示：

```
I already have a Claude Max subscription. You are my staff engineer who
helps me with my day-to-day coding tasks, and under the hood you use
Claude Code for all the executions. Set yourself up accordingly.
```

程序员会自行安装 autonomous-ai-agents/claude-code 技能，验证 claude 是否在 PATH 中，然后开始使用它进行代码执行。从下一条消息开始，任何与编码相关的事情（读取文件、编写代码、运行测试、提交、推送）都会在底层通过 Claude Code 路由。

需要知道的两件事：

- 激活前确保 claude 在你的 PATH 中。`which claude` 应该打印真实的二进制路径。
- Claude Code 有打印模式（单次、快速、无 TUI）和交互模式（完整 tmux 会话）。程序员会根据任务选择。你不需要操心。
## **定制设计师：教它你的视觉风格**

当设计师能以你的风格生成图像，而不是通用的 AI 输出时，它才会真正有用。模式是：给它参考设计，让它研究，然后要求它创建一个能生成相同风格新图像的技能。

这是把自改进循环用作设置机制。你不用手动写技能，而是给智能体展示好的例子，让它自己编码出这个模式。

启动设计师的会话，把你的参考图像粘贴进去（CLI 中拖放，或在 Telegram 中附加）。然后发送这个提示：

```
Study these reference designs carefully. Extract the visual language: color palette, typography treatment, illustration style, composition rules, and mood.
Create a reusable skill called "my-design-style" that can generate new images in exactly this style.
The skill should include:
- A detailed style guide
- A Python script using the image generation API
- Example prompts
Save everything under skills/my-design-style/
```

设计师会研究参考资料，编写 SKILL.md，生成 Python 脚本，将其保存到 `~/.hermes/profiles/designer/skills/my-design-style/`，并验证脚本能否运行。

如果你已经运行过 hermes setup 并选择了 OpenRouter 作为提供商，那么密钥已经通过 `--clone` 存在于设计师档案的 .env 中。如果没有，添加一次：

```
hermes --profile designer config set provider openrouter
# 然后在 ~/.hermes/profiles/designer/.env 中添加 OPENROUTER_API_KEY
```

从此以后，向设计师索要新插图就会触发该技能。它会根据你的风格指纹编写提示，通过 OpenRouter 调用 Nano Banana，并保存输出。

同样的模式适用于任何风格特定的输出。提供参考内容，要求智能体构建一个能复现该模式的技能。Newsletter 开头、X 线程、代码审查评论，任何需要一致性的地方都可以。

## **调度工作：用白话文写 Cron**

研究员的 SOUL.md 说它负责每日 Telegram 摘要。这意味着需要一个在自己日程上运行的任务，而不需要你记得去问。这就是 Hermes cron 的用途。

Hermes 内置了一个调度器。网关守护进程每 60 秒 tick 一次，在隔离的智能体会话中运行任何到期的任务，并将输出发送到你指定的任何消息平台。任务在重启后仍然存在。它们位于 `~/.hermes/cron/jobs.json`，输出会进入 `~/.hermes/cron/output/`。

有趣的部分：你不用写 cron 表达式。你用英文描述你想要什么，Hermes 会把它转换。

为研究员连接每日摘要

打开研究员的会话并发送这个提示：

```
Every morning at 8am, send me a concise digest of the most important AI and tech news from the last 24 hours. Include links when relevant.
```

研究员会使用它的 cronjob 工具创建任务，默认投递目标是当前聊天（这里是 Telegram），然后调度器接管后续工作。

验证是否已创建：

```
hermes cron list
```

你应该能看到任务及其下次运行时间。明天早上 8 点，你的 Telegram 就会亮起摘要。不需要进一步操作。

## **其他有用模式**

cron 语法很灵活。几个值得知道的变体：

- 一次性延迟：`/cron add 30m "Remind me to check the build"` 30 分钟后运行一次。
- 重复间隔：`/cron add "every 2h" "Check server status"` 每两小时运行一次。
- 标准 cron 表达式：`/cron add "0 9 * * 1-5" "..."` 精确控制（本例为工作日早上 9 点）。
- 技能附加：`/cron add "every 1h" "Summarize new feed items" --skill blogwatcher` 在运行提示前加载技能。
你还可以链式任务。一个 cron 的输出通过 context_from 标志成为下一个 cron 的输入。适用于需要研究步骤为写作步骤提供输入的多阶段自动化。

---

就到这里了。

感谢阅读。如果你想让我接下来覆盖什么，请在评论区告诉我。

如果你更喜欢通过视频学习，我会在几天后在 YouTube 和 X 上发布完整的 Hermes Agent 演练。

敬请期待！

Cheers! :)
