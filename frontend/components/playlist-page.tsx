"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SlidersHorizontal, X, RotateCcw, Home, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { PlaylistData, MoodSliders } from "@/app/page"

interface PlaylistPageProps {
  data: PlaylistData
  originalImage: string
  onRegenerate: () => void
  onReset: () => void
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const MOOD_SLIDER_CONFIG = [
  {
    key: "hipToCalm" as keyof MoodSliders,
    leftLabel: "힙함",
    rightLabel: "잔잔함",
    description: "트렌디하고 세련된 느낌과 평화롭고 차분한 느낌 사이의 균형",
  },
  {
    key: "excitedToRelaxed" as keyof MoodSliders,
    leftLabel: "신나는",
    rightLabel: "차분한",
    description: "에너지 넘치는 분위기와 편안하게 이완되는 분위기",
  },
  {
    key: "warmToCold" as keyof MoodSliders,
    leftLabel: "따뜻한",
    rightLabel: "차가운",
    description: "포근하고 아늑한 온기와 시원하고 청량한 느낌",
  },
  {
    key: "brightToDark" as keyof MoodSliders,
    leftLabel: "밝은",
    rightLabel: "어두운",
    description: "환하고 경쾌한 톤과 깊고 무거운 톤",
  },
  {
    key: "dreamyToClear" as keyof MoodSliders,
    leftLabel: "몽환적인",
    rightLabel: "선명한",
    description: "흐릿하고 신비로운 느낌과 또렷하고 명확한 느낌",
  },
  {
    key: "minimalToRich" as keyof MoodSliders,
    leftLabel: "미니멀한",
    rightLabel: "풍성한",
    description: "단순하고 절제된 사운드와 레이어가 풍부한 사운드",
  },
]

export default function PlaylistPage({ data, originalImage, onRegenerate, onReset }: PlaylistPageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showTrackList, setShowTrackList] = useState(false)
  const [showMoodEditor, setShowMoodEditor] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [moodValues, setMoodValues] = useState<MoodSliders>(data.moodSliders)
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const images = [
    { type: "YouTube 썸네일", url: data.images[1]?.url },
    { type: "LP 커버", url: data.images[2]?.url },
    { type: "원본", url: originalImage },
  ]

  const progress = data.totalDuration > 0 ? (currentTime / data.totalDuration) * 100 : 0

  useEffect(() => {
    const trackIndex = data.tracks.findLastIndex((track) => currentTime >= track.startTime)
    if (trackIndex !== -1 && trackIndex !== currentTrackIndex) {
      setCurrentTrackIndex(trackIndex)
    }
  }, [currentTime, data.tracks, currentTrackIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [])

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handlePlayPauseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTrackClick = (index: number) => {
    const audio = audioRef.current
    if (!audio) return

    const track = data.tracks[index]
    audio.currentTime = track.startTime
    setCurrentTime(track.startTime)
    setCurrentTrackIndex(index)

    if (!isPlaying) {
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleProgressSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const progressBar = progressBarRef.current
    if (!audio || !progressBar || data.totalDuration === 0) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percentage * data.totalDuration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return // 마우스 왼쪽 버튼 드래그만 처리
    handleProgressSeek(e)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <audio ref={audioRef} src={data.audioUrl} preload="metadata" />

      <div
        className="sticky top-0 z-40 w-full aspect-video bg-card overflow-hidden group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <img
          src={images[currentImageIndex].url || "/placeholder.svg"}
          alt={images[currentImageIndex].type}
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
          }`}
        >
          {!isPlaying && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}

          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevImage()
            }}
            className="absolute left-3 w-10 h-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center z-10 pointer-events-auto hover:bg-background/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>

          <button
            onClick={handlePlayPauseClick}
            className="w-16 h-16 rounded-full bg-background/80 backdrop-blur flex items-center justify-center z-10 pointer-events-auto"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-foreground" fill="currentColor" />
            ) : (
              <Play className="w-7 h-7 text-foreground ml-1" fill="currentColor" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNextImage()
            }}
            className="absolute right-3 w-10 h-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center z-10 pointer-events-auto hover:bg-background/80 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {isPlaying && isHovering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrevImage()
              }}
              className="absolute left-3 w-10 h-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center z-10 pointer-events-auto hover:bg-background/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>

            <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
              <Pause className="w-7 h-7 text-foreground" fill="currentColor" />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNextImage()
              }}
              className="absolute right-3 w-10 h-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center z-10 pointer-events-auto hover:bg-background/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        )}

        <div
          ref={progressBarRef}
          className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/30 z-20 cursor-pointer group-hover:h-2 transition-all"
          onClick={handleProgressSeek}
          onMouseMove={handleProgressDrag}
        >
          <div className="h-full bg-red-600 relative transition-all" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/70 backdrop-blur pointer-events-none">
          <span className="text-xs text-foreground font-medium">{images[currentImageIndex].type}</span>
        </div>

        <div className="absolute bottom-3 right-3 flex gap-1.5 pointer-events-auto">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex(index)
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentImageIndex ? "bg-primary w-4" : "bg-foreground/50"
              }`}
            />
          ))}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onReset()
          }}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/60 backdrop-blur flex items-center justify-center pointer-events-auto"
        >
          <Home className="w-4 h-4 text-foreground" />
        </button>
      </div>

      <div className="flex-1 px-5 py-4 overflow-auto">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-foreground leading-tight flex-1 text-balance">{data.title}</h1>
          <Button
            variant="default"
            onClick={() => setShowMoodEditor(true)}
            className="shrink-0 rounded-full px-4 h-9 gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-sm font-medium">무드 조절</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {data.keywords.map((k) => (
            <span key={k.keyword} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
              #{k.keyword}
            </span>
          ))}
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-2">왜 이런 키워드가 나왔을까요?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.keywordExplanation}</p>
          </div>

          <div className="p-4 rounded-xl bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">플레이리스트</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
              {data.tracks.map((track, index) => (
                <button
                  key={index}
                  onClick={() => handleTrackClick(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentTrackIndex === index ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary/15 text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          currentTrackIndex === index ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(track.startTime)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pl-9 line-clamp-2">{track.reason}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showTrackList && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur">
          <div className="h-full flex flex-col">
            <header className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">트랙 목록</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTrackList(false)}>
                <X className="w-5 h-5" />
              </Button>
            </header>
            <div className="flex-1 overflow-auto px-5 py-4">
              <div className="space-y-2">
                {data.tracks.map((track, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleTrackClick(index)
                      setShowTrackList(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-secondary transition-colors text-left"
                  >
                    <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(track.startTime)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMoodEditor && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur">
          <div className="h-full flex flex-col">
            <header className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">무드 조절</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMoodEditor(false)}>
                <X className="w-5 h-5" />
              </Button>
            </header>
            <div className="flex-1 overflow-auto px-5 py-4">
              <p className="text-sm text-muted-foreground mb-6">
                슬라이더를 조절하여 원하는 무드를 설정하고 플레이리스트를 재생성할 수 있어요.
              </p>
              <div className="space-y-6">
                {MOOD_SLIDER_CONFIG.map((mood) => (
                  <div key={mood.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">{mood.leftLabel}</span>
                      <span className="text-sm font-medium text-primary">{mood.rightLabel}</span>
                    </div>
                    <Slider
                      value={[moodValues[mood.key]]}
                      onValueChange={(value) => setMoodValues((prev) => ({ ...prev, [mood.key]: value[0] }))}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{mood.description}</p>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-4">
                        {moodValues[mood.key]}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-border">
              <Button
                onClick={() => {
                  setShowMoodEditor(false)
                  onRegenerate()
                }}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                플레이리스트 재생성
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
