#!/bin/bash
echo "正在停止 BiliGPT..."
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "vite" 2>/dev/null
echo "已停止"
