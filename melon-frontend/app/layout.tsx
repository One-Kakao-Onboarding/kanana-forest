import type React from "react"
import type { Metadata, Viewport } from "next"
import { Noto_Sans_KR } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const notoSansKR = Noto_Sans_KR({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pic-Tune | 사진으로 만드는 플레이리스트",
  description: "사진의 분위기를 AI가 분석해, 나만의 플레이리스트를 즉시 생성해드립니다.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
