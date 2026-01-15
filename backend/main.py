import os
import json
import uuid
import asyncio
import re
from pathlib import Path
from typing import List

import google.generativeai as genai
import requests
import yt_dlp
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydub import AudioSegment
from dotenv import load_dotenv

# Cookie manager for YouTube
from cookie_manager import setup_browser_profile, refresh_cookies_if_needed

# Image generator
from image_generator import generate_playlist_images

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="AI Music Curator",
    description="이미지 기반 감성 분석 및 AI 음악 큐레이션 서비스",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Youtube-URLs", "X-Successful-URLs", "X-Failed-URLs", "X-Songs", "X-Emotions", "X-Reason"],
)

# Configure API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# Create temp directory
TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)


# Startup event - 서버 시작 시 브라우저 프로필 설정
@app.on_event("startup")
async def startup_event():
    print("[Startup] Setting up browser profile for YouTube...")
    try:
        success = await asyncio.to_thread(setup_browser_profile)
        if success:
            print("[Startup] Browser profile setup complete - logged in")
        else:
            print("[Startup] Browser profile setup complete - login failed or skipped")
    except Exception as e:
        print(f"[Startup] Browser profile setup failed: {str(e)}")


# Helper Functions
def parse_gemini_json(gemini_response: str, session_id: str = "") -> dict:
    """
    Gemini 응답에서 JSON을 안전하게 파싱
    """
    cleaned = gemini_response.strip()

    # Remove markdown code blocks
    if cleaned.startswith("```"):
        first_newline = cleaned.find('\n')
        if first_newline != -1:
            cleaned = cleaned[first_newline + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    # Find JSON object
    start_idx = cleaned.find('{')
    end_idx = cleaned.rfind('}') + 1

    if start_idx == -1 or end_idx <= start_idx:
        raise ValueError("No JSON object found in response")

    json_str = cleaned[start_idx:end_idx]

    # Multiple cleanup attempts
    cleanup_attempts = [
        # Attempt 1: Basic cleanup
        lambda s: s,
        # Attempt 2: Remove control characters and normalize whitespace
        lambda s: re.sub(r'\s+', ' ', re.sub(r'[\x00-\x1f\x7f]', ' ', s)),
        # Attempt 3: Remove trailing commas
        lambda s: re.sub(r',(\s*[}\]])', r'\1', s),
        # Attempt 4: Fix unescaped quotes in string values
        lambda s: re.sub(r':\s*"([^"]*?)\'([^"]*?)"', r': "\1\2"', s),
        # Attempt 5: Replace single quotes with double quotes (careful approach)
        lambda s: s.replace("'", '"') if "'" in s and s.count('"') < 10 else s,
    ]

    last_error = None
    current_str = json_str

    for i, cleanup in enumerate(cleanup_attempts):
        try:
            current_str = cleanup(current_str)
            result = json.loads(current_str)
            print(f"[{session_id}] JSON parsed successfully on attempt {i + 1}")
            return result
        except json.JSONDecodeError as e:
            last_error = e
            continue

    # Final attempt: Extract data manually using regex
    print(f"[{session_id}] Attempting manual regex extraction...")
    try:
        emotions = []
        playlist_title = ""
        reason = ""
        songs = []

        # Extract emotions
        emotions_match = re.search(r'"emotions"\s*:\s*\[([^\]]*)\]', json_str)
        if emotions_match:
            emotions_str = emotions_match.group(1)
            emotions = re.findall(r'"([^"]+)"', emotions_str)

        # Extract playlist_title
        title_match = re.search(r'"playlist_title"\s*:\s*"([^"]*)"', json_str)
        if title_match:
            playlist_title = title_match.group(1)

        # Extract reason
        reason_match = re.search(r'"reason"\s*:\s*"([^"]*(?:[^"\\]|\\.)*)"|"reason"\s*:\s*"([^"]*)"', json_str)
        if reason_match:
            reason = reason_match.group(1) or reason_match.group(2) or ""

        # Extract songs
        songs_match = re.search(r'"songs"\s*:\s*\[(.*?)\]', json_str, re.DOTALL)
        if songs_match:
            songs_str = songs_match.group(1)
            # Try pattern with reason first
            song_pattern_with_reason = r'\{\s*"title"\s*:\s*"([^"]*)"\s*,\s*"artist"\s*:\s*"([^"]*)"\s*,\s*"reason"\s*:\s*"([^"]*)"\s*\}'
            matches = list(re.finditer(song_pattern_with_reason, songs_str))
            if matches:
                for match in matches:
                    songs.append({"title": match.group(1), "artist": match.group(2), "reason": match.group(3)})
            else:
                # Fallback to pattern without reason
                song_pattern = r'\{\s*"title"\s*:\s*"([^"]*)"\s*,\s*"artist"\s*:\s*"([^"]*)"\s*\}'
                for match in re.finditer(song_pattern, songs_str):
                    songs.append({"title": match.group(1), "artist": match.group(2), "reason": ""})

        if songs:
            print(f"[{session_id}] Manual extraction succeeded: {len(songs)} songs found")
            return {"emotions": emotions, "playlist_title": playlist_title, "reason": reason, "songs": songs}
    except Exception as e:
        print(f"[{session_id}] Manual extraction failed: {str(e)}")

    raise last_error or ValueError("Failed to parse JSON after all attempts")


async def analyze_mood_with_gemini(image_path: str) -> dict:
    """
    Gemini를 사용하여 이미지의 음악적 감성 수치 분석 (1단계)
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = """[Role]
당신은 이미지를 음악적 감성 수치로 변환하는 '비주얼-뮤직 매퍼(Visual-Music Mapper)'입니다.

[Task]
업로드된 이미지를 보고 아래 6가지 카테고리에 대해 가장 두드러지는 특성을 하나씩 선택하고, 그 강도를 0%에서 100% 사이의 수치로 제시하세요.

[Category & Criteria]
- 에너지: 힙함(Trend, Beat) vs 잔잔함(Peaceful, Acoustic)
- 템포: 신나는(Fast, Upbeat) vs 차분한(Slow, Downbeat)
- 온도: 따뜻한(Warm, Analog) vs 차가운(Cold, Digital)
- 명도: 밝은(Bright, Major) vs 어두운(Dark, Minor)
- 분위기: 몽환적인(Dreamy, Blurred) vs 선명한(Clear, Sharp)
- 밀도: 미니멀한(Simple, Vocal-focus) vs 풍성한(Complex, Orchestral)

[Output Format]
반드시 아래 JSON 형식으로만 응답하세요:
{"mood": {"energy": {"selected": "힙함 또는 잔잔함", "intensity": 75}, "tempo": {"selected": "신나는 또는 차분한", "intensity": 60}, "temperature": {"selected": "따뜻한 또는 차가운", "intensity": 80}, "brightness": {"selected": "밝은 또는 어두운", "intensity": 70}, "atmosphere": {"selected": "몽환적인 또는 선명한", "intensity": 65}, "density": {"selected": "미니멀한 또는 풍성한", "intensity": 50}}, "analysis": "사진의 색감, 요소, 구도를 바탕으로 한 줄 분석"}

규칙:
- 다른 텍스트 없이 JSON만 반환
- 문자열 내에 따옴표 사용 금지"""

        img = await asyncio.to_thread(Image.open, image_path)

        response = await asyncio.to_thread(
            model.generate_content,
            [prompt, img]
        )

        return response.text.strip()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini mood analysis error: {str(e)}")


async def recommend_songs_with_gemini(mood_data: dict) -> str:
    """
    분석된 무드를 기반으로 곡 추천 (2단계)
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        mood_summary = json.dumps(mood_data, ensure_ascii=False)

        prompt = f"""[Role]
당신은 음악적 감성 데이터를 기반으로 완벽한 플레이리스트를 추천하는 '뮤직 큐레이터'입니다.

[Input - 이미지 분석 결과]
{mood_summary}

[Task]
위 감성 분석 결과를 바탕으로 어울리는 곡 3개를 추천하고, 플레이리스트의 제목을 지어주세요.

[Output Format]
반드시 아래 JSON 형식으로만 응답하세요:
{{"playlist_title": "감성을 담은 창의적인 플레이리스트 제목", "reason": "이 플레이리스트를 추천하는 이유 1-2문장", "songs": [{{"title": "노래제목1", "artist": "가수1", "reason": "이 곡을 선정한 이유 1문장"}}, {{"title": "노래제목2", "artist": "가수2", "reason": "이 곡을 선정한 이유 1문장"}}, {{"title": "노래제목3", "artist": "가수3", "reason": "이 곡을 선정한 이유 1문장"}}]}}

규칙:
- playlist_title은 이미지의 분위기를 반영한 감성적이고 창의적인 제목 (한국어)
- reason은 한국어로 작성
- songs는 정확히 3곡
- 각 곡의 reason은 해당 곡이 이미지 감성에 어울리는 구체적인 이유를 설명
- 다른 텍스트 없이 JSON만 반환
- 문자열 내에 따옴표 사용 금지
- 실제 존재하는 곡만 추천"""

        response = await asyncio.to_thread(
            model.generate_content,
            prompt
        )

        return response.text.strip()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini song recommendation error: {str(e)}")


async def download_audio_by_search(title: str, artist: str, output_path: str) -> bool:
    """
    yt-dlp를 사용하여 YouTube에서 노래를 검색해서 오디오 다운로드
    """
    from cookie_manager import get_cookie_file

    def get_ydl_opts():
        opts = {
            'format': 'ba/b/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': output_path,
            'quiet': False,
            'no_warnings': False,
            'ignoreerrors': False,
            'nocheckcertificate': True,
            'extract_flat': False,
            'ffmpeg_location': '/usr/bin/ffmpeg',
            'socket_timeout': 60,
            'retries': 3,
            'fragment_retries': 3,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            },
        }
        cookie_file = get_cookie_file()
        if cookie_file:
            opts['cookiefile'] = str(cookie_file)
        return opts

    # YouTube 검색 쿼리
    search_query = f"ytsearch1:{title} {artist} official audio"

    try:
        print(f"[yt-dlp] Searching: {search_query}")
        ydl_opts = get_ydl_opts()

        def download_search():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([search_query])

        await asyncio.to_thread(download_search)

        if os.path.exists(f"{output_path}.mp3"):
            print(f"[yt-dlp] Download succeeded: {title} by {artist}")
            return True
    except Exception as e:
        print(f"[yt-dlp] Search failed: {str(e)}")

    # 재시도: official 없이
    search_query_retry = f"ytsearch1:{title} {artist}"
    try:
        print(f"[yt-dlp] Retry search: {search_query_retry}")
        ydl_opts = get_ydl_opts()

        def download_retry():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([search_query_retry])

        await asyncio.to_thread(download_retry)

        if os.path.exists(f"{output_path}.mp3"):
            print(f"[yt-dlp] Retry succeeded: {title} by {artist}")
            return True
    except Exception as e:
        print(f"[yt-dlp] Retry failed: {str(e)}")

    return False


async def merge_audio_files(audio_files: List[str], output_path: str) -> str:
    """
    pydub를 사용하여 여러 오디오 파일을 하나로 병합
    """
    try:
        if not audio_files:
            raise ValueError("No audio files to merge")

        # Load first audio file
        combined = await asyncio.to_thread(AudioSegment.from_mp3, audio_files[0])

        # Append remaining files
        for audio_file in audio_files[1:]:
            audio = await asyncio.to_thread(AudioSegment.from_mp3, audio_file)
            combined += audio

        # Export merged audio
        await asyncio.to_thread(
            combined.export,
            output_path,
            format="mp3"
        )

        return output_path

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio merge error: {str(e)}")


def cleanup_files(file_paths: List[str]):
    """
    임시 파일들을 삭제
    """
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}: {str(e)}")


# API Endpoints
@app.get("/")
async def root():
    return {"message": "AI Music Curator API - 이미지 기반 음악 큐레이션 서비스"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/refresh-cookies")
async def refresh_cookies():
    """YouTube 브라우저 프로필 재설정 (로그인)"""
    try:
        success = await asyncio.to_thread(setup_browser_profile)
        if success:
            return {"status": "success", "message": "Browser profile refreshed and logged in"}
        else:
            return {"status": "partial", "message": "Browser profile created but login may have failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Browser profile refresh error: {str(e)}")


@app.post("/generate-playlist")
async def generate_playlist(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    이미지를 업로드하면 감성 분석 후 어울리는 음악을 찾아 병합하여 반환
    """
    session_id = str(uuid.uuid4())
    temp_files = []

    try:
        # 1. Save uploaded image
        image_path = TEMP_DIR / f"{session_id}_image.jpg"
        temp_files.append(str(image_path))

        with open(image_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 2. Step 1: Analyze mood with Gemini
        print(f"[{session_id}] Step 1: Analyzing mood with Gemini...")
        mood_response = await analyze_mood_with_gemini(str(image_path))
        print(f"[{session_id}] Mood response: {mood_response}")

        # Parse mood JSON response
        try:
            mood_data = parse_gemini_json(mood_response, session_id)
            mood = mood_data.get("mood", {})
            analysis = mood_data.get("analysis", "")
            print(f"[{session_id}] Mood: {mood}")
            print(f"[{session_id}] Analysis: {analysis}")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"[{session_id}] Raw mood response: {mood_response}")
            raise HTTPException(status_code=500, detail=f"Failed to parse mood response: {str(e)}")

        # 2.5. Generate playlist images (YouTube thumbnail + LP cover)
        print(f"[{session_id}] Step 2.5: Generating playlist images...")
        generated_images = await generate_playlist_images(
            mood_data=mood,
            analysis=analysis,
            session_id=session_id,
            output_dir=TEMP_DIR
        )
        # Note: Image files are NOT added to temp_files - they persist for download
        # They will be cleaned up separately or on server restart

        # 3. Step 2: Get song recommendations based on mood
        print(f"[{session_id}] Step 2: Getting song recommendations...")
        songs_response = await recommend_songs_with_gemini(mood_data)
        print(f"[{session_id}] Songs response: {songs_response}")

        # Parse songs JSON response
        try:
            songs_data = parse_gemini_json(songs_response, session_id)
            playlist_title = songs_data.get("playlist_title", "AI 큐레이션 플레이리스트")
            reason = songs_data.get("reason", "")
            songs = songs_data.get("songs", [])
            print(f"[{session_id}] Playlist Title: {playlist_title}")
            print(f"[{session_id}] Reason: {reason}")
            print(f"[{session_id}] Songs: {songs}")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"[{session_id}] Raw songs response: {songs_response}")
            raise HTTPException(status_code=500, detail=f"Failed to parse songs response: {str(e)}")

        # 4. Download audio from YouTube (직접 검색)
        print(f"[{session_id}] Step 3: Downloading audio files via YouTube search...")
        downloaded_files = []
        successful_songs = []
        failed_songs = []

        for idx, song in enumerate(songs):
            output_file = str(TEMP_DIR / f"{session_id}_audio_{idx}")
            temp_files.append(f"{output_file}.mp3")

            title = song.get('title', '')
            artist = song.get('artist', '')
            print(f"[{session_id}] Searching and downloading: {title} by {artist}")

            success = await download_audio_by_search(title, artist, output_file)
            if success and os.path.exists(f"{output_file}.mp3"):
                downloaded_files.append(f"{output_file}.mp3")
                successful_songs.append(song)
                print(f"[{session_id}] Successfully downloaded: {title} by {artist}")
            else:
                failed_songs.append(song)
                print(f"[{session_id}] Failed to download: {title} by {artist}")

        if not downloaded_files:
            raise HTTPException(status_code=500, detail="Failed to download any audio files")

        print(f"[{session_id}] Downloaded {len(downloaded_files)}/{len(songs)} audio files")

        # 5. Step 4: Merge audio files
        print(f"[{session_id}] Merging audio files...")
        merged_path = str(TEMP_DIR / f"playlist_{session_id}.mp3")

        await merge_audio_files(downloaded_files, merged_path)
        print(f"[{session_id}] Merge complete: {merged_path}")

        # 6. Cleanup individual audio files (keep merged file for download)
        background_tasks.add_task(cleanup_files, temp_files)

        # 7. Return JSON response with session_id for download
        # Build images response
        images_response = {}
        if generated_images.get("youtube"):
            images_response["youtube_thumbnail"] = f"/download/image/{session_id}?type=youtube"
        if generated_images.get("lp"):
            images_response["lp_cover"] = f"/download/image/{session_id}?type=lp"

        return {
            "success": True,
            "session_id": session_id,
            "playlist_title": playlist_title,
            "mood": mood,
            "analysis": analysis,
            "reason": reason,
            "songs": {
                "requested": songs,
                "downloaded": successful_songs,
                "failed": failed_songs
            },
            "download_url": f"/download/{session_id}",
            "images": images_response
        }

    except HTTPException:
        # Cleanup on error
        cleanup_files(temp_files)
        raise
    except Exception as e:
        # Cleanup on error
        cleanup_files(temp_files)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.get("/download/{session_id}")
async def download_playlist(session_id: str, background_tasks: BackgroundTasks):
    """
    생성된 플레이리스트 MP3 파일 다운로드
    """
    file_path = TEMP_DIR / f"playlist_{session_id}.mp3"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found or expired")

    # Schedule cleanup after download (10 seconds delay to ensure download completes)
    async def delayed_cleanup():
        import asyncio
        await asyncio.sleep(10)
        cleanup_files([str(file_path)])

    background_tasks.add_task(delayed_cleanup)

    return FileResponse(
        path=str(file_path),
        filename=f"playlist_{session_id}.mp3",
        media_type="audio/mpeg"
    )


@app.get("/download/image/{session_id}")
async def download_image(session_id: str, type: str, background_tasks: BackgroundTasks):
    """
    생성된 이미지 다운로드

    Args:
        session_id: 세션 ID
        type: 이미지 타입 ("youtube" 또는 "lp")
    """
    if type == "youtube":
        file_path = TEMP_DIR / f"{session_id}_youtube.png"
    elif type == "lp":
        file_path = TEMP_DIR / f"{session_id}_lp.png"
    else:
        raise HTTPException(status_code=400, detail="Invalid image type. Use 'youtube' or 'lp'")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found or expired")

    return FileResponse(
        path=str(file_path),
        filename=f"{type}_{session_id}.png",
        media_type="image/png"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
