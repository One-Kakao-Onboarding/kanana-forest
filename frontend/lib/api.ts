/**
 * API 호출 및 데이터 변환 유틸리티
 */

import type { PlaylistData, MoodSliders } from "@/app/page"

// API Base URL - 환경에 따라 변경
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://ec2-43-207-157-99.ap-northeast-1.compute.amazonaws.com:8000"

/**
 * API 응답 타입 정의
 */
interface ApiMoodItem {
  selected: string
  intensity: number
}

interface ApiMood {
  energy: ApiMoodItem
  tempo: ApiMoodItem
  temperature: ApiMoodItem
  brightness: ApiMoodItem
  atmosphere: ApiMoodItem
  density: ApiMoodItem
}

interface ApiSong {
  title: string
  artist: string
  reason?: string
  duration_ms?: number
  duration_sec?: number
  start_time_ms?: number
  start_time_sec?: number
}

interface ApiResponse {
  success: boolean
  session_id: string
  playlist_title?: string
  mood: ApiMood
  analysis: string
  reason: string
  total_duration?: {
    ms: number
    sec: number
  }
  songs: {
    requested: ApiSong[]
    downloaded: ApiSong[]
    failed: ApiSong[]
  }
  download_url: string
  images?: {
    youtube_thumbnail?: string
    lp_cover?: string
  }
}

/**
 * 무드 카테고리 이름 매핑
 */
const CATEGORY_NAMES: Record<string, string> = {
  energy: "에너지 분석",
  tempo: "템포 분석",
  temperature: "온도 분석",
  brightness: "명도 분석",
  atmosphere: "분위기 분석",
  density: "밀도 분석",
}

/**
 * API 무드 데이터를 프론트엔드 키워드 배열로 변환
 */
function transformMoodToKeywords(mood: ApiMood): { keyword: string; reason: string; value: number }[] {
  return Object.entries(mood).map(([key, value]) => ({
    keyword: value.selected,
    reason: CATEGORY_NAMES[key] || key,
    value: value.intensity,
  }))
}

/**
 * API 무드 데이터를 프론트엔드 MoodSliders로 변환
 *
 * Frontend MoodSliders는 양방향 스케일:
 * - 0: 좌측 값 (힙함, 신나는, 따뜻한, 밝은, 몽환적인, 미니멀한)
 * - 100: 우측 값 (잔잔함, 차분한, 차가운, 어두운, 선명한, 풍성한)
 */
function transformMoodToSliders(mood: ApiMood): MoodSliders {
  return {
    // energy: 힙함(0) ↔ 잔잔함(100)
    hipToCalm: mood.energy.selected === "잔잔함" ? mood.energy.intensity : 100 - mood.energy.intensity,
    // tempo: 신나는(0) ↔ 차분한(100)
    excitedToRelaxed: mood.tempo.selected === "차분한" ? mood.tempo.intensity : 100 - mood.tempo.intensity,
    // temperature: 따뜻한(0) ↔ 차가운(100)
    warmToCold: mood.temperature.selected === "차가운" ? mood.temperature.intensity : 100 - mood.temperature.intensity,
    // brightness: 밝은(0) ↔ 어두운(100)
    brightToDark: mood.brightness.selected === "어두운" ? mood.brightness.intensity : 100 - mood.brightness.intensity,
    // atmosphere: 몽환적인(0) ↔ 선명한(100)
    dreamyToClear: mood.atmosphere.selected === "선명한" ? mood.atmosphere.intensity : 100 - mood.atmosphere.intensity,
    // density: 미니멀한(0) ↔ 풍성한(100)
    minimalToRich: mood.density.selected === "풍성한" ? mood.density.intensity : 100 - mood.density.intensity,
  }
}

/**
 * API 응답을 프론트엔드 PlaylistData로 변환
 */
function transformApiResponseToPlaylistData(
  apiResponse: ApiResponse,
  originalImageUrl: string
): PlaylistData {
  const songs = apiResponse.songs.downloaded.length > 0
    ? apiResponse.songs.downloaded
    : apiResponse.songs.requested

  // 트랙 시작 시간: API에서 제공하는 실제 값 사용 (fallback: 균등 분배)
  const defaultTrackDuration = 180 // fallback용 기본값
  const tracks = songs.map((song, index) => ({
    title: song.title,
    artist: song.artist,
    reason: song.reason || "이 분위기에 어울리는 곡입니다",
    startTime: song.start_time_sec ?? index * defaultTrackDuration,
  }))

  // 이미지 배열 생성
  const images = [
    { type: "original", url: originalImageUrl },
  ]

  if (apiResponse.images?.youtube_thumbnail) {
    images.push({
      type: "youtube",
      url: `${API_BASE_URL}${apiResponse.images.youtube_thumbnail}`
    })
  }

  if (apiResponse.images?.lp_cover) {
    images.push({
      type: "lp",
      url: `${API_BASE_URL}${apiResponse.images.lp_cover}`
    })
  }

  // 전체 재생 시간: API에서 제공하는 실제 값 사용 (fallback: 트랙 수 * 기본값)
  const totalDuration = apiResponse.total_duration?.sec ?? tracks.length * defaultTrackDuration

  return {
    title: apiResponse.playlist_title || "나만의 플레이리스트",
    keywords: transformMoodToKeywords(apiResponse.mood),
    keywordExplanation: apiResponse.analysis,
    playlistReason: apiResponse.reason,
    tracks,
    images,
    audioUrl: `${API_BASE_URL}${apiResponse.download_url}`,
    totalDuration,
    moodSliders: transformMoodToSliders(apiResponse.mood),
  }
}

/**
 * Base64 데이터 URL을 Blob으로 변환
 */
function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * 플레이리스트 생성 API 호출
 */
export async function generatePlaylist(imageDataUrl: string): Promise<PlaylistData> {
  // Base64 데이터 URL을 Blob으로 변환
  const imageBlob = dataURLToBlob(imageDataUrl)

  // FormData 생성
  const formData = new FormData()
  formData.append("file", imageBlob, "image.png")

  // API 호출
  const response = await fetch(`${API_BASE_URL}/generate-playlist`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Error: ${response.status} - ${errorText}`)
  }

  const apiResponse: ApiResponse = await response.json()

  if (!apiResponse.success) {
    throw new Error("플레이리스트 생성에 실패했습니다")
  }

  // API 응답을 프론트엔드 형식으로 변환
  return transformApiResponseToPlaylistData(apiResponse, imageDataUrl)
}

/**
 * API 상태 확인 (헬스 체크)
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}
