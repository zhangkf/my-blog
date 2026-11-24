---
title: '给智能体装上 Agent Skills：把专业知识打包成可组合的能力'
description: '译注：原文无独立大标题（页面标题为「Equipping agents with Agent Skills」），标题为译者代拟。原文发表于 2025 年 12 月 18 日；页面顶部此后有一则更新：Agent Skills 已作为开放标准发布，可跨平台移植（agentskills.io）。'
pubDate: '2025-12-18'
origin_date: '2025-12-18'
category: 'AI'
archived: false
route_category: 'ai'
route_slug: 'agent-skills'
source: notion
origin_url: 'https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills'
notion_id: '42245fd1-9f92-8142-8e56-d9faed320411'
notion_parent: 'AI'
last_synced: '2026-11-24T01:02:30.526Z'
---

*译注：原文无独立大标题（页面标题为「Equipping agents with Agent Skills」），标题为译者代拟。原文发表于 2025 年 12 月 18 日；页面顶部此后有一则更新：Agent Skills 已作为开放标准发布，可跨平台移植（agentskills.io）。*

---

**更新**：我们已将 Agent Skills 发布为开放标准，可跨平台移植。[了解更多](https://agentskills.io/)

随着模型能力的提升，我们已经可以构建与功能完备的计算环境交互的通用智能体。[Claude Code](https://claude.com/product/claude-code) 就是一例：借助本地代码执行和文件系统，它能跨领域完成复杂任务。但这些智能体越强大，我们就越需要一种更可组合、更可扩展、更可移植的方式，把领域专长装备到它们身上。

于是我们创造了 [**Agent Skills**](https://www.anthropic.com/news/skills)（智能体技能）：由指令、脚本和资源组成的、组织有序的文件夹，智能体可以动态地发现并加载它们，从而在特定任务上表现更好。Skills 把你的专长打包成可组合的资源交给 Claude，把通用智能体变成合你所需的专业智能体。

给智能体写一个技能，就像给新员工准备一份入职指南。你不必再为每个用例各自打造一件碎片化的定制智能体——任何人都可以把自己头脑中的程序性知识捕捉下来、分享出去，用可组合的能力让智能体专业化。本文解释 Skills 是什么、它们如何工作，并分享构建自己技能的最佳实践。

![](https://assets.claude.com/d8fc1b7c5e60a82895f26bdd2ead5dc2f19fac50.jpg?w=3840&q=75&fm=webp&fit=max)

一个技能（skill）就是一个目录：里面放着一个 SKILL.md 文件，以及组织有序的指令、脚本和资源文件夹，给智能体添上新的能力。

## 技能的构造

要看见 Skills 如何运转，最好的办法是拆一个真实的例子：驱动 [Claude 新近上线的文档编辑能力](https://www.anthropic.com/news/create-files)的技能之一。Claude 本就懂得很多关于理解 PDF 的知识，但在直接操作 PDF 上受限（比如填一张表单）。这个 [PDF 技能](https://github.com/anthropics/skills/tree/main/document-skills/pdf)让我们得以把新能力交给它。

最简单的形态下，一个技能就是一个目录，里面含有一个 `SKILL.md` 文件。这个文件必须以 YAML frontmatter 开头，其中包含必要的元数据：`name` 和 `description`。启动时，智能体会把每一个已安装技能的名字和描述预加载进系统提示词。

这层元数据是渐进式披露（progressive disclosure）的**第一级**：它只提供刚好够用的信息，让 Claude 知道每个技能何时该用，而无须把技能的全部内容装进上下文。文件正文是**第二级**。如果 Claude 认为该技能与当前任务相关，它就会读入完整的 `SKILL.md`，从而加载这个技能。

![](https://assets.claude.com/10eadeae20d054c871c511c1b8529ad6d04860da.jpg?w=3840&q=75&fm=webp&fit=max)

SKILL.md 文件必须以 YAML Frontmatter 开头，包含文件名和描述；它们会在启动时被加载进系统提示词。

技能长到一定复杂度，可能出现两种情况：上下文多到一个 `SKILL.md` 装不下，或某些内容只在特定场景才相关。这时，技能可以在自己的目录里捆绑额外的文件，并在 `SKILL.md` 中按名字引用它们。这些被链接的文件是**第三级**乃至更深的细节，Claude 只在需要时才会去翻找、发现。

在上面展示的 PDF 技能里，`SKILL.md` 引用了两个附加文件（`reference.md` 和 `forms.md`），它们是技能作者选择与核心文件捆绑在一起的。把填表单的说明挪进单独的文件（`forms.md`），技能的核心就可以保持精干——作者相信 Claude 只在填表时才会去读 `forms.md`。

![](https://assets.claude.com/af7cdbe16981bba4bb0c3747df15ab1ccf0c4dab.jpg?w=3840&q=75&fm=webp&fit=max)

你可以把更多上下文（以附加文件的形式）放进技能，Claude 会根据系统提示词按需触发它们。

渐进式披露是让 Agent Skills 灵活且可扩展的核心设计原则。就像一本编排得当的手册：先是一页目录，然后是具体章节，最后才是详尽的附录——skills 让 Claude 只在需要时才加载信息：

![](https://assets.claude.com/bfd8dd295b841601ea21a352b6e7218e232f341c.jpg?w=3840&q=75&fm=webp&fit=max)

带有文件系统和代码执行工具的智能体，在处理某个任务时，并不需要把技能的全部内容读进上下文窗口。这意味着一个技能所能捆绑的上下文，实际上没有上限。

### Skills 与上下文窗口

下面的示意图展示：当一条用户消息触发某个技能时，上下文窗口会发生什么。

![](https://assets.claude.com/828ab412ad0e017ea440071b8f2c9324765dcd9c.jpg?w=3840&q=75&fm=webp&fit=max)

技能经由你的系统提示词在上下文窗口中被触发。

图中所示的操作顺序是：

1. 一开始，上下文窗口里有核心系统提示词、每个已安装技能的元数据，以及用户的初始消息；
2. Claude 调用 Bash 工具读取 `pdf/SKILL.md` 的内容，从而触发 PDF 技能；
3. Claude 选择阅读技能捆绑的 `forms.md` 文件；
4. 最后，从 PDF 技能中装入了相关指令，Claude 开始处理用户的任务。
### Skills 与代码执行

技能还可以包含代码，让 Claude 在恰当的时机把它当作工具来执行。

大语言模型擅长许多任务，但某些操作更适合交给传统的代码执行。举例来说，用生成 token 的方式去排一个列表，比直接跑一遍排序算法贵得多。除了效率，许多应用还需要只有代码才能提供的确定性——同样的输入，永远得到同样的输出。

在我们的例子里，PDF 技能就附带了一个预先写好的 Python 脚本：读取一份 PDF，提取其中所有表单字段。Claude 可以直接运行这个脚本，而不必把脚本或 PDF 装进上下文。代码是确定性的，所以这条工作流稳定、可复现。

![](https://assets.claude.com/c1c869ca120319486777db6c42794243fc426c8f.jpg?w=3840&q=75&fm=webp&fit=max)

技能还可以包含代码，Claude 会根据任务的性质，自行决定何时把它们当作工具执行。

## 开发与评估技能

以下是几条实用的指引，供你着手编写和测试自己的技能：

- **从评估开始**：让智能体去做有代表性的任务，观察它在哪里卡壳、在哪里需要额外的上下文，从而找出它能力上的具体缺口。然后围绕这些短板，逐步搭建技能。
- **为规模设计结构**：当 `SKILL.md` 变得臃肿，就把内容拆成单独的文件、用引用串起来。如果某些场景互斥、或很少同时出现，把路径分开能降低 token 消耗。最后，代码既可以当可执行的工具，也可以当文档——要让 Claude 一眼分清：该直接运行这个脚本，还是把它读进上下文当参考。
- **从 Claude 的视角思考**：在真实场景中观察 Claude 如何使用你的技能，根据观察迭代。留意意外的执行轨迹，以及对某些上下文的过度依赖。特别用心打磨技能的 `name` 和 `description`——Claude 正是依据它们，决定要不要在当前任务上触发这个技能。
- **与 Claude 一起迭代**：和 Claude 协作完成任务时，让它把成功路径和常见错误沉淀成技能里可复用的上下文和代码。如果它用某个技能跑偏了，让它自己复盘哪里出了问题。这个过程会帮你发现 Claude 真正需要什么上下文，而不是靠你预先猜测。
### 使用 Skills 的安全须知

技能通过指令和代码赋予 Claude 新能力。这让它强大，但也意味着：恶意技能可能在你使用它的环境里引入漏洞，或指挥 Claude 外传数据、做出意料之外的动作。

我们建议只从可信来源安装技能。若要从可信度较低的来源安装，使用前务必彻底审计：先读一遍技能捆绑的所有文件，弄清它究竟做什么，特别留意代码依赖，以及图片、脚本等捆绑资源；同样要留意的，是技能里任何指示 Claude 去连接不可信外部网络源的指令或代码。

## Skills 的未来

Agent Skills 目前已支持 [Claude.ai](http://claude.ai/)、Claude Code、Claude Agent SDK 与 Claude Developer Platform。

接下来几周，我们会继续增加功能，覆盖创建、编辑、发现、分享和使用 Skills 的完整生命周期。我们尤其期待 Skills 能帮助组织和个人把自己的上下文与工作流分享给 Claude。我们还会探索 Skills 如何与 [Model Context Protocol](https://modelcontextprotocol.io/)（MCP）服务器互补——教智能体掌握涉及外部工具与软件的更复杂工作流。

看得更远一点，我们希望让智能体能够自己创建、编辑和评估 Skills，把它们自己的行为模式编纂成可复用的能力。

Skills 是一个简单的概念，格式也相应地简单。这份简单，让组织、开发者和最终用户都更容易构建定制化的智能体，并赋予它们新的能力。

我们期待看到人们用 Skills 做出什么。欢迎从我们的 Skills [文档](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)和 [cookbook](https://github.com/anthropics/claude-cookbooks/tree/main/skills)（示例集）开始上手。

## 作者与致谢

### 致谢

本文由 Barry Zhang、Keith Lazuka 和 Mahesh Murag 撰写——三位都特别喜欢文件夹。特别感谢 Anthropic 内外许多为 Skills 奔走、支持与建造的人。
