"use client"

import { useEffect, useState, useRef } from "react"
import { Music } from "lucide-react"
import Image from "next/image"
import type { PlaylistData } from "@/app/page"
import MiniGame from "./mini-game"
import Match3Game from "./match3-game"
import JumpGame from "./jump-game"
import { generatePlaylist } from "@/lib/api"

type GameType = "dodge" | "match3" | "jump"

interface GeneratingPageProps {
  imageUrl: string
  onComplete: (data: PlaylistData) => void
}

const STEPS = [
  { id: 1, label: "색감을 분석하고 있어요", duration: 10000 },
  { id: 2, label: "무드 키워드를 추출하고 있어요", duration: 10000 },
  { id: 3, label: "어울리는 음악을 찾고 있어요", duration: 10000 },
  { id: 4, label: "커버 이미지를 생성하고 있어요", duration: 10000 },
  { id: 5, label: "플레이리스트를 완성하고 있어요", duration: 10000 },
]

// Mock data generator (API 실패시 폴백용)
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
  playlistReason:
    "비 오는 날의 잔잔한 분위기와 따뜻한 색감이 재즈 음악과 완벽하게 어울립니다. 차분한 피아노와 감성적인 보컬이 이 순간을 더욱 특별하게 만들어줄 거예요.",
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
  ],
  images: [
    { type: "original", url: "" },
    { type: "youtube", url: "/youtube-thumbnail-jazz-cafe-rainy-aesthetic.jpg" },
    { type: "lp", url: "/lp-vinyl-record-cover-jazz-minimalist.jpg" },
  ],
  audioUrl: "/playlist.mp3",
  totalDuration: 540,
  moodSliders: {
    hipToCalm: 75,
    excitedToRelaxed: 80,
    warmToCold: 30,
    brightToDark: 60,
    dreamyToClear: 65,
    minimalToRich: 45,
  },
})

function CuteMascot({ className = "" }: { className?: string }) {
  return <Image src="/mascot.png" alt="Pic-Tune 마스코트" width={112} height={112} className={className} />
}

export default function GeneratingPage({ imageUrl, onComplete }: GeneratingPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [gameScore, setGameScore] = useState(0)
  const [selectedGame, setSelectedGame] = useState<GameType>("dodge")
  const apiResultRef = useRef<PlaylistData | null>(null)
  const animationDoneRef = useRef(false)

  useEffect(() => {
    let stepIndex = 0
    let progressInterval: NodeJS.Timeout
    let isCancelled = false

    // API 호출 (애니메이션과 병렬로 실행)
    const callApi = async () => {
      try {
        console.log("Calling generatePlaylist API...")
        const result = await generatePlaylist(imageUrl)
        console.log("API result received:", result)
        apiResultRef.current = result
      } catch (error) {
        console.error("API call failed, using mock data:", error)
        // API 실패시 Mock 데이터 사용
        const mockData = generateMockPlaylistData()
        mockData.images[0].url = imageUrl
        apiResultRef.current = mockData
      }

      // API 완료 후, 애니메이션도 완료되었으면 onComplete 호출
      if (animationDoneRef.current && !isCancelled) {
        onComplete(apiResultRef.current!)
      }
    }

    // API 호출 시작
    callApi()

    // 애니메이션 실행
    const runStep = () => {
      if (stepIndex >= STEPS.length) {
        animationDoneRef.current = true
        // 애니메이션 완료 후, API도 완료되었으면 onComplete 호출
        if (apiResultRef.current && !isCancelled) {
          onComplete(apiResultRef.current)
        }
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
      isCancelled = true
      clearInterval(progressInterval)
    }
  }, [imageUrl, onComplete])

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 bg-background relative overflow-hidden">
      <div className="absolute top-10 right-0 w-64 h-64 bg-[#4d7cfe] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute bottom-20 left-0 w-56 h-56 bg-[#a855f7] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

      {/* Header */}
      <header className="flex items-center justify-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
            <Music className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-black text-primary">생성 중...</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-4">
        {/* Progress section */}
        <div className="w-full max-w-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#4d7cfe] to-[#a855f7] p-0.5 shadow-lg flex-shrink-0">
              <div className="w-full h-full rounded-[14px] overflow-hidden">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground font-bold animate-pulse mb-2">
                {STEPS[currentStep]?.label || "완료 중..."}
              </p>
              <div className="h-2 bg-secondary rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary to-[#4ade80] transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep ? "bg-primary shadow-md shadow-primary/50" : "bg-secondary"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Game Selection */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => { setSelectedGame("dodge"); setGameScore(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedGame === "dodge"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            🏃 피하기
          </button>
          <button
            onClick={() => { setSelectedGame("match3"); setGameScore(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedGame === "match3"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            🎵 3매치
          </button>
          <button
            onClick={() => { setSelectedGame("jump"); setGameScore(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedGame === "jump"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            🏃 점프
          </button>
        </div>

        {/* Mini Game */}
        {selectedGame === "dodge" && <MiniGame onScoreChange={setGameScore} />}
        {selectedGame === "match3" && <Match3Game onScoreChange={setGameScore} />}
        {selectedGame === "jump" && <JumpGame onScoreChange={setGameScore} />}
      </div>

      {/* Bottom text */}
      <p className="text-center text-xs text-muted-foreground relative z-10">
        {gameScore > 0 ? (
          <>현재 점수: <span className="font-bold text-primary">{gameScore}점</span> - 조금만 더 기다려주세요!</>
        ) : (
          <>사진의 분위기를 분석하여<br />최적의 플레이리스트를 만들고 있어요</>
        )}
      </p>
    </div>
  )
}
