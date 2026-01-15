"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Upload, ImageIcon, Music, Sparkles } from "lucide-react"
import Image from "next/image"

interface LandingPageProps {
  onImageUpload: (imageUrl: string) => void
}

function CuteMascot({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/mascot.png"
      alt="Pic-Tune 마스코트"
      width={120}
      height={120}
      className={className}
      style={{ objectFit: "contain" }}
      unoptimized
    />
  )
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
    <div className="min-h-screen flex flex-col px-5 py-8 relative overflow-hidden bg-background">
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#4d7cfe] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-20 left-0 w-64 h-64 bg-[#a855f7] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute bottom-20 right-10 w-56 h-56 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000" />

      {/* Header */}
      <header className="relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Music className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-black text-primary">Pic-Tune</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center relative z-10 mt-8">
        <div className="flex justify-center mb-6">
          <CuteMascot className="w-28 h-28 drop-shadow-lg animate-bounce-cute" />
        </div>

        <div className="space-y-3 mb-8 text-center">
          <h1 className="text-2xl font-black leading-tight text-foreground text-balance">
            사진 한 장으로
            <br />
            <span className="text-primary">플레이리스트</span>를 만들어요
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            AI가 사진의 분위기를 분석해
            <br />딱 맞는 음악을 추천해드려요
          </p>
        </div>

        <div
          className={`relative rounded-3xl transition-all duration-300 p-[2px] ${
            isDragging
              ? "bg-gradient-to-r from-[#4d7cfe] via-primary to-[#a855f7] shadow-xl shadow-primary/30"
              : "bg-gradient-to-r from-[#4d7cfe]/50 via-primary/50 to-[#a855f7]/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="bg-background rounded-[22px]">
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
              <div className="relative">
                <div className="w-20 h-20 rounded-[28px] bg-primary flex items-center justify-center shadow-lg shadow-primary/40 rotate-3 transition-transform hover:rotate-0">
                  <Upload className="w-8 h-8 text-primary-foreground" />
                </div>
                {/* Decorative dots */}
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#fbbf24]" />
                <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-[#a855f7]" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-bold mb-1">사진을 업로드하세요</p>
                <p className="text-muted-foreground text-xs">탭하거나 드래그하여 이미지 선택</p>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <FeatureItem
            icon={<ImageIcon className="w-4 h-4" />}
            title="사진 분위기 분석"
            description="색감, 분위기, 감성을 AI가 분석해요"
            color="bg-[#4d7cfe]"
          />
          <FeatureItem
            icon={<Sparkles className="w-4 h-4" />}
            title="맞춤 플레이리스트"
            description="10곡의 완벽한 플레이리스트를 생성해요"
            color="bg-[#a855f7]"
          />
          <FeatureItem
            icon={<Music className="w-4 h-4" />}
            title="커버 이미지 제공"
            description="YouTube 썸네일, LP 커버를 제공해요"
            color="bg-primary"
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
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card hover:bg-secondary/50 transition-colors">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-md`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
