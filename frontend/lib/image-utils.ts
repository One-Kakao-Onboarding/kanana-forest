/**
 * 이미지 리사이즈 유틸리티
 * 업로드 전 이미지를 목표 크기 이하로 압축
 */

// 상수 정의
const TARGET_SIZE_KB = 100
const MAX_DIMENSION = 1920
const MIN_DIMENSION = 800
const INITIAL_QUALITY = 0.9
const MIN_QUALITY = 0.5
const SCALE_FACTOR = 0.8
const BINARY_SEARCH_ITERATIONS = 6

/**
 * File을 HTMLImageElement로 로드
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url) // 메모리 누수 방지
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("이미지 로드 실패"))
    }

    img.src = url
  })
}

/**
 * Canvas에서 지정 품질로 JPEG DataURL 생성
 */
function canvasToDataURL(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality)
}

/**
 * DataURL의 대략적인 바이트 크기 계산
 * Base64 인코딩은 원본 대비 약 4/3 크기
 */
function getDataURLSize(dataURL: string): number {
  const base64 = dataURL.split(",")[1]
  if (!base64) return 0
  return Math.round((base64.length * 3) / 4)
}

/**
 * 이미지를 Canvas에 그리기 (리사이즈 포함)
 */
function drawImageToCanvas(
  img: HTMLImageElement,
  maxDimension: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Canvas context 생성 실패")
  }

  let { width, height } = img

  // 비율 유지하며 최대 크기 제한
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, 0, 0, width, height)

  return canvas
}

/**
 * 이진 탐색으로 목표 크기에 맞는 품질 찾기
 */
function findOptimalQuality(
  canvas: HTMLCanvasElement,
  targetSize: number
): { dataURL: string; quality: number; size: number } {
  let low = MIN_QUALITY
  let high = INITIAL_QUALITY
  let bestResult = { dataURL: "", quality: high, size: Infinity }

  for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i++) {
    const mid = (low + high) / 2
    const dataURL = canvasToDataURL(canvas, mid)
    const size = getDataURLSize(dataURL)

    if (size <= targetSize) {
      bestResult = { dataURL, quality: mid, size }
      low = mid // 품질 올려보기
    } else {
      high = mid // 품질 낮추기
    }
  }

  // 마지막으로 최적 품질로 생성
  if (bestResult.size > targetSize || bestResult.dataURL === "") {
    const dataURL = canvasToDataURL(canvas, MIN_QUALITY)
    bestResult = {
      dataURL,
      quality: MIN_QUALITY,
      size: getDataURLSize(dataURL),
    }
  }

  return bestResult
}

/**
 * File을 DataURL로 변환 (리사이즈 없이)
 */
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 메인 함수: 이미지를 목표 크기 이하로 리사이즈
 * @param file 원본 이미지 파일
 * @param targetSizeKB 목표 크기 (KB 단위, 기본값 100KB)
 * @returns 리사이즈된 이미지의 DataURL
 */
export async function resizeImageToTargetSize(
  file: File,
  targetSizeKB: number = TARGET_SIZE_KB
): Promise<string> {
  const targetSize = targetSizeKB * 1024

  // 원본이 이미 목표 크기 이하면 그대로 반환
  if (file.size <= targetSize) {
    return fileToDataURL(file)
  }

  // 이미지 로드
  const img = await loadImage(file)
  let currentMaxDimension = MAX_DIMENSION

  // 해상도를 줄여가며 시도
  while (currentMaxDimension >= MIN_DIMENSION) {
    const canvas = drawImageToCanvas(img, currentMaxDimension)
    const result = findOptimalQuality(canvas, targetSize)

    if (result.size <= targetSize) {
      return result.dataURL
    }

    // 해상도 축소
    currentMaxDimension = Math.round(currentMaxDimension * SCALE_FACTOR)
  }

  // 최소 해상도에서 최소 품질로 강제 반환 (fallback)
  const finalCanvas = drawImageToCanvas(img, MIN_DIMENSION)
  return canvasToDataURL(finalCanvas, MIN_QUALITY)
}
