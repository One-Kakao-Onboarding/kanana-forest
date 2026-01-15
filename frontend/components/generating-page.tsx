"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { PlaylistData } from "@/app/page"

interface GeneratingPageProps {
  imageUrl: string
  onComplete: (data: PlaylistData) => void
}

const STEPS = [
  { id: 1, label: "색감을 분석하고 있어요", duration: 1500 },
  { id: 2, label: "무드 키워드를 추출하고 있어요", duration: 2000 },
  { id: 3, label: "어울리는 음악을 찾고 있어요", duration: 2500 },
  { id: 4, label: "커버 이미지를 생성하고 있어요", duration: 2000 },
  { id: 5, label: "플레이리스트를 완성하고 있어요", duration: 1500 },
]

// Mock data generator
const generateMockPlaylistData = (): PlaylistData => ({
  title: "비 오는 오후의 잔잔한 재즈",
  keywords: [
    { keyword: "잔잔한", reason: "부드러운 조명과 낮은 채도에서 느껴지는 차분함", value: 85 },
    { keyword: "감성적인", reason: "따뜻한 색감이 만드는 아늑한 분위기", value: 78 },
    { keyword: "몽환적인", reason: "흐릿한 배경과 부드러운 빛 번짐", value: 65 },
    { keyword: "따뜻한", reason: "오렌지/브라운 계열의 색온도", value: 72 },
    { keyword: "도시적인", reason: "창문 너머 보이는 도시 풍경", value: 55 },
  ],
  keywordExplanation:
    "이 사진은 전체적으로 따뜻한 색온도와 낮은 채도를 가지고 있어요. 창가의 부드러운 조명이 만드는 아늑한 분위기와 약간 흐릿한 배경이 몽환적인 느낌을 자아내요. 비 오는 날의 창가 카페에서 느낄 수 있는 잔잔하고 감성적인 무드가 느껴집니다.",
  tracks: [
    {
      title: "Autumn Leaves",
      artist: "Bill Evans",
      reason: "잔잔한 피아노 선율이 사진의 차분한 분위기와 어울려요",
      startTime: 0,
    },
    {
      title: "Blue in Green",
      artist: "Miles Davis",
      reason: "몽환적인 트럼펫이 흐릿한 배경의 느낌을 표현해요",
      startTime: 180,
    },
    {
      title: "My Funny Valentine",
      artist: "Chet Baker",
      reason: "따뜻하고 감성적인 보컬이 색온도와 매칭돼요",
      startTime: 360,
    },
    { title: "Take Five", artist: "Dave Brubeck", reason: "도시적인 세련됨이 느껴지는 리듬감", startTime: 540 },
    {
      title: "Round Midnight",
      artist: "Thelonious Monk",
      reason: "어두운 톤과 어울리는 밤 감성의 재즈",
      startTime: 720,
    },
    { title: "Misty", artist: "Erroll Garner", reason: "몽환적인 분위기의 클래식 재즈 넘버", startTime: 900 },
    {
      title: "Georgia On My Mind",
      artist: "Ray Charles",
      reason: "따뜻하고 향수적인 감성을 전달해요",
      startTime: 1080,
    },
    {
      title: "Summertime",
      artist: "Ella Fitzgerald",
      reason: "부드러운 보컬이 잔잔한 무드와 어울려요",
      startTime: 1260,
    },
    { title: "Body and Soul", artist: "John Coltrane", reason: "깊은 감성의 색소폰 연주", startTime: 1440 },
    { title: "The Girl from Ipanema", artist: "Stan Getz", reason: "가벼우면서도 감성적인 보사노바", startTime: 1620 },
  ],
  images: [
    { type: "original", url: "" },
    { type: "youtube", url: "/youtube-thumbnail-jazz-cafe-rainy-aesthetic.jpg" },
    { type: "lp", url: "/lp-vinyl-record-cover-jazz-minimalist.jpg" },
  ],
  audioUrl: "/playlist.mp3",
  totalDuration: 1800,
  moodSliders: {
    hipToCalm: 75,
    excitedToRelaxed: 80,
    warmToCold: 30,
    brightToDark: 60,
    dreamyToClear: 65,
    minimalToRich: 45,
  },
})

export default function GeneratingPage({ imageUrl, onComplete }: GeneratingPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let stepIndex = 0
    let progressInterval: NodeJS.Timeout

    const runStep = () => {
      if (stepIndex >= STEPS.length) {
        const mockData = generateMockPlaylistData()
        mockData.images[0].url = imageUrl
        onComplete(mockData)
        return
      }

      setCurrentStep(stepIndex)
      const stepDuration = STEPS[stepIndex].duration
      const incrementPercentage = 100 / STEPS.length / (stepDuration / 50)

      progressInterval = setInterval(() => {
        setProgress((prev) => {
          const targetProgress = ((stepIndex + 1) / STEPS.length) * 100
          if (prev >= targetProgress) {
            clearInterval(progressInterval)
            return prev
          }
          return Math.min(prev + incrementPercentage, targetProgress)
        })
      }, 50)

      setTimeout(() => {
        clearInterval(progressInterval)
        stepIndex++
        runStep()
      }, stepDuration)
    }

    runStep()

    return () => {
      clearInterval(progressInterval)
    }
  }, [imageUrl, onComplete])

  return (
    <div className="min-h-screen flex flex-col px-5 py-8">
      {/* Header */}
      <header className="flex items-center justify-center">
        <span className="text-lg font-bold text-foreground">플레이리스트 생성 중</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-72 h-72 mb-8">
          {/* LP 외곽 원반 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-2xl">
            {/* LP 그루브 라인들 */}
            <div className="absolute inset-2 rounded-full border border-zinc-700/30" />
            <div className="absolute inset-4 rounded-full border border-zinc-700/20" />
            <div className="absolute inset-6 rounded-full border border-zinc-700/30" />
            <div className="absolute inset-8 rounded-full border border-zinc-700/20" />
            <div className="absolute inset-10 rounded-full border border-zinc-700/30" />
            <div className="absolute inset-12 rounded-full border border-zinc-700/20" />
            <div className="absolute inset-14 rounded-full border border-zinc-700/30" />
            <div className="absolute inset-16 rounded-full border border-zinc-700/20" />
          </div>

          {/* 중앙 라벨 (업로드한 이미지) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-zinc-700 shadow-inner animate-[spin_4s_linear_infinite]">
              <img src={imageUrl || "/placeholder.svg"} alt="Uploaded" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* 중앙 홀 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-zinc-900 border-2 border-zinc-600" />
          </div>

          {/* 로딩 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-lg">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
          </div>

          {/* LP 반사광 효과 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
        </div>

        {/* Progress */}
        <div className="w-full max-w-xs space-y-4">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-center text-sm text-foreground font-medium animate-pulse">
            {STEPS[currentStep]?.label || "완료 중..."}
          </p>

          {/* Steps indicator */}
          <div className="flex justify-center gap-2 pt-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom text */}
      <p className="text-center text-xs text-muted-foreground">
        사진의 분위기를 분석하여
        <br />
        최적의 플레이리스트를 만들고 있어요
      </p>
    </div>
  )
}
