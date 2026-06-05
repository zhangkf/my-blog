---
title: 'Resolvers: The Routing Table for Intelligence'
description: '翻译：Garry Tan 的这篇长帖'
pubDate: '2026-05-16'
heroImage: 'https://app.notion.com/images/page-cover/texturelabs_metal_261S.jpg'
category: 'Agent'
source: notion
notion_id: '36245fd1-9f92-80d9-9026-f54d1cfc315e'
notion_parent: 'Agent'
last_synced: '2026-06-05T11:34:53.737Z'
---

**翻译：Garry Tan 的这篇长帖**

在《薄 Harness，胖 Skills》中，我介绍了构建真正有效的 Agent 系统的五个核心定义。Skills 获得了最多的关注，人们收藏了“Skill-as-method-call”模式、Diarization 概念以及薄 Harness 架构。很好，这些确实很重要。

但几乎没人注意到的那个定义，其实才是最重要的——**Resolvers**。它们被忽略的原因，正是它们如此重要的原因：**正常工作时隐形，失效时灾难性**。

**Resolver 是一个上下文路由表**。当出现 X 类型任务时，优先加载 Y 文档。就这么简单，一句话。但这一句话，就是“能持续复合智能的 Agent”和“慢慢忘记自己知道什么的 Agent”之间的区别。

下面是我如何惨痛地学到这一课的故事。

**2 万行的忏悔**

我的 CLAUDE.md 曾经有 **2 万行**。

我并不以此为荣。Claude Code 用过的每一个怪癖、每一种模式、每一次教训、我的代码库里的每一条约定、每一个让我吃过亏的边缘案例……我一直在往里加。文件越来越大，感觉自己在进步，感觉模型在变聪明。

其实不是。我是在淹没它。

模型的注意力严重退化，响应变慢、精度下降。最后 Claude Code 直接告诉我“该精简了”。当 AI 都开始劝你闭嘴的时候，你就知道自己真的过火了。

人的本能很自然：你想让模型知道一切，于是把所有东西都塞进系统提示、指令文件和上下文窗口。你试图通过“贴近”让模型无所不知。这行不通。你不可能通过更大声地喊叫让一个人变聪明，正确的方法是**在正确的时间给他正确的书**。

解决办法是缩减到大约 **200 行**：一个带编号的决策树 + 指向文档的指针。当模型需要归档内容时，它会走这个树：

- 是人？→ /people/ 目录
- 是公司？→ /companies/ 目录
- 是政策分析？→ /civic/ 目录
2 万行的知识，按需可用，完全不污染上下文窗口。

这个 200 行的文件就是 Resolver。它取代了 2 万行的指令，系统立刻变好：响应更快、归档更准确、幻觉更少。不是模型变聪明了，而是我不再用噪声把它弄瞎。

**那次误归档暴露了一切**

我让 Agent 摄入 Will Manidis 的文章《No New Deal for OpenAI》——一篇对 OpenAI 产业政策简报的毁灭性政策分析。它拆解了公司的监管策略、映射了政治影响、点名了机构参与者，是非常尖锐的公民分析。

Agent 把文章归档到了 sources/。

**错了**。sources/ 是用来放原始数据转储和批量导入的（CSV、API 导出、抓取的数据集）。这篇是政治分析，应该放在 civic/ 目录，那里才是政策文章、政治参与者和机构动态的家园。

为什么会发生？因为 idea-ingest 这个 Skill 硬编码了默认路径 brain/sources/。它没有咨询 Resolver，而是把自己的半吊子归档逻辑写死在 Skill 里。当没有明确路径时，它就默认扔进 sources/，就像懒惰的实习生把一切都丢进“杂项”文件夹。

一次误归档，我本可以改完就走。但我决定把线头拉到底。

**审计**

发现 Manidis 文章误归档后，我审计了所有会写入 brain 的 Skill。一共有 13 个：摄入文章、PDF、会议记录、视频、投资人更新、语音笔记、推文等。每条 Skill 都会往 brain 仓库写页面。

**只有 3 个**引用了 Resolver。

另外 10 个都有硬编码路径：idea-ingest 默认 sources/，PDF-ingest 默认 originals/，meeting-ingest 写到 meetings/……每个 Skill 都把自己的归档假设内化了，每个都是潜在的误归档炸弹。

这就是杀死 Agent 系统的模式。不是戏剧性崩溃，不是产生胡言乱语的幻觉，而是一种**缓慢、无声的漂移**：信息跑到错误的地方，连接无法形成，知识库逐渐变成一个有 14700 个文件的杂物抽屉，而不是结构化的智能层。

修复方法不是一个个修 10 个 Skill（那是打地鼠）。而是建立一个共享的 _brain-filing-rules.md 文件，并强制要求**每一个写入 brain 的 Skill 在创建页面前必须先读取 RESOLVER.md**。一条规则，修复了十个 Skill。

这个归档规则文档还记录了常见的误归档模式（sources vs originals、人 vs 公司、civic vs sources 等）。把每一次错误都文档化，这样同样的错误就不会以不同方式再次发生。

从那以后，**零误归档**。每一个新写的 brain 写入 Skill，顶部都有两行强制要求：

*在创建任何新的 brain 页面前，先读取 brain/RESOLVER.md 和 skills/_brain-filing-rules.md。按主要主题归档，而不是按来源格式或 Skill 名称。*

**隐形 Skill 问题**

上面的例子是关于 memory repo 的文件归档，但同样的逻辑也适用于 Skill 文件（胖 Skills）和要调用的代码。

Resolver 把任务路由到 Skill。但如果 Skill 存在，而 Resolver 不知道呢？

在 OpenClaw 里，我们在 executive assistant Skill 里构建了一个签名跟踪系统。它完美运行：跟踪 DocuSign 截止日期、显示未签名文件、起草提醒。工程上很漂亮，却完全隐形。

当有人问“check my signatures”或“我需要签什么”时，系统却毫无反应。因为 Resolver 里没有签名的触发器。Skill 存在、能力存在，但系统找不到它。就好像医院里有个外科医生，却没把他列入名录。

这比没有 Skill 还糟糕。没有 Skill，系统会诚实地说“我做不到”，你知道要去构建它。而一个存在却不可达的 Skill，会制造**能力幻觉**。你以为系统能处理签名，其实不能，直到关键时刻才发现。

经过一个月构建，我们有了 40+ 个 Skill。有些是针对特定事件创建的，有些是子 Agent 在 cron 里自动生成的。没人维护 Resolver 表。新 Skill 不断出生，却没有注册。系统拥有它自己都不知道的能力。

于是我构建了 **resolver trigger evals**：一个包含 50 个样本输入的测试套件，配上期望输出：

- 输入：“check my signatures” → 期望：executive-assistant（签名部分）
- 输入：“who is Pedro Franceschi” → 期望：brain-ops → gbrain search
- 输入：“save this article to brain” → 期望：idea-ingest + RESOLVER.md
两种失败模式：假阴性（该触发的没触发，触发描述错误或缺失）；假阳性（触发了错误的 Skill，两个触发重叠）。两者都可以通过编辑 Markdown 修复，无需改代码。Resolver 是个文档，文档改起来很便宜。

我告诉我的 Claw：“确保 Resolver 被测试，并且所有使用 Resolver 的 prompt 和 Skill 都有对应的 eval LLM 测试。”这不是可选的。如果你无法证明正确的 Skill 在正确输入时被触发，那你就不是拥有一个系统，而是一堆 Skill 加一句祈祷。

**元 Skill**

Trigger evals 能抓住路由失败。但还有更深的问题：有些 Skill 存在，却**完全没有路径**通向 Resolver——不是错的路径，是根本没有路径。

我在调试一个本该触发却没触发的 Skill 时，常规流程：检查触发描述、检查 Resolver 表、追踪链路。然后我意识到，没有系统性的方法来验证一个 Skill 是否可达。你只能一个一个查，无法批量检查。

于是我发明了 **check-resolvable**。这是一个元 Skill，它遍历整个链路（AGENTS.md → Skill 文件 → 代码），找出死链接。

我告诉 Agent：“检查 AGENTS.md 中的 Resolver 是否有一条直达这条正在运行的 Skill/Codepath 的路径。然后把这个记为 ‘check-resolvable’ Skill。该 Skill 应该实际检查这个 Skill 或 Codepath 是否被 Resolver 直接调用，或通过 Resolver 中的某物可调用。如果不是，就找出哪个可解析的 Skill 应该调用它。”

第一次运行就发现了 **6 个不可达 Skill**。系统构建了却无法访问的六项能力：一个没人能通过询问航班来调用的航班追踪器；一个只在 cron 运行却无法手动触发的内容创意生成器；一个存在于 skills 目录却完全没列入 Resolver 的引用修复器。

6 个，占 40+ 的 15%，是**暗能力**。

一小时内修复：只需在 AGENTS.md 里添加触发。现在 check-resolvable 每周运行。它相当于 Resolver 的 linter——在用户以惨痛方式发现前告诉你哪里坏了。

**上下文腐烂（Context Rot）**

关于 Resolver，有件事没人告诉你：**它们会腐烂**。

第 1 天：路由表完美，每项 Skill 都注册，触发准确，每条路径都能解析。你觉得自己是个天才。

第 30 天：出现了 3 个新 Skill，没人加到 Resolver 里。它们是子 Agent 凌晨 3 点根据真实需求建的，没人更新表。

第 60 天：有两个触发描述和用户实际的说法对不上。Skill 处理“track this flight”，但用户说“is my flight delayed?”。描述说一套，用户说另一套，Skill 不触发。

第 90 天：Resolver 变成了历史文档——记录的是系统**曾经**能做什么，而不是现在能做什么。

我注意到系统在漂移：Skill 越来越多地被直接指令调用（“read skills/flight-tracker/SKILL.md”），而不是通过 Resolver，因为 Resolver 没有正确的触发器。系统能工作，是因为**我知道**该调用哪个 Skill。那不是系统，那是**拿着文件柜的人**。

昨天在 YC 公司 office hours，一位 CTO 问我：“能不能用 RLM（强化学习模型？）来解决 Resolver 相关的上下文腐烂？”

想法是：一个强化学习循环，让系统观察每一次任务分发——哪个 Skill 触发了，哪个没触发，哪些任务没匹配，哪些匹配错了。然后定期（每晚或每周）根据观察到的证据重写 Resolver。不是人维护表格，而是表格自己维护自己。

一个月 800 次任务分发后，系统会看到“is my flight on time”从不触发 flight-tracker，但“check my flight”会，于是它重写触发描述。它会看到 pdf-ingest 触发了投资人更新邮件，但 investor-update-ingest 本该优先，于是调整优先级。

这还是前瞻性的，我们还没完全建成。Claude Code 的 AutoDream 系统（空闲时内存整合）是原始版本，它会回顾积累的上下文并压缩。把这个原则专门应用到 Resolver 上，你就得到一个**越用越好的路由表**。

一个能从自身流量中学习的 Resolver，这就是 Agent 治理的终局。

**Resolvers 是分形的**

还有一条原则，让一切都连贯起来。

**Resolvers 是可组合的**，它们存在于系统的每一层，而不只是顶层。

- Skill Resolver 位于 AGENTS.md：把任务类型映射到 Skill 文件。“Who is this person?” → brain-ops；“Ingest this PDF” → pdf-ingest；“Check my calendar” → google-calendar。
- Filing Resolver 位于 RESOLVER.md：把内容类型映射到目录。人 → people/；公司 → companies/；政策分析 → civic/。
- 每个 Skill 内部还有 Context Resolver：当 executive assistant Skill 触发时，它内部有自己的路由：邮件分类走一条路，日程安排走另一条，签名跟踪走第三条。
Claude Code 已经内置了这个模式。每个 Skill 都有 description 字段，模型根据用户意图自动匹配 Skill。你永远不用记住 /ship 存在，**description 本身就是 Resolver**。层层都是 Resolver。

相同的架构，在每一层。这就是为什么它能从 5 个 Skill 扩展到 50 个，从 1000 个文件到 25000 个，从玩具 demo 到每天处理 200 个输入的生产系统。

**事物的形状**

总结一下。

Resolver 是 200 行 Markdown，取代了 2 万行硬塞的上下文。它缺失时，Skill 就会发明自己的归档逻辑，一切慢慢退化。它存在但未测试时，能力会变暗——你有外科医生却找不到。它被测试但静态时，90 天内就会腐烂。它被测试且能自我修复时，系统就会复合增长。

模式：

- 在正确时刻加载正确上下文。不要硬塞。
- 强制每个 Skill 都咨询 Resolver。不要信任单个 Skill 的归档逻辑。
- 测试路由，而不仅仅是输出。Trigger evals。
- 审计可达性。Check-resolvable。每周一次。
- 让 Resolver 从自身流量中学习。终局目标。
Resolver 是 Agent 系统的**治理层**：交通警察、档案管理员、组织架构图、机构记忆，全都集中在一个模型 200 毫秒就能读完的文档里。

几乎没人明确构建它。大家还在把 2 万行塞进系统提示，然后奇怪为什么模型表现得比应有水平笨。模型不笨，它是被淹没了。给它一张路由表，看看会发生什么。

**我没意识到自己在构建的东西**

到目前为止，我把 Resolver 描述成一个技术模式：让 Agent 更好用、路由任务、加载正确上下文、避免淹没模型。

这个框架是对的，但太小了。

我真正构建的，更接近于**管理**。

想想一个有 40+ Skill 和 25000 个文件的真实系统。你拥有的不只是代码，而是一个**组织**。

Skill = 员工，每个都有能力。有些是专家，有些是通才，有些只跑 cron，有些面向用户。

Resolver = 组织架构图。它定义谁负责什么、任务如何路由、匹配失败时去哪里。它还是升级逻辑——一条路径失败时，下一步去哪。

归档规则 = 内部流程。信息放在哪里、决策如何记录、什么算“人” vs “公司” vs “政策分析”。没有它，你就没有知识库，只有杂物抽屉。

check-resolvable = 审计与合规。它不在乎代码漂不漂亮，只问一个简单问题：系统是否真的能做到它声称能做的事？是否存在存在却不可达的能力？

Trigger evals = 绩效评估。给定真实输入，组织的正确部分是否响应？如果没有，你不用重训模型，你修正描述、更新路由、让组织更清晰。

一旦用这个视角看，很多关于 Agent 的困惑就消失了。

问题不是模型不够聪明，而是我们一直在构建**没有管理层的组织**。只是一堆有才华的员工，加上“希望他们能协调好”的模糊祈祷。

**Resolvers 就是那个缺失的管理层**。

一旦这样看待它，目标就变了。你不再只是连工具，你是在设计一个能**成长、适应、长期保持一致性**的组织。

这是一个不同的问题，而且大得多。

**我希望你也构建自己的 Brain**

这篇文章里的一切——Resolver 模式、trigger evals、check-resolvable、归档规则、自愈循环——每天都在我的个人 Agent 上生产运行。它每天处理 200 个输入，有 25000 个文件，它在复合增长。

我把整个系统开源了。

我的开源项目 **GBrain** 内置了 Resolver 模式。gbrain init 会创建 RESOLVER.md、决策树和消歧规则。你的 Agent 从第一天就能正确归档。check-resolvable Skill 也内置。你不用通过摔东西来发现这些模式——系统已经把它们 embody 进去了。

**GStack** 是编码层，用 Markdown 写胖 Skills，已有 72,000+ GitHub stars。GStack 中的 Skill 会调用 GBrain 中的知识。两者合在一起就是完整的架构：智能随取随用。

OpenClaw 或 Hermes Agent 是指挥者——薄 Harness，运行 Agent 循环、管理会话、执行 cron。GBrain 和 GStack 是插进去的 Skills。你的 Agent 在回答前会先读取 GBrain 编译后的真相，你的 cron 在你睡觉时运行汇总管道。

这不是 SaaS 产品，而是一种**架构**。源码开源，Skills 是 Markdown，Brain 是一个你自己拥有的 Git 仓库。如果明天任何一部分消失了，你的知识依然以纯文本文件形式存活。

这是个人软件的新黎明。这不是封装好的软件，这是**你为自己构建的软件**——用胖 Skills、胖代码 + 薄 Harness 构成的你个人的迷你 AGI。

未来已经到来，我希望你把它装进口袋。

这个架构能写在一张索引卡上。知识装在一个 Git 仓库里。唯一缺少的，就是你开始行动。

**GBrain** —— 在 OpenClaw 或 Hermes Agent 中构建你的个人迷你 AGI

github.com/garrytan/gbrain

**GStack** —— 帮助你在 Claude Code 中更快构建

github.com/garrytan/gstack

（翻译完。这篇重点强调 Resolver 是 Agent 系统的“治理层”和“组织架构”，与前一篇高度互补。如需调整风格、加解释或对比两篇，请随时说。）
