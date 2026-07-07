# 🎬 BiliGPT — AI 驱动的 B 站视频内容效率工具

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.119-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript" alt="TS">
  <img src="https://img.shields.io/badge/Tailwind-4.3-06B6D4?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

> 📌 粘贴 B 站视频链接，一键获得 **全局摘要** + **带时间戳的分段总结** + **思维导图**，帮你快速把握视频全貌并精准定位感兴趣的内容。

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📝 **全局摘要** | 100~200 字结论导向，快速判断视频价值 |
| 🔖 **分段总结** | 5~15 个自然段落，每段含时间戳 + 标题 + 摘要，点击可跳转播放 |
| 🧠 **思维导图** | 层级化知识结构，一眼看清视频脉络 |
| 🎛️ **自定义提示词** | 支持变量占位符 `{{subtitle_text}}` 和 `{{video_title}}`，按场景定制输出 |
| 🔐 **B 站扫码登录** | 内建二维码扫码登录，自动获取凭证，无需手动填 cookie |
| 🔧 **字幕诊断工具** | 逐步诊断端点 `/api/debug-subtitle`，从 BV 解析到 CDN 下载每步可观测 |
| 🛡️ **全链路异常处理** | 覆盖 7+ 种字幕获取异常，分级错误提示（用户友好文案 + 可折叠技术详情） |
| 💾 **配置持久化** | localStorage 存储 API Key 和凭证，支持 OpenAI 兼容格式的任意模型 |
| 📦 **前后端一体部署** | 前端构建产物由 FastAPI 直接托管，无需 Nginx |

---

## 🖼️ 界面预览

```
┌──────────────────────────────────────────────┐
│  BiliGPT                              ⚙️    │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐    │
│  │  粘贴 B 站视频链接...            🔍   │    │
│  └──────────────────────────────────────┘    │
│                                              │
│         📝 全局摘要    🔖 分段总结   🧠 思维导图  │
│  ┌──────────────────────────────────────┐    │
│  │  AI 生成的摘要 / 分段 / 脑图内容       │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 📋 环境要求

- **Python** 3.10+
- **Node.js** 18+
- **OpenAI 兼容 API Key**（支持 OpenAI / DeepSeek / 其他兼容模型）

### 🔧 本地开发

#### 1️⃣ 克隆项目

```bash
git clone https://github.com/viabytsai/bili-gpt.git
cd bili-gpt
```

#### 2️⃣ 安装后端依赖

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

#### 3️⃣ 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

#### 4️⃣ 一键启动

```bash
./start.sh
```

启动后访问：
- 🖥️ **前端页面**：http://127.0.0.1:5173
- 🔌 **后端 API**：http://127.0.0.1:8000
- 📖 **API 文档**：http://127.0.0.1:8000/docs

按 `Ctrl+C` 停止所有服务（或使用 `./stop.sh`）。

### ⚙️ 首次配置

1. 打开页面后点击右上角 ⚙️ 设置按钮
2. 填入你的 **API Key**（支持 OpenAI 兼容接口）
3. 可选：修改 Base URL 和模型名称（默认 `gpt-4o-mini`）
4. 可选：填入 B 站 SESSDATA 凭证，或使用 **扫码登录** 自动获取

---

## 📡 生产部署

```bash
# 默认端口 8000
./deploy.sh

# 自定义端口
./deploy.sh 8080

# 后台运行
nohup ./deploy.sh > biligpt.log 2>&1 &
```

部署后访问 `http://<服务器IP>:8000`，前端静态文件由 FastAPI 直接托管，无需 Nginx。

> 💡 部署前确保服务器防火墙已放行对应端口。详见 [DEPLOY.md](DEPLOY.md)。

---

## 🏗️ 技术架构

```
用户浏览器
    │
    ▼
┌─────────────────────────────────────────┐
│  FastAPI (uvicorn)                      │
│  ├─ /api/generate         生成摘要      │
│  ├─ /api/test-connection  测试 LLM 连接  │
│  ├─ /api/debug-subtitle   字幕诊断      │
│  ├─ /api/bilibili-login/* 扫码登录      │
│  └─ /*                    SPA 静态文件   │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐    ┌──────────────┐
│ B站 API  │    │  OpenAI API  │
│ 字幕获取  │    │  摘要/脑图    │
└──────────┘    └──────────────┘
```

### 📦 技术栈

| 层 | 技术 |
|----|------|
| 🎨 前端 | React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + Ant Design 6 + AntV G6 5 |
| 🔧 后端 | FastAPI + Pydantic + httpx + uvicorn |
| 🤖 AI | OpenAI 兼容 API（并行调用：摘要 + 分段 + 脑图） |
| 📺 B 站 | bilibili-api-python（视频信息 + 字幕 CDN 下载） |

### 🔄 数据流

```
粘贴 B 站链接 → 前端校验格式 → FastAPI 接收
  → bilibili-api 获取视频信息 + 字幕 URL
  → httpx 带 cookie 直接请求字幕 CDN（绕过开源库 bug）
  → prompt 模板变量替换 → OpenAI 三路并行调用
  → 摘要(str) + 分段(JSON) + 脑图(JSON) → 前端三栏渲染
```
---

## 📁 项目结构

```
bili-gpt/
├── backend/
│   ├── main.py              # FastAPI 入口，路由定义
│   ├── models.py            # Pydantic 数据模型
│   ├── prompts.py           # 默认提示词模板
│   ├── requirements.txt     # Python 依赖
│   └── services/
│       ├── llm.py           # LLM 调用（摘要/分段/脑图）
│       └── subtitle.py      # B站字幕获取
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # 主页面
│   │   ├── components/
│   │   │   ├── InputArea.tsx      # 链接输入区
│   │   │   ├── SummaryCard.tsx    # 摘要卡片
│   │   │   ├── SegmentList.tsx    # 分段列表
│   │   │   ├── MindMap.tsx        # 思维导图（G6）
│   │   │   ├── VideoPlayer.tsx    # B站播放器嵌入
│   │   │   ├── SettingsPanel.tsx  # 设置面板
│   │   │   ├── ProgressBar.tsx    # 进度指示
│   │   │   └── ErrorModal.tsx     # 错误弹窗
│   │   ├── services/api.ts       # 后端 API 调用
│   │   ├── hooks/useSettings.ts  # 设置持久化 hook
│   │   └── types.ts              # TypeScript 类型定义
│   ├── package.json
│   └── vite.config.ts
├── .venv/                   # Python 虚拟环境（gitignore）
├── start.sh                 # 开发环境启动脚本
├── stop.sh                  # 停止服务脚本
├── deploy.sh                # 生产部署脚本
└── DEPLOY.md                # 部署详细指南
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT © [viabytsai](https://github.com/viabytsai)

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/viabytsai">Tingfeng Cai</a></sub>
</p>
