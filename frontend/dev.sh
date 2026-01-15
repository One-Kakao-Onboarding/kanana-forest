#!/bin/bash

# Melon 프론트엔드 개발 서버 실행 스크립트

set -e  # 에러 발생 시 스크립트 중단

echo "🍈 Melon 프론트엔드 개발 서버 시작..."
echo ""

# nvm 로드
echo "📦 nvm 로드 중..."
export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    echo "✅ nvm 로드 완료"
else
    echo "❌ 오류: nvm이 설치되어 있지 않습니다."
    echo ""
    echo "nvm 설치 방법:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
    echo ""
    exit 1
fi

# Node.js 20 사용
echo ""
echo "🔧 Node.js 20 활성화 중..."
if nvm use 20 2>/dev/null; then
    echo "✅ Node.js $(node --version) 사용 중"
else
    echo "❌ 오류: Node.js 20이 설치되어 있지 않습니다."
    echo ""
    echo "Node.js 20 설치 방법:"
    echo "  nvm install 20"
    echo ""
    exit 1
fi

# pnpm 확인
echo ""
echo "📦 pnpm 확인 중..."
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm이 설치되어 있지 않습니다. corepack으로 설치 중..."
    corepack enable
    corepack prepare pnpm@latest --activate
    echo "✅ pnpm 설치 완료"
else
    echo "✅ pnpm $(pnpm --version) 사용 가능"
fi

# node_modules 확인
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 의존성이 설치되어 있지 않습니다. 설치 중..."
    pnpm install
    echo "✅ 의존성 설치 완료"
fi

# 개발 서버 실행
echo ""
echo "🚀 Melon 프론트엔드 개발 서버 실행 중..."
echo "   접속 주소: http://localhost:3000"
echo ""
echo "   종료하려면 Ctrl + C를 누르세요."
echo ""

pnpm dev
