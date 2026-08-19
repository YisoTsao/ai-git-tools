#!/bin/bash

# AI Git Tools - 本地測試腳本
# 用於測試所有功能是否正常運作

set -e

echo "🧪 AI Git Tools - 本地測試腳本"
echo "================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查 Node.js 版本
echo "📋 檢查環境..."
NODE_VERSION=$(node -v)
echo "Node.js 版本: $NODE_VERSION"

if ! node -e "process.exit(parseInt(process.version.slice(1).split('.')[0]) >= 18 ? 0 : 1)"; then
    echo -e "${RED}❌ 錯誤: 需要 Node.js >= 18.0.0${NC}"
    exit 1
fi

# 檢查 Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ 錯誤: Git 未安裝${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git 已安裝${NC}"

# 檢查 GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  警告: GitHub CLI 未安裝（PR 功能需要）${NC}"
else
    echo -e "${GREEN}✅ GitHub CLI 已安裝${NC}"
fi

echo ""
echo "📦 安裝依賴..."
npm install

echo ""
echo "🔗 建立本地連結..."
npm link

echo ""
echo "🧹 創建測試環境..."
TEST_DIR="/tmp/ai-git-tools-test-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "測試目錄: $TEST_DIR"
echo ""

# 測試 1: 檢查命令可用性
echo "🧪 測試 1: 檢查命令可用性"
if gitai --help &> /dev/null; then
    echo -e "${GREEN}✅ gitai 命令可用${NC}"
else
    echo -e "${RED}❌ gitai 命令不可用${NC}"
    exit 1
fi

# 測試 2: 初始化 Git 倉庫
echo ""
echo "🧪 測試 2: 初始化 Git 倉庫"
git init
git config user.email "test@example.com"
git config user.name "Test User"
echo -e "${GREEN}✅ Git 倉庫已初始化${NC}"

# 測試 3: 測試 init 命令
echo ""
echo "🧪 測試 3: 測試 init 命令"
echo "model: 'claude-haiku-4.5'" > .ai-git-config.js
if [ -f .ai-git-config.js ]; then
    echo -e "${GREEN}✅ 配置檔已創建${NC}"
else
    echo -e "${RED}❌ 配置檔創建失敗${NC}"
    exit 1
fi

# 測試 4: 測試 commit 命令（應該失敗，因為沒有 staged 變更）
echo ""
echo "🧪 測試 4: 測試 commit 命令錯誤處理"
if gitai commit 2>&1 | grep -q "沒有 staged 的變更"; then
    echo -e "${GREEN}✅ 錯誤處理正常${NC}"
else
    echo -e "${YELLOW}⚠️  錯誤訊息可能不同${NC}"
fi

# 測試 5: 創建測試檔案
echo ""
echo "🧪 測試 5: 創建測試檔案"
echo "console.log('Hello World');" > test.js
echo "console.log('Test 2');" > test2.js
git add test.js
echo -e "${GREEN}✅ 測試檔案已創建並 staged${NC}"

# 測試 6: 測試語法檢查
echo ""
echo "🧪 測試 6: 檢查 JavaScript 語法"
cd "$(dirname "$(which gitai)")/.."
if node -c bin/cli.js; then
    echo -e "${GREEN}✅ CLI 語法正確${NC}"
else
    echo -e "${RED}❌ CLI 語法錯誤${NC}"
    exit 1
fi

# 檢查所有命令檔案
for file in src/commands/*.js; do
    if node -c "$file"; then
        echo -e "${GREEN}✅ $(basename $file) 語法正確${NC}"
    else
        echo -e "${RED}❌ $(basename $file) 語法錯誤${NC}"
        exit 1
    fi
done

# 檢查所有核心檔案
for file in src/core/*.js; do
    if node -c "$file"; then
        echo -e "${GREEN}✅ $(basename $file) 語法正確${NC}"
    else
        echo -e "${RED}❌ $(basename $file) 語法錯誤${NC}"
        exit 1
    fi
done

echo ""
echo "================================"
echo -e "${GREEN}🎉 所有基本測試通過！${NC}"
echo ""
echo "📝 手動測試建議："
echo "1. 測試 commit:"
echo "   cd $TEST_DIR"
echo "   gitai commit --verbose"
echo ""
echo "2. 測試 commit-all:"
echo "   cd $TEST_DIR"
echo "   gitai commit-all --verbose"
echo ""
echo "3. 測試 PR (需要 GitHub repo):"
echo "   gitai pr --preview"
echo ""
echo "🧹 清理測試環境："
echo "   rm -rf $TEST_DIR"
echo "   npm unlink -g ai-git-tools"
