"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"

interface Obstacle {
  id: number
  x: number
  type: "obstacle" | "coin"
}

interface JumpGameProps {
  onScoreChange?: (score: number) => void
}

export default function JumpGame({ onScoreChange }: JumpGameProps) {
  const [playerY, setPlayerY] = useState(0) // 0 = ground, positive = jumping
  const [isJumping, setIsJumping] = useState(false)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const obstacleIdRef = useRef(0)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const playerYRef = useRef(0) // 충돌 체크용 ref

  // Notify parent of score changes
  useEffect(() => {
    onScoreChange?.(score)
  }, [score, onScoreChange])

  // Jump mechanics
  const jump = useCallback(() => {
    if (isJumping || gameOver) return
    setIsJumping(true)

    let jumpHeight = 0
    const jumpUp = setInterval(() => {
      jumpHeight += 8
      setPlayerY(jumpHeight)
      playerYRef.current = jumpHeight
      if (jumpHeight >= 60) {
        clearInterval(jumpUp)
        // Fall down
        const fallDown = setInterval(() => {
          jumpHeight -= 6
          const newY = Math.max(0, jumpHeight)
          setPlayerY(newY)
          playerYRef.current = newY
          if (jumpHeight <= 0) {
            clearInterval(fallDown)
            setIsJumping(false)
            setPlayerY(0)
            playerYRef.current = 0
          }
        }, 30)
      }
    }, 30)
  }, [isJumping, gameOver])

  // Keyboard & touch controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp") {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [jump])

  // Spawn obstacles
  useEffect(() => {
    if (gameOver) return

    const spawnInterval = setInterval(() => {
      const isObstacle = Math.random() > 0.4 // 60% 장애물, 40% 코인
      const newObstacle: Obstacle = {
        id: obstacleIdRef.current++,
        x: 100,
        type: isObstacle ? "obstacle" : "coin",
      }
      setObstacles((prev) => [...prev, newObstacle])
    }, 1200)

    return () => clearInterval(spawnInterval)
  }, [gameOver])

  // Move obstacles & check collision
  useEffect(() => {
    if (gameOver) return

    const moveInterval = setInterval(() => {
      setObstacles((prev) => {
        const updated = prev
          .map((obs) => ({ ...obs, x: obs.x - 4 }))
          .filter((obs) => obs.x > -10)

        // Check collision
        for (const obs of updated) {
          if (obs.x > 5 && obs.x < 25) {
            if (obs.type === "obstacle") {
              // 장애물 충돌 체크 (점프 중이면 피함)
              if (playerYRef.current < 30) {
                setGameOver(true)
                return prev
              }
            } else if (obs.type === "coin") {
              // 코인 수집
              if (Math.abs(obs.x - 15) < 10) {
                setScore((s) => s + 15)
                return updated.filter((o) => o.id !== obs.id)
              }
            }
          }
        }

        // 장애물 통과 점수
        const passed = prev.filter(
          (obs) => obs.type === "obstacle" && obs.x >= 5 &&
          !updated.find((u) => u.id === obs.id && u.x >= 5)
        )
        if (passed.length > 0) {
          setScore((s) => s + passed.length * 10)
        }

        return updated
      })
    }, 50)

    return () => clearInterval(moveInterval)
  }, [gameOver])

  const restartGame = () => {
    setGameOver(false)
    setScore(0)
    setObstacles([])
    setPlayerY(0)
    setIsJumping(false)
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-xs font-bold text-primary">점프 게임</span>
        <span className="text-xs font-bold text-foreground">점수: {score}</span>
      </div>

      <div
        ref={gameAreaRef}
        onClick={jump}
        className="relative w-full h-40 bg-gradient-to-b from-sky-200 to-sky-100 rounded-2xl overflow-hidden border border-primary/20 cursor-pointer"
      >
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-green-600 to-green-500" />

        {/* Clouds */}
        <div className="absolute top-4 left-8 text-2xl opacity-60">☁️</div>
        <div className="absolute top-8 right-12 text-xl opacity-40">☁️</div>

        {/* Player */}
        <div
          className="absolute left-4 w-10 h-10 transition-all duration-75"
          style={{ bottom: `${32 + playerY}px` }}
        >
          <Image
            src="/mascot.png"
            alt="Player"
            width={40}
            height={40}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Obstacles & Coins */}
        {obstacles.map((obs) => (
          <div
            key={obs.id}
            className="absolute transition-none"
            style={{
              left: `${obs.x}%`,
              bottom: obs.type === "coin" ? "60px" : "32px",
            }}
          >
            {obs.type === "obstacle" ? (
              <span className="text-2xl">🌵</span>
            ) : (
              <span className="text-xl animate-pulse">🎵</span>
            )}
          </div>
        ))}

        {/* Instructions */}
        {!gameOver && score === 0 && obstacles.length < 2 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-gray-600 text-center animate-pulse bg-white/50 px-3 py-1 rounded-full">
              탭하거나 스페이스바로 점프!
            </p>
          </div>
        )}

        {/* Game Over */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <p className="text-white font-bold mb-1">게임 오버!</p>
            <p className="text-white/80 text-sm mb-3">점수: {score}</p>
            <button
              onClick={(e) => { e.stopPropagation(); restartGame(); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold"
            >
              다시하기
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        🌵 장애물을 피하고 🎵 음표를 모으세요!
      </p>
    </div>
  )
}
