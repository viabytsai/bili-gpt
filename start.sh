#!/bin/bash
# bili GPT 启动脚本

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================"
echo "  bili GPT 启动中..."
echo "================================"

# 启动后端
echo "[1/2] 启动后端 (port 8000)..."
cd "$SCRIPT_DIR/backend"
"$SCRIPT_DIR/.venv/bin/python3" -m uvicorn main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# 启动前端
echo "[2/2] 启动前端 (port 5173)..."
cd "$SCRIPT_DIR/frontend"
npx vite --host 127.0.0.1 &
FRONTEND_PID=$!

echo ""
echo "后端: http://127.0.0.1:8000"
echo "前端: http://127.0.0.1:5173"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获退出信号并清理进程
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "已停止"
    exit 0
}
trap cleanup INT TERM

# 等待子进程
wait
