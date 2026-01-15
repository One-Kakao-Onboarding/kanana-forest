"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"

interface Obstacle {
  id: number
  x: number
  y: number
  type: "note" | "disc"
}

interface MiniGameProps {
  onScoreChange?: (score: number) => void
}

export default function MiniGame({ onScoreChange }: MiniGameProps) {
  const [playerX, setPlayerX] = useState(50) // 0-100 percentage
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const obstacleIdRef = useRef(0)

  // Spawn obstacles
  useEffect(() => {
    if (gameOver) return

    const spawnInterval = setInterval(() => {
      const newObstacle: Obstacle = {
        id: obstacleIdRef.current++,
        x: Math.random() * 80 + 10, // 10-90%
        y: 0,
        type: Math.random() > 0.5 ? "note" : "disc",
      }
      setObstacles((prev) => [...prev, newObstacle])
    }, 800)

    return () => clearInterval(spawnInterval)
  }, [gameOver])

  // Move obstacles down
  useEffect(() => {
    if (gameOver) return

    const moveInterval = setInterval(() => {
      setObstacles((prev) => {
        // 먼저 모든 장애물 이동
        const moved = prev.map((obs) => ({ ...obs, y: obs.y + 3 }))

        // 화면 밖으로 나간 장애물 카운트 (점수용)
        const dodged = moved.filter((obs) => obs.y >= 100).length

        // 화면 안에 있는 장애물만 유지
        const updated = moved.filter((obs) => obs.y < 100)

        // Check collision
        const playerLeft = playerX - 10
        const playerRight = playerX + 10
        const playerTop = 75
        const playerBottom = 95

        for (const obs of updated) {
          const obsLeft = obs.x - 5
          const obsRight = obs.x + 5
          const obsTop = obs.y
          const obsBottom = obs.y + 10

          if (
            playerRight > obsLeft &&
            playerLeft < obsRight &&
            playerBottom > obsTop &&
            playerTop < obsBottom
          ) {
            setGameOver(true)
            return prev
          }
        }

        // Add score for dodged obstacles
        if (dodged > 0) {
          setScore((s) => s + dodged * 10)
        }

        return updated
      })
    }, 50)

    return () => clearInterval(moveInterval)
  }, [gameOver, playerX, onScoreChange])

  // Notify parent of score changes
  useEffect(() => {
    onScoreChange?.(score)
  }, [score, onScoreChange])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return
      if (e.key === "ArrowLeft") {
        setPlayerX((prev) => Math.max(10, prev - 8))
      } else if (e.key === "ArrowRight") {
        setPlayerX((prev) => Math.min(90, prev + 8))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameOver])

  // Touch controls
  const handleTouch = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (gameOver) return
      const gameArea = gameAreaRef.current
      if (!gameArea) return

      const rect = gameArea.getBoundingClientRect()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const x = ((clientX - rect.left) / rect.width) * 100
      setPlayerX(Math.max(10, Math.min(90, x)))
    },
    [gameOver]
  )

  const restartGame = () => {
    setGameOver(false)
    setScore(0)
    setObstacles([])
    setPlayerX(50)
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-xs font-bold text-primary">미니게임</span>
        <span className="text-xs font-bold text-foreground">점수: {score}</span>
      </div>

      <div
        ref={gameAreaRef}
        className="relative w-full h-48 bg-gradient-to-b from-primary/10 to-primary/5 rounded-2xl overflow-hidden border border-primary/20 cursor-pointer"
        onMouseMove={handleTouch}
        onTouchMove={handleTouch}
        onClick={handleTouch}
      >
        {/* Instructions */}
        {!gameOver && score === 0 && obstacles.length < 3 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground text-center animate-pulse">
              터치하거나 ← → 키로<br />마스코트를 움직여 피하세요!
            </p>
          </div>
        )}

        {/* Obstacles */}
        {obstacles.map((obs) => (
          <div
            key={obs.id}
            className="absolute w-6 h-6 transition-none"
            style={{
              left: `${obs.x}%`,
              top: `${obs.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {obs.type === "note" ? (
              <span className="text-xl">🎵</span>
            ) : (
              <span className="text-xl">💿</span>
            )}
          </div>
        ))}

        {/* Player (Mascot) */}
        <div
          className="absolute bottom-2 w-12 h-12 transition-all duration-75"
          style={{
            left: `${playerX}%`,
            transform: "translateX(-50%)",
          }}
        >
          <Image
            src="/mascot.png"
            alt="Player"
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-2xl">
            <p className="text-white font-bold mb-1">게임 오버!</p>
            <p className="text-white/80 text-sm mb-3">최종 점수: {score}</p>
            <button
              onClick={restartGame}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              다시하기
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        기다리는 동안 즐겨보세요!
      </p>
    </div>
  )
}
