"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Upload, ImageIcon, Music, Sparkles } from "lucide-react"

interface LandingPageProps {
  onImageUpload: (imageUrl: string) => void
}

export default function LandingPage({ onImageUpload }: LandingPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        onImageUpload(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Music className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Pic-Tune</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center relative z-10 mt-8">
        <div className="space-y-4 mb-10">
          <h1 className="text-3xl font-bold leading-tight text-foreground text-balance">
            사진 한 장으로
            <br />
            <span className="text-primary">나만의 플레이리스트</span>를
            <br />
            만들어보세요
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            AI가 사진의 분위기를 분석해
            <br />딱 맞는 음악을 추천해드려요
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`relative rounded-2xl border-2 transition-all duration-300 ${
            isDragging ? "border-primary bg-primary/20 shadow-lg shadow-primary/20" : "border-primary/50 bg-primary/5"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 flex flex-col items-center gap-4 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1">사진을 업로드하세요</p>
              <p className="text-muted-foreground text-xs">탭하거나 드래그하여 이미지 선택</p>
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="mt-10 space-y-3">
          <FeatureItem
            icon={<ImageIcon className="w-4 h-4" />}
            title="사진 분위기 분석"
            description="색감, 분위기, 감성을 AI가 분석해요"
          />
          <FeatureItem
            icon={<Sparkles className="w-4 h-4" />}
            title="맞춤 플레이리스트"
            description="10곡의 완벽한 플레이리스트를 생성해요"
          />
          <FeatureItem
            icon={<Music className="w-4 h-4" />}
            title="커버 이미지 제공"
            description="YouTube 썸네일, LP 커버를 제공해요"
          />
        </div>
      </section>
    </div>
  )
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50">
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
