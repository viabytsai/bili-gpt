# Tingfeng Cai

**AI 产品/工程方向 · 校招** | Email: your.email@example.com | GitHub: github.com/yourname

---

## 教育背景

XX大学 · 计算机科学/软件工程 本科 · 20XX 年毕业

---

## 项目经历

### bili GPT — B站视频 AI 智能总结工具

*全栈独立开发 · 2026.06 – 2026.07*

**一句话定位**：面向B站长视频的AI内容效率工具，粘贴链接即可获得全局摘要+带时间戳的分段总结，帮助用户快速把握视频全貌并精准定位兴趣片段。

**技术栈**：`Python` `FastAPI` `React` `TypeScript` `Tailwind CSS` `OpenAI API` `bilibili-api`

**核心工作**：

- **产品设计**：独立撰写完整 PRD，涵盖功能需求、异常处理、非功能需求、技术架构，以用户视角定义产品边界和交互流程
- **双输出架构**：设计「全局摘要 + 分段总结」双模型调用方案，通过分体式 prompt 分别控制摘要粒度（100~200字结论导向）和段落划分（5~15自然段，每段含时间戳+标题+摘要），输出结构化 JSON
- **自定义提示词引擎**：支持用户自定义 prompt 模板，设计变量占位符机制（`{{subtitle_text}}`、`{{video_title}}`），运行时动态替换，满足不同场景的个性化需求
- **全链路异常处理**：覆盖 7 种字幕获取异常场景，设计分级错误提示（用户友好文案 + 可折叠技术详情），降低用户 debug 门槛
- **字幕凭证诊断工具**：开发逐步诊断端点（`/api/debug-subtitle`），从BV号解析→凭证验证→视频信息→播放器信息→字幕CDN下载，每步独立上报状态和详情

**技术亮点**：

- **第三方库Bug排查与绕过**：集成 `bilibili-api` 时发现字幕 CDN 下载返回 HTTP 403。通过逐层 traceback 定位到库内部 `ass.py:83` 创建 HTTP 请求时遗漏 cookie 透传，改为自行实现带凭证的 `httpx` 直接请求 CDN 解决
- **全流程内存操作**：字幕原文、大模型输入输出均不落盘，符合数据最小化原则
- **前后端分离**：FastAPI + React + Vite，代理解决本地跨域，独立启动脚本
- **配置持久化**：localStorage 存储 API Key 和凭证，支持 OpenAI 兼容格式的任意模型

**数据流**：

```
用户粘贴B站链接 → 前端校验格式 → FastAPI接收
  → bilibili-api 获取视频信息 + 字幕URL → httpx带cookie下载字幕JSON
  → prompt模板变量替换 → OpenAI API双调用
  → 摘要(str) + 分段(JSON) → 前端双卡片渲染
```

---

## 专业技能

- **语言**：Python, TypeScript, JavaScript, SQL
- **后端**：FastAPI, Pydantic, httpx, asyncio, uvicorn
- **前端**：React, Vite, Tailwind CSS, localStorage
- **AI/LLM**：OpenAI API, Prompt Engineering, 结构化输出（JSON mode）, Token 管理
- **工具链**：Git, npm/pip, Chrome DevTools
- **产品能力**：PRD撰写、用户场景分析、异常流程设计、交互原型

---

## 自我评价

- 具备全栈交付能力，能从 PRD 到代码独立完成完整的 AI 应用
- 注重产品体验细节：错误提示分级、加载状态反馈、降级策略设计
- 遇到技术阻塞不绕过，追到源码层定位根因并修复
- 关注 AI Native 产品方向，持续探索 LLM 在实际场景中的落地方式
