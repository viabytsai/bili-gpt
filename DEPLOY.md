# BiliGPT 部署指南

## 环境要求

- Python 3.10+
- Node.js 18+
- 操作系统：Linux / macOS

## 部署步骤

### 1. 打包上传

在本地打包项目（排除 `node_modules` 和 `.venv`）：

```bash
cd ~/Desktop
tar -czf bili-gpt.tar.gz \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='__pycache__' \
  'bili GPT'
```

上传到服务器：

```bash
scp bili-gpt.tar.gz user@<服务器IP>:/home/user/
```

### 2. 服务器安装依赖

```bash
ssh user@<服务器IP>
cd /home/user
tar -xzf bili-gpt.tar.gz
cd 'bili GPT'

# Python 虚拟环境
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
```

### 3. 一键部署

```bash
./deploy.sh
```

如需指定端口：

```bash
./deploy.sh 8080
```

### 4. 访问

```
http://<服务器IP>:8000
```

## 后台运行

```bash
nohup ./deploy.sh > biligpt.log 2>&1 &
```

查看日志：

```bash
tail -f biligpt.log
```

## 停止服务

```bash
pkill -f "uvicorn main:app"
```

## 架构说明

```
用户浏览器
    │
    ▼
┌─────────────────────────┐
│  FastAPI (uvicorn)      │
│  ├─ /api/*  后端接口      │
│  └─ /*      前端静态文件   │
│      ├─ index.html       │
│      └─ assets/*.js      │
└─────────────────────────┘
```

- 前后端同源部署，前端构建产物（`frontend/dist/`）由 FastAPI 直接托管
- 无需 Nginx，无需 Vite dev server
- 默认 4 个 worker 进程，支持一定并发

## 防火墙放行

如果服务器有防火墙，需要放行对应端口：

```bash
# ufw
sudo ufw allow 8000

# 或 firewalld
sudo firewall-cmd --add-port=8000/tcp --permanent
sudo firewall-cmd --reload

# 阿里云/腾讯云等需在控制台安全组中添加入站规则
```
