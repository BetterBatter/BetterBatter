import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  Coins,
  History,
  LogOut,
  MessageCircle,
  Radio,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'
import {
  mdiBaseball,
  mdiBaseballBat,
  mdiBaseballDiamondOutline,
  mdiTrophyVariant,
} from '@mdi/js'
import {
  AdminPage,
  AuthDialog,
  CommunityPage,
  DEFAULT_FAVORITE_TEAM_CODE,
  DEFAULT_DISPLAYED_ACHIEVEMENT_IDS,
  LiveGameChat,
  NotificationPanel,
  ProfilePage,
  RankingsPage,
  TEAM_OPTIONS,
  teamByCode,
  type AchievementId,
  type ProfileTab,
  type TeamCode,
} from './CommunityViews'
import { DEFAULT_PROFILE_IMAGE, UserAvatar } from './UserAvatar'
import { LiveGameSelector, type LiveGameOption } from './LiveGameSelector'
import { PredictionHistoryContent, type PredictionHistoryItem } from './PredictionHistory'
import { teamAccentStyle, teamBadgeStyle } from './teamBrand'

type Side = 'yes' | 'no'
type MarketStatus = 'open' | 'closing' | 'settled'
type MarketTone = 'blue' | 'coral' | 'gold' | 'green'
type QuestionEmphasis = 'subject' | 'context' | 'outcome'
type PositionTone = 'live' | 'settled'
type PositionFilter = 'all' | PositionTone

const PROFILE_TAB_PATHS: Record<ProfileTab, string> = {
  overview: '/mypage',
  activity: '/mypage/activity',
  badges: '/mypage/achievements',
  settings: '/mypage/settings',
}

function profileTabFromPath(pathname: string): ProfileTab {
  if (pathname.startsWith('/mypage/activity')) return 'activity'
  if (pathname.startsWith('/mypage/achievements')) return 'badges'
  if (pathname.startsWith('/mypage/settings')) return 'settings'
  return 'overview'
}

type QuestionPart = {
  text: string
  emphasis?: QuestionEmphasis
}

type Market = {
  id: number
  category: string
  question: string
  questionParts: QuestionPart[]
  yes: number
  closes: string
  status: MarketStatus
  resolution: string
  tone: MarketTone
}

const markets: Market[] = [
  {
    id: 1,
    category: 'AT BAT · 추천',
    question: 'Shohei Ohtani가 이번 타석에서 출루할까요?',
    questionParts: [
      { text: 'Shohei Ohtani', emphasis: 'subject' },
      { text: '가 이번 타석에서 ' },
      { text: '출루', emphasis: 'outcome' },
      { text: '할까요?' },
    ],
    yes: 54,
    closes: '투구 전까지 · 00:18',
    status: 'closing',
    resolution: '공식 타석 결과가 안타·볼넷·사구·실책 출루 중 하나면 YES로 판정합니다.',
    tone: 'blue',
  },
  {
    id: 2,
    category: 'INNING',
    question: '7회 말에 다저스가 득점할까요?',
    questionParts: [
      { text: '7회 말', emphasis: 'context' },
      { text: '에 ' },
      { text: '다저스', emphasis: 'subject' },
      { text: '가 ' },
      { text: '득점', emphasis: 'outcome' },
      { text: '할까요?' },
    ],
    yes: 38,
    closes: '이닝 종료까지',
    status: 'open',
    resolution: '7회 말 종료 시 Los Angeles Dodgers의 득점이 1점 이상이면 YES로 판정합니다.',
    tone: 'coral',
  },
  {
    id: 3,
    category: 'NEXT PLAY',
    question: '다음 플레이 결과가 삼진일까요?',
    questionParts: [
      { text: '다음 플레이', emphasis: 'context' },
      { text: ' 결과가 ' },
      { text: '삼진', emphasis: 'outcome' },
      { text: '일까요?' },
    ],
    yes: 31,
    closes: '다음 투구 전까지',
    status: 'open',
    resolution: '다음 타석 결과가 공식 경기 기록상 삼진이면 YES로 판정합니다.',
    tone: 'gold',
  },
  {
    id: 4,
    category: 'GAME',
    question: 'LA 다저스가 이 경기를 이길까요?',
    questionParts: [
      { text: 'LA 다저스', emphasis: 'subject' },
      { text: '가 이 경기를 ' },
      { text: '이길', emphasis: 'outcome' },
      { text: '까요?' },
    ],
    yes: 68,
    closes: '경기 종료까지',
    status: 'open',
    resolution: '연장전을 포함한 경기 최종 승리 팀이 Los Angeles Dodgers면 YES로 판정합니다.',
    tone: 'green',
  },
]

// The mock advances polls slowly enough to read like a half-inning change,
// while production can replace this timer with the live game-state event.
const POLL_ROTATION_INTERVAL_MS = 45_000

const todayGames: LiveGameOption[] = [
  {
    id: 'lad-sf', status: 'live', startTime: '19:10', awayCode: 'SF', awayName: '자이언츠', awayScore: 3, homeCode: 'LAD', homeName: '다저스', homeScore: 4,
    inning: '7회 말', outs: 2, venue: 'Dodger Stadium', participants: 184, unread: 0,
    batter: 'Shohei Ohtani', batterNumber: 17, batterRecord: '1-for-3 · BB', pitcher: 'Camilo Doval', pitcherNumber: 75, pitcherRecord: '14 P · 9 S · 1 K',
    playContext: '2사 · 주자 1, 2루 · 2B 1S', balls: 2, strikes: 1, occupiedBases: ['first', 'second'], delaySeconds: 18,
  },
  {
    id: 'nyy-bos', status: 'live', startTime: '18:40', awayCode: 'NYY', awayName: '양키스', awayScore: 5, homeCode: 'BOS', homeName: '레드삭스', homeScore: 2,
    inning: '6회 초', outs: 1, venue: 'Fenway Park', participants: 126, unread: 12,
    batter: 'Aaron Judge', batterNumber: 99, batterRecord: '2-for-3 · HR', pitcher: 'Garrett Whitlock', pitcherNumber: 22, pitcherRecord: '11 P · 7 S',
    playContext: '1사 · 주자 1루 · 1B 2S', balls: 1, strikes: 2, occupiedBases: ['first'], delaySeconds: 6,
  },
  {
    id: 'hou-sea', status: 'live', startTime: '19:40', awayCode: 'HOU', awayName: '애스트로스', awayScore: 2, homeCode: 'SEA', homeName: '매리너스', homeScore: 2,
    inning: '5회 말', outs: 0, venue: 'T-Mobile Park', participants: 92, unread: 4,
    batter: 'Julio Rodríguez', batterNumber: 44, batterRecord: '1-for-2 · 2B', pitcher: 'Framber Valdez', pitcherNumber: 59, pitcherRecord: '68 P · 43 S · 5 K',
    playContext: '무사 · 주자 없음 · 0B 1S', balls: 0, strikes: 1, occupiedBases: [], delaySeconds: 0,
  },
  {
    id: 'chc-mil', status: 'final', startTime: '13:10', awayCode: 'CHC', awayName: '컵스', awayScore: 2, homeCode: 'MIL', homeName: '브루어스', homeScore: 6,
    inning: '종료', outs: 0, venue: 'American Family Field', participants: 68, unread: 0,
    batter: '', batterNumber: 0, batterRecord: '', pitcher: '', pitcherNumber: 0, pitcherRecord: '',
    playContext: '최종 스코어 · CHC 2 — 6 MIL', balls: 0, strikes: 0, occupiedBases: [], delaySeconds: 0,
  },
  {
    id: 'sd-stl', status: 'scheduled', startTime: '20:15', awayCode: 'SD', awayName: '파드리스', awayScore: 0, homeCode: 'STL', homeName: '카디널스', homeScore: 0,
    inning: '경기 전', outs: 0, venue: 'Busch Stadium', participants: 31, unread: 0,
    batter: '', batterNumber: 0, batterRecord: '', pitcher: '', pitcherNumber: 0, pitcherRecord: '',
    playContext: '오늘 20:15 경기 시작 예정', balls: 0, strikes: 0, occupiedBases: [], delaySeconds: 0,
  },
]

const marketsByGame: Record<string, Market[]> = {
  'lad-sf': markets,
  'nyy-bos': [
    { id: 11, category: 'AT BAT · 추천', question: 'Aaron Judge가 이번 타석에서 장타를 칠까요?', questionParts: [{ text: 'Aaron Judge', emphasis: 'subject' }, { text: '가 이번 타석에서 ' }, { text: '장타', emphasis: 'outcome' }, { text: '를 칠까요?' }], yes: 47, closes: '투구 전까지 · 00:24', status: 'closing', resolution: '이번 타석 결과가 2루타, 3루타 또는 홈런이면 YES로 판정합니다.', tone: 'blue' },
    { id: 12, category: 'INNING', question: '6회 초에 양키스가 추가 득점할까요?', questionParts: [{ text: '6회 초', emphasis: 'context' }, { text: '에 ' }, { text: '양키스', emphasis: 'subject' }, { text: '가 추가 ' }, { text: '득점', emphasis: 'outcome' }, { text: '할까요?' }], yes: 61, closes: '이닝 종료까지', status: 'open', resolution: '6회 초 종료 전 뉴욕 양키스가 1점 이상 득점하면 YES로 판정합니다.', tone: 'coral' },
    { id: 13, category: 'NEXT PLAY', question: '다음 플레이에서 아웃이 기록될까요?', questionParts: [{ text: '다음 플레이', emphasis: 'context' }, { text: '에서 ' }, { text: '아웃', emphasis: 'outcome' }, { text: '이 기록될까요?' }], yes: 58, closes: '다음 투구 전까지', status: 'open', resolution: '다음 공식 플레이 결과가 타자 또는 주자의 아웃이면 YES로 판정합니다.', tone: 'gold' },
    { id: 14, category: 'GAME', question: '양키스가 리드를 지키고 승리할까요?', questionParts: [{ text: '양키스', emphasis: 'subject' }, { text: '가 리드를 지키고 ' }, { text: '승리', emphasis: 'outcome' }, { text: '할까요?' }], yes: 79, closes: '경기 종료까지', status: 'open', resolution: '연장전을 포함한 경기 최종 승리 팀이 뉴욕 양키스면 YES로 판정합니다.', tone: 'green' },
  ],
  'hou-sea': [
    { id: 21, category: 'AT BAT · 추천', question: 'Julio Rodríguez가 이번 타석에서 출루할까요?', questionParts: [{ text: 'Julio Rodríguez', emphasis: 'subject' }, { text: '가 이번 타석에서 ' }, { text: '출루', emphasis: 'outcome' }, { text: '할까요?' }], yes: 52, closes: '투구 전까지 · 00:31', status: 'closing', resolution: '이번 타석에서 안타, 볼넷, 사구 또는 실책으로 출루하면 YES로 판정합니다.', tone: 'blue' },
    { id: 22, category: 'INNING', question: '5회 말에 매리너스가 득점할까요?', questionParts: [{ text: '5회 말', emphasis: 'context' }, { text: '에 ' }, { text: '매리너스', emphasis: 'subject' }, { text: '가 ' }, { text: '득점', emphasis: 'outcome' }, { text: '할까요?' }], yes: 44, closes: '이닝 종료까지', status: 'open', resolution: '5회 말 종료 전 시애틀 매리너스가 1점 이상 득점하면 YES로 판정합니다.', tone: 'coral' },
    { id: 23, category: 'NEXT PLAY', question: '다음 타구가 내야를 벗어날까요?', questionParts: [{ text: '다음 타구', emphasis: 'context' }, { text: '가 ' }, { text: '내야를 벗어날', emphasis: 'outcome' }, { text: '까요?' }], yes: 49, closes: '다음 투구 전까지', status: 'open', resolution: '다음 인플레이 타구가 외야에 도달하면 YES로 판정합니다.', tone: 'gold' },
    { id: 24, category: 'GAME', question: '매리너스가 홈에서 승리할까요?', questionParts: [{ text: '매리너스', emphasis: 'subject' }, { text: '가 홈에서 ' }, { text: '승리', emphasis: 'outcome' }, { text: '할까요?' }], yes: 55, closes: '경기 종료까지', status: 'open', resolution: '연장전을 포함한 경기 최종 승리 팀이 시애틀 매리너스면 YES로 판정합니다.', tone: 'green' },
  ],
}

const predictionHistoryByGame: Record<string, PredictionHistoryItem[]> = {
  'lad-sf': [
    { id: 103, time: '21:31', inning: '7회 초', question: '다음 플레이 결과가 삼진일까요?', yes: 31, choice: 'no', answer: 'no', amount: 100, delta: 45 },
    { id: 102, time: '21:18', inning: '6회 말', question: '6회 총 득점이 1점 이상일까요?', yes: 47, choice: 'yes', answer: 'yes', amount: 100, delta: 113 },
    { id: 101, time: '21:09', inning: '6회 초', question: '이닝 종료 전 주자가 득점할까요?', yes: 58, choice: null, answer: 'no' },
    { id: 100, time: '20:54', inning: '5회 말', question: 'Shohei Ohtani가 이번 타석에서 안타를 칠까요?', yes: 64, choice: 'yes', answer: 'no', amount: 150, delta: -150 },
  ],
  'nyy-bos': [
    { id: 113, time: '20:47', inning: '5회 말', question: '다음 타자가 출루할까요?', yes: 52, choice: 'yes', answer: 'yes', amount: 100, delta: 92 },
    { id: 112, time: '20:33', inning: '5회 초', question: '양키스가 이번 이닝에 득점할까요?', yes: 67, choice: 'yes', answer: 'yes', amount: 150, delta: 74 },
    { id: 111, time: '20:19', inning: '4회 말', question: '다음 플레이에서 아웃이 기록될까요?', yes: 61, choice: 'no', answer: 'yes', amount: 100, delta: -100 },
  ],
  'hou-sea': [
    { id: 123, time: '20:56', inning: '5회 초', question: '애스트로스가 주자를 득점권에 보낼까요?', yes: 46, choice: 'no', answer: 'no', amount: 100, delta: 85 },
    { id: 122, time: '20:41', inning: '4회 말', question: 'Julio Rodríguez가 출루할까요?', yes: 55, choice: null, answer: 'yes' },
    { id: 121, time: '20:25', inning: '4회 초', question: '이번 이닝에 1점 이상 나올까요?', yes: 49, choice: 'yes', answer: 'no', amount: 100, delta: -100 },
  ],
}

function InfoTip({ label, children, triggerText }: { label: string; children: ReactNode; triggerText?: string }) {
  const tooltipId = useId()
  const [open, setOpen] = useState(false)

  return (
    <span
      className={`info-tip ${triggerText ? 'text-trigger' : ''} ${open ? 'open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="info-tip-trigger"
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            event.currentTarget.blur()
          }
        }}
      >
        {triggerText ?? <CircleHelp size={17} />}
      </button>
      {open && <span className="info-tip-bubble" id={tooltipId} role="tooltip">{children}</span>}
    </span>
  )
}

function MarketBackgroundArt({ category }: { category: string }) {
  let path = mdiTrophyVariant
  let artClass = 'art-trophy'

  if (category.startsWith('AT BAT')) {
    path = mdiBaseball
    artClass = 'art-baseball'
  } else if (category === 'INNING') {
    path = mdiBaseballDiamondOutline
    artClass = 'art-diamond'
  } else if (category === 'NEXT PLAY') {
    path = mdiBaseballBat
    artClass = 'art-bat'
  }

  return (
    <svg
      className={`market-background-art ${artClass}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  )
}

type CollisionParticle = {
  side: Side
  style: CSSProperties & Record<`--${string}`, string>
}

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function createCollisionParticles(seed: number, count = 36): CollisionParticle[] {
  const random = seededRandom(seed)
  const particlesPerSide = Math.ceil(count / 2)

  return Array.from({ length: count }, (_, index) => {
    const side: Side = index % 2 === 0 ? 'yes' : 'no'
    const sideIndex = Math.floor(index / 2)
    const lanePosition = particlesPerSide <= 1 ? .5 : sideIndex / (particlesPerSide - 1)
    const particleX = Math.min(66, Math.max(34, 35 + lanePosition * 30 + (side === 'yes' ? -.75 : .75) + (random() - .5) * 1.8))
    let y: number

    if (index < 10) {
      y = 5 + index * 10 + (random() - .5) * 4
    } else if (index % 9 === 0) {
      y = 80 + random() * 16
    } else {
      y = 7 + ((random() + random()) / 2) * 86
    }

    y = Math.max(4, Math.min(96, y))
    const centerWeight = 1 - Math.min(1, Math.abs(y - 50) / 50)
    const lifetime = 1.15 + centerWeight * 1.75 + random() * .75
    const direction = side === 'yes' ? -1 : 1
    const sizeBias = random()
    const maxParticleSize = 3.2 + centerWeight * 12.3
    const particleSizeRatio = .58 + sizeBias * sizeBias * .42

    return {
      side,
      style: {
        '--particle-x': `${particleX.toFixed(2)}%`,
        '--particle-y': `${y.toFixed(2)}%`,
        '--particle-size': `${(1.1 + particleSizeRatio * (maxParticleSize - 1.1)).toFixed(2)}px`,
        '--particle-life': `${lifetime.toFixed(2)}s`,
        '--particle-delay': `${(-random() * lifetime).toFixed(2)}s`,
        '--particle-origin': `${((random() - .5) * 3).toFixed(2)}px`,
        '--particle-travel': `${(direction * (18 + random() * 40)).toFixed(2)}px`,
        '--particle-drift': `${((random() - .5) * 22).toFixed(2)}px`,
        '--particle-alpha': `${(.38 + centerWeight * .38 + random() * .2).toFixed(2)}`,
      },
    }
  })
}

const collisionParticleSets: Record<string, CollisionParticle[]> = {
  'core-impact': createCollisionParticles(247, 54),
}

function CollisionLine({ className, position }: { className: string; position: number }) {
  const clipId = `versus-${className.replace(/[^a-z0-9_-]/gi, '-')}`

  return (
    <span className={`${className} collision-line`} style={{ left: `${position}%` }} aria-hidden="true">
      <svg className="versus-mark" viewBox="0 0 120 80" focusable="false">
        <defs>
          <clipPath id={`${clipId}-yes`}><polygon points="0,0 66,0 41,80 0,80" /></clipPath>
          <clipPath id={`${clipId}-no`}><polygon points="77.5,0 120,0 120,80 52.5,80" /></clipPath>
        </defs>
        <text className="versus-text yes" x="49" y="58" textAnchor="middle" clipPath={`url(#${clipId}-yes)`}>V</text>
        <text className="versus-text no" x="71" y="70" textAnchor="middle" clipPath={`url(#${clipId}-no)`}>S</text>
      </svg>
    </span>
  )
}

function CollisionParticleFields({ className, yesClip, noClip }: { className: string; yesClip: string; noClip: string }) {
  const particles = collisionParticleSets[className] ?? collisionParticleSets['core-impact']

  return (
    <>
      {(['yes', 'no'] as Side[]).map((particleSide) => (
        <span
          className={`collision-particle-field ${particleSide}`}
          style={{ clipPath: particleSide === 'yes' ? yesClip : noClip }}
          aria-hidden="true"
          key={particleSide}
        >
          {particles.map((particle, index) => particle.side === particleSide && (
            <i className={`collision-particle ${particle.side}`} style={particle.style} key={index} />
          ))}
        </span>
      ))}
    </>
  )
}

function getVisualCorePosition(probability: number) {
  const clampedProbability = Math.min(80, Math.max(20, probability))
  return 42 + ((clampedProbability - 20) / 60) * 16
}

function sampleDuelCurve(progress: number, targetPosition: number) {
  const keyframes = [
    { progress: 0, position: 50 },
    { progress: .17, position: 61 },
    { progress: .31, position: 58 },
    { progress: .55, position: 40 },
    { progress: .67, position: 44 },
    { progress: .84, position: 58 },
    { progress: 1, position: targetPosition },
  ]
  const segmentIndex = Math.min(
    keyframes.length - 2,
    Math.max(0, keyframes.findIndex((keyframe) => progress <= keyframe.progress) - 1),
  )
  const from = keyframes[segmentIndex]
  const to = keyframes[segmentIndex + 1]
  const segmentSpan = to.progress - from.progress
  const localProgress = Math.min(1, Math.max(0, (progress - from.progress) / segmentSpan))
  const previous = keyframes[Math.max(0, segmentIndex - 1)]
  const next = keyframes[Math.min(keyframes.length - 1, segmentIndex + 2)]
  const fromSlope = segmentIndex === 0 ? 0 : (to.position - previous.position) / (to.progress - previous.progress)
  const toSlope = segmentIndex + 1 === keyframes.length - 1 ? 0 : (next.position - from.position) / (next.progress - from.progress)
  const t2 = localProgress * localProgress
  const t3 = t2 * localProgress

  return (
    (2 * t3 - 3 * t2 + 1) * from.position
    + (t3 - 2 * t2 + localProgress) * fromSlope * segmentSpan
    + (-2 * t3 + 3 * t2) * to.position
    + (t3 - t2) * toSlope * segmentSpan
  )
}

function PowerCorePicker({ market, side, active, motionEnabled, readOnly = false, onSelect }: { market: Market; side: Side | null; active: boolean; motionEnabled: boolean; readOnly?: boolean; onSelect: (side: Side) => void }) {
  const targetPosition = getVisualCorePosition(market.yes)
  const [motion, setMotion] = useState({ yes: 0, no: 0, position: 50, running: false, impacting: false })

  useEffect(() => {
    if (!active) {
      setMotion({ yes: 0, no: 0, position: 50, running: false, impacting: false })
      return
    }

    const targetNo = 100 - market.yes
    if (!motionEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotion({ yes: market.yes, no: targetNo, position: targetPosition, running: false, impacting: false })
      return
    }

    let animationFrame = 0
    const startedAt = performance.now()
    const duration = 1600
    const clashAt = .82
    setMotion({ yes: 0, no: 0, position: 50, running: true, impacting: false })

    const animate = (now: number) => {
      const elapsed = Math.min(duration, now - startedAt)
      const progress = elapsed / duration
      const duelProgress = Math.min(1, progress / clashAt)
      const reveal = 1 - Math.pow(1 - duelProgress, 2.05)
      let position = sampleDuelCurve(duelProgress, targetPosition)
      const countBias = Math.min(10, Math.max(-10, (position - targetPosition) * .58))
      let animatedYes = Math.min(100, Math.max(0, market.yes * reveal + countBias))
      let animatedNo = Math.min(100, Math.max(0, targetNo * reveal - countBias))
      const impacting = progress >= clashAt && progress < 1

      if (impacting) {
        const settle = (progress - clashAt) / (1 - clashAt)
        const damping = Math.pow(1 - settle, 1.35)
        position = targetPosition + Math.sin(settle * Math.PI * 5) * .85 * damping
        animatedYes = market.yes
        animatedNo = targetNo
      }

      setMotion({
        yes: progress === 1 ? market.yes : Math.round(animatedYes),
        no: progress === 1 ? targetNo : Math.round(animatedNo),
        position: progress === 1 ? targetPosition : position,
        running: progress < 1,
        impacting,
      })

      if (progress < 1) animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [active, market.id, market.yes, motionEnabled, targetPosition])

  const visualPosition = motion.position
  // 176px stage at 17deg: (176 / 2) * tan(17deg) = 26.9px.
  // Keep the clipped color boundary on the same axis as the divider rail.
  const dividerEdgeOffset = 27
  const yesClip = `polygon(0 0, calc(${visualPosition}% + ${dividerEdgeOffset}px) 0, calc(${visualPosition}% - ${dividerEdgeOffset}px) 100%, 0 100%)`
  const noClip = `polygon(calc(${visualPosition}% + ${dividerEdgeOffset}px) 0, 100% 0, 100% 100%, calc(${visualPosition}% - ${dividerEdgeOffset}px) 100%)`

  return (
    <div className={`core-stage live-power-core ${side ? `selected-${side}` : 'unselected'} ${readOnly ? 'is-review' : ''} ${motionEnabled ? '' : 'motion-disabled'} ${motion.running ? 'is-entering' : ''} ${motion.impacting ? 'is-impacting' : ''}`} style={{ '--core-position': `${visualPosition}%` } as CSSProperties & Record<`--${string}`, string>} role="group" aria-label={readOnly ? '참여한 예측 결과' : '예측 결과 선택'}>
      <span className="core-beam yes" style={{ clipPath: yesClip }} aria-hidden="true" />
      <span className="core-beam no" style={{ clipPath: noClip }} aria-hidden="true" />
      <CollisionParticleFields className="core-impact" yesClip={yesClip} noClip={noClip} />
      <button className={`core-choice yes ${side === 'yes' ? 'selected' : ''}`} type="button" disabled={readOnly} aria-label={`YES ${market.yes}% 그렇다 ${side === 'yes' ? '선택됨' : '선택'}`} aria-pressed={side === 'yes'} onClick={() => onSelect('yes')}>
        <small>YES</small><b><span>{motion.yes}</span><em>%</em></b><strong>그렇다</strong><span>{side === 'yes' ? <><Check size={13} />선택됨</> : '선택'}</span>
      </button>
      <button className={`core-choice no ${side === 'no' ? 'selected' : ''}`} type="button" disabled={readOnly} aria-label={`NO ${100 - market.yes}% 아니다 ${side === 'no' ? '선택됨' : '선택'}`} aria-pressed={side === 'no'} onClick={() => onSelect('no')}>
        <small>NO</small><b><span>{motion.no}</span><em>%</em></b><strong>아니다</strong><span>{side === 'no' ? <><Check size={13} />선택됨</> : '선택'}</span>
      </button>
      <CollisionLine className="core-impact" position={visualPosition} />
    </div>
  )
}

const positionRows: Array<{
  questionParts: QuestionPart[]
  context: string
  side: 'YES' | 'NO'
  amount: number
  price: number
  returnAmount: number
  profit: number
  tone: PositionTone
  verifiedAt?: string
  verificationId?: string
}> = [
  {
    questionParts: [{ text: 'Shohei Ohtani', emphasis: 'subject' }, { text: '가 ' }, { text: '출루', emphasis: 'outcome' }, { text: '할까요?' }],
    context: 'LAD vs SF · 7회 말 · 투구 전',
    side: 'YES', amount: 200, price: 54, returnAmount: 370, profit: 170, tone: 'live',
  },
  {
    questionParts: [{ text: '7회 말', emphasis: 'context' }, { text: '에 ' }, { text: '다저스', emphasis: 'subject' }, { text: '가 ' }, { text: '득점', emphasis: 'outcome' }, { text: '할까요?' }],
    context: 'LAD vs SF · 7회 말 · 이닝 종료 전',
    side: 'NO', amount: 150, price: 62, returnAmount: 241, profit: 91, tone: 'live',
  },
  {
    questionParts: [{ text: '6회', emphasis: 'context' }, { text: ' 총 득점이 ' }, { text: '1점 이상', emphasis: 'outcome' }, { text: '일까요?' }],
    context: 'LAD vs SF · 6회 종료',
    side: 'YES', amount: 100, price: 47, returnAmount: 213, profit: 113, tone: 'settled',
    verifiedAt: '21:42:08', verificationId: '0x71F2…9A40',
  },
]

const activePositionRows = positionRows.filter((row) => row.tone === 'live')
const activePositionTotal = activePositionRows.reduce((sum, row) => sum + row.amount, 0)

function MarketQuestion({ market }: { market: Market }) {
  return (
    <span className="market-question">
      {market.questionParts.map((part, index) => (
        <span className={part.emphasis ? `question-keyword ${part.emphasis}` : undefined} key={`${market.id}-${index}`}>
          {part.text}
        </span>
      ))}
    </span>
  )
}

const fieldPositions = [
  { code: 'LF', label: '좌익수', x: 22, y: 21, mobileX: 18, mobileY: 23 },
  { code: 'CF', label: '중견수', x: 50, y: 13, mobileX: 50, mobileY: 13 },
  { code: 'RF', label: '우익수', x: 78, y: 21, mobileX: 82, mobileY: 23 },
  { code: '3B', label: '3루수', x: 22, y: 42.5, mobileX: 22, mobileY: 59 },
  { code: 'SS', label: '유격수', x: 32, y: 33, mobileX: 30, mobileY: 39 },
  { code: '2B', label: '2루수', x: 68, y: 33, mobileX: 70, mobileY: 39 },
  { code: '1B', label: '1루수', x: 78, y: 42.5, mobileX: 78, mobileY: 59 },
  { code: 'P', label: '투수', x: 50, y: 53, mobileX: 50, mobileY: 65 },
  { code: 'C', label: '포수', x: 50, y: 94, mobileX: 50, mobileY: 94 },
] as const

function FieldCanvas({ game }: { game: LiveGameOption }) {
  const [selectedPosition, setSelectedPosition] = useState<(typeof fieldPositions)[number]['code']>('P')
  const defenseCode = game.inning.includes('말') ? game.awayCode : game.homeCode
  const runnerLabel = game.occupiedBases.length
    ? game.occupiedBases.map((base) => ({ first: '1루', second: '2루', third: '3루' })[base]).join('·')
    : '주자 없음'

  return (
    <div className="field-canvas tactical-field" aria-label={`${game.venue} 필드. ${defenseCode} 수비, ${runnerLabel}, 투수 ${game.pitcher}`}>
      <svg className="field-canvas-art" viewBox="0 0 640 390" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="field-grass-live" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dcebd6" />
            <stop offset=".52" stopColor="#b9d0ae" />
            <stop offset="1" stopColor="#8fb28a" />
          </linearGradient>
          <linearGradient id="field-dirt-live" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e5d2aa" />
            <stop offset="1" stopColor="#b58f5f" />
          </linearGradient>
          <linearGradient id="stadium-bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6f8790" /><stop offset="1" stopColor="#344f59" /></linearGradient>
          <linearGradient id="stadium-seat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#294856" /><stop offset="1" stopColor="#173544" /></linearGradient>
          <radialGradient id="field-light" cx="50%" cy="62%" r="62%"><stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <clipPath id="field-live-clip"><path d="M320 371 27 111Q320-61 613 111Z" /></clipPath>
          <filter id="field-soft-shadow" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#173a36" floodOpacity=".22" /></filter>
          <filter id="base-shadow" x="-50%" y="-50%" width="200%" height="220%"><feDropShadow dx="0" dy="4" stdDeviation="2.5" floodColor="#493b28" floodOpacity=".35" /></filter>
        </defs>
        <path className="stadium-upper-bowl" d="M9 113Q320-91 631 113l-15 22Q320-45 24 135Z" fill="url(#stadium-bowl)" />
        <path className="stadium-seat-band" d="M20 117Q320-70 620 117l-8 12Q320-48 28 129Z" fill="url(#stadium-seat)" />
        <path className="stadium-aisle" d="M83 85 99 112M173 39l9 29M320 8v33M467 39l-9 29M557 85l-16 27" />
        <path className="field-ground-shadow" d="M320 384 20 118Q320-58 620 118Z" />
        <path className="field-depth-edge" d="M320 382 27 122v-11l293 260 293-260v11Z" />
        <path className="field-outfield-shape" d="M320 371 27 111Q320-61 613 111Z" fill="url(#field-grass-live)" filter="url(#field-soft-shadow)" />
        <g clipPath="url(#field-live-clip)" className="field-mowing-pattern">
          <path d="M-15 96Q320-116 655 96l-19 31Q320-72 4 127Z" />
          <path d="M13 149Q320-30 627 149l-24 36Q320 20 37 185Z" />
          <path d="M44 207Q320 62 596 207l-30 40Q320 119 74 247Z" />
          <path d="M80 268Q320 157 560 268l-37 43Q320 221 117 311Z" />
        </g>
        <path className="field-light-wash" d="M320 371 27 111Q320-61 613 111Z" fill="url(#field-light)" />
        <path className="field-warning-track" d="M37 112Q320-48 603 112" />
        <path className="field-infield-shadow" d="m320 369-119-119 119-119 119 119Z" />
        <path className="field-infield-shape" d="m320 358-112-112 112-112 112 112Z" fill="url(#field-dirt-live)" />
        <path className="field-inner-grass" d="m320 326-80-80 80-80 80 80Z" />
        <path className="field-foul-line" d="M320 358 24 105M320 358l296-253" />
        <ellipse className="field-mound-shadow" cx="320" cy="252" rx="24" ry="11" />
        <ellipse className="field-mound" cx="320" cy="246" rx="20" ry="12" />
        <rect className={`field-base second ${game.occupiedBases.includes('second') ? 'occupied' : ''}`} x="310" y="158" width="20" height="20" transform="rotate(45 320 168)" filter="url(#base-shadow)" />
        <rect className={`field-base third ${game.occupiedBases.includes('third') ? 'occupied' : ''}`} x="230" y="236" width="20" height="20" transform="rotate(45 240 246)" filter="url(#base-shadow)" />
        <rect className={`field-base first ${game.occupiedBases.includes('first') ? 'occupied' : ''}`} x="390" y="236" width="20" height="20" transform="rotate(45 400 246)" filter="url(#base-shadow)" />
        <path className="field-home" d="m320 342 13 8-4 16h-18l-4-16Z" filter="url(#base-shadow)" />
        <path className="field-front-lip" d="M306 365h28l-5 8h-18Z" />
      </svg>
      <div className="field-base-layer" aria-hidden="true">
        {(['second', 'third', 'first'] as const).map((base) => <span className={`dynamic-base ${base} ${game.occupiedBases.includes(base) ? 'occupied' : ''}`} key={base} />)}
      </div>
      <div className="field-position-layer">
        {fieldPositions.map((position) => {
          const selected = selectedPosition === position.code
          const playerLabel = position.code === 'P' ? game.pitcher : position.label
          return (
            <button
              className={`field-position ${position.code === 'P' ? 'current' : ''} ${selected ? 'is-selected' : ''}`}
              data-position={position.code}
              style={{
                '--field-x': `${position.x}%`,
                '--field-y': `${position.y}%`,
                '--field-mobile-x': `${position.mobileX}%`,
                '--field-mobile-y': `${position.mobileY}%`,
              } as CSSProperties}
              type="button"
              aria-label={`${playerLabel}, ${position.code} 위치`}
              aria-pressed={selected}
              onClick={() => setSelectedPosition(position.code)}
              key={position.code}
            >
              <b aria-hidden="true">{position.code}</b><small aria-hidden="true">{playerLabel}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BallparkVisualizer({ game, pitch, pitchDetail }: { game: LiveGameOption; pitch: number; pitchDetail: { speed: string; type: string; result: string; tone: string } }) {
  const [fieldExpanded, setFieldExpanded] = useState(true)
  const defenseCode = game.inning.includes('말') ? game.awayCode : game.homeCode
  const runnerLabel = game.occupiedBases.length
    ? game.occupiedBases.map((base) => ({ first: '1루', second: '2루', third: '3루' })[base]).join(' · ')
    : '주자 없음'

  return (
    <section className="ballpark-visualizer merged" aria-labelledby="ballpark-title">
      <h2 className="visually-hidden" id="ballpark-title">실시간 경기 및 수비 배치</h2>
      <header className="field-score-hud" aria-label={`${game.awayName} ${game.awayScore}점, ${game.homeName} ${game.homeScore}점`}>
        <div className="hud-team away"><span style={teamBadgeStyle(game.awayCode)}>{game.awayCode}</span><b style={teamAccentStyle(game.awayCode)}>{game.awayScore}</b><small>{game.awayName}</small></div>
        <span className="hud-versus" aria-hidden="true"><i>V</i><i>S</i></span>
        <div className="hud-game-state">
          <div className="hud-state-heading"><small>현재 경기</small><b>{game.inning} · {game.outs} OUT</b></div>
          <span>{game.venue}</span>
          <strong>{defenseCode} 수비 · {runnerLabel}</strong>
          <div className="field-count" aria-label={`볼 ${game.balls}, 스트라이크 ${game.strikes}, 아웃 ${game.outs}`}>
            <span className="count-item balls"><small>B</small><span className="count-lights" aria-hidden="true">{[0, 1, 2].map((count) => <i className={count < game.balls ? 'active' : ''} key={count} />)}</span></span>
            <span className="count-item strikes"><small>S</small><span className="count-lights" aria-hidden="true">{[0, 1].map((count) => <i className={count < game.strikes ? 'active' : ''} key={count} />)}</span></span>
            <span className="count-item outs"><small>O</small><span className="count-lights" aria-hidden="true">{[0, 1].map((count) => <i className={count < game.outs ? 'active' : ''} key={count} />)}</span></span>
          </div>
          <button
            className="field-collapse-toggle"
            type="button"
            aria-controls="live-defense-field"
            aria-expanded={fieldExpanded}
            aria-label={fieldExpanded ? '구장 이미지 접기' : '구장 이미지 펼치기'}
            title={fieldExpanded ? '구장 이미지 접기' : '구장 이미지 펼치기'}
            onClick={() => setFieldExpanded((expanded) => !expanded)}
          >
            {fieldExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
        </div>
        <div className="hud-team home"><span style={teamBadgeStyle(game.homeCode)}>{game.homeCode}</span><b style={teamAccentStyle(game.homeCode)}>{game.homeScore}</b><small>{game.homeName}</small></div>
      </header>

      <div className="ballpark-stage style-broadcast" id="live-defense-field" hidden={!fieldExpanded}>
        <FieldCanvas game={game} />
      </div>
      <footer className="live-brief" aria-label={`현재 타자 ${game.batter}, ${pitch}구째 ${pitchDetail.speed} ${pitchDetail.type} ${pitchDetail.result}, 투수 ${game.pitcher}`}>
        <div className="brief-player batter"><small>타자 · #{game.batterNumber}</small><strong>{game.batter}</strong></div>
        <div className="brief-pitch"><small>LAST PITCH</small><span>{pitch}구째</span><em>{pitchDetail.speed}</em><b className={`result-${pitchDetail.tone}`}>{pitchDetail.result}</b></div>
        <div className="brief-player pitcher"><small>투수 · #{game.pitcherNumber}</small><strong>{game.pitcher}</strong></div>
      </footer>
    </section>
  )
}

function LandingPage({ game, games, market, displayedAchievementIds, voteMotionEnabled, onLive, onRankings }: { game: LiveGameOption; games: LiveGameOption[]; market: Market; displayedAchievementIds: readonly AchievementId[]; voteMotionEnabled: boolean; onLive: () => void; onRankings: () => void }) {
  const [landingSide, setLandingSide] = useState<Side | null>(null)
  const [landingAmount, setLandingAmount] = useState(200)
  const [landingSubmitted, setLandingSubmitted] = useState(false)
  const [landingVoteActive, setLandingVoteActive] = useState(false)
  const landingVoteSceneRef = useRef<HTMLElement>(null)
  const landingFlow = [
    { code: 'SELECT', title: '오늘의 경기를 고릅니다', copy: '진행 중·예정·종료 경기를 한곳에서 보고, 지금 함께할 경기를 선택합니다.', proof: '오늘 경기 선택 UI' },
    { code: 'WATCH', title: '경기 흐름을 먼저 읽습니다', copy: '점수와 주자, 볼카운트, 수비 위치가 하나의 구장 화면에서 이어집니다.', proof: '실시간 구장 UI' },
    { code: 'QUESTION', title: '상황에 맞는 질문이 열립니다', copy: '현재 타석과 이닝을 바탕으로 다음 플레이를 묻는 예측이 경기 위에 나타납니다.', proof: '라이브 예측 UI' },
    { code: 'PREDICT', title: 'YES 또는 NO로 참여합니다', copy: '선택과 참여 포인트, 적중 시 예상 포인트를 확인하고 한 번의 판단을 남깁니다.', proof: '예측 참여 완료 상태' },
    { code: 'CHEER', title: '같은 장면을 함께 응원합니다', copy: '팬들의 선택과 메시지가 같은 흐름 안에 보여, 경기를 보던 맥락이 끊기지 않습니다.', proof: '응원톡 UI' },
    { code: 'RECORD', title: '결과는 활동 기록이 됩니다', copy: '예측 결과와 포인트 정산, 출석 보너스가 대회명과 함께 한 타임라인에 쌓입니다.', proof: '통합 활동 기록 UI' },
    { code: 'GROW', title: '한 경기가 시즌 성장이 됩니다', copy: '쌓인 점수는 티어 진행도와 시즌·경기·구단 랭킹으로 이어집니다.', proof: '시즌 티어 UI' },
  ] as const
  const landingPrice = landingSide === 'yes' ? market.yes : landingSide === 'no' ? 100 - market.yes : null
  const landingExpected = landingPrice === null ? null : Math.floor(landingAmount / (landingPrice / 100))
  const landingGain = landingExpected === null ? null : Math.max(0, landingExpected - landingAmount)
  const chooseLandingSide = (choice: Side) => {
    setLandingSide(choice)
    setLandingSubmitted(false)
  }

  useEffect(() => {
    const scene = landingVoteSceneRef.current
    if (!scene) return
    const observer = new IntersectionObserver(([entry]) => setLandingVoteActive(entry.isIntersecting), {
      threshold: .28,
      rootMargin: '-8% 0px -8%',
    })
    observer.observe(scene)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="landing-page" aria-labelledby="landing-title">
      <section className="landing-intro bb-deck-cover">
        <header className="bb-cover-meta"><span><b>2026</b> BASEBALL FAN EXPERIENCE</span><small>BETTERBATTER</small></header>
        <div className="bb-cover-title">
          <span className="landing-eyebrow"><i aria-hidden="true" /> ONE GAME, ONE FLOW</span>
          <h1 id="landing-title">경기를 보는 순간이<br /><em>나의 기록이 됩니다.</em></h1>
          <p>라이브 상황을 읽고, 다음 플레이를 예측하고, 함께 응원한 뒤 시즌 기록으로 남기는 야구 팬 플랫폼.</p>
        </div>
        <div className="landing-hero-actions">
          <button type="button" className="landing-primary-action" onClick={() => document.getElementById('landing-product-story')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>사용 흐름 보기 <ArrowRight size={17} aria-hidden="true" /></button>
          <button type="button" className="landing-secondary-action" onClick={onLive}><Radio size={16} aria-hidden="true" /> 라이브 바로가기</button>
        </div>
        <div className="landing-live-ribbon" aria-label={`${game.awayName} 대 ${game.homeName} 현재 경기`}>
          <span><i aria-hidden="true" /> LIVE</span>
          <b>{game.awayCode} <strong>{game.awayScore}</strong></b>
          <small>{game.inning} · {game.outs} OUT</small>
          <b><strong>{game.homeScore}</strong> {game.homeCode}</b>
          <em>{game.venue}</em>
        </div>
        <footer className="bb-cover-footer"><span>BETTERBATTER PRODUCT STORY</span><small>SCROLL TO CONTINUE</small></footer>
      </section>

      <section className="landing-journey bb-product-story bb-flowing-story" id="landing-product-story" aria-labelledby="landing-flow-title">
        <header className="landing-journey-heading bb-story-intro">
          <span>THE USER JOURNEY</span>
          <h2 id="landing-flow-title">오늘의 경기에서<br />시즌 랭킹까지.</h2>
          <p>각 장면은 실제 사용 순서를 따라 이어집니다. 스크롤을 내리며 한 경기의 경험이 어떻게 기록으로 남는지 확인하세요.</p>
        </header>

        <ol className="bb-flow-map" aria-label="BetterBatter 이용 흐름">
          {landingFlow.map((item, index) => <li key={item.code}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.code}</b><small>{item.title}</small></li>)}
        </ol>

        <section className="bb-flow-scene bb-live-scene" aria-labelledby="bb-live-scene-title">
          <header className="bb-scene-heading"><span>01—02 / SELECT &amp; WATCH</span><h2 id="bb-live-scene-title">경기를 고르고,<br />지금의 상황을 읽습니다.</h2><p>오늘의 경기 선택과 실시간 구장 정보가 한 화면 안에서 자연스럽게 이어집니다.</p></header>
          <div className="bb-scene-canvas bb-live-canvas">
            <div className="bb-scene-windowbar"><span><Radio size={13} /> LIVE GAME</span><small>{game.venue}</small></div>
            <div className="bb-live-field"><BallparkVisualizer game={game} pitch={3} pitchDetail={{ speed: '96.1 mph', type: '포심', result: '스트라이크', tone: 'strike' }} /></div>
            <section className="bb-game-picker bb-inline-game-picker" aria-label="오늘 경기 선택 예시">
              <header><span>TODAY · {games.length} GAMES</span><strong>오늘의 경기를 선택하세요</strong></header>
              <div>{games.slice(0, 3).map((item) => <button type="button" className={item.id === game.id ? 'selected' : ''} onClick={onLive} key={item.id}>
                <span className={`bb-game-status ${item.status}`}>{item.status === 'live' ? item.inning : item.status === 'scheduled' ? item.startTime : '종료'}</span>
                <strong>{item.awayCode} <em>{item.status === 'scheduled' ? 'VS' : `${item.awayScore} — ${item.homeScore}`}</em> {item.homeCode}</strong>
                <small>{item.venue}</small>{item.id === game.id && <Check size={15} aria-hidden="true" />}
              </button>)}</div>
            </section>
            <span className="bb-scene-note note-game">경기를 선택하면<br />같은 화면의 데이터가 바뀝니다</span>
          </div>
        </section>

        <section className="bb-flow-scene bb-question-scene" aria-labelledby="bb-question-scene-title">
          <header className="bb-scene-heading"><span>03 / QUESTION</span><h2 id="bb-question-scene-title">경기 흐름 안에서<br />질문을 발견합니다.</h2><p>라이브 화면을 떠나지 않아도 현재 타석과 이닝에 맞는 예측이 바로 나타납니다.</p></header>
          <div className="bb-scene-canvas bb-question-canvas">
            <div className="bb-question-field"><BallparkVisualizer game={game} pitch={3} pitchDetail={{ speed: '96.1 mph', type: '포심', result: '스트라이크', tone: 'strike' }} /></div>
            <section className="landing-ui-market bb-inline-market" aria-label="실제 라이브 예측 UI">
              <header><div><Radio size={14} aria-hidden="true" /><strong>라이브 예측</strong></div><span>{game.inning}</span></header>
              <button className={`market-row tone-${market.tone}`} type="button" onClick={() => document.getElementById('bb-vote-demo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                <MarketBackgroundArt category={market.category} />
                <span className="market-copy"><small>{market.category}</small><strong><MarketQuestion market={market} /></strong><em><span className="market-state open">진행 중</span><span className="market-deadline">{market.closes}</span></em></span>
                <span className="odds"><span className="yes"><small>YES</small><b><span>{market.yes}</span><em>%</em></b></span><span className="no"><small>NO</small><b><span>{100 - market.yes}</span><em>%</em></b></span></span>
                <span className="market-entry-hint">눌러서 예측 <ArrowRight size={14} aria-hidden="true" /></span>
              </button>
            </section>
          </div>
        </section>

        <section ref={landingVoteSceneRef} className={`bb-flow-scene bb-vote-scene ${landingVoteActive ? 'is-motion-active' : ''}`} id="bb-vote-demo" aria-labelledby="bb-vote-scene-title">
          <header className="bb-scene-heading"><span>04 / PREDICT</span><h2 id="bb-vote-scene-title">YES 또는 NO,<br />직접 선택해보세요.</h2><p>실제 투표 화면과 같은 선택 방식입니다. 포인트와 적중 시 예상 결과까지 한 번에 확인합니다.</p></header>
          <div className={`bb-vote-demo tone-${market.tone}`}>
            <div className="selected-market">
              <small>{market.category}</small>
              <strong><MarketQuestion market={market} /></strong>
              <div className="selected-market-meta"><span><i className="pulse" /> 실시간 확률 · 방금 갱신</span><em>{game.inning} · {game.venue}</em></div>
            </div>
            <PowerCorePicker market={market} side={landingSide} active={landingVoteActive} motionEnabled={voteMotionEnabled} readOnly={landingSubmitted} onSelect={chooseLandingSide} />
            <div className="bb-landing-amount">
              <header><span>참여 포인트</span><small>보유 <b>1,240P</b></small></header>
              <div className="bb-landing-amount-value"><strong>{landingAmount.toLocaleString()}<small> P</small></strong><span><em>적중 시 예상</em><b>{landingExpected === null ? '선택 후 계산' : `${landingExpected.toLocaleString()}P`}</b><small>{landingGain === null ? '—' : `+${landingGain.toLocaleString()}P`}</small></span></div>
              <div className="bb-landing-adjustments" role="group" aria-label="랜딩 예시 참여 포인트 조절">{[-100, -50, 50, 100].map((delta) => <button type="button" disabled={landingSubmitted || landingAmount + delta < 10 || landingAmount + delta > 1240} onClick={() => setLandingAmount((current) => Math.min(1240, Math.max(10, current + delta)))} key={delta}>{delta < 0 ? '−' : '＋'}{Math.abs(delta)}</button>)}</div>
            </div>
            <button className={`submit-order bb-landing-submit ${landingSubmitted ? 'review-complete' : landingSide ? `side-${landingSide}` : 'side-unselected'}`} type="button" disabled={landingSide === null || landingSubmitted} onClick={() => setLandingSubmitted(true)}>{landingSubmitted ? <><Check size={17} />참여 완료 · {landingSide?.toUpperCase()} 선택</> : landingSide ? <>{landingSide.toUpperCase()}에 {landingAmount.toLocaleString()}P 참여 <ArrowRight size={17} /></> : <>결과를 먼저 선택하세요</>}</button>
          </div>
        </section>

        <section className="bb-flow-scene bb-cheer-scene" aria-labelledby="bb-cheer-scene-title">
          <header className="bb-scene-heading"><span>05 / CHEER</span><h2 id="bb-cheer-scene-title">선택 뒤에는<br />같은 순간의 응원이 이어집니다.</h2><p>팬들의 YES·NO와 메시지를 함께 보며, 방금 참여한 경기 흐름을 계속 이어갑니다.</p></header>
          <div className="bb-scene-canvas bb-cheer-canvas"><div className="bb-cheer-demo"><LiveGameChat games={games} selectedGameId={game.id} activePoll={market} displayedAchievementIds={displayedAchievementIds} /></div><span className="bb-scene-note note-cheer">투표 선택이 이름 옆에 표시되어<br />대화의 맥락을 바로 이해합니다</span></div>
        </section>

        <section className="bb-flow-scene bb-record-scene" aria-labelledby="bb-record-scene-title">
          <header className="bb-scene-heading"><span>06 / RECORD</span><h2 id="bb-record-scene-title">경기가 끝나도<br />판단은 사라지지 않습니다.</h2><p>예측과 보너스, 포인트 변동이 대회명과 함께 하나의 활동 기록으로 정리됩니다.</p></header>
          <div className="bb-scene-canvas bb-record-canvas"><section className="bb-activity-scene bb-inline-activity" aria-label="통합 활동 기록 예시">
            <header><div><span>ACTIVITY LOG</span><strong>오늘의 활동 기록</strong></div><small>MLB 정규시즌</small></header>
            <div className="bb-activity-summary"><span>보유 포인트 <b>1,240P</b></span><span>오늘 변동 <b>+128P</b></span></div>
            <ol><li><i><Check size={14} /></i><div><small>21:31 · 7회 초</small><strong>다음 플레이 결과가 삼진일까요?</strong><span>내 선택 <b>NO</b> · 100P 참여</span></div><em>적중<br /><b>+45P</b></em></li><li><i><Coins size={14} /></i><div><small>20:42 · MLB 정규시즌</small><strong>출석 보너스</strong><span>7일 연속 방문</span></div><em>보너스<br /><b>+40P</b></em></li></ol>
          </section></div>
        </section>

        <section className="bb-flow-scene bb-grow-scene" aria-labelledby="bb-grow-scene-title">
          <header className="bb-scene-heading"><span>07 / GROW</span><h2 id="bb-grow-scene-title">쌓인 기록은<br />시즌의 위치가 됩니다.</h2><p>경기마다 쌓인 점수가 티어 진행도와 시즌·경기·구단 랭킹으로 이어집니다.</p></header>
          <section className="rank-tier-focus landing-ui-rank bb-inline-rank" aria-label="실제 시즌 티어 UI"><div className="tier-focus-hero">
            <span className="rank-kicker"><Trophy size={14} />SEASON BEST</span><span className="tier-season-status rank-card-season-status"><Clock3 size={14} /><span><small>2026 SUMMER</small><b>시즌 종료 D-18</b></span></span>
            <div className="tier-focus-emblem"><img src="/tier-badges/diamond.png" alt="" aria-hidden="true" /><h2>DIAMOND</h2><p>상위 4.8% · 전체 23위</p></div>
            <div className="tier-focus-summary"><div className="tier-focus-score"><div className="tier-focus-score-header"><span>RANK SCORE</span></div><strong>8,420<small> P</small></strong></div><div className="rank-promotion hybrid-tier-progress" aria-label="DIAMOND에서 ALL-STAR까지 42% 진행, 580점 남음"><div className="hybrid-tier-endpoint current"><span><img src="/tier-badges/diamond.png" alt="" /></span><div><small>현재 티어</small><strong>DIAMOND</strong></div></div><div className="hybrid-gauge"><header className="hybrid-gauge-remaining"><span>42% 진행</span><strong>580 P 남음</strong></header><div className="hybrid-gauge-track"><span style={{ width: '42%' }} /><i aria-hidden="true" style={{ left: '42%' }} /></div><footer className="hybrid-gauge-scale"><span>8,000 P</span><span>9,000 P</span></footer></div><div className="hybrid-tier-endpoint next"><span><img src="/tier-badges/all-star.png" alt="" /></span><div><small>다음 티어</small><strong>ALL-STAR</strong></div></div></div><dl className="tier-focus-stats"><div><dt>오늘 최고</dt><dd>760</dd></div><div><dt>연속 적중</dt><dd>4</dd></div><div><dt>시즌 참여</dt><dd>184</dd></div></dl></div>
          </div></section>
        </section>
      </section>

      <section className="landing-closing" aria-labelledby="landing-closing-title">
        <div><span>2026 SUMMER</span><h2 id="landing-closing-title">오늘의 경기를, 당신의 기록으로 남겨보세요.</h2></div>
        <button type="button" onClick={onRankings}>시즌 랭킹 보기 <ArrowRight size={17} aria-hidden="true" /></button>
      </section>
    </section>
  )
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const historyDialogRef = useRef<HTMLDialogElement>(null)
  const profileTab = profileTabFromPath(location.pathname)
  const [displayedAchievementIds, setDisplayedAchievementIds] = useState<AchievementId[]>([...DEFAULT_DISPLAYED_ACHIEVEMENT_IDS])
  const [voteMotionEnabled, setVoteMotionEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('better-batter-vote-motion') !== 'false'
  })
  const [favoriteTeamCode, setFavoriteTeamCode] = useState<TeamCode>(() => {
    const storedTeamCode = typeof window === 'undefined' ? null : window.localStorage.getItem('better-batter-favorite-team')
    return TEAM_OPTIONS.some((team) => team.code === storedTeamCode) ? storedTeamCode as TeamCode : DEFAULT_FAVORITE_TEAM_CODE
  })
  const [selectedGameId, setSelectedGameId] = useState(todayGames[0].id)
  const [selectedId, setSelectedId] = useState(1)
  const [side, setSide] = useState<Side | null>(null)
  const [amount, setAmount] = useState(200)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [points, setPoints] = useState(1240)
  const [pitch, setPitch] = useState(3)
  const [modalOpen, setModalOpen] = useState(false)
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all')
  const [authenticated, setAuthenticated] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [participatedIds, setParticipatedIds] = useState(() => new Set([2]))
  const [pollChoices, setPollChoices] = useState<Record<number, Side>>({ 2: 'no' })
  const [pollAmounts, setPollAmounts] = useState<Record<number, number>>({ 2: 200 })
  const [activePollIndex, setActivePollIndex] = useState(1)

  const selectedGame = todayGames.find((game) => game.id === selectedGameId) ?? todayGames[0]
  const favoriteTeam = teamByCode(favoriteTeamCode)
  const isLiveGame = selectedGame.status === 'live'
  const isScheduledGame = selectedGame.status === 'scheduled'
  const activeMarkets = isLiveGame ? marketsByGame[selectedGame.id] ?? [] : []
  const activePoll = activeMarkets.length ? activeMarkets[activePollIndex % activeMarkets.length] : undefined
  const selected = activeMarkets.find((market) => market.id === selectedId) ?? activeMarkets[0] ?? markets[0]
  const selectedParticipated = participatedIds.has(selected.id)
  const predictionHistory = predictionHistoryByGame[selectedGame.id] ?? []
  const visiblePositionRows = positionFilter === 'all'
    ? positionRows
    : positionRows.filter((row) => row.tone === positionFilter)
  const price = side === null ? null : side === 'yes' ? selected.yes : 100 - selected.yes
  const expected = price === null ? null : Math.floor(amount / (price / 100))
  const expectedGain = expected === null ? null : Math.max(0, expected - amount)
  const amountError = amount < 10
    ? '최소 10P부터 참여할 수 있습니다.'
    : amount > points
      ? '보유 포인트를 초과했습니다.'
      : ''
  const pitchDetail = pitch === 4
    ? { speed: '94.8 mph', type: '포심', result: '파울', tone: 'foul' }
    : pitch === 5
      ? { speed: '86.2 mph', type: '슬라이더', result: '볼', tone: 'ball' }
      : { speed: '96.1 mph', type: '포심', result: '스트라이크', tone: 'strike' }

  useEffect(() => {
    setNotificationsOpen(false)
    setUserMenuOpen(false)

    const pageTitle = location.pathname.startsWith('/mypage')
      ? '마이페이지'
      : location.pathname === '/community'
        ? '커뮤니티'
        : location.pathname === '/rankings'
          ? '랭킹'
          : location.pathname === '/predictions'
            ? '내 예측'
            : location.pathname === '/admin'
              ? '운영 관리'
              : location.pathname === '/about'
                ? 'BetterBatter 소개'
                : '라이브'
    document.title = `${pageTitle} | BetterBatter`
  }, [location.pathname])

  useEffect(() => {
    if (!isLiveGame || activeMarkets.length < 2 || modalOpen) return
    const rotationTimer = window.setInterval(() => {
      setActivePollIndex((current) => (current + 1) % activeMarkets.length)
    }, POLL_ROTATION_INTERVAL_MS)
    return () => window.clearInterval(rotationTimer)
  }, [activeMarkets.length, isLiveGame, modalOpen, selectedGame.id])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (modalOpen && !dialog.open) dialog.showModal()
    if (!modalOpen && dialog.open) dialog.close()
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [modalOpen])

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash !== '#predict') setModalOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const closePrediction = () => {
    setModalOpen(false)
    if (window.location.hash === '#predict' && window.history.state?.pitch9PredictionModal) {
      window.history.back()
    }
  }
  const openPredictionHistory = () => {
    const dialog = historyDialogRef.current
    if (!dialog) return
    const historyBody = dialog.querySelector<HTMLElement>('.prediction-history-body')
    dialog.showModal()
    requestAnimationFrame(() => {
      if (historyBody) historyBody.scrollTop = 0
    })
  }
  const closePredictionHistory = () => historyDialogRef.current?.close()
  const selectMarket = (marketId: number) => {
    if (!authenticated) {
      setAuthMode('login')
      return
    }
    setSelectedId(marketId)
    setSide(participatedIds.has(marketId) ? pollChoices[marketId] ?? null : null)
    if (participatedIds.has(marketId)) setAmount(pollAmounts[marketId] ?? 200)
    setNotice('')

    if (window.location.hash !== '#predict') {
      window.history.pushState(
        { ...(window.history.state ?? {}), pitch9PredictionModal: true },
        '',
        `${window.location.pathname}${window.location.search}#predict`,
      )
    }
    setModalOpen(true)
  }
  const placeOrder = () => {
    if (side === null || amountError || busy) return
    setBusy(true)
    setNotice('')
    window.setTimeout(() => {
      setBusy(false)
      setPoints((current) => current - amount)
      setParticipatedIds((current) => new Set(current).add(selectedId))
      setPollChoices((current) => ({ ...current, [selectedId]: side }))
      setPollAmounts((current) => ({ ...current, [selectedId]: amount }))
      setNotice(`${side.toUpperCase()} 예측에 ${amount.toLocaleString()}P 참여가 완료되었습니다.`)
      window.setTimeout(() => setNotice(''), 2800)
    }, 650)
  }

  const selectTodayGame = (gameId: string) => {
    const nextGame = todayGames.find((game) => game.id === gameId)
    if (!nextGame || nextGame.id === selectedGame.id) return
    closePrediction()
    closePredictionHistory()
    setSelectedGameId(nextGame.id)
    setSelectedId(marketsByGame[nextGame.id]?.[0]?.id ?? markets[0].id)
    setActivePollIndex(0)
    setSide(null)
    setPitch(3)
    setNotice(`${nextGame.awayCode} vs ${nextGame.homeCode} 경기로 이동했습니다.`)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const selectFavoriteTeam = (teamCode: TeamCode) => {
    const nextTeam = teamByCode(teamCode)
    setFavoriteTeamCode(teamCode)
    window.localStorage.setItem('better-batter-favorite-team', teamCode)
    setNotice(`${nextTeam.name} 팬으로 설정했습니다.`)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const updateVoteMotionPreference = (enabled: boolean) => {
    setVoteMotionEnabled(enabled)
    window.localStorage.setItem('better-batter-vote-motion', String(enabled))
    setNotice(enabled ? '투표 경쟁 애니메이션을 켰습니다.' : '투표 경쟁 애니메이션을 껐습니다.')
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header className="topbar">
        <Link className="brand" to="/about" aria-label="BetterBatter 서비스 소개" title="서비스 소개">
          <svg className="brand-wordmark" viewBox="98 223 1583 446" aria-hidden="true" focusable="false">
            <defs>
              <filter id="brand-dark-to-light" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feComponentTransfer in="SourceGraphic" result="inverted">
                  <feFuncR type="linear" slope="-1" intercept="1" />
                  <feFuncG type="linear" slope="-1" intercept="1" />
                  <feFuncB type="linear" slope="-1" intercept="1" />
                  <feFuncA type="identity" />
                </feComponentTransfer>
                <feBlend in="SourceGraphic" in2="inverted" mode="color" />
              </filter>
            </defs>
            <image href="/brand/better-batter-wordmark.png" width="1774" height="887" filter="url(#brand-dark-to-light)" />
          </svg>
          <img className="brand-icon" src="/brand/better-batter-icon.png" alt="" aria-hidden="true" />
        </Link>

        <nav className="primary-nav" aria-label="주요 메뉴">
          <NavLink to="/live" className={({ isActive }) => isActive ? 'active' : undefined}><Radio size={15} />라이브</NavLink>
          <NavLink to="/community" className={({ isActive }) => isActive ? 'active' : undefined}><MessageCircle size={15} />커뮤니티</NavLink>
          <NavLink to="/rankings" className={({ isActive }) => isActive ? 'active' : undefined}><Trophy size={15} />랭킹</NavLink>
          {authenticated
            ? <NavLink to="/mypage" className={({ isActive }) => isActive ? 'active' : undefined}><UserRound size={15} />마이</NavLink>
            : <button type="button" onClick={() => setAuthMode('login')}><UserRound size={15} />마이</button>}
        </nav>

        <div className="top-actions">
          {authenticated ? <>
            <span className="top-tier-chip"><img src="/tier-badges/diamond.png" alt="" aria-hidden="true" />DIAMOND</span>
          <button className="point-balance" type="button" onClick={() => navigate('/mypage/activity')} aria-label={`보유 포인트 ${points.toLocaleString()} 포인트, 활동 기록 열기`}><Coins size={15} /><strong>{points.toLocaleString()}</strong><span>P</span></button>
            <button className="icon-button notification-button" type="button" aria-label="알림 4개" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setUserMenuOpen(false) }}><Bell size={19} /><b>4</b></button>
            <button className="avatar" type="button" aria-label="프로필 메뉴 열기" aria-expanded={userMenuOpen} onClick={() => { setUserMenuOpen((open) => !open); setNotificationsOpen(false) }}><img src={DEFAULT_PROFILE_IMAGE} alt="" /></button>
          </> : <button className="login-button" type="button" onClick={() => setAuthMode('login')}>로그인</button>}
          {notificationsOpen && <NotificationPanel onClose={() => setNotificationsOpen(false)} onOpenSettings={() => { setNotificationsOpen(false); navigate('/mypage/settings') }} />}
          {userMenuOpen && <section className="user-menu" aria-label="사용자 메뉴"><div><UserAvatar size="small" /><p><strong>BetterBatter</strong><small>DIAMOND · <span style={teamAccentStyle(favoriteTeam.code)}>{favoriteTeam.code} · {favoriteTeam.name} 팬</span></small></p></div><button className="logout" type="button" onClick={() => { setAuthenticated(false); navigate('/live'); setUserMenuOpen(false) }}><LogOut size={14} />로그아웃</button></section>}
        </div>
      </header>

      <main id="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/live" replace />} />
          <Route path="/about" element={<LandingPage game={selectedGame} games={todayGames} market={activePoll ?? markets[1]} displayedAchievementIds={displayedAchievementIds} voteMotionEnabled={voteMotionEnabled} onLive={() => navigate('/live')} onRankings={() => navigate('/rankings')} />} />
          <Route path="/live" element={(
          <div className="live-layout">
            <div className="workspace">
              <section className="scoreboard" aria-labelledby="live-game-title">
                <header className="section-heading score-heading">
                  <h1 className="visually-hidden" id="live-game-title">{selectedGame.awayName} 대 {selectedGame.homeName}, {isLiveGame ? `${selectedGame.inning} ${selectedGame.outs}아웃 진행 중` : isScheduledGame ? `오늘 ${selectedGame.startTime} 경기 예정` : '경기 종료'}</h1>
                  <div className="score-heading-line" aria-hidden="true">
                    <span className={`live-badge status-${selectedGame.status}`}>{isLiveGame && <span className="pulse" />}{isLiveGame ? 'LIVE' : isScheduledGame ? 'TODAY' : 'FINAL'}</span>
                    {isLiveGame && <span className="score-broadcast-label">실시간 중계</span>}
                    <b>{isLiveGame ? selectedGame.inning : isScheduledGame ? selectedGame.startTime : '경기 종료'}</b>
                    {isLiveGame && <span className="score-out">{selectedGame.outs} OUT</span>}
                    <small>{selectedGame.venue.toUpperCase()}</small>
                  </div>
                  <div className="score-heading-actions">
                    <LiveGameSelector games={todayGames} selectedGameId={selectedGame.id} onSelectGame={selectTodayGame} label="오늘 경기" />
                  </div>
                </header>

                {!isLiveGame && <div className="score-grid">
                  <div className="team-score away">
                    <span className="team-monogram" style={teamBadgeStyle(selectedGame.awayCode)}>{selectedGame.awayCode}</span>
                    <div><small>AWAY · {selectedGame.awayCode}</small><strong>{selectedGame.awayName}</strong></div>
                    <b style={teamAccentStyle(selectedGame.awayCode)} aria-label={isScheduledGame ? `${selectedGame.awayName} 경기 전` : `${selectedGame.awayName} ${selectedGame.awayScore}점`}>{isScheduledGame ? '—' : selectedGame.awayScore}</b>
                  </div>

                  {!isLiveGame && <div className={`game-nonlive-state ${selectedGame.status}`} aria-label={isScheduledGame ? `오늘 ${selectedGame.startTime} 경기 예정` : '경기 종료'}>
                    <span>{isScheduledGame ? <Clock3 size={24} /> : <Check size={24} />}</span>
                    <strong>{isScheduledGame ? selectedGame.startTime : 'FINAL'}</strong>
                    <small>{isScheduledGame ? '경기 시작 전' : '경기 종료'}</small>
                  </div>}

                  <div className="team-score home">
                    <span className="team-monogram" style={teamBadgeStyle(selectedGame.homeCode)}>{selectedGame.homeCode}</span>
                    <div><small>HOME · {selectedGame.homeCode}</small><strong>{selectedGame.homeName}</strong></div>
                    <b style={teamAccentStyle(selectedGame.homeCode)} aria-label={isScheduledGame ? `${selectedGame.homeName} 경기 전` : `${selectedGame.homeName} ${selectedGame.homeScore}점`}>{isScheduledGame ? '—' : selectedGame.homeScore}</b>
                  </div>
                </div>}

                {!isLiveGame && <div className={`game-context-strip ${selectedGame.status}`}>
                  <span>{isScheduledGame ? <Clock3 size={15} /> : <Check size={15} />}</span>
                  <div><small>{isScheduledGame ? 'UPCOMING' : 'GAME COMPLETE'}</small><strong>{isScheduledGame ? `오늘 ${selectedGame.startTime} 시작 예정` : `${selectedGame.awayCode} ${selectedGame.awayScore} — ${selectedGame.homeScore} ${selectedGame.homeCode}`}</strong></div>
                  <p>{isScheduledGame ? `${selectedGame.venue}에서 열립니다.` : '응원톡과 결과는 다시 볼 수 있습니다.'}</p>
                </div>}

                {isLiveGame && <BallparkVisualizer game={selectedGame} pitch={pitch} pitchDetail={pitchDetail} />}
              </section>

              <div className="live-feature-region">
              <section className="markets" aria-labelledby="market-title">
                <header className="section-heading market-heading">
                  <div className="market-heading-title">
                    <h2 id="market-title">{isLiveGame ? '라이브 예측' : isScheduledGame ? '경기 전 안내' : '경기 종료'}</h2>
                    {isLiveGame && activePoll && <span className="poll-rotation-status" aria-live="polite"><Radio size={12} />{selectedGame.inning}</span>}
                  </div>
                  {isLiveGame && <button className="prediction-history-trigger" type="button" title="이전 투표 기록 보기" aria-label="이전 투표 기록 보기" aria-haspopup="dialog" aria-controls="prediction-history-dialog" onClick={openPredictionHistory}>
                    <History size={16} aria-hidden="true" /><span>이전 투표</span>
                  </button>}
                </header>
                {isLiveGame ? <div className="market-list">
                  {(activePoll ? [activePoll] : []).map((market) => {
                    const participated = participatedIds.has(market.id)
                    const chosenSide = pollChoices[market.id]

                    return <button
                      className={`market-row tone-${market.tone} ${modalOpen && selectedId === market.id ? 'selected' : ''} ${participated ? 'participated' : ''}`}
                      type="button"
                      key={market.id}
                      onClick={() => selectMarket(market.id)}
                      aria-haspopup="dialog"
                      aria-controls="prediction-dialog"
                    >
                      <MarketBackgroundArt category={market.category} />
                      <span className="market-copy">
                        <small>{market.category}</small>
                        <strong><MarketQuestion market={market} /></strong>
                        <em>
                          {market.status === 'closing' ? (
                            <span className="market-timer"><Clock3 size={11} />18초 남음</span>
                          ) : (
                            <span className="market-state open">진행 중</span>
                          )}
                          <span className="market-deadline">{market.status === 'closing' ? '투구 전까지' : market.closes}</span>
                        </em>
                      </span>
                      <span className="odds">
                        <span className={`yes ${market.yes >= 50 ? 'leading' : ''} ${chosenSide === 'yes' ? 'picked' : ''}`} aria-label={`YES ${market.yes}퍼센트${chosenSide === 'yes' ? ', 내 선택' : ''}`}>
                          <small>YES{chosenSide === 'yes' && <Check size={10} aria-hidden="true" />}</small>
                          <b><span>{market.yes}</span><em>%</em></b>
                        </span>
                        <span className={`no ${market.yes < 50 ? 'leading' : ''} ${chosenSide === 'no' ? 'picked' : ''}`} aria-label={`NO ${100 - market.yes}퍼센트${chosenSide === 'no' ? ', 내 선택' : ''}`}>
                          <small>NO{chosenSide === 'no' && <Check size={10} aria-hidden="true" />}</small>
                          <b><span>{100 - market.yes}</span><em>%</em></b>
                        </span>
                      </span>
                      <span className={`market-entry-hint ${participated ? 'completed' : ''}`}>
                        {participated ? <><Check size={12} aria-hidden="true" />참여 완료</> : <>눌러서 예측<ArrowRight size={14} aria-hidden="true" /></>}
                      </span>
                    </button>
                  })}
                </div> : <div className={`market-unavailable ${selectedGame.status}`}>
                  <span>{isScheduledGame ? <Clock3 size={22} /> : <Check size={22} />}</span>
                  <div><strong>{isScheduledGame ? '라이브 예측은 경기 시작 후 열립니다.' : '이 경기의 라이브 예측이 마감되었습니다.'}</strong><p>{isScheduledGame ? '경기가 시작되면 현재 타석과 이닝 예측에 참여할 수 있습니다.' : '완료된 예측과 포인트 정산은 마이페이지에서 확인할 수 있습니다.'}</p></div>
                </div>}
              </section>

              <div className="live-feature-chat-pane">
                <LiveGameChat games={todayGames} selectedGameId={selectedGame.id} activePoll={activePoll} displayedAchievementIds={displayedAchievementIds} />
              </div>
              </div>

            </div>

            <dialog
              id="prediction-dialog"
              className={`order-panel prediction-modal tone-${selected.tone}`}
              ref={dialogRef}
              aria-labelledby="order-title"
              onCancel={(event) => {
                event.preventDefault()
                closePrediction()
              }}
              onClick={(event) => {
                if (event.target === event.currentTarget) closePrediction()
              }}
            >
              <header className="order-modal-header">
                <button className="modal-back" type="button" onClick={closePrediction}><ArrowLeft size={16} />뒤로</button>
                <h2 id="order-title" className="visually-hidden">{selectedParticipated ? '참여한 예측 확인' : '예측 참여'}</h2>
                <span className="order-header-spacer" aria-hidden="true" />
                <div className="order-header-actions">
                  <button className="modal-close" type="button" onClick={closePrediction} aria-label="예측 창 닫기"><X size={17} /></button>
                </div>
              </header>
              <div className="selected-market">
                <small>{selected.category}</small>
                <strong><MarketQuestion market={selected} /></strong>
                <div className="selected-market-meta">
                  <span><i className="pulse" /> 실시간 확률 · 2초 전 갱신</span>
                  <InfoTip label="결과 판정 기준" triggerText="판정 기준?">
                    <strong>결과 판정 기준</strong>
                    <span>{selected.resolution}</span>
                    <small>출처 · MLB 공식 Play-by-Play</small>
                  </InfoTip>
                </div>
              </div>

              <PowerCorePicker market={selected} side={side} active={modalOpen} motionEnabled={voteMotionEnabled} readOnly={selectedParticipated} onSelect={setSide} />

              <div className={`amount-field ${selectedParticipated ? 'review' : ''}`}>
                <div className="amount-heading">
                  <span className="amount-label-group">
                    <label htmlFor="point-amount">참여 포인트</label>
                    <InfoTip label="무료 팬 참여 포인트 안내" triggerText="?">
                      <strong>무료 팬 참여 포인트</strong>
                      <span>현금 구매·환전·사용자 간 양도가 불가능합니다.</span>
                    </InfoTip>
                  </span>
                  <button
                    className={`amount-balance ${amount >= points ? 'active' : ''}`}
                    id="amount-balance"
                    type="button"
                    aria-label={amount >= points ? `보유 ${points.toLocaleString()}P 전부 사용 중` : `보유 ${points.toLocaleString()}P 전부 사용`}
                    aria-pressed={amount >= points}
                    onClick={() => setAmount(points)}
                    disabled={selectedParticipated}
                  >
                    <span>보유</span>
                    <strong>{points.toLocaleString()}P</strong>
                    <em>{amount >= points && <Check size={10} aria-hidden="true" />}전부</em>
                  </button>
                </div>
                <div className="amount-value">
                  <span className="amount-entry">
                    <input id="point-amount" type="number" inputMode="numeric" min="10" max={points} step="10" value={amount} disabled={selectedParticipated} aria-invalid={Boolean(amountError)} aria-describedby={amountError ? 'amount-balance amount-error' : 'amount-balance'} onChange={(event) => setAmount(Math.max(0, Number(event.target.value)))} />
                    <span>P</span>
                  </span>
                  <span className={`amount-gain-preview ${expected === null ? 'is-pending' : ''}`} aria-live="polite">
                    <i aria-hidden="true">↗</i>
                    <span>
                      <em>적중 시 예상</em>
                      <strong>{expected === null ? '—' : `${expected.toLocaleString()}P`}</strong>
                      <small>{expectedGain === null ? '선택 후' : `+${expectedGain.toLocaleString()}P`}</small>
                    </span>
                  </span>
                </div>
                <div className="amount-adjustments" role="group" aria-label="참여 포인트 증감">
                  {[-100, -50, 50, 100].map((delta) => (
                    <button
                      type="button"
                      key={delta}
                      aria-label={`참여 포인트 ${Math.abs(delta)}P ${delta < 0 ? '줄이기' : '늘리기'}`}
                      disabled={selectedParticipated || amount + delta < 10 || amount + delta > points}
                      onClick={() => setAmount((current) => Math.min(points, Math.max(10, current + delta)))}
                    >
                      {delta < 0 ? '−' : '＋'}{Math.abs(delta)}
                    </button>
                  ))}
                </div>
                {amountError && <p className="amount-error" id="amount-error" role="alert">{amountError}</p>}
              </div>

              <button className={`submit-order ${selectedParticipated ? 'review-complete' : side ? `side-${side}` : 'side-unselected'}`} type="button" onClick={placeOrder} disabled={selectedParticipated || busy || Boolean(amountError) || side === null} aria-busy={busy} aria-describedby="order-deadline">
                {selectedParticipated ? <><Check size={17} />참여 완료 · {side?.toUpperCase()} 선택</> : busy ? <><RefreshCw className="spin" size={17} />참여 처리 중</> : side ? <>{side.toUpperCase()}에 {amount.toLocaleString()}P 참여<ArrowRight size={17} /></> : <>결과를 먼저 선택하세요</>}
              </button>
              <p className="order-deadline" id="order-deadline">{selectedParticipated ? <><Check size={13} />참여한 예측 내용을 다시 확인하고 있어요.</> : <><Clock3 size={13} />다음 투구 전까지 참여할 수 있어요.</>}</p>
            </dialog>

            <dialog
              id="prediction-history-dialog"
              className="prediction-history-dialog"
              ref={historyDialogRef}
              aria-labelledby="prediction-history-title"
              onCancel={(event) => {
                event.preventDefault()
                closePredictionHistory()
              }}
              onClick={(event) => {
                if (event.target === event.currentTarget) closePredictionHistory()
              }}
            >
              <header className="prediction-history-header">
                <div>
                  <span>{selectedGame.awayCode} vs {selectedGame.homeCode} · 오늘</span>
                  <h2 id="prediction-history-title">이전 질문 기록</h2>
                </div>
                <button type="button" onClick={closePredictionHistory} aria-label="이전 질문 기록 닫기"><X size={19} /></button>
              </header>

              <div className="prediction-history-body">
                <PredictionHistoryContent items={predictionHistory} summaryLabel="오늘의 예측 기록 요약" />
              </div>
            </dialog>
          </div>
          )} />

          <Route path="/predictions" element={(
          <section className="subpage predictions-page" aria-labelledby="positions-title">
            <header className="subpage-heading">
              <div className="subpage-title-row">
                <div><h1 id="positions-title">내 예측</h1><p>참여와 정산 현황을 확인합니다.</p></div>
                <span className="position-exposure"><small>진행 중 참여</small><strong>{activePositionTotal.toLocaleString()}P</strong><em>{activePositionRows.length}건</em></span>
              </div>
            </header>
            <section className="metric-row" aria-label="예측 요약">
              <div className="metric-primary"><span>진행 중</span><strong>{activePositionRows.length}</strong><small>{activePositionTotal.toLocaleString()}P 참여</small></div>
              <div><span>오늘 수익</span><strong className="positive">+189P</strong><small>2건 정산</small></div>
              <div><span>적중률</span><strong>58%</strong><small>최근 30건</small></div>
            </section>
            <section className="data-panel" aria-labelledby="positions-list-title">
              <header className="position-list-toolbar">
                <div><h2 id="positions-list-title">참여 내역</h2><p>최근 참여 순</p></div>
                <div className="position-filters" role="group" aria-label="참여 내역 필터">
                  {([
                    ['all', `전체 ${positionRows.length}`],
                    ['live', `진행 중 ${activePositionRows.length}`],
                    ['settled', `정산 ${positionRows.length - activePositionRows.length}`],
                  ] as Array<[PositionFilter, string]>).map(([filter, label]) => (
                    <button type="button" className={positionFilter === filter ? 'active' : ''} aria-pressed={positionFilter === filter} onClick={() => setPositionFilter(filter)} key={filter}>{label}</button>
                  ))}
                </div>
              </header>
              <div className="position-list">
                {visiblePositionRows.map((row, rowIndex) => (
                  <article className={`position-row ${row.tone}`} key={`${row.context}-${row.side}`}>
                    <header className="position-row-heading">
                      <span className={`position-status ${row.tone}`}>{row.tone === 'live' ? '진행 중' : '적중 · 정산 완료'}</span>
                      <strong className="market-question">
                        {row.questionParts.map((part, partIndex) => <span className={part.emphasis ? `question-keyword ${part.emphasis}` : undefined} key={`${rowIndex}-${partIndex}`}>{part.text}</span>)}
                      </strong>
                      <small>{row.context}</small>
                    </header>
                    <dl className="position-details">
                      <div className={`position-choice ${row.side.toLowerCase()}`}><dt>선택</dt><dd>{row.side}</dd></div>
                      <div><dt>참여</dt><dd>{row.amount.toLocaleString()}P</dd></div>
                      <div><dt>당시 확률</dt><dd>{row.price}%</dd></div>
                      <div className={`position-return ${row.tone}`}>
                        <dt>{row.tone === 'live' ? '적중 시 예상' : '수령'}</dt>
                        <dd>{row.returnAmount.toLocaleString()}P</dd>
                        <em>+{row.profit.toLocaleString()}P</em>
                        {row.tone === 'settled' && row.verificationId && (
                          <details className="position-verification">
                            <summary><ShieldCheck size={12} />검증 정보</summary>
                            <div>
                              <strong>공식 경기 기록으로 결과 확인</strong>
                              <span><time dateTime={`2026-08-24T${row.verifiedAt}+09:00`}>{row.verifiedAt}</time><code>{row.verificationId}</code></span>
                            </div>
                          </details>
                        )}
                      </div>
                    </dl>
                  </article>
                ))}
                {visiblePositionRows.length === 0 && <p className="position-empty">해당 상태의 참여 내역이 없습니다.</p>}
              </div>
            </section>
          </section>
          )} />

          <Route path="/community" element={<CommunityPage favoriteTeamCode={favoriteTeamCode} displayedAchievementIds={displayedAchievementIds} onRequireLogin={() => { if (authenticated) { setNotice('커뮤니티 운영 정책을 확인했습니다.'); window.setTimeout(() => setNotice(''), 2200) } else { setAuthMode('login') } }} />} />
          <Route path="/rankings" element={<RankingsPage favoriteTeamCode={favoriteTeamCode} games={todayGames} selectedGameId={selectedGame.id} onSelectGame={selectTodayGame} displayedAchievementIds={displayedAchievementIds} />} />
          <Route path="/mypage/*" element={authenticated
            ? <ProfilePage points={points} favoriteTeamCode={favoriteTeamCode} onFavoriteTeamChange={selectFavoriteTeam} displayedAchievementIds={displayedAchievementIds} onDisplayedAchievementIdsChange={setDisplayedAchievementIds} voteMotionEnabled={voteMotionEnabled} onVoteMotionEnabledChange={updateVoteMotionPreference} onAdmin={() => navigate('/admin')} tab={profileTab} onTabChange={(tab) => navigate(PROFILE_TAB_PATHS[tab])} />
            : <Navigate to="/live" replace />} />
          <Route path="/admin" element={authenticated ? <AdminPage /> : <Navigate to="/live" replace />} />
          <Route path="*" element={<Navigate to="/live" replace />} />
        </Routes>
      </main>

      {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onSuccess={() => { setAuthenticated(true); setAuthMode(null); navigate('/mypage'); setNotice('로그인되었습니다.'); window.setTimeout(() => setNotice(''), 2200) }} />}
      <div className={`toast ${notice ? 'show' : ''}`} role="status" aria-live="polite"><Check size={16} />{notice}</div>
    </div>
  )
}

export default App
