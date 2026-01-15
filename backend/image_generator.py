"""
Gemini 3 Pro Image Generation Module (Nano Banana Pro)

이미지 분석 결과를 바탕으로 YouTube 썸네일과 LP 커버 이미지를 생성합니다.
모델: gemini-3-pro-image-preview (Gemini 3 Pro Image)
"""

import os
import asyncio
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types


def get_genai_client() -> genai.Client:
    """Gemini API 클라이언트 생성"""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("gemini")
    if not api_key:
        raise ValueError("GEMINI_API_KEY or gemini not found in environment variables")
    return genai.Client(api_key=api_key)


def extract_mood_keywords(mood_data: dict) -> str:
    """mood 데이터에서 키워드 문자열 추출"""
    keywords = []
    for category, data in mood_data.items():
        if isinstance(data, dict) and "selected" in data:
            keywords.append(f"{data['selected']} ({data.get('intensity', 50)}%)")
    return ", ".join(keywords)


def load_image_as_part(image_path: str) -> types.Part:
    """이미지 파일을 Gemini API Part로 변환"""
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # 확장자로 mime type 결정
    ext = Path(image_path).suffix.lower()
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    mime_type = mime_types.get(ext, "image/png")

    return types.Part.from_bytes(data=image_bytes, mime_type=mime_type)


async def generate_youtube_thumbnail(
    mood_data: dict,
    analysis: str,
    session_id: str,
    output_dir: Path,
    image_path: Optional[str] = None
) -> Optional[str]:
    """
    YouTube 썸네일 이미지 생성 (16:9 비율)

    Args:
        mood_data: Gemini 무드 분석 결과
        analysis: 이미지 분석 텍스트
        session_id: 세션 ID
        output_dir: 출력 디렉토리
        image_path: 입력 이미지 경로 (선택사항)

    Returns:
        생성된 이미지 파일 경로 (실패시 None)
    """
    try:
        client = get_genai_client()
        keywords = extract_mood_keywords(mood_data)

        prompt = f"""Based on this provided image, create a cinematic 16:9 YouTube thumbnail for a music playlist.
Apply professional cinematic touch with a soft, slightly desaturated color grade and subtle film grain texture for a moody, calm atmosphere.
In the dead center, add the word "playlist" in an elegant, clean, understated white serif font.
Directly underneath the word "playlist", include a thin, horizontal music playback progress bar or a subtle audio waveform visualizer that matches the exact width of the text.
High quality, 4k resolution, photography style, evocative and eye-catching.
Keep the essence and character of the original image while applying these transformations."""

        # 이미지와 프롬프트를 함께 전달
        if image_path and Path(image_path).exists():
            image_part = load_image_as_part(image_path)
            contents = [image_part, prompt]
            print(f"[ImageGen] YouTube thumbnail: Using input image {image_path}")
        else:
            contents = prompt
            print(f"[ImageGen] YouTube thumbnail: No input image, generating from prompt only")

        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE']
            )
        )

        # 이미지 추출 및 저장
        output_path = output_dir / f"{session_id}_youtube.png"

        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image = part.inline_data
                # 이미지 데이터를 파일로 저장
                with open(output_path, "wb") as f:
                    f.write(image.data)
                print(f"[ImageGen] YouTube thumbnail saved: {output_path}")
                return str(output_path)

        print(f"[ImageGen] No image data in response for YouTube thumbnail")
        return None

    except Exception as e:
        print(f"[ImageGen] YouTube thumbnail generation failed: {str(e)}")
        return None


async def generate_lp_cover(
    mood_data: dict,
    analysis: str,
    session_id: str,
    output_dir: Path,
    image_path: Optional[str] = None
) -> Optional[str]:
    """
    LP 스타일 커버 이미지 생성 (1:1 비율)

    Args:
        mood_data: Gemini 무드 분석 결과
        analysis: 이미지 분석 텍스트
        session_id: 세션 ID
        output_dir: 출력 디렉토리
        image_path: 입력 이미지 경로 (선택사항)

    Returns:
        생성된 이미지 파일 경로 (실패시 None)
    """
    try:
        client = get_genai_client()
        keywords = extract_mood_keywords(mood_data)

        prompt = f"""[일러스트,앨범커버 변환 프롬프트] 
프롬프트:
제공된 사진을 바탕으로 따뜻하고 포근한 손그림 회화 스타일의 일러스트를 제작하고, 이를 상세한 바이닐(LP) 앨범 커버 목업에 적용해줘. 전체 이미지 비율은 16:9 와이드스크린이며, 배경은 완전한 순백색이다.

1. 일러스트레이션 스타일:

원본 사진의 구도와 피사체는 완벽하게 유지하되, 사진적인 질감은 완전히 제거한다.
붓 자국이 선명하게 느껴지는 두터운 유화 또는 아크릴 페인팅 질감으로 표현한다.
세부 디테일은 과감하게 단순화하고, 전체적인 형태와 따뜻한 분위기 위주로 묘사한다. 전체적인 사진의 밝기는  유지하고 사진의 색깔도 그대로 사용하되 부드럽고 온화하게 섞인 페인터리 톤(그림책이나 손그림 애니메이션 배경 느낌)으로 바꾼다. (지브리 스타일 모방 금지)

2. 상세 목업 구성 (핵심):

화면 중앙에 **정사각형의 바이닐 레코드 슬리브(커버)**가 위치한다. 슬리브는 약간 거친 무광 질감의 두꺼운 종이 재질로 표현되어야 한다.
이 슬리브의 앞면 전체에 위에서 제작한 회화 일러스트가 인쇄되어 있다.
슬리브의 오른쪽 측면 입구로 **검은색 바이닐 레코드(LP판)**가 미끄러져 나오고 있다.
레코드는 전체의 약 3분의 1(1/3) 정도만 슬리브 밖으로 노출되어 있어야 한다.
노출된 레코드 표면에는 동심원의 소리 골(groove) 디테일이 보여야 하며, 레코드 중앙에는 원형 종이 라벨이 붙어 있다.
이 중앙 원형 라벨에도 커버와 동일한 일러스트가 작게 크롭되어 들어가야 한다.
3. 레이아웃 및 배경:

이 모든 목업 구성 요소(슬리브와 빠져나온 레코드)는 아무런 무늬나 그림자가 없는 깨끗한 순백색(#FFFFFF) 배경 정중앙에 배치된다.
부드럽고 자연스러운 스튜디오 조명을 사용하여 입체감을 준다."""

        # 이미지와 프롬프트를 함께 전달
        if image_path and Path(image_path).exists():
            image_part = load_image_as_part(image_path)
            contents = [image_part, prompt]
            print(f"[ImageGen] LP cover: Using input image {image_path}")
        else:
            contents = prompt
            print(f"[ImageGen] LP cover: No input image, generating from prompt only")

        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE']
            )
        )

        # 이미지 추출 및 저장
        output_path = output_dir / f"{session_id}_lp.png"

        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image = part.inline_data
                # 이미지 데이터를 파일로 저장
                with open(output_path, "wb") as f:
                    f.write(image.data)
                print(f"[ImageGen] LP cover saved: {output_path}")
                return str(output_path)

        print(f"[ImageGen] No image data in response for LP cover")
        return None

    except Exception as e:
        print(f"[ImageGen] LP cover generation failed: {str(e)}")
        return None


async def generate_playlist_images(
    mood_data: dict,
    analysis: str,
    session_id: str,
    output_dir: Path,
    image_path: Optional[str] = None
) -> dict:
    """
    YouTube 썸네일과 LP 커버를 동시에 생성

    Args:
        mood_data: Gemini 무드 분석 결과
        analysis: 이미지 분석 텍스트
        session_id: 세션 ID
        output_dir: 출력 디렉토리
        image_path: 입력 이미지 경로 (선택사항)

    Returns:
        {"youtube": path_or_none, "lp": path_or_none}
    """
    print(f"[{session_id}] Starting image generation...")
    if image_path:
        print(f"[{session_id}] Input image: {image_path}")

    # 두 이미지를 병렬로 생성
    youtube_task = generate_youtube_thumbnail(mood_data, analysis, session_id, output_dir, image_path)
    lp_task = generate_lp_cover(mood_data, analysis, session_id, output_dir, image_path)

    youtube_path, lp_path = await asyncio.gather(youtube_task, lp_task)

    result = {
        "youtube": youtube_path,
        "lp": lp_path
    }

    print(f"[{session_id}] Image generation complete: youtube={youtube_path is not None}, lp={lp_path is not None}")
    return result
