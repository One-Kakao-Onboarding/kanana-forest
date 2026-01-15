# Python 3.11 slim 이미지 사용
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 Chromium, FFmpeg 설치
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    gnupg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 및 Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY main.py .
COPY cookie_manager.py .
COPY .env .

# temp 디렉토리 및 쿠키 디렉토리 생성
RUN mkdir -p temp /app/cookies

# 쿠키 파일 복사 (수동으로 추출한 YouTube 쿠키)
COPY cookies/cookies.txt /app/cookies/cookies.txt

# 포트 노출
EXPOSE 8000

# Health check 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Uvicorn으로 FastAPI 앱 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
