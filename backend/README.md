# AI Music Curator

이미지 기반 감성 분석 및 AI 음악 큐레이션/병합 서비스

## 프로젝트 개요

사용자가 이미지를 업로드하면, AI가 해당 이미지의 분위기를 분석하고, 어울리는 음악을 찾아 다운로드한 뒤, 하나의 오디오 파일로 합쳐서 반환하는 API입니다.

## 기술 스택

- **Framework:** FastAPI, Uvicorn
- **AI/LLM:**
  - Google Gemini (이미지 감성 분석)
  - Perplexity API (음악 검색)
- **Media Processing:**
  - yt-dlp (Youtube Audio Download)
  - pydub (Audio Merge)
  - FFmpeg (Audio Processing)

## 배포 방법

### 방법 1: Docker로 실행 (권장 - AWS 배포용)

Docker를 사용하면 FFmpeg와 모든 의존성이 자동으로 설치됩니다.

#### 1. 환경 변수 설정

`.env` 파일을 생성하고 API 키를 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

#### 2. Docker 이미지 빌드 및 실행

**Docker Compose 사용 (권장):**
```bash
docker-compose up -d
```

**Docker 직접 사용:**
```bash
# 이미지 빌드
docker build -t ai-music-curator .

# 컨테이너 실행
docker run -d \
  --name ai-music-curator \
  -p 8000:8000 \
  --env-file .env \
  ai-music-curator
```

#### 3. 로그 확인

```bash
docker-compose logs -f
# 또는
docker logs -f ai-music-curator
```

#### 4. 중지 및 삭제

```bash
# Docker Compose
docker-compose down

# Docker 직접
docker stop ai-music-curator
docker rm ai-music-curator
```

#### AWS EC2 배포

1. EC2 인스턴스에 Docker 설치
```bash
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user
```

2. 프로젝트 파일 업로드 (git clone 또는 scp)
```bash
git clone <your-repo-url>
cd hackerton
```

3. .env 파일 생성 후 API 키 입력

4. Docker 실행
```bash
docker build -t ai-music-curator .
docker run -d -p 8000:8000 --env-file .env --restart unless-stopped ai-music-curator
```

5. 보안 그룹에서 8000 포트 열기

### 방법 2: 로컬 설치 및 실행

#### 필수 요구사항

**1. FFmpeg 설치**

FFmpeg는 오디오/비디오 처리를 위해 반드시 필요합니다.

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
- [FFmpeg 공식 사이트](https://ffmpeg.org/download.html)에서 다운로드
- PATH 환경변수에 FFmpeg bin 폴더 추가

설치 확인:
```bash
ffmpeg -version
```

**2. Python 3.9 이상**
```bash
python3 --version
```

#### 설치 및 실행

### 1. 가상환경 생성 및 활성화

```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 API 키를 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 예시:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# YouTube 쿠키 추출용 Google 계정 (선택사항, 로그인이 필요한 콘텐츠 다운로드 시 필요)
GOOGLE_EMAIL=your_email@gmail.com
GOOGLE_PASSWORD=your_password
```

**API 키 발급 방법:**
- **Gemini API Key:** [Google AI Studio](https://makersuite.google.com/app/apikey)에서 발급
- **Perplexity API Key:** [Perplexity AI](https://www.perplexity.ai/)에서 발급

**YouTube 쿠키 설정 (선택사항):**

YouTube에서 로그인이 필요한 콘텐츠(연령 제한, 비공개 재생목록 등)를 다운로드하려면 Google 계정 정보가 필요합니다.

⚠️ **주의사항:**
- YouTube는 자동화된 요청에 대해 계정을 차단할 수 있습니다
- 가능하면 테스트용 계정을 사용하는 것을 권장합니다
- 2단계 인증(2FA)이 활성화된 경우 앱 비밀번호를 생성해야 합니다

자동 쿠키 추출은 서버 시작 시 자동으로 실행되며, incognito 모드에서 로그인하여 쿠키 rotation을 방지합니다.

쿠키를 수동으로 갱신하려면:
```bash
curl -X POST http://localhost:8000/refresh-cookies
```

### 4. 서버 실행

```bash
# 방법 1: Python으로 직접 실행
python main.py

# 방법 2: Uvicorn으로 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

서버가 실행되면 http://localhost:8000 에서 접속할 수 있습니다.

## API 문서

서버 실행 후 다음 URL에서 자동 생성된 API 문서를 확인할 수 있습니다:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## API 사용법

### Endpoint: `POST /generate-playlist`

이미지를 업로드하여 감성 분석 후 어울리는 음악 플레이리스트를 생성합니다.

#### Request

**Method:** `POST`

**URL:** `/generate-playlist`

**Content-Type:** `multipart/form-data`

**Body:**
- `file`: 이미지 파일 (JPEG, PNG 등)

#### cURL 예시

```bash
curl -X POST "http://localhost:8000/generate-playlist" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/image.jpg" \
  --output playlist.mp3
```

#### Python 예시

```python
import requests

url = "http://localhost:8000/generate-playlist"
files = {"file": open("image.jpg", "rb")}

response = requests.post(url, files=files)

if response.status_code == 200:
    with open("playlist.mp3", "wb") as f:
        f.write(response.content)
    print("플레이리스트가 생성되었습니다!")
else:
    print(f"오류: {response.json()}")
```

#### Response

**Success (200):**
- Content-Type: `audio/mpeg`
- Body: 병합된 MP3 파일

**Error (4xx/5xx):**
```json
{
  "detail": "Error message"
}
```

## 처리 과정

1. **이미지 분석 (Gemini):** 업로드된 이미지의 감성과 분위기를 분석하여 음악 검색 키워드 생성
2. **음악 검색 (Perplexity):** 분석된 키워드로 어울리는 유튜브 음악 URL 3개 검색
3. **오디오 다운로드 (yt-dlp):** 검색된 유튜브 영상에서 오디오만 MP3로 다운로드
4. **오디오 병합 (pydub):** 다운로드된 여러 음악 파일을 하나로 병합
5. **파일 반환:** 병합된 MP3 파일을 클라이언트에게 반환
6. **정리 (BackgroundTasks):** 임시 파일 자동 삭제

## 프로젝트 구조

```
hackerton/
├── main.py              # FastAPI 애플리케이션
├── requirements.txt     # Python 의존성
├── Dockerfile           # Docker 이미지 빌드 설정
├── docker-compose.yml   # Docker Compose 설정
├── .dockerignore        # Docker 빌드 시 제외 파일
├── .env                 # 환경 변수 (gitignore)
├── .env.example         # 환경 변수 예시
├── .gitignore          # Git 무시 파일
├── temp/               # 임시 파일 저장소 (자동 생성)
└── README.md           # 프로젝트 문서
```

## 기타 엔드포인트

- `GET /` - API 루트 (상태 확인)
- `GET /health` - 헬스 체크

## 에러 핸들링

- 유효하지 않은 유튜브 링크나 다운로드 실패 시 해당 곡은 건너뛰고 진행
- 모든 다운로드가 실패하면 500 에러 반환
- API 키가 없거나 잘못된 경우 서버 시작 시 에러 발생

## 주의사항

1. **Docker 사용 시:** FFmpeg는 자동으로 설치됩니다
2. **로컬 실행 시:** FFmpeg가 시스템에 반드시 설치되어 있어야 합니다
3. API 키는 절대 공개 저장소에 커밋하지 마세요 (`.env` 파일은 `.gitignore`에 포함됨)
4. 임시 파일은 자동으로 삭제되지만, 에러 발생 시 수동으로 `temp/` 폴더를 비워야 할 수 있습니다
5. 유튜브 다운로드는 시간이 오래 걸릴 수 있습니다 (네트워크 속도에 따라 다름)
6. Perplexity API는 무료 티어 제한이 있으니 주의하세요
7. **AWS 배포 시:** 보안 그룹에서 필요한 포트를 열어야 합니다

## 트러블슈팅

### FFmpeg 관련 오류
```
FileNotFoundError: [Errno 2] No such file or directory: 'ffmpeg'
```
→ FFmpeg가 설치되지 않았거나 PATH에 없습니다. 위의 FFmpeg 설치 섹션을 참고하세요.

### API 키 오류
```
ValueError: GEMINI_API_KEY not found in environment variables
```
→ `.env` 파일이 없거나 API 키가 올바르게 설정되지 않았습니다.

### 다운로드 실패
```
Failed to download any audio files
```
→ 유튜브 URL이 잘못되었거나, 네트워크 문제, 또는 yt-dlp 버전 문제일 수 있습니다.

### YouTube 쿠키 관련 오류

**연령 제한 또는 로그인 필요 오류:**
```
Sign in to confirm your age
ERROR: This video is age restricted
```
→ `.env` 파일에 `GOOGLE_EMAIL`과 `GOOGLE_PASSWORD`를 추가하고 서버를 재시작하세요.

**쿠키 Rotation 문제:**

YouTube는 보안을 위해 쿠키를 자동으로 rotate시킵니다. 이를 방지하기 위해:
1. 시스템은 자동으로 incognito 모드에서 로그인
2. `robots.txt`로 이동하여 쿠키 rotation 방지
3. 즉시 쿠키를 추출하고 세션 종료

자세한 내용: [yt-dlp FAQ - Exporting YouTube cookies](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#exporting-youtube-cookies)

**쿠키 수동 추출 (권장):**

자동 쿠키 추출이 작동하지 않을 경우, 수동으로 쿠키를 추출할 수 있습니다:

1. Private/Incognito 창을 열고 YouTube에 로그인
2. 같은 탭에서 `https://www.youtube.com/robots.txt`로 이동
3. 브라우저 익스텐션으로 쿠키 추출 (예: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc))
4. 추출한 쿠키 파일을 `/app/cookies/youtube_cookies.txt`에 저장 (Docker) 또는 프로젝트 루트에 저장
5. Private/Incognito 창을 즉시 닫음

**2FA(2단계 인증) 문제:**
```
Login verification failed - may require 2FA or CAPTCHA
```
→ Google 계정에서 [앱 비밀번호](https://myaccount.google.com/apppasswords)를 생성하고 `.env`의 `GOOGLE_PASSWORD`에 사용하세요.

## 라이선스

MIT License
