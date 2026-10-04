#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
LOCAL_NODE="$PWD/.runtime/node-v22.23.3-darwin-arm64/bin"
if [ -x "$LOCAL_NODE/node" ]; then
  export PATH="$LOCAL_NODE:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  printf '请安装 Node.js 22.18 或更新版本，再运行此启动文件。\nhttps://nodejs.org/\n'
  exit 1
fi
if [ ! -d node_modules ]; then
  npm ci --cache "$PWD/.runtime/npm-cache"
fi
printf '\n哈尔滨冬日城市：http://127.0.0.1:5173/\n按 Ctrl+C 停止预览。\n\n'
exec npm run dev
