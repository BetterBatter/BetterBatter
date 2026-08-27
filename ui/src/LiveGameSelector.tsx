import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, List, Users, X } from 'lucide-react'
import { teamAccentStyle } from './teamBrand'

export type GameStatus = 'live' | 'scheduled' | 'final'

export type LiveGameOption = {
  id: string
  status: GameStatus
  startTime: string
  awayCode: string
  awayName: string
  awayScore: number
  homeCode: string
  homeName: string
  homeScore: number
  inning: string
  outs: number
  venue: string
  participants: number
  unread: number
  batter: string
  batterNumber: number
  batterRecord: string
  pitcher: string
  pitcherNumber: number
  pitcherRecord: string
  playContext: string
  balls: number
  strikes: number
  occupiedBases: Array<'first' | 'second' | 'third'>
  delaySeconds: number
}

type LiveGameSelectorProps = {
  games: LiveGameOption[]
  selectedGameId: string
  onSelectGame: (gameId: string) => void
  label?: string
}

export function LiveGameSelector({ games, selectedGameId, onSelectGame, label = '오늘 경기' }: LiveGameSelectorProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? games[0]

  const closeSelector = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) summaryRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) closeSelector()
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [open])

  return (
    <details
      className="live-game-selector"
      ref={detailsRef}
      open={open}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          closeSelector(true)
        }
      }}
    >
      <summary ref={summaryRef} aria-expanded={open} aria-label={`${label} 선택, 현재 ${selectedGame.awayCode} 대 ${selectedGame.homeCode}`} onClick={(event) => { event.preventDefault(); setOpen((current) => !current) }}>
        <List size={15} />
        <span>{label}</span>
        <ChevronDown className="game-selector-chevron" size={16} />
      </summary>

      <button className="game-selector-backdrop" type="button" aria-label="경기 선택 닫기" onClick={() => closeSelector(true)} />

      <div className="live-game-selector-menu" aria-label="오늘 경기 목록">
        <header>
          <div><span><CalendarDays size={14} />TODAY · {games.length} GAMES</span><h2>오늘의 경기를 선택하세요</h2></div>
          <button type="button" aria-label="경기 선택 닫기" onClick={() => closeSelector(true)}><X size={17} /></button>
        </header>
        <div className="live-game-options">
          {games.map((game) => {
            const selected = game.id === selectedGame.id
            const statusLabel = game.status === 'live' ? game.inning : game.status === 'scheduled' ? game.startTime : '종료'
            const statusDescription = game.status === 'live' ? `${game.inning} 진행 중` : game.status === 'scheduled' ? `오늘 ${game.startTime} 예정` : '경기 종료'
            return (
              <button
                type="button"
                className={`${selected ? 'selected' : ''} status-${game.status}`}
                aria-pressed={selected}
                aria-label={`${game.awayName} 대 ${game.homeName}, ${statusDescription}`}
                onClick={() => {
                  onSelectGame(game.id)
                  closeSelector(true)
                }}
                key={game.id}
              >
                <span className={`game-option-status ${game.status}`}>{game.status === 'live' && <i />}{statusLabel}</span>
                <span className="game-option-score"><b style={teamAccentStyle(game.awayCode)}>{game.awayCode}</b><strong>{game.status === 'scheduled' ? <span className="game-option-versus">VS</span> : <>{game.awayScore} <em>—</em> {game.homeScore}</>}</strong><b style={teamAccentStyle(game.homeCode)}>{game.homeCode}</b></span>
                <span className="game-option-meta"><small>{game.venue}</small><small>{game.status === 'live' ? <><Users size={11} />{game.participants}명</> : game.status === 'scheduled' ? '경기 예정' : '경기 종료'}</small>{game.unread > 0 && <em>새 메시지 {game.unread}</em>}</span>
                <span className="game-option-check" aria-hidden="true">{selected && <Check size={14} />}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="visually-hidden" role="status">현재 선택된 경기: {selectedGame.awayName} 대 {selectedGame.homeName}, {selectedGame.status === 'live' ? selectedGame.inning : selectedGame.status === 'scheduled' ? `${selectedGame.startTime} 예정` : '종료'}</p>
    </details>
  )
}
