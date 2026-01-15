# 카나나숲 프론트엔드

31팀 카나나숲의 프론트엔드 애플리케이션입니다.

## 기술 스택

- **프레임워크**: Next.js 16.0.10 (App Router)
- **언어**: TypeScript 5.9.3
- **UI 라이브러리**: React 19.2.0
- **스타일링**: Tailwind CSS 4.1.18
- **컴포넌트**: Radix UI, shadcn/ui
- **폼 관리**: React Hook Form + Zod
- **패키지 매니저**: pnpm 10.28.0

## 필수 요구사항

### 1. nvm (Node Version Manager)

Node.js 버전 관리를 위해 nvm이 필요합니다.

**설치 여부 확인:**
```bash
nvm --version
```

**설치 방법 (아직 설치하지 않은 경우):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

설치 후 터미널을 재시작하거나 다음 명령을 실행하세요:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 2. Node.js 20

이 프로젝트는 Node.js 20을 사용합니다 (.nvmrc 파일에 명시).

```bash
nvm install 20
nvm use
```

### 3. pnpm

pnpm은 Node.js 20에 포함된 corepack을 통해 설치합니다.

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 설치 및 실행

### 방법 1: 실행 스크립트 사용 (권장)

```bash
# 개발 서버 실행
./dev.sh

# 또는 처음 실행 시 권한 부여 후 실행
chmod +x dev.sh
./dev.sh
```

### 방법 2: 수동 실행

```bash
# nvm 로드 (새 터미널에서는 자동으로 로드됨)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Node.js 20 사용
nvm use

# 의존성 설치 (최초 1회)
pnpm install

# 개발 서버 실행
pnpm dev
```

## 사용 가능한 명령어

```bash
# 개발 서버 실행 (http://localhost:3000)
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행 (빌드 후)
pnpm start

# 린트 실행
pnpm lint
```

## 디렉토리 구조

```
frontend/
├── app/                    # Next.js App Router 페이지
├── components/             # 재사용 가능한 React 컴포넌트
├── hooks/                  # 커스텀 React 훅
├── lib/                    # 유틸리티 함수
├── public/                 # 정적 파일
├── styles/                 # 전역 스타일
├── next.config.mjs         # Next.js 설정
├── tsconfig.json           # TypeScript 설정
├── tailwind.config.js      # Tailwind CSS 설정
├── components.json         # shadcn/ui 설정
└── package.json            # 프로젝트 의존성
```

## 개발 환경 접속

개발 서버 실행 후 다음 URL에서 애플리케이션에 접속할 수 있습니다:

- Local: http://localhost:3000
- Network: http://[your-local-ip]:3000

## 문제 해결

### nvm: command not found

터미널을 재시작하거나 다음 명령을 실행하세요:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Node.js 버전이 맞지 않음

```bash
nvm use
```

### 의존성 설치 오류

```bash
# node_modules와 lock 파일 삭제 후 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 포트 3000이 이미 사용 중

```bash
# 다른 포트로 실행
PORT=3001 pnpm dev
```

## 참고 사항

- TypeScript 빌드 에러는 개발 중에는 무시됩니다 (next.config.mjs 설정)
- 이미지 최적화는 비활성화되어 있습니다
- Next.js 텔레메트리가 활성화되어 있습니다 (비활성화: `npx next telemetry disable`)
