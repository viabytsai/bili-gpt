#!/bin/bash
# BiliGPT 生产部署脚本
# 用法: ./deploy.sh [port]
# 默认端口: 8000

set -e

PORT="${1:-8000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================"
echo "  BiliGPT 生产部署"
echo "================================"

# 1. 构建前端
echo "[1/3] 构建前端..."
cd "$SCRIPT_DIR/frontend"
npm install --silent
npm run build

# 2. 安装后端依赖
echo "[2/3] 检查后端依赖..."
cd "$SCRIPT_DIR"
.venv/bin/pip install -r backend/requirements.txt -q

# 3. 启动生产服务
echo "[3/3] 启动服务 (端口 $PORT)..."
cd "$SCRIPT_DIR/backend"
../.venv/bin/python3 -m uvicorn main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 4 \
    --log-level info \
    --no-access-log

echo "服务已启动: http://0.0.0.0:$PORT"
