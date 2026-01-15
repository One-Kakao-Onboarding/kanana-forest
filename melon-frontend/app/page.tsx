"use client"

import { useState } from "react"
import LandingPage from "@/components/landing-page"
import GeneratingPage from "@/components/generating-page"
import PlaylistPage from "@/components/playlist-page"

export type AppState = "landing" | "generating" | "playlist"

export interface MoodSliders {
  hipToCalm: number // 힙함 ↔ 잔잔함
  excitedToRelaxed: number // 신나는 ↔ 차분한
  warmToCold: number // 따뜻한 ↔ 차가운
  brightToDark: number // 밝은 ↔ 어두운
  dreamyToClear: number // 몽환적인 ↔ 선명한
  minimalToRich: number // 미니멀한 ↔ 풍성한
}

export interface PlaylistData {
  title: string
  keywords: { keyword: string; reason: string; value: number }[]
  tracks: { title: string; artist: string; reason: string; startTime: number }[]
  images: { type: string; url: string }[]
  keywordExplanation: string
  audioUrl: string
  totalDuration: number
  moodSliders: MoodSliders // 무드 슬라이더 값 추가
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null)

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl)
    setAppState("generating")
  }

  const handleGenerationComplete = (data: PlaylistData) => {
    setPlaylistData(data)
    setAppState("playlist")
  }

  const handleRegenerate = () => {
    setAppState("generating")
  }

  const handleReset = () => {
    setAppState("landing")
    setUploadedImage(null)
    setPlaylistData(null)
  }

  return (
    <main className="min-h-screen max-w-md mx-auto bg-background">
      {appState === "landing" && <LandingPage onImageUpload={handleImageUpload} />}
      {appState === "generating" && uploadedImage && (
        <GeneratingPage imageUrl={uploadedImage} onComplete={handleGenerationComplete} />
      )}
      {appState === "playlist" && playlistData && (
        <PlaylistPage
          data={playlistData}
          originalImage={uploadedImage!}
          onRegenerate={handleRegenerate}
          onReset={handleReset}
        />
      )}
    </main>
  )
}
