"use client"

import { useEffect, useState, useCallback } from "react"

const GRID_SIZE = 5
const ITEMS = ["🎵", "🎶", "🎸", "🎹", "🎤"]

interface Position {
  row: number
  col: number
}

interface Match3GameProps {
  onScoreChange?: (score: number) => void
}

function createBoard(): string[][] {
  const board: string[][] = []
  for (let i = 0; i < GRID_SIZE; i++) {
    const row: string[] = []
    for (let j = 0; j < GRID_SIZE; j++) {
      row.push(ITEMS[Math.floor(Math.random() * ITEMS.length)])
    }
    board.push(row)
  }
  return board
}

function findMatches(board: string[][]): Position[][] {
  const matches: Position[][] = []

  // Check horizontal matches
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      if (
        board[row][col] === board[row][col + 1] &&
        board[row][col] === board[row][col + 2]
      ) {
        const match: Position[] = []
        let endCol = col
        while (endCol < GRID_SIZE && board[row][col] === board[row][endCol]) {
          match.push({ row, col: endCol })
          endCol++
        }
        matches.push(match)
        col = endCol - 1
      }
    }
  }

  // Check vertical matches
  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      if (
        board[row][col] === board[row + 1][col] &&
        board[row][col] === board[row + 2][col]
      ) {
        const match: Position[] = []
        let endRow = row
        while (endRow < GRID_SIZE && board[row][col] === board[endRow][col]) {
          match.push({ row: endRow, col })
          endRow++
        }
        matches.push(match)
        row = endRow - 1
      }
    }
  }

  return matches
}

function removeMatches(board: string[][], matches: Position[][]): string[][] {
  const newBoard = board.map((row) => [...row])
  const toRemove = new Set<string>()

  matches.forEach((match) => {
    match.forEach((pos) => {
      toRemove.add(`${pos.row},${pos.col}`)
    })
  })

  toRemove.forEach((key) => {
    const [row, col] = key.split(",").map(Number)
    newBoard[row][col] = ""
  })

  return newBoard
}

function dropItems(board: string[][]): string[][] {
  const newBoard = board.map((row) => [...row])

  for (let col = 0; col < GRID_SIZE; col++) {
    const column: string[] = []
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (newBoard[row][col] !== "") {
        column.push(newBoard[row][col])
      }
    }
    while (column.length < GRID_SIZE) {
      column.push(ITEMS[Math.floor(Math.random() * ITEMS.length)])
    }
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      newBoard[row][col] = column[GRID_SIZE - 1 - row]
    }
  }

  return newBoard
}

export default function Match3Game({ onScoreChange }: Match3GameProps) {
  const [board, setBoard] = useState<string[][]>(() => createBoard())
  const [selected, setSelected] = useState<Position | null>(null)
  const [score, setScore] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Notify parent of score changes
  useEffect(() => {
    onScoreChange?.(score)
  }, [score, onScoreChange])

  // Process matches after board changes
  useEffect(() => {
    if (isProcessing) return

    const matches = findMatches(board)
    if (matches.length > 0) {
      setIsProcessing(true)
      const points = matches.reduce((sum, match) => sum + match.length * 10, 0)

      setTimeout(() => {
        setBoard((prev) => {
          const afterRemove = removeMatches(prev, matches)
          return dropItems(afterRemove)
        })
        setScore((s) => s + points)
        setIsProcessing(false)
      }, 300)
    }
  }, [board, isProcessing])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (isProcessing) return

      if (!selected) {
        setSelected({ row, col })
        return
      }

      // Check if adjacent
      const isAdjacent =
        (Math.abs(selected.row - row) === 1 && selected.col === col) ||
        (Math.abs(selected.col - col) === 1 && selected.row === row)

      if (!isAdjacent) {
        setSelected({ row, col })
        return
      }

      // Swap
      setBoard((prev) => {
        const newBoard = prev.map((r) => [...r])
        const temp = newBoard[row][col]
        newBoard[row][col] = newBoard[selected.row][selected.col]
        newBoard[selected.row][selected.col] = temp

        // Check if swap creates a match
        const matches = findMatches(newBoard)
        if (matches.length === 0) {
          // Swap back if no match
          return prev
        }

        return newBoard
      })

      setSelected(null)
    },
    [selected, isProcessing]
  )

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-xs font-bold text-primary">3매치 게임</span>
        <span className="text-xs font-bold text-foreground">점수: {score}</span>
      </div>

      <div className="bg-gradient-to-b from-primary/10 to-primary/5 rounded-2xl p-3 border border-primary/20">
        <div className="grid grid-cols-5 gap-1">
          {board.map((row, rowIdx) =>
            row.map((item, colIdx) => (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                className={`aspect-square rounded-lg text-2xl flex items-center justify-center transition-all duration-150 ${
                  selected?.row === rowIdx && selected?.col === colIdx
                    ? "bg-primary/30 scale-110 ring-2 ring-primary"
                    : "bg-white/50 hover:bg-white/80 active:scale-95"
                }`}
              >
                {item}
              </button>
            ))
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        같은 아이콘 3개를 연결하세요!
      </p>
    </div>
  )
}
