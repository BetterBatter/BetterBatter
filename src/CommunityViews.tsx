import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  Coins,
  CornerDownRight,
  Eye,
  Flag,
  Flame,
  Gamepad2,
  Hash,
  Heart,
  ImagePlus,
  LockKeyhole,
  Mail,
  Megaphone,
  MessageCircle,
  Plus,
  Pin,
  Radio,
  Search,
  Send,
  ShieldCheck,
  SquarePen,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import { LiveGameSelector, type LiveGameOption } from './LiveGameSelector'
import { PredictionHistoryContent, type ActivityHistoryItem, type PredictionHistoryItem } from './PredictionHistory'
import { teamAccentStyle, teamBadgeStyle, teamTagStyle, type TeamCode } from './teamBrand'

type PostCategory = '분석·예측' | '팀 라운지' | '야구 이야기' | '자유'
type CommunitySort = 'latest' | 'popular'
type LiveMessage = { id: number; author: string; tier: string; time: string; body: string; mine: boolean }
type CommunityScreen = 'list' | 'detail'
type CommunityScope = 'recommended' | 'general' | 'following' | 'team'
type RankingScope = 'season' | 'game' | 'team'
export type ProfileTab = 'overview' | 'activity' | 'badges' | 'settings'
type NotificationPreferences = { game: boolean; prediction: boolean; community: boolean; achievement: boolean }

const defaultNotificationPreferences: NotificationPreferences = { game: true, prediction: true, community: true, achievement: true }

function readStoredPreferences<T extends Record<string, boolean>>(key: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults
  try {
    const saved = window.localStorage.getItem(key)
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
  } catch {
    return defaults
  }
}
export type LivePoll = { id: number; category: string; question: string; yes: number; closes: string; status: string }
type PollChoice = 'yes' | 'no'
type ThreadPost = {
  id: number
  category: PostCategory
  title: string
  author: string
  tier: string
  time: string
  comments: number
  likes: number
  views: number
  popular: boolean
  body: string
  tags?: string[]
  image?: string
  imageAlt?: string
}
type ThreadComment = {
  id: number
  author: string
  tier: string
  time: string
  body: string
  likes: number
  parentId?: number
  replyTo?: string
}

const profileAchievements = [
  { id: 'first-prediction', name: '첫 예측', detail: '라이브 예측에 처음 참여', image: '/achievements/first-prediction.png', rarity: 'common', rarityLabel: '일반', earned: true, earnedAt: '2026-08-10', progress: 100, progressLabel: '달성', evolution: null },
  { id: 'clutch-hitter', name: '클러치 히터', detail: '연속 예측 적중 기록', image: '/achievements/clutch-hitter.png', rarity: 'common', rarityLabel: '일반', earned: true, earnedAt: '2026-08-23', progress: 100, progressLabel: '달성', evolution: { current: 5, unit: '연속', stages: [
    { threshold: 3, image: '/achievements/evolution/clutch-hitter-stage-1.png' },
    { threshold: 5, image: '/achievements/evolution/clutch-hitter-stage-2.png' },
    { threshold: 10, image: '/achievements/evolution/clutch-hitter-stage-3.png' },
    { threshold: 20, image: '/achievements/evolution/clutch-hitter-stage-4.png' },
  ] } },
  { id: 'hot-streak', name: '뜨거운 타석', detail: '연속 라이브 참여 기록', image: '/achievements/hot-streak.png', rarity: 'epic', rarityLabel: '에픽', earned: true, earnedAt: '2026-08-20', progress: 100, progressLabel: '달성', evolution: { current: 7, unit: '일', stages: [
    { threshold: 7, image: '/achievements/evolution/hot-streak-stage-1.png' },
    { threshold: 30, image: '/achievements/evolution/hot-streak-stage-2.png' },
    { threshold: 90, image: '/achievements/evolution/hot-streak-stage-3.png' },
    { threshold: 180, image: '/achievements/evolution/hot-streak-stage-4.png' },
  ] } },
  { id: 'dugout-leader', name: '덕아웃 리더', detail: '커뮤니티 공감 누적 기록', image: '/achievements/dugout-leader.png', rarity: 'common', rarityLabel: '일반', earned: true, earnedAt: '2026-08-14', progress: 100, progressLabel: '달성', evolution: { current: 1000, unit: '공감', stages: [
    { threshold: 100, image: '/achievements/evolution/dugout-leader-stage-1.png' },
    { threshold: 1000, image: '/achievements/evolution/dugout-leader-stage-2.png' },
    { threshold: 5000, image: '/achievements/evolution/dugout-leader-stage-3.png' },
    { threshold: 10000, image: '/achievements/evolution/dugout-leader-stage-4.png' },
  ] } },
  { id: 'comeback-call', name: '역전의 한 수', detail: '역전 결과 예측 5회 적중', image: '/achievements/comeback-call.png', rarity: 'rare', rarityLabel: '희귀', earned: false, earnedAt: null, progress: 60, progressLabel: '3 / 5', evolution: null },
  { id: 'night-game', name: '야간 원정대', detail: '야간 경기 10회 참여', image: '/achievements/night-game.png', rarity: 'rare', rarityLabel: '희귀', earned: false, earnedAt: null, progress: 70, progressLabel: '7 / 10', evolution: null },
  { id: 'ballpark-regular', name: '구장 단골', detail: '5개 구장 경기 참여', image: '/achievements/ballpark-regular.png', rarity: 'rare', rarityLabel: '희귀', earned: false, earnedAt: null, progress: 40, progressLabel: '2 / 5', evolution: null },
  { id: 'season-challenger', name: '시즌 챌린저', detail: '한 시즌 예측 250회 참여', image: '/achievements/season-challenger.png', rarity: 'legendary', rarityLabel: '전설', earned: false, earnedAt: null, progress: 74, progressLabel: '184 / 250', evolution: null },
] as const

type ProfileAchievement = (typeof profileAchievements)[number]
export type AchievementId = (typeof profileAchievements)[number]['id']
export const DEFAULT_DISPLAYED_ACHIEVEMENT_IDS: readonly AchievementId[] = ['clutch-hitter', 'hot-streak', 'dugout-leader']

function achievementEvolutionState(achievement: ProfileAchievement) {
  const evolution = achievement.evolution
  if (!evolution) return null

  let stageIndex = 0
  evolution.stages.forEach((stage, index) => {
    if (evolution.current >= stage.threshold) stageIndex = index
  })
  const stage = evolution.stages[stageIndex]
  const nextStage = evolution.stages[stageIndex + 1] ?? null
  const progress = nextStage ? Math.min(100, Math.round((evolution.current / nextStage.threshold) * 100)) : 100
  const currentValue = evolution.current.toLocaleString('ko-KR')
  const nextValue = nextStage?.threshold.toLocaleString('ko-KR')

  return {
    stageIndex,
    stage,
    nextStage,
    progress,
    progressLabel: nextStage ? `${currentValue} / ${nextValue}` : '최종 단계',
    stageLabel: `${stageIndex + 1}단계`,
  }
}

function achievementArtwork(achievement: ProfileAchievement) {
  return achievementEvolutionState(achievement)?.stage.image ?? achievement.image
}

function achievementTooltip(achievement: ProfileAchievement) {
  const evolution = achievementEvolutionState(achievement)
  return evolution ? `${achievement.name} · ${evolution.stageLabel}` : achievement.name
}

const baseSuggestedThreadTags = ['#LAD', '#SF', '#LADvsSF', '#직관', '#집관', '#구장먹거리', '#팬스타일', '#응원'] as const
const DEFAULT_VISIBLE_TAG_COUNT = 5
const categoryThreadTag: Record<PostCategory, string> = {
  '분석·예측': '#분석',
  '팀 라운지': '#팀이야기',
  '야구 이야기': '#야구이야기',
  '자유': '#자유',
}

const THREAD_BATCH_SIZE = 5
const MAX_DRAFT_TAGS = 10

const posts: ThreadPost[] = [
  { id: 1, category: '분석·예측' as PostCategory, title: '오타니 다음 타석, 초구부터 승부할까요?', author: 'BlueCurve', tier: 'DIAMOND', time: '1분 전', comments: 3, likes: 126, views: 842, popular: true, body: '도발이 초구 스트라이크 비율을 끌어올리고 있어서 초구부터 적극적으로 들어올 가능성이 높아 보여요.\n\n다만 직전 타석에서 바깥쪽 슬라이더에 타이밍이 늦었던 만큼, 오타니가 초구 변화구를 지켜본 뒤 2구째부터 승부할 수도 있습니다. 여러분은 어떤 흐름으로 보시나요?' },
  { id: 18, category: '야구 이야기' as PostCategory, title: '경기 한 시간 전, 구장 풍경 먼저 공유해요', author: 'FirstGate', tier: 'SILVER', time: '4분 전', comments: 1, likes: 37, views: 214, popular: false, body: '관중이 들어오기 전 잔디와 내야를 정리하는 시간이 생각보다 평화롭네요. 일찍 입장하면 경기 전 연습도 보고 사진도 여유 있게 남길 수 있어서 좋았습니다.\n\n여러분은 보통 경기 시작 몇 분 전에 구장에 도착하시나요?', tags: ['#직관', '#구장풍경', '#야구이야기'], image: '/community/pregame-stadium.jpg', imageAlt: '경기 시작 전 관중이 드문 야구장에서 그라운드 관리 직원들이 내야를 정리하는 모습' },
  { id: 2, category: '분석·예측' as PostCategory, title: '오늘 불펜 운영은 8회부터가 핵심 같네요', author: 'LA_since08', tier: 'PLATINUM', time: '9분 전', comments: 2, likes: 94, views: 615, popular: true, body: '선발 투구 수와 현재 타순을 보면 8회 상위 타선 구간이 가장 큰 승부처입니다.\n\n필립스가 8회를 막고 9회에 트라이넨을 붙이는 운영이 가장 안정적으로 보이는데, 좌타 구간에서 변수가 생길 수 있겠네요.' },
  { id: 17, category: '자유' as PostCategory, title: '집관 세팅 완료했습니다. 오늘은 기록하면서 볼게요', author: 'SofaScout', tier: 'GOLD', time: '14분 전', comments: 2, likes: 63, views: 391, popular: true, body: '오늘은 팝콘과 탄산수 준비하고 타석별 배합을 간단히 적어보려고 합니다. 이렇게 기록하면서 보니 같은 장면도 더 오래 기억에 남더라고요.\n\n집에서 경기 볼 때 꼭 챙기는 간식이나 루틴이 있나요?', tags: ['#집관', '#응원', '#야구이야기'], image: '/community/home-tv-watch.jpg', imageAlt: '따뜻한 조명의 거실에서 TV 야구 경기를 보며 팝콘과 기록 노트를 펼쳐둔 모습' },
  { id: 4, category: '팀 라운지' as PostCategory, title: '다저스 수비 시프트 위치, 오늘 정말 좋았습니다', author: 'NineInning', tier: 'SILVER', time: '19분 전', comments: 0, likes: 21, views: 188, popular: false, body: '당겨 치는 타구 비율에 맞춰 2루수가 한 걸음 더 깊게 들어간 선택이 두 번이나 아웃으로 이어졌습니다. 오늘 수비 코치 준비가 좋았네요.' },
  { id: 5, category: '팀 라운지' as PostCategory, title: '도발의 슬라이더 각이 오늘 유난히 좋네요', author: 'OrangeBay', tier: 'GOLD', time: '24분 전', comments: 1, likes: 38, views: 264, popular: false, body: '우타자 바깥쪽으로 빠지는 공과 스트라이크존 끝에 걸치는 공의 출발점이 거의 같아 보입니다. 포심과 조합되니 더 까다롭네요.' },
  { id: 6, category: '분석·예측' as PostCategory, title: '7회 말 득점 확률, 주자 상황보다 타순이 중요해 보여요', author: 'StatFan', tier: 'PLATINUM', time: '38분 전', comments: 1, likes: 56, views: 349, popular: true, body: '현재 주자는 없지만 2번 타자부터 시작하는 이닝이라 출루 하나만 나오면 기대 득점이 빠르게 올라갈 수 있습니다.' },
  { id: 7, category: '야구 이야기' as PostCategory, title: '처음 직관 가는 친구에게 꼭 알려줄 팁이 있을까요?', author: 'FirstPitch', tier: 'BRONZE', time: '46분 전', comments: 2, likes: 44, views: 302, popular: false, body: '경기 시작 한 시간 전 도착하는 것과 모바일 티켓 준비 말고도 초보 관람객이 알면 좋은 팁을 모아보고 싶어요.' },
  { id: 14, category: '야구 이야기' as PostCategory, title: '구장 신메뉴 먹어봤어요. 이 조합 괜찮네요', author: 'BallparkBites', tier: 'GOLD', time: '50분 전', comments: 2, likes: 84, views: 529, popular: true, body: '핫도그는 소스가 진해서 감자튀김과 같이 먹기 좋았고, 경기 시작 전에 받아서 자리에서 천천히 먹었습니다. 양은 둘이 나누기보다 한 명이 먹기 적당했어요.\n\n다른 구장에서 꼭 먹어봐야 할 메뉴도 추천해주세요.', tags: ['#직관', '#구장먹거리', '#야구이야기'], image: '/community/ballpark-food.jpg', imageAlt: '노을이 비치는 야구장 좌석에서 핫도그와 감자튀김, 차가운 음료를 놓고 찍은 모습' },
  { id: 3, category: '야구 이야기' as PostCategory, title: '구장별 응원 문화 차이가 생각보다 크네요', author: 'ballpark_trip', tier: 'GOLD', time: '54분 전', comments: 2, likes: 72, views: 431, popular: true, body: '이번 시즌에 세 구장을 다녀왔는데 같은 팀을 응원해도 박수 타이밍과 구호가 꽤 달랐습니다.\n\n구장마다 기억에 남는 응원 방식이나 처음 방문하는 팬에게 추천하고 싶은 문화가 있나요?', tags: ['#LAD', '#직관', '#응원'], image: '/community/night-game-from-stands.png', imageAlt: '야간 야구 경기장에서 관중들이 남색과 크림색 응원 수건을 들고 그라운드를 바라보는 모습' },
  { id: 8, category: '자유' as PostCategory, title: '오늘 경기 보면서 먹을 야식 추천받습니다', author: 'LateInning', tier: 'SILVER', time: '1시간 5분 전', comments: 1, likes: 18, views: 176, popular: false, body: '경기가 길어질 것 같아서 간단하게 먹을 야식을 찾고 있습니다. 너무 무겁지 않은 메뉴면 더 좋아요.' },
  { id: 9, category: '팀 라운지' as PostCategory, title: '샌프란시스코 원정 라인업에서 기대되는 선수', author: 'McCoveyCove', tier: 'GOLD', time: '1시간 18분 전', comments: 0, likes: 33, views: 221, popular: false, body: '최근 좌완 상대 타구 질이 좋아진 선수들을 중심으로 원정 라인업을 예상해봤습니다.' },
  { id: 10, category: '분석·예측' as PostCategory, title: '초구 스트라이크 이후 타격 결과 데이터를 정리했습니다', author: 'PitchLab', tier: 'DIAMOND', time: '1시간 31분 전', comments: 1, likes: 81, views: 507, popular: true, body: '최근 20경기의 초구 스트라이크 이후 타석 결과를 간단히 정리했습니다. 0-1 카운트에서 장타보다 출루율 하락이 더 크게 나타났습니다.' },
  { id: 15, category: '자유' as PostCategory, title: '첫 직관 티셔츠, 이 색 조합으로 골랐어요', author: 'JerseyDay', tier: 'ROOKIE', time: '1시간 46분 전', comments: 1, likes: 46, views: 286, popular: false, body: '로고가 큰 유니폼보다 평소에도 입을 수 있는 네이비와 크림 조합으로 준비해봤습니다. 모자는 포인트로 살짝 다른 색을 골랐는데 과하지 않은 것 같아 마음에 들어요.\n\n직관 갈 때 편하면서도 사진 잘 나오는 팬 스타일 추천도 받아요.', tags: ['#팬스타일', '#직관', '#자유'], image: '/community/fan-tshirt.jpg', imageAlt: '나무 벤치 위에 네이비와 크림색 야구 티셔츠, 모자와 티켓 지갑을 준비해 둔 모습' },
  { id: 11, category: '야구 이야기' as PostCategory, title: '이번 주 가장 인상적이었던 수비 장면은?', author: 'GloveWork', tier: 'GOLD', time: '2시간 5분 전', comments: 0, likes: 29, views: 193, popular: false, body: '홈런만큼 기억에 남는 수비 장면을 함께 모아보고 싶습니다. 저는 어제 6회 다이빙 캐치가 가장 인상적이었어요.' },
  { id: 12, category: '자유' as PostCategory, title: '응원 유니폼 마킹 고민 중입니다', author: 'JerseyDay', tier: 'ROOKIE', time: '2시간 24분 전', comments: 1, likes: 14, views: 142, popular: false, body: '첫 유니폼이라 오래 응원할 선수를 고르고 싶습니다. 여러분의 첫 마킹은 누구였나요?' },
  { id: 16, category: '팀 라운지' as PostCategory, title: '9회 응원 분위기 정말 뜨거웠어요', author: 'StandTogether', tier: 'PLATINUM', time: '2시간 52분 전', comments: 2, likes: 118, views: 704, popular: true, body: '한 점 차 9회가 되니 모르는 사람끼리도 타이밍을 맞춰 수건을 들게 되더라고요. 결과와 별개로 오늘 직관에서 가장 오래 기억에 남을 순간입니다.\n\n사진만 봐도 그때 함성이 다시 들리는 것 같아요.', tags: ['#LAD', '#직관', '#응원'], image: '/community/crowd-cheering.jpg', imageAlt: '야간 야구 경기장에서 팬들이 흰 수건을 들고 함께 응원하는 뒷모습' },
  { id: 13, category: '팀 라운지' as PostCategory, title: '다음 홈 시리즈 선발 로테이션 예상', author: 'BlueRotation', tier: 'PLATINUM', time: '4시간 전', comments: 0, likes: 47, views: 318, popular: false, body: '휴식일과 최근 투구 수를 기준으로 다음 홈 시리즈의 선발 순서를 예상했습니다.' },
]

function tagsForThread(post: ThreadPost) {
  if (post.tags) return post.tags
  const teamTag = ['OrangeBay', 'McCoveyCove'].includes(post.author) ? '#SF' : '#LAD'
  const gameTag = post.category === '분석·예측' ? '#LADvsSF' : null
  return Array.from(new Set([teamTag, categoryThreadTag[post.category], gameTag].filter((tag): tag is string => Boolean(tag))))
}

const initialComments: Record<number, ThreadComment[]> = {
  18: [{ id: 1801, author: 'ballpark_trip', tier: 'GOLD', time: '방금', body: '저도 최소 한 시간 전에는 들어가요. 빈 구장 특유의 분위기가 좋더라고요.', likes: 4 }],
  17: [
    { id: 1701, author: 'PitchLab', tier: 'PLATINUM', time: '2분 전', body: '직접 적어보면 불펜 투수 배합이 바뀌는 지점이 잘 보여서 재미있어요.', likes: 8 },
    { id: 1702, author: 'LateInning', tier: 'SILVER', time: '1분 전', body: '저는 집관할 때 소리 작은 간식을 고르는 것도 중요합니다.', likes: 5 },
  ],
  16: [
    { id: 1601, author: 'BlueCurve', tier: 'DIAMOND', time: '5분 전', body: '마지막 아웃카운트까지 다 같이 서 있던 장면이 아직도 생생하네요.', likes: 11 },
    { id: 1602, author: 'FirstGate', tier: 'SILVER', time: '3분 전', body: '처음 직관 온 친구도 이 순간에 완전히 팬이 됐습니다.', likes: 7 },
  ],
  15: [{ id: 1501, author: 'FirstPitch', tier: 'BRONZE', time: '8분 전', body: '크림색이 사진에서 밝게 보여서 정말 잘 어울릴 것 같아요.', likes: 5 }],
  14: [
    { id: 1401, author: 'LateInning', tier: 'SILVER', time: '13분 전', body: '소스가 많은 핫도그는 경기 시작 전에 먹는 게 정답이죠.', likes: 6 },
    { id: 1402, author: 'ballpark_trip', tier: 'GOLD', time: '10분 전', body: '다음 원정 때 구장별 대표 메뉴도 스레드로 모아봐요.', likes: 9 },
  ],
  1: [
    { id: 101, author: 'PitchLab', tier: 'PLATINUM', time: '2분 전', body: '저도 초구 포심 가능성을 높게 봅니다. 앞 타석 배합과도 잘 맞아요.', likes: 12 },
    { id: 102, author: 'NineInning', tier: 'SILVER', time: '1분 전', body: '초구는 지켜보고 2구째 슬라이더를 노리는 쪽에 한 표입니다.', likes: 7 },
    { id: 103, author: 'BetterBatter', tier: 'DIAMOND', time: '방금', body: '현재 투수의 좌타 상대 초구 스트라이크 비율도 같이 보면 좋겠네요.', likes: 3 },
  ],
  2: [
    { id: 201, author: 'CloserNine', tier: 'GOLD', time: '5분 전', body: '8회 좌타 구간에서 한 명 더 준비시킬 것 같아요.', likes: 8 },
    { id: 202, author: 'LA_since08', tier: 'PLATINUM', time: '3분 전', body: '맞아요. 그래서 7회 투구 수를 더 지켜봐야 할 것 같습니다.', likes: 4 },
  ],
  3: [
    { id: 301, author: 'FirstPitch', tier: 'BRONZE', time: '9분 전', body: '처음 간 구장에서 다 같이 일어나는 타이밍을 몰라서 당황했던 기억이 나요.', likes: 6 },
    { id: 302, author: 'ballpark_trip', tier: 'GOLD', time: '6분 전', body: '그 차이가 재미있죠. 구장별 응원 가이드도 정리해볼게요.', likes: 5 },
  ],
  5: [{ id: 501, author: 'McCoveyCove', tier: 'GOLD', time: '18분 전', body: '포심과 같은 궤적으로 오다가 마지막에 빠지는 움직임이 좋네요.', likes: 4 }],
  6: [{ id: 601, author: 'BlueCurve', tier: 'DIAMOND', time: '25분 전', body: '상위 타순 시작이라 첫 타자 출루가 정말 중요하겠습니다.', likes: 7 }],
  7: [
    { id: 701, author: 'ballpark_trip', tier: 'GOLD', time: '34분 전', body: '입장 전에 구장 앱과 반입 규정을 확인하면 좋아요.', likes: 9 },
    { id: 702, author: 'JerseyDay', tier: 'ROOKIE', time: '29분 전', body: '좌석 찾을 시간까지 생각해서 일찍 가는 걸 추천합니다.', likes: 3 },
  ],
  8: [{ id: 801, author: 'LateInning', tier: 'SILVER', time: '43분 전', body: '결국 가볍게 먹을 수 있는 타코로 정했습니다.', likes: 2 }],
  10: [{ id: 1001, author: 'StatFan', tier: 'PLATINUM', time: '53분 전', body: '표본 경기와 상대 투수 유형도 함께 보고 싶어요.', likes: 11 }],
  12: [{ id: 1201, author: 'FirstPitch', tier: 'BRONZE', time: '1시간 전', body: '첫 마킹은 오래 응원한 선수로 고르는 게 가장 기억에 남더라고요.', likes: 5 }],
}

const initialLiveMessages: LiveMessage[] = [
  { id: 1, author: 'BlueCurve', tier: 'DIAMOND', time: '21:34', body: '초구는 포심으로 들어올 것 같아요.', mine: false },
  { id: 2, author: 'BlueCurve', tier: 'DIAMOND', time: '21:34', body: '앞 타석부터 바깥쪽 승부가 많았어요.', mine: false },
  { id: 3, author: 'BetterBatter', tier: 'DIAMOND', time: '21:35', body: '저는 변화구 하나 보고 들어갈 것 같아요.', mine: true },
  { id: 4, author: 'OrangeBay', tier: 'GOLD', time: '21:35', body: '지금 불펜 슬라이더 제구가 정말 좋습니다.', mine: false },
  { id: 5, author: 'NineInning', tier: 'SILVER', time: '21:36', body: '주자 1, 2루라 병살 시프트도 확인해야겠네요.', mine: false },
  { id: 6, author: 'StatFan', tier: 'PLATINUM', time: '21:36', body: '오타니 이번 경기 강한 타구 비율 50%입니다.', mine: false },
]

const initialLiveMessagesByGame: Record<string, LiveMessage[]> = {
  'lad-sf': initialLiveMessages,
  'nyy-bos': [
    { id: 101, author: 'BronxOracle', tier: 'ALL-STAR', time: '21:37', body: '저지는 오늘 높은 공을 정말 잘 보고 있네요.', mine: false },
    { id: 102, author: 'GreenMonster', tier: 'DIAMOND', time: '21:37', body: '불펜이 여기서 흐름을 끊어줘야 합니다.', mine: false },
    { id: 103, author: 'BetterBatter', tier: 'DIAMOND', time: '21:38', body: '1볼 2스트라이크라 바깥쪽 유인구 예상해봅니다.', mine: true },
    { id: 104, author: 'StatFan', tier: 'PLATINUM', time: '21:38', body: '저지의 오늘 평균 타구 속도는 101.2마일입니다.', mine: false },
  ],
  'hou-sea': [
    { id: 201, author: 'EmeraldCity', tier: 'GOLD', time: '21:39', body: '훌리오가 첫 타석부터 타이밍은 잘 맞추고 있어요.', mine: false },
    { id: 202, author: 'SpaceCity', tier: 'PLATINUM', time: '21:39', body: '발데스 싱커가 낮게만 들어가면 괜찮습니다.', mine: false },
    { id: 203, author: 'BetterBatter', tier: 'DIAMOND', time: '21:40', body: '동점 상황이라 선두타자 출루가 중요하겠네요.', mine: true },
    { id: 204, author: 'NineInning', tier: 'SILVER', time: '21:40', body: '수비 시프트는 거의 정위치로 돌아왔습니다.', mine: false },
  ],
}

type RankingUser = { rank: number; name: string; team: string; score: number; tier: string; streak: number }

const seasonRanking: RankingUser[] = [
  { rank: 1, name: 'CurveMaster', team: 'LAD', score: 12480, tier: 'ALL-STAR', streak: 12 },
  { rank: 2, name: 'BronxOracle', team: 'NYY', score: 11920, tier: 'ALL-STAR', streak: 9 },
  { rank: 3, name: 'BayAreaAce', team: 'SF', score: 10870, tier: 'DIAMOND', streak: 8 },
  { rank: 4, name: 'GreenMonster', team: 'BOS', score: 10140, tier: 'DIAMOND', streak: 7 },
  { rank: 5, name: 'SeoulSlugger', team: 'LAD', score: 9840, tier: 'DIAMOND', streak: 6 },
  { rank: 6, name: 'NorthSideFan', team: 'CHC', score: 9210, tier: 'DIAMOND', streak: 5 },
  { rank: 7, name: 'WrigleyWind', team: 'CHC', score: 9050, tier: 'ALL-STAR', streak: 4 },
  { rank: 8, name: 'FriarFaithful', team: 'SD', score: 8890, tier: 'DIAMOND', streak: 5 },
  { rank: 9, name: 'EmeraldPitch', team: 'SEA', score: 8730, tier: 'DIAMOND', streak: 3 },
  { rank: 10, name: 'CardinalCall', team: 'STL', score: 8580, tier: 'DIAMOND', streak: 4 },
  { rank: 11, name: 'DesertHeat', team: 'AZ', score: 8510, tier: 'PLATINUM', streak: 5 },
  { rank: 12, name: 'QueensRally', team: 'NYM', score: 8490, tier: 'DIAMOND', streak: 3 },
  { rank: 13, name: 'MotownSlider', team: 'DET', score: 8475, tier: 'PLATINUM', streak: 4 },
  { rank: 14, name: 'RoyalLine', team: 'KC', score: 8460, tier: 'PLATINUM', streak: 2 },
  { rank: 15, name: 'SouthBeachSpin', team: 'MIA', score: 8452, tier: 'PLATINUM', streak: 3 },
  { rank: 16, name: 'TwinCityGlove', team: 'MIN', score: 8448, tier: 'PLATINUM', streak: 4 },
  { rank: 17, name: 'RockyMountain', team: 'COL', score: 8444, tier: 'PLATINUM', streak: 2 },
  { rank: 18, name: 'LoneStarPitch', team: 'TEX', score: 8441, tier: 'PLATINUM', streak: 3 },
  { rank: 19, name: 'PhillyPhanatic', team: 'PHI', score: 8439, tier: 'DIAMOND', streak: 5 },
  { rank: 20, name: 'BrewerBarrel', team: 'MIL', score: 8438, tier: 'DIAMOND', streak: 3 },
  { rank: 21, name: 'CapitolCurve', team: 'WSH', score: 8437, tier: 'DIAMOND', streak: 4 },
  { rank: 22, name: 'PitchSequencer', team: 'NYM', score: 8435, tier: 'DIAMOND', streak: 3 },
  { rank: 23, name: 'BetterBatter', team: 'LAD', score: 8420, tier: 'DIAMOND', streak: 4 },
  { rank: 24, name: 'SouthSideSpin', team: 'CWS', score: 8405, tier: 'DIAMOND', streak: 2 },
  { rank: 25, name: 'HaloFastball', team: 'LAA', score: 8388, tier: 'PLATINUM', streak: 2 },
  { rank: 26, name: 'OaklandWave', team: 'ATH', score: 8360, tier: 'GOLD', streak: 3 },
  { rank: 27, name: 'GuardianShift', team: 'CLE', score: 8334, tier: 'PLATINUM', streak: 4 },
  { rank: 28, name: 'RedMachine', team: 'CIN', score: 8310, tier: 'GOLD', streak: 2 },
  { rank: 29, name: 'BucHarbor', team: 'PIT', score: 8280, tier: 'GOLD', streak: 3 },
  { rank: 30, name: 'SpaceCity', team: 'HOU', score: 8250, tier: 'PLATINUM', streak: 4 },
]

const gameRanking: RankingUser[] = [
  { rank: 1, name: 'FastballOnly', team: 'LAD', score: 940, tier: 'PLATINUM', streak: 6 },
  { rank: 2, name: 'OrangeBay', team: 'SF', score: 880, tier: 'GOLD', streak: 5 },
  { rank: 3, name: 'BetterBatter', team: 'LAD', score: 760, tier: 'DIAMOND', streak: 4 },
  { rank: 4, name: 'CloserNine', team: 'SF', score: 690, tier: 'PLATINUM', streak: 4 },
  { rank: 5, name: 'DugoutTalk', team: 'LAD', score: 610, tier: 'SILVER', streak: 3 },
  { rank: 6, name: 'StatFan', team: 'NYY', score: 570, tier: 'PLATINUM', streak: 3 },
  { rank: 7, name: 'BlueCurve', team: 'LAD', score: 525, tier: 'DIAMOND', streak: 2 },
  { rank: 8, name: 'NineInning', team: 'SF', score: 480, tier: 'SILVER', streak: 2 },
  { rank: 9, name: 'McCoveyCove', team: 'SF', score: 450, tier: 'GOLD', streak: 1 },
  { rank: 10, name: 'LateInning', team: 'LAD', score: 410, tier: 'SILVER', streak: 2 },
]

const gameRankingTiers = ['PLATINUM', 'GOLD', 'DIAMOND', 'PLATINUM', 'SILVER', 'GOLD', 'DIAMOND', 'SILVER', 'GOLD', 'SILVER']
const rankJourneyTiers = [
  { name: 'ROOKIE', image: '/tier-badges/rookie.png' },
  { name: 'BRONZE', image: '/tier-badges/bronze.png' },
  { name: 'SILVER', image: '/tier-badges/silver.png' },
  { name: 'GOLD', image: '/tier-badges/gold.png' },
  { name: 'PLATINUM', image: '/tier-badges/platinum.png' },
  { name: 'DIAMOND', image: '/tier-badges/diamond.png' },
  { name: 'ALL-STAR', image: '/tier-badges/all-star.png' },
] as const
const gameRankingStreaks = [6, 5, 4, 4, 3, 3, 2, 2, 1, 2]
const buildGameRanking = (rows: Array<[string, string, number]>): RankingUser[] => rows.map(([name, team, score], index) => ({ rank: index + 1, name, team, score, tier: gameRankingTiers[index], streak: gameRankingStreaks[index] }))

const gameRankingsByGame: Record<string, RankingUser[]> = {
  'lad-sf': gameRanking,
  'nyy-bos': buildGameRanking([
    ['BronxOracle', 'NYY', 1020], ['GreenMonster', 'BOS', 930], ['JudgeWatch', 'NYY', 850], ['FenwayFaithful', 'BOS', 790], ['PinstripeData', 'NYY', 725],
    ['MonsterWall', 'BOS', 680], ['BetterBatter', 'LAD', 615], ['CloserNine', 'SF', 570], ['StatFan', 'NYY', 525], ['LateInning', 'LAD', 480],
  ]),
  'hou-sea': buildGameRanking([
    ['EmeraldCity', 'SEA', 970], ['SpaceCity', 'HOU', 905], ['JulioWave', 'SEA', 830], ['OrbitLine', 'HOU', 775], ['TMobileRoar', 'SEA', 720],
    ['SiderialPitch', 'HOU', 665], ['BetterBatter', 'LAD', 590], ['NineInning', 'SF', 545], ['PitchLab', 'LAD', 510], ['LateInning', 'LAD', 465],
  ]),
  'chc-mil': buildGameRanking([
    ['BrewCrewWin', 'MIL', 1180], ['NorthSideFan', 'CHC', 990], ['BerniesSlide', 'MIL', 920], ['WrigleyWind', 'CHC', 845], ['CreamCity', 'MIL', 790],
    ['IvyWall', 'CHC', 735], ['BetterBatter', 'LAD', 640], ['StatFan', 'NYY', 590], ['FirstPitch', 'CHC', 540], ['LateInning', 'LAD', 495],
  ]),
}

function completeGameRanking(rows: RankingUser[]) {
  if (rows.length >= 30) return rows
  const existingNames = new Set(rows.map((user) => user.name))
  const lastScore = rows[rows.length - 1]?.score ?? 500
  const fillers = seasonRanking
    .filter((user) => !existingNames.has(user.name))
    .slice(0, 30 - rows.length)
    .map((user, index) => ({
      ...user,
      rank: rows.length + index + 1,
      score: Math.max(90, lastScore - (index + 1) * 17),
    }))
  return [...rows, ...fillers]
}

export const TEAM_OPTIONS = [
  { rank: 1, code: 'NYY', name: '뉴욕 양키스', supporters: 3412, score: 26448120 },
  { rank: 2, code: 'LAD', name: 'LA 다저스', supporters: 3284, score: 25972860 },
  { rank: 3, code: 'BOS', name: '보스턴 레드삭스', supporters: 3061, score: 23811740 },
  { rank: 4, code: 'SF', name: '샌프란시스코 자이언츠', supporters: 2916, score: 22406520 },
  { rank: 5, code: 'CHC', name: '시카고 컵스', supporters: 2857, score: 21982430 },
  { rank: 6, code: 'SD', name: '샌디에이고 파드리스', supporters: 2544, score: 19775180 },
  { rank: 7, code: 'SEA', name: '시애틀 매리너스', supporters: 2462, score: 18940210 },
  { rank: 8, code: 'STL', name: '세인트루이스 카디널스', supporters: 2401, score: 18626900 },
  { rank: 9, code: 'NYM', name: '뉴욕 메츠', supporters: 2312, score: 17882330 },
  { rank: 10, code: 'HOU', name: '휴스턴 애스트로스', supporters: 2244, score: 17194750 },
  { rank: 11, code: 'PHI', name: '필라델피아 필리스', supporters: 2178, score: 16744810 },
  { rank: 12, code: 'ATL', name: '애틀랜타 브레이브스', supporters: 2125, score: 16299740 },
  { rank: 13, code: 'TEX', name: '텍사스 레인저스', supporters: 2071, score: 15876210 },
  { rank: 14, code: 'TOR', name: '토론토 블루제이스', supporters: 2022, score: 15431680 },
  { rank: 15, code: 'CLE', name: '클리블랜드 가디언스', supporters: 1976, score: 15004820 },
  { rank: 16, code: 'MIN', name: '미네소타 트윈스', supporters: 1928, score: 14660410 },
  { rank: 17, code: 'DET', name: '디트로이트 타이거스', supporters: 1873, score: 14222890 },
  { rank: 18, code: 'BAL', name: '볼티모어 오리올스', supporters: 1825, score: 13891420 },
  { rank: 19, code: 'TB', name: '탬파베이 레이스', supporters: 1762, score: 13488560 },
  { rank: 20, code: 'ARI', name: '애리조나 다이아몬드백스', supporters: 1719, score: 13144200 },
  { rank: 21, code: 'MIL', name: '밀워키 브루어스', supporters: 1668, score: 12799850 },
  { rank: 22, code: 'CIN', name: '신시내티 레즈', supporters: 1605, score: 12360430 },
  { rank: 23, code: 'KC', name: '캔자스시티 로열스', supporters: 1542, score: 11928640 },
  { rank: 24, code: 'LAA', name: 'LA 에인절스', supporters: 1480, score: 11477810 },
  { rank: 25, code: 'PIT', name: '피츠버그 파이리츠', supporters: 1418, score: 10984320 },
  { rank: 26, code: 'WSH', name: '워싱턴 내셔널스', supporters: 1354, score: 10468190 },
  { rank: 27, code: 'MIA', name: '마이애미 말린스', supporters: 1292, score: 9985220 },
  { rank: 28, code: 'COL', name: '콜로라도 로키스', supporters: 1238, score: 9513640 },
  { rank: 29, code: 'CWS', name: '시카고 화이트삭스', supporters: 1187, score: 9064710 },
  { rank: 30, code: 'ATH', name: '애슬레틱스', supporters: 1124, score: 8546280 },
] as const

export type { TeamCode } from './teamBrand'
export const DEFAULT_FAVORITE_TEAM_CODE: TeamCode = 'LAD'
export const teamByCode = (code: TeamCode) => TEAM_OPTIONS.find((team) => team.code === code) ?? TEAM_OPTIONS[1]
const teamRanking = TEAM_OPTIONS

type ProfileDialogUser = {
  name: string
  tier: string
  team?: string
  eyebrow: string
  badges: readonly ProfileAchievement[]
  stats: readonly [{ label: string; value: string }, { label: string; value: string }]
}

function displayedAchievementsFor(user: RankingUser, myDisplayedIds: readonly AchievementId[]) {
  const earnedAchievements = profileAchievements.filter((achievement) => achievement.earned)
  if (user.name === 'BetterBatter') {
    return myDisplayedIds.map((id) => profileAchievements.find((achievement) => achievement.id === id)).filter((achievement): achievement is (typeof profileAchievements)[number] => Boolean(achievement))
  }
  const offset = (user.rank - 1) % earnedAchievements.length
  return Array.from({ length: 3 }, (_, index) => earnedAchievements[(offset + index) % earnedAchievements.length])
}

function UserProfileDialog({
  dialogRef,
  dialogId,
  user,
  followed,
  onToggleFollow,
  onClose,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>
  dialogId: string
  user: ProfileDialogUser
  followed: boolean
  onToggleFollow: () => void
  onClose: () => void
}) {
  const [reported, setReported] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [safetyNotice, setSafetyNotice] = useState('')

  const toggleBlock = () => {
    const nextBlocked = !blocked
    if (nextBlocked && followed) onToggleFollow()
    setBlocked(nextBlocked)
    setSafetyNotice(nextBlocked ? `${user.name}님을 차단했습니다.` : `${user.name}님의 차단을 해제했습니다.`)
  }

  return (
    <dialog
      ref={dialogRef}
      className="rank-profile-dialog"
      aria-labelledby={`${dialogId}-name`}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <article className="rank-profile-card">
        <button type="button" className="rank-profile-close" aria-label="프로필 닫기" onClick={onClose}><X size={17} /></button>
        <header className="rank-profile-identity">
          <UserAvatar size="large" />
          <div>
            <span className="rank-profile-rank-label">{user.eyebrow}</span>
            <div className="rank-profile-name-row">
              <h2 id={`${dialogId}-name`}>{user.name}</h2>
              {user.name !== 'BetterBatter' && <button type="button" className={`rank-profile-follow ${followed ? 'following' : ''}`} aria-label={`${user.name} ${followed ? '팔로우 취소' : '팔로우'}`} aria-pressed={followed} disabled={blocked} onClick={onToggleFollow}>{blocked ? <><Ban size={11} />차단됨</> : followed ? <><Check size={11} />팔로잉</> : <><UserPlus size={11} />팔로우</>}</button>}
            </div>
            <div className="rank-profile-meta">{user.team && <span style={teamAccentStyle(user.team)}>{user.team} 팬</span>}<TierMark tier={user.tier} /></div>
          </div>
        </header>
        <section className="rank-profile-badges" aria-labelledby={`${dialogId}-badges-title`}>
          <h3 className="rank-profile-badges-label" id={`${dialogId}-badges-title`}>전시 배지</h3>
          <ul>
            {Array.from({ length: 3 }, (_, index) => {
              const achievement = user.badges[index]
              if (!achievement) {
                return <li className="rank-profile-badge-empty" key={`empty-badge-${index}`} aria-label="빈 전시 배지 슬롯"><span aria-hidden="true" /></li>
              }
              const tooltipId = `${dialogId}-badge-${achievement.id}-description`
              return (
                <li className="rank-profile-badge" key={achievement.id} tabIndex={0} aria-describedby={tooltipId}>
                  <img src={achievementArtwork(achievement)} alt="" aria-hidden="true" />
                  <strong>{achievement.name}</strong>
                  <span className="rank-profile-badge-tooltip" id={tooltipId} role="tooltip">{achievementTooltip(achievement)}</span>
                </li>
              )
            })}
          </ul>
        </section>
        <dl className="rank-profile-stats" aria-label="프로필 기록">
          {user.stats.map((stat, index) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>
                <span className={`rank-profile-stat-icon ${index === 0 ? 'rank' : 'streak'}`} aria-hidden="true">
                  {index === 0 ? <Trophy size={13} /> : <Flame size={13} />}
                </span>
                <strong>{stat.value}</strong>
              </dd>
            </div>
          ))}
        </dl>
        <footer className="rank-profile-actions">
          {user.name === 'BetterBatter'
            ? <span className="rank-profile-self"><BadgeCheck size={15} />내 프로필</span>
            : <>
              <div className="rank-profile-safety" aria-label="사용자 안전 관리">
                <button type="button" className={`rank-profile-report ${reported ? 'is-complete' : ''}`} disabled={reported} onClick={() => { setReported(true); setSafetyNotice(`${user.name}님에 대한 신고가 접수되었습니다.`) }}><Flag size={13} />{reported ? '신고 접수됨' : '신고'}</button>
                <button type="button" className={`rank-profile-block ${blocked ? 'is-blocked' : ''}`} aria-pressed={blocked} onClick={toggleBlock}><Ban size={13} />{blocked ? '차단 해제' : '차단'}</button>
              </div>
              {safetyNotice && <p className="rank-profile-action-status" role="status" aria-live="polite">{safetyNotice}</p>}
            </>}
        </footer>
      </article>
    </dialog>
  )
}

function AchievementStageDialog({
  dialogRef,
  achievement,
  onClose,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>
  achievement: ProfileAchievement
  onClose: () => void
}) {
  const evolution = achievement.evolution
  const evolutionState = achievementEvolutionState(achievement)
  if (!evolution || !evolutionState) return null

  return (
    <dialog
      ref={dialogRef}
      className="achievement-stage-dialog"
      aria-labelledby="achievement-stage-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section className="achievement-stage-sheet">
        <header>
          <div><span>업적 단계</span><h2 id="achievement-stage-title">{achievement.name}</h2><p>{achievement.detail}</p></div>
          <button className="achievement-stage-close" type="button" aria-label="단계 보기 닫기" onClick={onClose}><X size={18} /></button>
        </header>
        <section className="achievement-current-progress" aria-label={`현재 ${evolutionState.stageLabel}, ${evolution.current.toLocaleString()}${evolution.unit}`}>
          <div><span>현재 단계</span><strong>{evolutionState.stageLabel}</strong></div>
          <div className="achievement-current-meter" aria-hidden="true"><span style={{ width: `${evolutionState.progress}%` }} /></div>
          <p><b>{evolution.current.toLocaleString()}{evolutionState.nextStage ? ` / ${evolutionState.nextStage.threshold.toLocaleString()}` : ''}{evolution.unit}</b>{evolutionState.nextStage ? ` · 다음 단계까지 ${Math.max(0, evolutionState.nextStage.threshold - evolution.current).toLocaleString()}${evolution.unit}` : ' · 최종 단계 달성'}</p>
        </section>
        <ol className="achievement-stage-list" aria-label={`${achievement.name} 전체 단계`}>
          {evolution.stages.map((stage, index) => {
            const unlocked = evolution.current >= stage.threshold
            const current = index === evolutionState.stageIndex
            const stateLabel = current ? '현재 단계' : unlocked ? '달성' : '미달성'
            return <li className={`${current ? 'current' : ''} ${unlocked ? 'unlocked' : 'locked'}`} key={stage.threshold}>
              <div className="achievement-stage-art"><img src={stage.image} alt={`${achievement.name} ${index + 1}단계 배지`} /></div>
              <div className="achievement-stage-label"><strong>{index + 1}단계</strong><span className={current ? 'current' : ''}>{current ? <i className="achievement-stage-current-dot" aria-hidden="true" /> : unlocked ? <Check size={11} /> : <LockKeyhole size={11} />}{stateLabel}</span></div>
              <p>{stage.threshold.toLocaleString()}<small>{evolution.unit}</small></p>
            </li>
          })}
        </ol>
        <footer><CircleHelp size={14} /><p>기록이 기준에 도달하면 같은 배지가 다음 단계 디자인으로 진화합니다.</p></footer>
      </section>
    </dialog>
  )
}

function profileDialogUserFor(
  name: string,
  tier: string,
  displayedAchievementIds: readonly AchievementId[],
  communityPosts: typeof posts,
  communityComments: typeof initialComments,
): ProfileDialogUser {
  const rankedUser = seasonRanking.find((user) => user.name === name) ?? gameRanking.find((user) => user.name === name)
  const authoredPosts = communityPosts.filter((post) => post.author === name)
  const authoredComments = Object.values(communityComments).flat().filter((comment) => comment.author === name)
  const communityLikes = authoredPosts.reduce((sum, post) => sum + post.likes, 0) + authoredComments.reduce((sum, comment) => sum + comment.likes, 0)
  return {
    name,
    tier,
    team: rankedUser?.team,
    eyebrow: rankedUser ? `GLOBAL RANK #${rankedUser.rank}` : 'COMMUNITY MEMBER',
    badges: rankedUser ? displayedAchievementsFor(rankedUser, displayedAchievementIds) : [],
    stats: rankedUser
      ? [{ label: '랭크 점수', value: `${rankedUser.score.toLocaleString()}P` }, { label: '연속 적중', value: String(rankedUser.streak) }]
      : [{ label: '받은 공감', value: communityLikes.toLocaleString() }, { label: '작성 활동', value: `${authoredPosts.length + authoredComments.length}건` }],
  }
}

const profilePredictionRows: PredictionHistoryItem[] = [
  { id: 'profile-103', time: '21:31', inning: '7회 초', question: '다음 플레이 결과가 삼진일까요?', yes: 31, choice: 'no', answer: 'no', amount: 100, delta: 45, competition: 'MLB 정규시즌', match: 'LAD vs SF', order: 2131 },
  { id: 'profile-102', time: '21:18', inning: '6회 말', question: '6회 총 득점이 1점 이상일까요?', yes: 47, choice: 'yes', answer: 'yes', amount: 100, delta: 113, competition: 'MLB 정규시즌', match: 'LAD vs SF', order: 2118 },
  { id: 'profile-100', time: '20:54', inning: '5회 말', question: 'Shohei Ohtani가 이번 타석에서 안타를 칠까요?', yes: 64, choice: 'yes', answer: 'no', amount: 150, delta: -150, competition: 'MLB 정규시즌', match: 'LAD vs SF', order: 2054 },
]

const profileBonusRows: ActivityHistoryItem[] = [
  { id: 'bonus-20260826', time: '09:10', dateLabel: '08.26', title: '7일 연속 출석', detail: '연속 방문 보상 · 포인트 적립', competition: '2026 SUMMER', delta: 40, kind: 'attendance', order: 910 },
  { id: 'reward-20260825', time: '18:30', dateLabel: '08.25', title: '주간 예측 미션 완료', detail: '주간 미션 5회 참여 달성', competition: 'SUMMER PICK CHALLENGE', delta: 80, kind: 'reward', order: -1830 },
]

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="portal-heading">
      <div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>
      {action}
    </header>
  )
}

function TierMark({ tier = 'DIAMOND', compact = false }: { tier?: string; compact?: boolean }) {
  const slug = tier.toLowerCase()
  return <span className={`tier-mark tier-${slug.replace(/-/g, '')} ${compact ? 'compact' : ''}`}><img className="tier-badge-image" src={`/tier-badges/${slug}.png`} alt="" aria-hidden="true" /><span>{tier}</span></span>
}

function mockParticipantPollChoice(author: string, pollId: number): PollChoice {
  const authorSeed = Array.from(author).reduce((total, character) => total + character.charCodeAt(0), pollId)
  return authorSeed % 2 === 0 ? 'yes' : 'no'
}

export function LiveGameChat({
  games,
  selectedGameId,
  activePoll,
  displayedAchievementIds = DEFAULT_DISPLAYED_ACHIEVEMENT_IDS,
}: {
  games: LiveGameOption[]
  selectedGameId: string
  activePoll?: LivePoll
  displayedAchievementIds?: readonly AchievementId[]
}) {
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? games[0]
  const isLiveGame = selectedGame.status === 'live'
  const isScheduledGame = selectedGame.status === 'scheduled'
  const [liveMessagesByGame, setLiveMessagesByGame] = useState<Record<string, LiveMessage[]>>(initialLiveMessagesByGame)
  const [liveDraftsByGame, setLiveDraftsByGame] = useState<Record<string, string>>({})
  const [selectedProfile, setSelectedProfile] = useState<ProfileDialogUser | null>(null)
  const [followedProfiles, setFollowedProfiles] = useState(() => new Set<string>())
  const liveMessageListRef = useRef<HTMLDivElement>(null)
  const previousChatGameRef = useRef('')
  const previousChatPollRef = useRef<number | undefined>(undefined)
  const profileDialogRef = useRef<HTMLDialogElement | null>(null)
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null)
  const liveMessages = liveMessagesByGame[selectedGame.id] ?? []
  const liveDraft = liveDraftsByGame[selectedGame.id] ?? ''
  const now = new Date()
  const chatDate = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`

  useEffect(() => {
    const messageList = liveMessageListRef.current
    if (!messageList) return

    const contextChanged = previousChatGameRef.current !== selectedGame.id || previousChatPollRef.current !== activePoll?.id
    const frame = requestAnimationFrame(() => {
      previousChatGameRef.current = selectedGame.id
      previousChatPollRef.current = activePoll?.id
      messageList.scrollTop = messageList.scrollHeight

      if (!contextChanged) return
      const listTop = messageList.getBoundingClientRect().top
      const firstVisibleMessage = Array.from(messageList.querySelectorAll<HTMLElement>('.chat-message'))
        .find((message) => message.getBoundingClientRect().bottom > listTop + 12)

      if (!firstVisibleMessage) return
      const messageTop = firstVisibleMessage.getBoundingClientRect().top
      if (messageTop < listTop + 12) messageList.scrollTop += messageTop - listTop - 12
    })

    return () => cancelAnimationFrame(frame)
  }, [activePoll?.id, liveMessages, selectedGame.id])

  useEffect(() => {
    const dialog = profileDialogRef.current
    if (!selectedProfile || !dialog || dialog.open) return
    dialog.showModal()
    requestAnimationFrame(() => dialog.querySelector<HTMLButtonElement>('.rank-profile-close')?.focus())
  }, [selectedProfile])

  const submitLiveMessage = (event: FormEvent) => {
    event.preventDefault()
    if (!isLiveGame || !liveDraft.trim()) return
    setLiveMessagesByGame((current) => ({
      ...current,
      [selectedGame.id]: [...(current[selectedGame.id] ?? []), { id: Date.now(), author: 'BetterBatter', tier: 'DIAMOND', time: '지금', body: liveDraft.trim(), mine: true }],
    }))
    setLiveDraftsByGame((current) => ({ ...current, [selectedGame.id]: '' }))
  }

  const openProfile = (name: string, tier: string, trigger: HTMLButtonElement) => {
    profileTriggerRef.current = trigger
    setSelectedProfile(profileDialogUserFor(name, tier, displayedAchievementIds, posts, initialComments))
  }

  const closeProfile = () => {
    profileDialogRef.current?.close()
    setSelectedProfile(null)
    requestAnimationFrame(() => profileTriggerRef.current?.focus())
  }

  return (
    <>
      <section className="live-chat-panel live-hub-chat-panel" aria-label="응원톡">
        <header className="desktop-chat-heading">
          <div><Radio size={14} aria-hidden="true" /><strong>응원톡</strong><span>LIVE</span></div>
          <small>{selectedGame.awayCode} {selectedGame.awayScore} — {selectedGame.homeScore} {selectedGame.homeCode}</small>
        </header>
        <div ref={liveMessageListRef} className="live-message-list" role="log" aria-live="polite" aria-relevant="additions" aria-label={`${selectedGame.awayCode} 대 ${selectedGame.homeCode} 응원톡 메시지`}>
          <div className="chat-date-divider"><span>{chatDate}</span></div>
          {liveMessages.map((message, index) => {
            const previousMessage = liveMessages[index - 1]
            const nextMessage = liveMessages[index + 1]
            const groupStart = !previousMessage || previousMessage.author !== message.author
            const groupEnd = !nextMessage || nextMessage.author !== message.author
            const participantPollChoice = activePoll && !message.mine ? mockParticipantPollChoice(message.author, activePoll.id) : null
            return (
              <article className={`chat-message ${message.mine ? 'mine' : 'theirs'} ${groupStart ? 'group-start' : ''} ${groupEnd ? 'group-end' : ''}`} key={message.id}>
                {!message.mine && (groupStart ? <button type="button" className="profile-avatar-trigger" aria-haspopup="dialog" aria-label={`${message.author} 프로필 열기`} onClick={(event) => openProfile(message.author, message.tier, event.currentTarget)}><UserAvatar size="small" /></button> : <span className="chat-avatar-spacer" />)}
                <div className="chat-message-body">
                  {!message.mine && groupStart && <header><button type="button" className="community-profile-trigger" aria-haspopup="dialog" aria-label={`${message.author} 프로필 열기`} onClick={(event) => openProfile(message.author, message.tier, event.currentTarget)}>{message.author}</button><TierMark tier={message.tier} compact />{participantPollChoice && <span className={`chat-vote-choice ${participantPollChoice}`} aria-label={`현재 투표 ${participantPollChoice.toUpperCase()} 선택`}>{participantPollChoice.toUpperCase()}</span>}</header>}
                  <div className="chat-bubble-line">{message.mine && <time>{message.time}</time>}<p>{message.body}</p>{!message.mine && <time>{message.time}</time>}</div>
                </div>
              </article>
            )
          })}
        </div>
        <form className={`live-chat-form ${isLiveGame ? '' : 'read-only'}`} onSubmit={submitLiveMessage}><label><input aria-label="응원 메시지" value={liveDraft} onChange={(event) => setLiveDraftsByGame((current) => ({ ...current, [selectedGame.id]: event.target.value }))} maxLength={120} disabled={!isLiveGame} placeholder={isLiveGame ? '경기 흐름에 대한 이야기를 남겨보세요.' : isScheduledGame ? '경기 시작 후 메시지를 보낼 수 있습니다.' : '종료된 응원톡은 읽기 전용입니다.'} /></label><small>{liveDraft.length}/120</small><button type="submit" disabled={!isLiveGame || !liveDraft.trim()} aria-label="메시지 보내기"><Send size={17} /></button></form>
      </section>
      {selectedProfile && <UserProfileDialog dialogRef={profileDialogRef} dialogId="live-chat-profile" user={selectedProfile} followed={followedProfiles.has(selectedProfile.name)} onToggleFollow={() => setFollowedProfiles((current) => { const next = new Set(current); if (next.has(selectedProfile.name)) next.delete(selectedProfile.name); else next.add(selectedProfile.name); return next })} onClose={closeProfile} />}
    </>
  )
}

export function CommunityPage({ onRequireLogin, displayedAchievementIds = DEFAULT_DISPLAYED_ACHIEVEMENT_IDS, favoriteTeamCode = DEFAULT_FAVORITE_TEAM_CODE }: { onRequireLogin: () => void; displayedAchievementIds?: readonly AchievementId[]; favoriteTeamCode?: TeamCode }) {
  const favoriteTeamTag = `#${favoriteTeamCode}`
  const suggestedThreadTags = useMemo(() => Array.from(new Set([favoriteTeamTag, ...baseSuggestedThreadTags])), [favoriteTeamTag])
  const [scope, setScope] = useState<CommunityScope>('recommended')
  const [sort, setSort] = useState<CommunitySort>('latest')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [screen, setScreen] = useState<CommunityScreen>('list')
  const [visibleCount, setVisibleCount] = useState(THREAD_BATCH_SIZE)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [draftBody, setDraftBody] = useState('')
  const [draftTags, setDraftTags] = useState<string[]>([favoriteTeamTag])
  const [tagDraft, setTagDraft] = useState('')
  const [draftImage, setDraftImage] = useState<string | null>(null)
  const [draftImageAlt, setDraftImageAlt] = useState('')
  const [composerStatus, setComposerStatus] = useState('')
  const [liked, setLiked] = useState(() => new Set<number>())
  const [localPosts, setLocalPosts] = useState(posts)
  const [commentsByPost, setCommentsByPost] = useState(initialComments)
  const [commentDraft, setCommentDraft] = useState('')
  const [replyTarget, setReplyTarget] = useState<{ parentId: number; anchorId: number; rootId: number; author: string } | null>(null)
  const [expandedReplyGroups, setExpandedReplyGroups] = useState(() => new Set<number>())
  const [selectedCommunityProfile, setSelectedCommunityProfile] = useState<ProfileDialogUser | null>(null)
  const [followedProfiles, setFollowedProfiles] = useState(() => new Set<string>())
  const [showAllTags, setShowAllTags] = useState(false)
  const [collapsedTagLimit, setCollapsedTagLimit] = useState(DEFAULT_VISIBLE_TAG_COUNT)
  const [composerOpen, setComposerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const composerTriggerRef = useRef<HTMLButtonElement | null>(null)
  const loadSentinelRef = useRef<HTMLDivElement | null>(null)
  const tagDiscoveryRef = useRef<HTMLDivElement | null>(null)
  const tagMeasureRef = useRef<HTMLDivElement | null>(null)
  const communityProfileDialogRef = useRef<HTMLDialogElement | null>(null)
  const communityProfileTriggerRef = useRef<HTMLButtonElement | null>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const filteredPosts = useMemo(() => [...localPosts]
    .filter((post) => scope === 'general' || scope === 'recommended' || (scope === 'team' ? tagsForThread(post).includes(favoriteTeamTag) : followedProfiles.has(post.author)))
    .filter((post) => !activeTag || tagsForThread(post).includes(activeTag))
    .filter((post) => `${post.title} ${post.author} ${post.body} ${tagsForThread(post).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'popular' ? b.likes - a.likes : 0), [activeTag, favoriteTeamTag, followedProfiles, localPosts, query, scope, sort])
  const visiblePosts = filteredPosts.slice(0, visibleCount)
  const hasMoreThreads = visibleCount < filteredPosts.length
  const selectedPost = localPosts.find((post) => post.id === selectedPostId)
  const selectedComments = selectedPost ? commentsByPost[selectedPost.id] ?? [] : []
  const selectedTags = selectedPost ? tagsForThread(selectedPost) : []
  const visibleSuggestedTags = showAllTags ? suggestedThreadTags : suggestedThreadTags.slice(0, collapsedTagLimit)
  const hiddenSuggestedTagCount = Math.max(0, suggestedThreadTags.length - collapsedTagLimit)

  useEffect(() => setVisibleCount(THREAD_BATCH_SIZE), [activeTag, query, scope, sort])
  useLayoutEffect(() => {
    const textarea = replyTextareaRef.current
    if (!textarea || screen !== 'detail') return

    textarea.style.height = 'auto'
    const styles = window.getComputedStyle(textarea)
    const minHeight = Number.parseFloat(styles.minHeight) || 40
    const maxHeight = Number.parseFloat(styles.maxHeight) || 112
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)

    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [commentDraft, screen, selectedPostId])
  useLayoutEffect(() => {
    const discovery = tagDiscoveryRef.current
    const measurement = tagMeasureRef.current
    if (!discovery || !measurement) return

    const syncCollapsedTagLimit = () => {
      const origin = measurement.getBoundingClientRect().left
      const availableWidth = discovery.clientWidth
      const measuredTags = Array.from(measurement.querySelectorAll<HTMLElement>('[data-measured-tag]'))
      let nextLimit = 0

      measuredTags.forEach((tag) => {
        if (tag.getBoundingClientRect().right - origin <= availableWidth + 0.5) nextLimit += 1
      })
      setCollapsedTagLimit(Math.max(1, nextLimit))
    }

    syncCollapsedTagLimit()
    const observer = new ResizeObserver(syncCollapsedTagLimit)
    observer.observe(discovery)
    observer.observe(measurement)
    void document.fonts?.ready.then(syncCollapsedTagLimit)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const sentinel = loadSentinelRef.current
    if (!sentinel || !hasMoreThreads || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setVisibleCount((current) => Math.min(current + THREAD_BATCH_SIZE, filteredPosts.length))
    }, { rootMargin: '240px 0px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filteredPosts.length, hasMoreThreads, visibleCount])
  useEffect(() => {
    const dialog = communityProfileDialogRef.current
    if (!selectedCommunityProfile || !dialog || dialog.open) return
    dialog.showModal()
    requestAnimationFrame(() => dialog.querySelector<HTMLButtonElement>('.rank-profile-close')?.focus())
  }, [selectedCommunityProfile])

  const submitPost = (event: FormEvent) => {
    event.preventDefault()
    const body = draftBody.trim()
    if (!body) return
    const firstLine = body.split('\n')[0]
    setLocalPosts((current) => [{ id: Date.now(), category: '자유', title: firstLine.slice(0, 80), author: 'BetterBatter', tier: 'DIAMOND', time: '방금', comments: 0, likes: 0, views: 0, popular: false, body, tags: draftTags, image: draftImage ?? undefined, imageAlt: draftImage ? draftImageAlt.trim() || '사용자가 첨부한 야구 사진' : undefined }, ...current])
    setDraftBody('')
    setDraftTags([favoriteTeamTag])
    setTagDraft('')
    setDraftImage(null)
    setDraftImageAlt('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setScope('general')
    setActiveTag(null)
    setSort('latest')
    setVisibleCount(THREAD_BATCH_SIZE)
    setComposerStatus('스레드가 게시되었습니다.')
    window.setTimeout(() => setComposerStatus(''), 2200)
  }

  const addDraftTag = (rawTag: string) => {
    const tagText = rawTag.trim().replace(/^#/, '').replace(/\s+/g, '')
    if (!tagText) return
    const tag = `#${tagText}`
    if (draftTags.includes(tag)) {
      setTagDraft('')
      return
    }
    if (draftTags.length >= MAX_DRAFT_TAGS) {
      setComposerStatus(`태그는 최대 ${MAX_DRAFT_TAGS}개까지 추가할 수 있습니다.`)
      return
    }
    setDraftTags((current) => [...current, tag])
    setTagDraft('')
    setComposerStatus('')
  }

  const selectImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setComposerStatus('이미지 파일만 첨부할 수 있습니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDraftImage(String(reader.result))
      setDraftImageAlt(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
      setComposerStatus('')
    }
    reader.onerror = () => setComposerStatus('사진을 불러오지 못했습니다. 다시 선택해주세요.')
    reader.readAsDataURL(file)
  }

  const openPost = (id: number) => {
    setSelectedPostId(id)
    setCommentDraft('')
    setReplyTarget(null)
    setExpandedReplyGroups(new Set())
    setScreen('detail')
  }

  const submitComment = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedPost || !commentDraft.trim()) return
    setCommentsByPost((current) => ({
      ...current,
      [selectedPost.id]: [...(current[selectedPost.id] ?? []), { id: Date.now(), author: 'BetterBatter', tier: 'DIAMOND', time: '방금', body: commentDraft.trim(), likes: 0, parentId: replyTarget?.parentId, replyTo: replyTarget?.author }],
    }))
    if (replyTarget) setExpandedReplyGroups((current) => new Set(current).add(replyTarget.rootId))
    setCommentDraft('')
    setReplyTarget(null)
  }

  const beginNestedReply = (comment: ThreadComment) => {
    let rootComment = comment
    const visited = new Set<number>()
    while (rootComment.parentId && !visited.has(rootComment.id)) {
      visited.add(rootComment.id)
      const parent = selectedComments.find((candidate) => candidate.id === rootComment.parentId)
      if (!parent) break
      rootComment = parent
    }
    setReplyTarget({ parentId: comment.id, anchorId: comment.id, rootId: rootComment.id, author: comment.author })
    requestAnimationFrame(() => replyTextareaRef.current?.focus())
  }

  const toggleLiked = (id: number) => setLiked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })

  const openCommunityProfile = (name: string, tier: string, trigger: HTMLButtonElement) => {
    communityProfileTriggerRef.current = trigger
    setSelectedCommunityProfile(profileDialogUserFor(name, tier, displayedAchievementIds, localPosts, commentsByPost))
  }

  const closeCommunityProfile = () => {
    communityProfileDialogRef.current?.close()
    setSelectedCommunityProfile(null)
    requestAnimationFrame(() => communityProfileTriggerRef.current?.focus())
  }

  const communityProfileDialog = selectedCommunityProfile ? (
    <UserProfileDialog
      dialogRef={communityProfileDialogRef}
      dialogId="community-profile"
      user={selectedCommunityProfile}
      followed={followedProfiles.has(selectedCommunityProfile.name)}
      onToggleFollow={() => setFollowedProfiles((current) => {
        const next = new Set(current)
        if (next.has(selectedCommunityProfile.name)) next.delete(selectedCommunityProfile.name)
        else next.add(selectedCommunityProfile.name)
        return next
      })}
      onClose={closeCommunityProfile}
    />
  ) : null

  const renderReplyComposer = (inline = false) => <form className={`thread-reply-form${replyTarget ? ' replying' : ''}${inline ? ' inline' : ''}`} onSubmit={submitComment} key={`reply-composer-${replyTarget?.anchorId ?? 'root'}`}>
    <UserAvatar size="small" />
    {replyTarget && <div className="thread-reply-context"><span><CornerDownRight size={13} aria-hidden="true" /><b>@{replyTarget.author}</b>에게 답글</span><button type="button" aria-label={`${replyTarget.author} 답글 작성 취소`} onClick={() => { setReplyTarget(null); requestAnimationFrame(() => replyTextareaRef.current?.focus()) }}><X size={13} /></button></div>}
    <label><span className="visually-hidden">{replyTarget ? `${replyTarget.author}에게 대댓글 작성` : '답글 작성'}</span><textarea ref={replyTextareaRef} id="thread-reply-input" rows={1} maxLength={300} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={replyTarget ? `${replyTarget.author}님에게 답글 남기기` : '답글을 남겨보세요.'} /></label>
    <button type="submit" aria-label={replyTarget ? `${replyTarget.author}에게 답글 등록` : '답글 등록'} disabled={!commentDraft.trim()}><Send size={14} /><span>답글</span></button>
  </form>

  const renderThreadReply = (comment: ThreadComment, nested = false, connected = false) => <article className={`thread-reply${nested ? ' nested' : ''}${connected ? ' connected' : ''}`}>
    <button type="button" className="profile-avatar-trigger" aria-haspopup="dialog" aria-label={`${comment.author} 프로필 열기`} onClick={(event) => openCommunityProfile(comment.author, comment.tier, event.currentTarget)}><UserAvatar size="small" /></button>
    <div>
      <header className="thread-author-line"><button type="button" className="community-profile-trigger" aria-haspopup="dialog" aria-label={`${comment.author} 프로필 열기`} onClick={(event) => openCommunityProfile(comment.author, comment.tier, event.currentTarget)}>{comment.author}</button><TierMark tier={comment.tier} compact /><time>{comment.time}</time></header>
      <p>{comment.replyTo && <span className="thread-reply-mention">@{comment.replyTo}</span>}{comment.body}</p>
      <div className="thread-reply-actions"><button type="button" className="thread-reply-like" aria-label={`${comment.author}의 답글 좋아요`}><Heart size={14} />{comment.likes}</button><button type="button" className="thread-reply-answer" aria-label={`${comment.author}에게 답글 작성`} onClick={() => beginNestedReply(comment)}>답글</button></div>
    </div>
  </article>

  const descendantsForReply = (parentId: number, visited = new Set<number>()): ThreadComment[] => {
    if (visited.has(parentId)) return []
    const nextVisited = new Set(visited).add(parentId)
    return selectedComments
      .filter((reply) => reply.parentId === parentId)
      .flatMap((reply) => [reply, ...descendantsForReply(reply.id, nextVisited)])
  }

  const renderReplyBranch = (comment: ThreadComment): ReactNode => {
    const descendants = descendantsForReply(comment.id)
    const expanded = expandedReplyGroups.has(comment.id)
    const visibleReplies = expanded ? descendants : descendants.slice(0, 2)
    const hiddenReplyCount = descendants.length - visibleReplies.length
    const rootComposerOpen = replyTarget?.anchorId === comment.id
    const hasConnectedContent = rootComposerOpen || visibleReplies.length > 0

    return <div className="thread-reply-branch root" key={comment.id}>
      {renderThreadReply(comment, false, hasConnectedContent)}
      {hasConnectedContent && <div className="thread-reply-children">
        {rootComposerOpen && <div className={`thread-reply-flat-child composer-item${visibleReplies.length === 0 ? ' last-visible' : ''}`}><span className="thread-reply-connector" aria-hidden="true" />{renderReplyComposer(true)}</div>}
        {visibleReplies.flatMap((reply, index) => {
          const composerOpen = replyTarget?.anchorId === reply.id
          const lastReply = index === visibleReplies.length - 1
          const replyItems: ReactNode[] = [<div className={`thread-reply-flat-child${lastReply && !composerOpen ? ' last-visible' : ''}`} key={reply.id}><span className="thread-reply-connector" aria-hidden="true" />{renderThreadReply(reply, true)}</div>]
          if (composerOpen) replyItems.push(<div className={`thread-reply-flat-child composer-item${lastReply ? ' last-visible' : ''}`} key={`composer-item-${reply.id}`}><span className="thread-reply-connector" aria-hidden="true" />{renderReplyComposer(true)}</div>)
          return replyItems
        })}
        {descendants.length > 2 && <button
          type="button"
          className="thread-reply-toggle"
          aria-expanded={expanded}
          onClick={() => setExpandedReplyGroups((current) => {
            const next = new Set(current)
            if (next.has(comment.id)) next.delete(comment.id)
            else next.add(comment.id)
            return next
          })}
        ><ChevronDown size={14} aria-hidden="true" />{expanded ? '답글 접기' : `답글 ${hiddenReplyCount}개 더 보기`}</button>}
      </div>}
    </div>
  }

  if (screen === 'detail' && selectedPost) {
    return (
      <section className="portal-page community-detail-page thread-detail-page" aria-labelledby="thread-detail-title">
        <button className="detail-back thread-back" type="button" onClick={() => setScreen('list')}><ArrowLeft size={16} />커뮤니티 피드</button>
        <section className="thread-detail-shell">
          <article className="thread-detail-root">
            <button type="button" className="profile-avatar-trigger" aria-haspopup="dialog" aria-label={`${selectedPost.author} 프로필 열기`} onClick={(event) => openCommunityProfile(selectedPost.author, selectedPost.tier, event.currentTarget)}><UserAvatar /></button>
            <div>
              <header className="thread-author-line"><button type="button" className="community-profile-trigger" aria-haspopup="dialog" aria-label={`${selectedPost.author} 프로필 열기`} onClick={(event) => openCommunityProfile(selectedPost.author, selectedPost.tier, event.currentTarget)}>{selectedPost.author}</button><TierMark tier={selectedPost.tier} compact /><time>{selectedPost.time}</time></header>
              <h1 className="visually-hidden" id="thread-detail-title">{selectedPost.title}</h1>
              <div className="thread-detail-copy"><strong>{selectedPost.title}</strong>{selectedPost.body !== selectedPost.title && selectedPost.body.split('\n').filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              {selectedPost.image && <img className="thread-media" src={selectedPost.image} alt={selectedPost.imageAlt ?? '첨부 이미지'} decoding="async" />}
              <div className="thread-tags" aria-label="해시태그">{selectedTags.map((tag) => <button type="button" style={teamTagStyle(tag)} key={tag} onClick={() => { setActiveTag(tag); setScreen('list') }}>{tag}</button>)}</div>
              <footer className="thread-actions"><button type="button" aria-label={`답글 ${selectedComments.length}개 작성하기`} onClick={() => { setReplyTarget(null); requestAnimationFrame(() => replyTextareaRef.current?.focus()) }}><MessageCircle size={15} /><span>{selectedComments.length}</span></button><button type="button" className={liked.has(selectedPost.id) ? 'liked' : ''} aria-pressed={liked.has(selectedPost.id)} onClick={() => toggleLiked(selectedPost.id)}><Heart size={15} /><span>{selectedPost.likes + (liked.has(selectedPost.id) ? 1 : 0)}</span></button><span><Eye size={14} />{selectedPost.views + 1}</span></footer>
            </div>
          </article>

          <section className="thread-replies" aria-labelledby="thread-replies-title">
            <header><h2 id="thread-replies-title">답글 <span>{selectedComments.length}</span></h2></header>
            {!replyTarget && renderReplyComposer()}
            <div className="thread-reply-list">
              {selectedComments.filter((comment) => !comment.parentId).map((comment) => renderReplyBranch(comment))}
              {selectedComments.length === 0 && <p className="portal-empty">첫 답글을 남겨보세요.</p>}
            </div>
          </section>
        </section>
        {communityProfileDialog}
      </section>
    )
  }

  return (
    <section className="portal-page community-page" aria-labelledby="community-title">
      <h1 className="visually-hidden" id="community-title">커뮤니티</h1>

      <div className="community-layout">
        <div className="community-main">
          <section className="community-scope-panel" aria-label="커뮤니티 피드 범위">
            <div className="thread-scope" role="group" aria-label="피드 범위">
              {([['recommended', '추천'], ['general', '일반'], ['following', '팔로잉'], ['team', '내 팀']] as Array<[CommunityScope, string]>).map(([value, label]) => <button type="button" className={scope === value ? 'active' : ''} aria-pressed={scope === value} onClick={() => setScope(value)} key={value}>{label}</button>)}
            </div>
            <button ref={composerTriggerRef} className={`thread-compose-trigger ${composerOpen ? 'active' : ''}`} type="button" aria-label={composerOpen ? '새 스레드 작성 닫기' : '새 스레드 작성'} aria-expanded={composerOpen} aria-controls="thread-composer" onClick={() => { if (composerOpen) { setComposerOpen(false); return } setComposerOpen(true); requestAnimationFrame(() => composerTextareaRef.current?.focus()) }}>{composerOpen ? <><X size={15} />닫기</> : <><SquarePen size={15} />작성</>}</button>
          </section>

          {composerOpen && <section className="thread-compose-panel" aria-label="새 스레드 작성">
            <form id="thread-composer" className="thread-composer" onSubmit={submitPost}>
              <UserAvatar />
              <div>
                <label className="thread-composer-body"><span>새 스레드</span><textarea ref={composerTextareaRef} rows={3} maxLength={500} value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder="지금 보고 있는 경기나 야구 이야기를 나눠보세요." /></label>
                {draftImage && <div className="thread-image-preview"><img src={draftImage} alt={draftImageAlt || '첨부할 이미지 미리보기'} /><button type="button" aria-label="첨부 사진 삭제" onClick={() => { setDraftImage(null); setDraftImageAlt(''); if (fileInputRef.current) fileInputRef.current.value = '' }}><X size={14} /></button><label className="thread-image-caption"><span className="visually-hidden">사진 설명</span><input value={draftImageAlt} onChange={(event) => setDraftImageAlt(event.target.value)} placeholder="사진 설명 추가 (선택)" /></label></div>}
                <footer>
                  <div className="thread-composer-tools">
                    <label className="thread-photo-control"><ImagePlus size={16} /><span>사진</span><input ref={fileInputRef} type="file" accept="image/*" onChange={(event) => selectImage(event.target.files?.[0])} /></label>
                    <div className="thread-draft-tags" aria-label="작성할 해시태그">
                      {draftTags.map((tag) => <button type="button" style={teamTagStyle(tag)} aria-label={`${tag} 삭제`} onClick={() => setDraftTags((current) => current.filter((item) => item !== tag))} key={tag}>{tag}<X size={10} /></button>)}
                      <label className="thread-tag-input"><Hash size={14} /><span className="visually-hidden">해시태그 추가</span><input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (!event.nativeEvent.isComposing && (event.key === 'Enter' || event.key === ',' || event.key === ' ')) { event.preventDefault(); addDraftTag(tagDraft) } }} onBlur={() => addDraftTag(tagDraft)} placeholder="태그 추가" /></label>
                    </div>
                  </div>
                  <span>{draftBody.length}/500</span>
                  <button type="submit" disabled={!draftBody.trim()}>게시</button>
                </footer>
                <p className="thread-composer-status" role="status" aria-live="polite">{composerStatus}</p>
              </div>
            </form>
          </section>}

          <section className="thread-feed-panel" aria-labelledby="feed-title">
            <h2 className="visually-hidden" id="feed-title">커뮤니티 스레드</h2>
            <div className="thread-feed-meta">
              <div className="thread-feed-controls">
                <label className="thread-search"><Search size={15} /><span className="visually-hidden">스레드와 해시태그 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" /></label>
                <div className="board-sort" role="group" aria-label="스레드 정렬"><button type="button" className={sort === 'latest' ? 'active' : ''} aria-pressed={sort === 'latest'} onClick={() => setSort('latest')}>최신</button><button type="button" className={sort === 'popular' ? 'active' : ''} aria-pressed={sort === 'popular'} onClick={() => setSort('popular')}><Flame size={11} />인기</button></div>
              </div>
            </div>
            <div className={`thread-tag-rail ${showAllTags ? 'expanded' : ''}`}>
              <div ref={tagDiscoveryRef} id="thread-tag-options" className="thread-tag-discovery" aria-label="추천 해시태그">
                <span>#인기</span>
                {visibleSuggestedTags.map((tag) => <button type="button" style={teamTagStyle(tag, activeTag === tag)} className={activeTag === tag ? 'active' : ''} aria-pressed={activeTag === tag} onClick={() => setActiveTag((current) => current === tag ? null : tag)} key={tag}>{tag}</button>)}
                {activeTag && <button type="button" className="clear-tag" aria-label={`${activeTag} 필터 해제`} onClick={() => setActiveTag(null)}><X size={12} /><b>필터 해제</b></button>}
              </div>
              <div ref={tagMeasureRef} className="thread-tag-measure" aria-hidden="true"><span>#인기</span>{suggestedThreadTags.map((tag) => <span data-measured-tag key={tag}>{tag}</span>)}</div>
              {hiddenSuggestedTagCount > 0 && <button type="button" className="tag-more-toggle" aria-label={showAllTags ? '태그 접기' : `${hiddenSuggestedTagCount}개 태그 더보기`} aria-expanded={showAllTags} aria-controls="thread-tag-options" onClick={() => setShowAllTags((current) => !current)}><b>{showAllTags ? '접기' : `+${hiddenSuggestedTagCount}`}</b><ChevronRight size={12} aria-hidden="true" /></button>}
            </div>

            <div className="thread-list">
              {!query && (!activeTag || ['#공지', '#운영정책'].includes(activeTag)) && <article className="thread-item pinned-thread" aria-label="상단 고정 공지"><span className="thread-notice-icon" aria-hidden="true"><Megaphone size={18} /></span><div><header className="thread-author-line"><strong>BetterBatter Official</strong><span className="thread-notice-chip"><Pin size={10} />공지</span><time>08.24</time></header><button type="button" className="thread-open" onClick={onRequireLogin}><strong>커뮤니티 운영 정책 및 경기 중계 예절 안내</strong><span>선수와 다른 팬을 존중하며 확인되지 않은 경기 정보는 출처와 함께 공유해주세요.</span></button><div className="thread-tags"><button type="button" onClick={() => setActiveTag('#공지')}>#공지</button><button type="button" onClick={() => setActiveTag('#운영정책')}>#운영정책</button></div></div></article>}
              {visiblePosts.map((post) => {
                const postTags = tagsForThread(post)
                const replyCount = commentsByPost[post.id]?.length ?? post.comments
                return <article className="thread-item" key={post.id}>
                  <button type="button" className="profile-avatar-trigger" aria-haspopup="dialog" aria-label={`${post.author} 프로필 열기`} onClick={(event) => openCommunityProfile(post.author, post.tier, event.currentTarget)}><UserAvatar size="small" /></button>
                  <div>
                    <header className="thread-author-line"><button type="button" className="community-profile-trigger" aria-haspopup="dialog" aria-label={`${post.author} 프로필 열기`} onClick={(event) => openCommunityProfile(post.author, post.tier, event.currentTarget)}>{post.author}</button><TierMark tier={post.tier} compact />{post.popular && <em className="thread-popular-icon" aria-label="인기 스레드" title="인기 스레드"><Flame size={14} fill="currentColor" /></em>}<time>{post.time}</time></header>
                    <button type="button" className="thread-open" aria-label={`${post.title} 스레드 열기`} onClick={() => openPost(post.id)}><strong>{post.title}</strong>{post.body !== post.title && <span>{post.body.split('\n').find(Boolean)}</span>}</button>
                    {post.image && <button type="button" className="thread-media-button" aria-label={`${post.title} 첨부 이미지와 스레드 열기`} onClick={() => openPost(post.id)}><img className="thread-media" src={post.image} alt={post.imageAlt ?? '첨부 이미지'} loading="lazy" decoding="async" /></button>}
                    <div className="thread-tags" aria-label="해시태그">{postTags.map((tag) => <button type="button" style={teamTagStyle(tag, activeTag === tag)} className={activeTag === tag ? 'active' : ''} onClick={() => setActiveTag(tag)} key={tag}>{tag}</button>)}</div>
                    <footer className="thread-actions"><button type="button" aria-label={`${post.title} 답글 ${replyCount}개 열기`} onClick={() => openPost(post.id)}><MessageCircle size={15} /><span>{replyCount}</span></button><button type="button" className={liked.has(post.id) ? 'liked' : ''} aria-pressed={liked.has(post.id)} aria-label={`${post.title} 공감`} onClick={() => toggleLiked(post.id)}><Heart size={15} /><span>{post.likes + (liked.has(post.id) ? 1 : 0)}</span></button><span><Eye size={14} />{post.views}</span></footer>
                  </div>
                </article>
              })}
              {visiblePosts.length === 0 && <div className="thread-empty"><Hash size={22} /><strong>아직 표시할 스레드가 없습니다.</strong><p>검색어나 해시태그를 바꾸거나 새로운 스레드를 작성해보세요.</p></div>}
            </div>
            {filteredPosts.length > 0 && (
              <div ref={loadSentinelRef} className="thread-scroll-status" aria-live="polite">
                {hasMoreThreads ? (
                  <>
                    <span className="thread-loading-copy"><i aria-hidden="true" />다음 스레드를 불러오는 중</span>
                    <button type="button" className="thread-load-more" onClick={() => setVisibleCount((current) => Math.min(current + THREAD_BATCH_SIZE, filteredPosts.length))}>바로 더 보기<span>{filteredPosts.length - visibleCount}개 남음</span></button>
                  </>
                ) : (
                  <div className="thread-feed-end" role="status"><Check size={17} aria-hidden="true" /><strong>새로운 이야기는 여기까지예요.</strong><span>더 이상 게시글이 없습니다.</span></div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
      {communityProfileDialog}
    </section>
  )
}

export function RankingsPage({ games, selectedGameId, onSelectGame, displayedAchievementIds = DEFAULT_DISPLAYED_ACHIEVEMENT_IDS, favoriteTeamCode = DEFAULT_FAVORITE_TEAM_CODE }: { games: LiveGameOption[]; selectedGameId: string; onSelectGame: (gameId: string) => void; displayedAchievementIds?: readonly AchievementId[]; favoriteTeamCode?: TeamCode }) {
  const [scope, setScope] = useState<RankingScope>('season')
  const [rankJourneyOpen, setRankJourneyOpen] = useState(false)
  const [followed, setFollowed] = useState(() => new Set(['CurveMaster']))
  const [selectedProfile, setSelectedProfile] = useState<RankingUser | null>(null)
  const [rankQuery, setRankQuery] = useState('')
  const [rankPage, setRankPage] = useState(1)
  const profileDialogRef = useRef<HTMLDialogElement | null>(null)
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null)
  const rankJourneyDialogRef = useRef<HTMLDialogElement | null>(null)
  const rankJourneyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const rankJourneyScrollYRef = useRef(0)
  const selectedRankingGame = games.find((game) => game.id === selectedGameId) ?? games[0]
  const rawRanking = scope === 'game' ? gameRankingsByGame[selectedRankingGame?.id ?? ''] ?? [] : seasonRanking
  const ranking = (scope === 'game' ? completeGameRanking(rawRanking) : rawRanking).map((user) => user.name === 'BetterBatter' ? { ...user, team: favoriteTeamCode } : user)
  const rankingGameStatusLabel = selectedRankingGame?.status === 'live' ? 'LIVE' : selectedRankingGame?.status === 'final' ? 'FINAL' : 'TODAY'
  const rankingGameScore = selectedRankingGame?.status === 'scheduled'
    ? `${selectedRankingGame.awayCode} VS ${selectedRankingGame.homeCode}`
    : selectedRankingGame ? `${selectedRankingGame.awayCode} ${selectedRankingGame.awayScore} — ${selectedRankingGame.homeScore} ${selectedRankingGame.homeCode}` : ''
  const rankingGameMeta = selectedRankingGame?.status === 'live'
    ? `${selectedRankingGame.inning} · ${selectedRankingGame.venue}`
    : selectedRankingGame?.status === 'final' ? `경기 종료 · ${selectedRankingGame.venue}` : selectedRankingGame ? `${selectedRankingGame.startTime} 예정 · ${selectedRankingGame.venue}` : ''
  const topThree = ranking.filter((user) => user.rank <= 3)
  const currentPlayer = ranking.find((user) => user.name === 'BetterBatter')
  const normalizedRankQuery = rankQuery.trim().toLocaleLowerCase('ko-KR')
  const filteredPlayers = ranking.filter((user) => `${user.name} ${user.team}`.toLocaleLowerCase('ko-KR').includes(normalizedRankQuery))
  const filteredTeams = teamRanking.filter((team) => `${team.name} ${team.code}`.toLocaleLowerCase('ko-KR').includes(normalizedRankQuery))
  const filteredPlayerList = filteredPlayers.filter((user) => user.rank > 3)
  const filteredTeamList = filteredTeams.filter((team) => team.rank > 3)
  const rankPageSize = 10
  const filteredRankCount = scope === 'team' ? filteredTeams.length : filteredPlayers.length
  const paginatedRankCount = normalizedRankQuery
    ? scope === 'team' ? filteredTeamList.length : filteredPlayerList.length
    : scope === 'team' ? teamRanking.length : ranking.length
  const rankPageCount = Math.max(1, Math.ceil(paginatedRankCount / rankPageSize))
  const currentRankPage = Math.min(rankPage, rankPageCount)
  const pageStart = (currentRankPage - 1) * rankPageSize
  const visiblePlayers = normalizedRankQuery
    ? filteredPlayerList.slice(pageStart, pageStart + rankPageSize)
    : ranking.filter((user) => currentRankPage === 1 ? user.rank >= 4 && user.rank <= 10 : user.rank > (currentRankPage - 1) * 10 && user.rank <= currentRankPage * 10)
  const currentPlayerVisible = visiblePlayers.some((user) => user.name === 'BetterBatter')
  const visibleLastPlayerRank = visiblePlayers[visiblePlayers.length - 1]?.rank
  const detachedCurrentPlayer = currentPlayer && !normalizedRankQuery && !currentPlayerVisible ? currentPlayer : null
  const formatSkippedRanks = (start: number, end: number) => start === end ? `${start}위 생략` : `${start}–${end}위 생략`
  const skippedPlayerRankLabel = detachedCurrentPlayer && visibleLastPlayerRank && detachedCurrentPlayer.rank > visibleLastPlayerRank + 1
    ? formatSkippedRanks(visibleLastPlayerRank + 1, detachedCurrentPlayer.rank - 1)
    : '중간 순위 생략'
  const visibleTeams = normalizedRankQuery
    ? filteredTeamList.slice(pageStart, pageStart + rankPageSize)
    : teamRanking.filter((team) => currentRankPage === 1 ? team.rank >= 4 && team.rank <= 10 : team.rank > (currentRankPage - 1) * 10 && team.rank <= currentRankPage * 10)
  const favoriteRankedTeam = teamRanking.find((team) => team.code === favoriteTeamCode)
  const favoriteTeamVisible = visibleTeams.some((team) => team.code === favoriteTeamCode)
  const visibleLastTeamRank = visibleTeams[visibleTeams.length - 1]?.rank
  const detachedFavoriteTeam = favoriteRankedTeam && favoriteRankedTeam.rank > 3 && !normalizedRankQuery && !favoriteTeamVisible ? favoriteRankedTeam : null
  const skippedTeamRankLabel = detachedFavoriteTeam && visibleLastTeamRank && detachedFavoriteTeam.rank > visibleLastTeamRank + 1
    ? formatSkippedRanks(visibleLastTeamRank + 1, detachedFavoriteTeam.rank - 1)
    : '중간 순위 생략'
  const podiumOnlySearchResult = Boolean(normalizedRankQuery) && (scope === 'team' ? filteredTeams : filteredPlayers).some((entry) => entry.rank <= 3) && (scope === 'team' ? filteredTeamList : filteredPlayerList).length === 0
  const displayedProfileAchievements = selectedProfile ? displayedAchievementsFor(selectedProfile, displayedAchievementIds) : []
  const rankingDialogUser: ProfileDialogUser | null = selectedProfile ? {
    name: selectedProfile.name,
    tier: selectedProfile.tier,
    team: selectedProfile.team,
    eyebrow: `GLOBAL RANK #${selectedProfile.rank}`,
    badges: displayedProfileAchievements,
    stats: [{ label: '랭크 점수', value: `${selectedProfile.score.toLocaleString()}P` }, { label: '연속 적중', value: String(selectedProfile.streak) }],
  } : null
  const toggleFollow = (name: string) => setFollowed((current) => { const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next })

  useEffect(() => {
    const dialog = profileDialogRef.current
    if (!selectedProfile || !dialog || dialog.open) return
    dialog.showModal()
    requestAnimationFrame(() => dialog.querySelector<HTMLButtonElement>('.rank-profile-close')?.focus())
  }, [selectedProfile])

  useEffect(() => {
    if (!rankJourneyOpen) return
    const root = document.documentElement
    const body = document.body
    const scrollY = rankJourneyScrollYRef.current
    const previousBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      right: body.style.right,
      left: body.style.left,
      width: body.style.width,
    }
    root.classList.add('rank-journey-modal-open')
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, right: '0', left: '0', width: '100%' })
    return () => {
      root.classList.remove('rank-journey-modal-open')
      Object.assign(body.style, previousBodyStyle)
      window.scrollTo(0, scrollY)
    }
  }, [rankJourneyOpen])

  const openProfile = (user: RankingUser, trigger: HTMLButtonElement) => {
    profileTriggerRef.current = trigger
    setSelectedProfile(user)
  }

  const closeProfile = () => {
    profileDialogRef.current?.close()
    setSelectedProfile(null)
    requestAnimationFrame(() => profileTriggerRef.current?.focus())
  }

  const openRankJourney = (trigger: HTMLButtonElement) => {
    rankJourneyTriggerRef.current = trigger
    rankJourneyScrollYRef.current = window.scrollY
    rankJourneyDialogRef.current?.showModal()
    setRankJourneyOpen(true)
    requestAnimationFrame(() => rankJourneyDialogRef.current?.querySelector<HTMLButtonElement>('.rank-journey-close')?.focus())
  }

  const closeRankJourney = () => {
    rankJourneyDialogRef.current?.close()
    setRankJourneyOpen(false)
    requestAnimationFrame(() => rankJourneyTriggerRef.current?.focus())
  }

  const changeScope = (nextScope: RankingScope) => {
    setSelectedProfile(null)
    setRankQuery('')
    setRankPage(1)
    setScope(nextScope)
  }

  const jumpToMyRank = () => {
    setRankQuery('')
    const myRank = scope === 'team' ? teamRanking.find((team) => team.code === favoriteTeamCode)?.rank : currentPlayer?.rank
    if (myRank) setRankPage(Math.ceil(myRank / rankPageSize))
  }

  const scopeToggle = (
    <div className="rank-scope-toggle" role="group" aria-label="랭킹 범위">
      <button type="button" className={scope === 'game' ? 'active' : ''} aria-pressed={scope === 'game'} onClick={() => changeScope('game')}>경기 랭킹</button>
      <button type="button" className={scope === 'season' ? 'active' : ''} aria-pressed={scope === 'season'} onClick={() => changeScope('season')}>시즌 랭킹</button>
      <button type="button" className={scope === 'team' ? 'active' : ''} aria-pressed={scope === 'team'} onClick={() => changeScope('team')}>구단 랭킹</button>
    </div>
  )

  const rankingRow = (user: RankingUser, nearby = false, showListLink = false) => (
    <article className={`tier-rank-row ${user.name === 'BetterBatter' ? 'is-current' : ''} ${nearby ? 'nearby-rank-row' : ''}`} key={user.name} aria-label={`${user.rank}위 ${user.name}${user.name === 'BetterBatter' ? ', 내 순위' : ''}`}>
      <span className="rank-number">{String(user.rank).padStart(2, '0')}</span>
      <button type="button" className="rank-player rank-profile-trigger" aria-haspopup="dialog" aria-label={`${user.name} 프로필 열기`} onClick={(event) => openProfile(user, event.currentTarget)}><UserAvatar size="small" className="rank-avatar" /><span><strong>{user.name}</strong><small><span className="mobile-rank-tier"><TierMark tier={user.tier} compact /></span><span><b className="team-code-inline" style={teamAccentStyle(user.team)}>{user.team}</b> · {user.streak}연속 적중</span></small></span></button>
      <TierMark tier={user.tier} compact />
      {showListLink ? <div className="my-rank-score-action"><strong className="rank-score">{user.score.toLocaleString()}<small>P</small></strong><button type="button" onClick={jumpToMyRank}>{user.rank}위로 이동<ChevronRight size={12} /></button></div> : <strong className="rank-score">{user.score.toLocaleString()}<small>P</small></strong>}
    </article>
  )

  const teamRankingRow = (team: (typeof teamRanking)[number]) => (
    <article className={team.code === favoriteTeamCode ? 'is-supported' : ''} key={team.code} aria-label={`${team.rank}위 ${team.name}, 응원 팬 ${team.supporters.toLocaleString()}명, 합산 ${team.score.toLocaleString()}점${team.code === favoriteTeamCode ? ', 내 응원 구단' : ''}`}>
      <span>{String(team.rank).padStart(2, '0')}</span>
      <div><i className="team-rank-monogram" aria-hidden="true" style={teamBadgeStyle(team.code)}>{team.code}</i><span><strong>{team.name}</strong><small><em className="team-code-inline" style={teamAccentStyle(team.code)}>{team.code}</em><b> · 응원 팬 {team.supporters.toLocaleString()}명</b></small></span></div>
      <span>{team.supporters.toLocaleString()}명</span>
      <strong>{team.score.toLocaleString()}<small>P</small></strong>
    </article>
  )

  const fullRankingToolbar = (
    <header className="full-ranking-toolbar">
      <div className="full-ranking-actions">
        <div className="full-ranking-search">
          <Search size={15} aria-hidden="true" />
          <input aria-label="랭킹 검색" value={rankQuery} onChange={(event) => { setRankQuery(event.target.value); setRankPage(1) }} placeholder={scope === 'team' ? '구단명·코드 검색' : '닉네임·구단 검색'} />
          {rankQuery && <button type="button" aria-label="검색어 지우기" onClick={() => { setRankQuery(''); setRankPage(1) }}><X size={14} /></button>}
        </div>
        {rankQuery && <span className="full-ranking-result-count" role="status">검색 결과 <b>{filteredRankCount.toLocaleString()}</b>{scope === 'team' ? '개 구단' : '명'}</span>}
      </div>
    </header>
  )

  const fullRankingPagination = rankPageCount > 1 && (
    <nav className="full-ranking-pagination" aria-label="전체 랭킹 페이지">
      <button type="button" disabled={currentRankPage === 1} onClick={() => setRankPage((page) => Math.max(1, page - 1))} aria-label="이전 랭킹 페이지">이전</button>
      <span><b>{currentRankPage}</b> / {rankPageCount}</span>
      <div aria-label="페이지 선택">{Array.from({ length: rankPageCount }, (_, index) => index + 1).map((page) => <button type="button" className={currentRankPage === page ? 'active' : ''} aria-current={currentRankPage === page ? 'page' : undefined} aria-label={`${page}페이지`} onClick={() => setRankPage(page)} key={page}>{page}</button>)}</div>
      <button type="button" disabled={currentRankPage === rankPageCount} onClick={() => setRankPage((page) => Math.min(rankPageCount, page + 1))} aria-label="다음 랭킹 페이지">다음</button>
    </nav>
  )

  return (
    <section className="portal-page rankings-page rank-lab rank-final" aria-labelledby="rankings-title">
      <h1 className="visually-hidden" id="rankings-title">랭킹</h1>

      <section className="rank-tier-focus" aria-labelledby="tier-focus-title">
            <div className="tier-focus-hero">
              <span className="rank-kicker"><Sparkles size={14} />SEASON BEST</span>
              <span className="tier-season-status rank-card-season-status"><Clock3 size={14} /><span><small>2026 SUMMER</small><b>시즌 종료 D-18</b></span></span>
              <div className="tier-focus-emblem">
                <img src="/tier-badges/diamond.png" alt="" aria-hidden="true" />
                <h2 id="tier-focus-title">DIAMOND</h2>
                <p>상위 4.8% · 전체 23위</p>
              </div>
              <div className="tier-focus-summary">
                <div className="tier-focus-score">
                  <div className="tier-focus-score-header">
                    <span>RANK SCORE</span>
                    <button className="rank-progress-help-trigger" type="button" aria-haspopup="dialog" aria-label="랭크 진행도 보기" onClick={(event) => openRankJourney(event.currentTarget)}>?</button>
                  </div>
                  <strong>8,420<small> P</small></strong>
                </div>
                <div className="rank-promotion hybrid-tier-progress" aria-label="DIAMOND 8,000점에서 ALL-STAR 9,000점까지 42% 진행, 승급까지 580점 남음">
                  <div className="hybrid-tier-endpoint current">
                    <span><img src="/tier-badges/diamond.png" alt="" aria-hidden="true" /></span>
                    <div><small>현재 티어</small><strong>DIAMOND</strong></div>
                  </div>
                  <div className="hybrid-gauge">
                    <header className="hybrid-gauge-remaining"><span>42% 진행</span><strong>580 P 남음</strong></header>
                    <div className="hybrid-gauge-track"><span style={{ width: '42%' }} /><i aria-hidden="true" style={{ left: '42%' }} /></div>
                    <footer className="hybrid-gauge-scale"><span>8,000 P</span><span>9,000 P</span></footer>
                  </div>
                  <div className="hybrid-tier-endpoint next">
                    <span><img src="/tier-badges/all-star.png" alt="" aria-hidden="true" /></span>
                    <div><small>다음 티어</small><strong>ALL-STAR</strong></div>
                  </div>
                </div>
                <dl className="tier-focus-stats"><div><dt>오늘 최고</dt><dd>760</dd></div><div><dt>연속 적중</dt><dd>4</dd></div><div><dt>시즌 참여</dt><dd>184</dd></div></dl>
              </div>
            </div>

            <section className={`rank-board tier-board final-tier-board ${scope === 'team' ? 'team-ranking-board' : 'player-layout-search'}`} aria-label={scope === 'team' ? '구단 랭킹' : '플레이어 랭킹'}>
              <div className="rank-board-controls">{scopeToggle}</div>
              {scope === 'season' && <section className="ranking-context-bar is-season" aria-label="시즌 랭킹 집계 안내">
                <div className="ranking-context-copy"><span><Trophy size={15} />시즌 누적 점수</span><small>2026 SUMMER · 이번 시즌에 획득한 랭킹 점수를 기준으로 집계합니다.</small></div>
              </section>}
              {scope === 'game' && selectedRankingGame && <section className="ranking-context-bar is-game" aria-labelledby="selected-ranking-game-title">
                <div className="ranking-context-copy"><span><Radio size={15} />경기별 참여 점수</span><small id="selected-ranking-game-title">{rankingGameStatusLabel} · {rankingGameScore} · {rankingGameMeta}</small></div>
                <div className="game-ranking-picker"><LiveGameSelector games={games} selectedGameId={selectedRankingGame.id} onSelectGame={(gameId) => { setRankQuery(''); setRankPage(1); onSelectGame(gameId) }} label="경기 선택" /></div>
              </section>}
              {scope === 'team' && <section className="ranking-context-bar is-team" aria-label="구단 랭킹 집계 안내">
                <div className="ranking-context-copy"><span><Users size={15} />응원 팬 점수 총합</span><small>2026 SUMMER · 구단을 응원하는 모든 사용자의 시즌 점수를 합산합니다.</small></div>
              </section>}
              {scope === 'team' && <div className="player-ranking-toolbar-slot team-ranking-toolbar-slot">{fullRankingToolbar}</div>}
              {scope === 'team' ? (
                <div className="team-ranking-content" aria-live="polite">
                  <ol className="team-top-podium" aria-label="구단 랭킹 1위부터 3위">
                    {teamRanking.slice(0, 3).map((team) => <li className={`team-podium-card place-${team.rank} ${team.code === favoriteTeamCode ? 'is-supported' : ''}`} aria-label={`${team.rank}위 ${team.name}, 응원 팬 ${team.supporters.toLocaleString()}명, 합산 ${team.score.toLocaleString()}점${team.code === favoriteTeamCode ? ', 내 응원 구단' : ''}`} key={team.code}>
                      <div className="podium-profile-trigger team-podium-content" aria-hidden="true">
                        <span className={`podium-avatar-medal team-podium-medal rank-${team.rank}`}>
                          <span className="podium-medal-ribbon" />
                          <i className="team-rank-monogram" style={teamBadgeStyle(team.code)}>{team.code}</i>
                          <span className="podium-medal-coin" />
                          {team.code === favoriteTeamCode && <span className="supported-team-marker"><Heart size={10} fill="currentColor" /></span>}
                        </span>
                        <span>
                          <strong>{team.name}</strong>
                          <small className="podium-team-line"><span>응원 팬 {team.supporters.toLocaleString()}명</span></small>
                        </span>
                      </div>
                      <strong className="team-podium-score">{team.score.toLocaleString()}<small>P</small></strong>
                    </li>)}
                  </ol>
                  <section className="full-ranking-shell" aria-labelledby="full-team-ranking-title">
                    <h3 className="visually-hidden" id="full-team-ranking-title">전체 구단 랭킹</h3>
                    {visibleTeams.length ? <div className="team-rank-list" aria-label="전체 구단 랭킹">
                      <div className="team-rank-head" aria-hidden="true"><span>순위</span><span>구단</span><span>응원 팬</span><span>합산 점수</span></div>
                      {visibleTeams.map(teamRankingRow)}
                    </div> : <div className="full-ranking-empty" role="status"><Search size={19} /><strong>{podiumOnlySearchResult ? '검색한 구단은 위 시상대에서 확인할 수 있습니다.' : '일치하는 구단이 없습니다.'}</strong><button type="button" onClick={() => setRankQuery('')}>검색 초기화</button></div>}
                    {detachedFavoriteTeam && <section className="detached-supported-team" aria-label="내 응원 구단 순위">
                      <div className="my-rank-gap" role="separator" aria-label={skippedTeamRankLabel}>
                        <span className="vertical-ellipsis" aria-hidden="true"><i /><i /><i /></span>
                        <small>{skippedTeamRankLabel}</small>
                      </div>
                      <div className="team-rank-list">{teamRankingRow(detachedFavoriteTeam)}</div>
                    </section>}
                    {fullRankingPagination}
                  </section>
                </div>
              ) : (
                <>
                  {ranking.length > 0 ? <>
                    <ol className="tier-top-podium" aria-label="1위부터 3위">
                      {topThree.map((user) => <li className={`tier-podium-card place-${user.rank}`} key={user.name}>
                        <button type="button" className="podium-profile-trigger" aria-haspopup="dialog" aria-label={`${user.rank}위 ${user.name} 프로필 열기`} onClick={(event) => openProfile(user, event.currentTarget)}>
                          <span className={`podium-avatar-medal rank-${user.rank}`} aria-hidden="true">
                            <span className="podium-medal-ribbon" />
                            <UserAvatar />
                            <span className="podium-medal-coin" />
                          </span>
                          <span>
                            <strong>{user.name}</strong>
                            <small className="podium-team-line"><TierMark tier={user.tier} compact /><span><b className="team-code-inline" style={teamAccentStyle(user.team)}>{user.team}</b> · {user.streak}연속</span></small>
                          </span>
                        </button>
                        <strong>{user.score.toLocaleString()}<small>P</small></strong>
                      </li>)}
                    </ol>
                    <div className="player-ranking-toolbar-slot">{fullRankingToolbar}</div>
                    <section className="full-ranking-shell" aria-labelledby="full-player-ranking-title">
                      <h3 className="visually-hidden" id="full-player-ranking-title">전체 플레이어 랭킹</h3>
                      {visiblePlayers.length ? <div className="tier-rank-list dense-rank-list" aria-label="전체 플레이어 랭킹">
                        <div className="dense-rank-head" aria-hidden="true"><span>순위</span><span>플레이어</span><span>티어</span><span>점수</span></div>
                        {visiblePlayers.map((user) => rankingRow(user, user.name === 'BetterBatter'))}
                      </div> : <div className="full-ranking-empty" role="status"><Search size={19} /><strong>{podiumOnlySearchResult ? '검색한 사용자는 위 시상대에서 확인할 수 있습니다.' : '일치하는 사용자가 없습니다.'}</strong><button type="button" onClick={() => setRankQuery('')}>검색 초기화</button></div>}
                      {detachedCurrentPlayer && <section className="my-rank-spotlight detached-current-rank" aria-label="내 순위">
                        <div className="my-rank-gap" role="separator" aria-label={skippedPlayerRankLabel}>
                          <span className="vertical-ellipsis" aria-hidden="true"><i /><i /><i /></span>
                          <small>{skippedPlayerRankLabel}</small>
                        </div>
                        <div className="tier-rank-list">{rankingRow(detachedCurrentPlayer, true, true)}</div>
                      </section>}
                      {fullRankingPagination}
                    </section>
                  </> : (
                    <div className="game-ranking-empty" role="status"><span><Clock3 size={21} /></span><div><strong>경기 시작 후 랭킹이 집계됩니다.</strong><p>{selectedRankingGame?.awayCode} vs {selectedRankingGame?.homeCode} 경기가 시작되면 예측 참여 점수를 실시간으로 반영합니다.</p></div></div>
                  )}
                </>
              )}
            </section>
          </section>

      <dialog ref={rankJourneyDialogRef} className="rank-journey-dialog" aria-labelledby="rank-journey-title" onCancel={(event) => { event.preventDefault(); closeRankJourney() }} onClose={() => setRankJourneyOpen(false)}>
        <section>
          <header className="rank-journey-header">
            <div><span>RANK ROAD</span><h2 id="rank-journey-title">랭크 진행도</h2><p>시즌 최고점으로 올라온 경로와 다음 목표를 확인하세요.</p></div>
            <button className="rank-journey-close" type="button" aria-label="랭크 진행도 닫기" onClick={closeRankJourney}><X size={18} /></button>
          </header>
          <div className="rank-journey-body">
            <section className="rank-journey-current" aria-label="현재 DIAMOND, 8,420점, ALL-STAR까지 580점 남음">
              <img src="/tier-badges/diamond.png" alt="" aria-hidden="true" />
              <div><span>CURRENT RANK</span><h3>DIAMOND</h3><p>8,420 P · 상위 4.8%</p></div>
              <strong>42%<small>다음 티어까지</small></strong>
            </section>
            <ol className="rank-journey-timeline" aria-label="티어 진행 순서">
              {rankJourneyTiers.map((tier, index) => {
                const state = index < 5 ? 'passed' : index === 5 ? 'current' : 'next'
                const status = state === 'passed' ? '달성' : state === 'current' ? '현재 · 8,420 P' : '580 P 남음'
                return <li className={state} aria-current={state === 'current' ? 'step' : undefined} key={tier.name}>
                  <span className="rank-journey-node"><img src={tier.image} alt="" aria-hidden="true" /></span>
                  <div><small>{String(index + 1).padStart(2, '0')}</small><strong>{tier.name}</strong></div>
                  <em>{status}</em>
                </li>
              })}
            </ol>
            <footer className="rank-journey-note"><Trophy size={15} aria-hidden="true" /><span>시즌 최고점 기준 · 달성한 최고 티어는 유지됩니다.</span></footer>
          </div>
        </section>
      </dialog>

      {rankingDialogUser && <UserProfileDialog dialogRef={profileDialogRef} dialogId="rank-profile" user={rankingDialogUser} followed={followed.has(rankingDialogUser.name)} onToggleFollow={() => toggleFollow(rankingDialogUser.name)} onClose={closeProfile} />}

    </section>
  )
}

export function ProfilePage({ points, displayedAchievementIds, onDisplayedAchievementIdsChange, favoriteTeamCode, onFavoriteTeamChange, voteMotionEnabled, onVoteMotionEnabledChange, onAdmin, tab, onTabChange }: { points: number; displayedAchievementIds: readonly AchievementId[]; onDisplayedAchievementIdsChange: (ids: AchievementId[]) => void; favoriteTeamCode: TeamCode; onFavoriteTeamChange: (code: TeamCode) => void; voteMotionEnabled: boolean; onVoteMotionEnabledChange: (enabled: boolean) => void; onAdmin: () => void; tab: ProfileTab; onTabChange: (tab: ProfileTab) => void }) {
  const setTab = onTabChange
  const [teamQuery, setTeamQuery] = useState('')
  const [favoriteTeamDialogOpen, setFavoriteTeamDialogOpen] = useState(false)
  const [selectedStageAchievement, setSelectedStageAchievement] = useState<ProfileAchievement | null>(null)
  const [notificationPreferences, setNotificationPreferences] = useState(() => readStoredPreferences('better-batter-notification-preferences', defaultNotificationPreferences))
  const favoriteTeam = teamByCode(favoriteTeamCode)
  const filteredTeamOptions = TEAM_OPTIONS.filter((team) => `${team.code} ${team.name}`.toLocaleLowerCase('ko-KR').includes(teamQuery.trim().toLocaleLowerCase('ko-KR')))
  const favoriteTeamDialogRef = useRef<HTMLDialogElement | null>(null)
  const favoriteTeamTriggerRef = useRef<HTMLButtonElement | null>(null)
  const favoriteTeamScrollYRef = useRef(0)
  const achievementStageDialogRef = useRef<HTMLDialogElement | null>(null)
  const achievementStageTriggerRef = useRef<HTMLButtonElement | null>(null)
  const displayedAchievements = displayedAchievementIds
    .map((id) => profileAchievements.find((achievement) => achievement.id === id))
    .filter((achievement): achievement is ProfileAchievement => achievement !== undefined)
  const toggleDisplayedAchievement = (id: AchievementId) => {
    if (displayedAchievementIds.includes(id)) {
      onDisplayedAchievementIdsChange(displayedAchievementIds.filter((achievementId) => achievementId !== id))
      return
    }
    if (displayedAchievementIds.length < 3) onDisplayedAchievementIdsChange([...displayedAchievementIds, id])
  }
  const saveNotificationPreferences = (next: NotificationPreferences) => {
    setNotificationPreferences(next)
    window.localStorage.setItem('better-batter-notification-preferences', JSON.stringify(next))
  }
  const notificationSettingItems = [
    { key: 'game' as const, icon: <Bell size={17} />, title: '경기 알림', detail: '관심 경기의 시작과 주요 상황' },
    { key: 'prediction' as const, icon: <Coins size={17} />, title: '예측 결과', detail: '참여한 예측의 마감과 정산 결과' },
    { key: 'community' as const, icon: <MessageCircle size={17} />, title: '커뮤니티 활동', detail: '답글과 팔로우 등 새로운 반응' },
    { key: 'achievement' as const, icon: <Trophy size={17} />, title: '티어와 업적', detail: '승급과 새로운 업적 달성 소식' },
  ]

  useEffect(() => {
    const dialog = achievementStageDialogRef.current
    if (!selectedStageAchievement || !dialog || dialog.open) return
    dialog.showModal()
    requestAnimationFrame(() => dialog.querySelector<HTMLButtonElement>('.achievement-stage-close')?.focus())
  }, [selectedStageAchievement])

  useEffect(() => {
    if (!favoriteTeamDialogOpen) return
    const root = document.documentElement
    const body = document.body
    const scrollY = favoriteTeamScrollYRef.current
    const previousBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      right: body.style.right,
      left: body.style.left,
      width: body.style.width,
    }
    root.classList.add('favorite-team-modal-open')
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, right: '0', left: '0', width: '100%' })
    return () => {
      root.classList.remove('favorite-team-modal-open')
      Object.assign(body.style, previousBodyStyle)
      window.scrollTo(0, scrollY)
    }
  }, [favoriteTeamDialogOpen])

  const openAchievementStages = (achievement: ProfileAchievement, trigger: HTMLButtonElement) => {
    achievementStageTriggerRef.current = trigger
    setSelectedStageAchievement(achievement)
  }

  const closeAchievementStages = () => {
    achievementStageDialogRef.current?.close()
    setSelectedStageAchievement(null)
    requestAnimationFrame(() => achievementStageTriggerRef.current?.focus())
  }
  const openFavoriteTeamDialog = (trigger: HTMLButtonElement) => {
    favoriteTeamTriggerRef.current = trigger
    favoriteTeamScrollYRef.current = window.scrollY
    setTeamQuery('')
    favoriteTeamDialogRef.current?.showModal()
    setFavoriteTeamDialogOpen(true)
    requestAnimationFrame(() => favoriteTeamDialogRef.current?.querySelector<HTMLInputElement>('input')?.focus())
  }
  const closeFavoriteTeamDialog = () => {
    favoriteTeamDialogRef.current?.close()
    setFavoriteTeamDialogOpen(false)
    requestAnimationFrame(() => favoriteTeamTriggerRef.current?.focus())
  }
  const selectFavoriteTeam = (code: TeamCode) => {
    if (code !== favoriteTeamCode) onFavoriteTeamChange(code)
    closeFavoriteTeamDialog()
  }
  return (
    <section className="portal-page profile-page" aria-labelledby="profile-title">
      <h1 className="visually-hidden" id="profile-title">마이페이지</h1>
      <section className="profile-identity">
        <div className="profile-person"><UserAvatar size="large" /><div><button className="profile-favorite-team" type="button" aria-haspopup="dialog" aria-label={`응원 구단 변경, 현재 ${favoriteTeam.name}`} onClick={(event) => openFavoriteTeamDialog(event.currentTarget)}><i aria-hidden="true" style={teamBadgeStyle(favoriteTeam.code)}>{favoriteTeam.code}</i><span style={teamAccentStyle(favoriteTeam.code)}>{favoriteTeam.name} 팬</span><ChevronDown size={13} aria-hidden="true" /></button><h2>BetterBatter</h2><p>@betterbatter · 2025년 4월 가입</p></div></div>
        <dl><div><dt>팔로워</dt><dd>248</dd></div><div><dt>팔로잉</dt><dd>91</dd></div><div><dt>작성 글</dt><dd>37</dd></div></dl>
        <button className="profile-admin-action" type="button" aria-label="운영 도구 열기" title="운영 도구" onClick={onAdmin}><ShieldCheck size={18} aria-hidden="true" /></button>
      </section>
      <section className="profile-tier-card" aria-label="시즌 최고 티어 DIAMOND, 8,420점, 전체 23위, ALL-STAR 승급까지 580점">
        <div className="profile-tier-overview">
          <img src="/tier-badges/diamond.png" alt="" aria-hidden="true" />
          <div className="profile-tier-main">
            <div className="profile-tier-kicker"><span>2026 SUMMER</span><em><Clock3 size={12} />시즌 종료 D-18</em></div>
            <h2>DIAMOND</h2>
          </div>
        </div>
        <div className="profile-tier-record"><span>시즌 최고 순위</span><strong>23<small>위</small></strong><em>상위 4.8%</em></div>
        <div className="profile-tier-promotion" aria-label="DIAMOND 8,000점부터 ALL-STAR 9,000점까지 42퍼센트 진행">
          <header><span>현재 <b>8,420 P</b></span><strong>580 P 남음</strong></header>
          <div className="profile-tier-track" aria-hidden="true"><span style={{ width: '42%' }} /><i style={{ left: '42%' }} /></div>
          <footer><span>DIAMOND · 8,000 P</span><b>승급 게이지</b><span>ALL-STAR · 9,000 P</span></footer>
        </div>
      </section>
      <nav className="profile-tabs" aria-label="마이페이지 메뉴">{([['overview','대시보드'],['activity','활동 기록'],['badges','업적'],['settings','설정']] as Array<[ProfileTab,string]>).map(([value,label]) => <button type="button" className={tab === value ? 'active' : ''} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)} key={value}>{label}</button>)}</nav>

      {tab === 'overview' && <div className="profile-dashboard"><section className="profile-metrics"><div><span>시즌 적중률</span><strong>58%</strong><small>최근 30회 +6%</small></div><div><span>최고 연속 적중</span><strong>9</strong><small>현재 4연속</small></div><div><span>라이브 참여</span><strong>184</strong><small>이번 시즌</small></div><div><span>커뮤니티 공감</span><strong>1.2K</strong><small>받은 공감</small></div></section><article className="dashboard-card"><header><h3>최근 업적</h3><button type="button" onClick={() => setTab('badges')}>전체 보기</button></header><div className="recent-badges">{profileAchievements.filter((achievement) => achievement.earned).slice(1, 4).map((achievement) => {
        const evolution = achievementEvolutionState(achievement)
        return <span key={achievement.id}><img src={achievementArtwork(achievement)} alt="" aria-hidden="true" /><b>{achievement.name}</b><small>{evolution?.stageLabel ?? achievement.detail}</small>{achievement.earnedAt && <time dateTime={achievement.earnedAt} aria-label={`${new Date(`${achievement.earnedAt}T00:00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 달성`}>{achievement.earnedAt.slice(5).replace('-', '.')}</time>}</span>
      })}</div></article></div>}

      {tab === 'activity' && <section className="profile-list-panel profile-prediction-panel profile-activity-panel">
        <header>
          <dl className="activity-point-balance"><dt>보유 포인트</dt><dd>{points.toLocaleString()}<small>P</small></dd></dl>
        </header>
        <div className="prediction-history-body profile-prediction-history-body">
          <PredictionHistoryContent items={profilePredictionRows} activityItems={profileBonusRows} showFilters summaryLabel="마이페이지 통합 활동 기록 요약" />
        </div>
      </section>}

      {tab === 'badges' && <section className="achievement-panel" aria-labelledby="achievement-title">
        <header className="achievement-heading">
          <h2 id="achievement-title">나의 업적 <span className="achievement-heading-count" aria-label="업적 8개 중 4개 달성">4 / 8</span></h2>
        </header>
        <section className="achievement-showcase" aria-labelledby="achievement-showcase-title">
          <div className="achievement-showcase-rail rank-profile-badges">
            <h3 className="rank-profile-badges-label" id="achievement-showcase-title">전시 배지</h3>
            <ul aria-live="polite">
              {Array.from({ length: 3 }, (_, index) => {
                const achievement = displayedAchievements[index]
                if (!achievement) {
                  return <li className="rank-profile-badge-empty" key={`empty-${index}`} aria-label="빈 전시 배지 슬롯"><span aria-hidden="true" /></li>
                }
                const tooltipId = `showcase-badge-${achievement.id}-description`
                return <li className="rank-profile-badge achievement-showcase-slot" key={achievement.id} aria-describedby={tooltipId}>
                  <img src={achievementArtwork(achievement)} alt="" aria-hidden="true" />
                  <strong>{achievement.name}</strong>
                  <button type="button" aria-label={`${achievement.name} 배지 전시 해제`} onClick={() => toggleDisplayedAchievement(achievement.id)}><X size={11} /></button>
                  <span className="rank-profile-badge-tooltip" id={tooltipId} role="tooltip">{achievementTooltip(achievement)}</span>
                </li>
              })}
            </ul>
          </div>
        </section>
        <div className="achievement-grid">
          {profileAchievements.map((achievement) => {
            const displayed = displayedAchievementIds.includes(achievement.id)
            const evolution = achievementEvolutionState(achievement)
            const displayLimitReached = !displayed && displayedAchievementIds.length >= 3
            const displayActionLabel = displayed
              ? `${achievement.name} 배지 전시 해제`
              : displayLimitReached
                ? `${achievement.name} 배지: 전시 슬롯이 가득 찼습니다`
                : `${achievement.name} 배지 전시하기`
            const canToggleDisplay = achievement.earned && (!displayLimitReached || displayed)
            return <article
              className={`achievement-card ${achievement.earned ? 'earned' : 'in-progress'} ${evolution ? 'evolving' : ''} ${displayed ? 'displayed' : ''} ${displayLimitReached && achievement.earned ? 'slot-full' : ''}`}
              key={achievement.id}
            >
              {achievement.earned && <button className="achievement-display-hitarea" type="button" aria-label={displayActionLabel} aria-pressed={displayed} disabled={!canToggleDisplay} onClick={() => toggleDisplayedAchievement(achievement.id)}><span className="achievement-display-control" aria-hidden="true">{displayed ? <Check size={14} /> : displayLimitReached ? <LockKeyhole size={13} /> : <Plus size={14} />}</span></button>}
              {!achievement.earned && <span className="achievement-locked-mark" aria-label="미획득"><LockKeyhole size={13} /></span>}
              <div className="achievement-art"><img src={achievementArtwork(achievement)} alt={`${achievement.name}${evolution ? ` ${evolution.stageIndex + 1}단계` : ''} 업적 배지`} loading="lazy" /></div>
              <div className="achievement-copy"><div><div className="achievement-meta"><span className={`achievement-rarity ${achievement.rarity}`}>{achievement.rarityLabel}</span></div><h3>{achievement.name}</h3></div>{!evolution && <p>{achievement.detail}</p>}</div>
              {evolution ? <button
                className="achievement-stage-timeline"
                type="button"
                aria-haspopup="dialog"
                aria-label={`${achievement.name} ${evolution.stageLabel}, 전체 단계 보기`}
                onClick={(event) => openAchievementStages(achievement, event.currentTarget)}
              >
                <span className="achievement-stage-track" aria-hidden="true">
                  <span className="achievement-stage-connector"><i style={{ width: `${(evolution.stageIndex / Math.max(1, (achievement.evolution?.stages.length ?? 1) - 1)) * 100}%` }} /></span>
                  {achievement.evolution?.stages.map((stage, index) => {
                    const stageState = index < evolution.stageIndex ? '달성' : index === evolution.stageIndex ? '현재 단계' : '미달성'
                    return <span className={`achievement-stage-node ${index < evolution.stageIndex ? 'complete' : index === evolution.stageIndex ? 'current' : 'future'}`} key={stage.threshold}>
                      <span className="achievement-stage-node-art"><img src={stage.image} alt="" /></span>
                      <i>{index + 1}</i>
                      <span className="achievement-stage-tooltip" role="tooltip"><b>{index + 1}단계</b><em>{stage.threshold.toLocaleString()}{achievement.evolution?.unit}</em><small>{stageState}</small></span>
                    </span>
                  })}
                </span>
                <span className="achievement-stage-summary"><b>{evolution.stageLabel}</b><em>{evolution.progressLabel}</em><ChevronRight size={13} /></span>
              </button> : <footer><div className="achievement-card-progress" aria-hidden="true"><span style={{ width: `${achievement.progress}%` }} /></div><b>{achievement.progressLabel}</b></footer>}
            </article>
          })}
        </div>
      </section>}

      {tab === 'settings' && <div className="profile-settings-page">
        <section className="profile-settings-section profile-notification-settings" aria-labelledby="profile-notification-title">
          <header><span aria-hidden="true"><Bell size={18} /></span><div><h2 id="profile-notification-title">알림</h2><p>받고 싶은 소식만 선택하세요.</p></div></header>
          <div className="notification-settings">
            <label className="notification-master-setting">
              <span><strong>전체 알림</strong><small>Better Batter의 모든 알림을 한 번에 관리합니다.</small></span>
              <input className="visually-hidden" type="checkbox" checked={Object.values(notificationPreferences).every(Boolean)} onChange={(event) => saveNotificationPreferences({ game: event.target.checked, prediction: event.target.checked, community: event.target.checked, achievement: event.target.checked })} />
              <i className="notification-switch" aria-hidden="true" />
            </label>
            <fieldset>
              <legend className="visually-hidden">알림 종류별 설정</legend>
              {notificationSettingItems.map((item) => <label className="notification-setting-row" key={item.key}>
                <span className="notification-setting-icon" aria-hidden="true">{item.icon}</span>
                <span className="notification-setting-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                <input className="visually-hidden" type="checkbox" checked={notificationPreferences[item.key]} onChange={(event) => saveNotificationPreferences({ ...notificationPreferences, [item.key]: event.target.checked })} />
                <i className="notification-switch" aria-hidden="true" />
              </label>)}
            </fieldset>
          </div>
        </section>
        <section className="profile-settings-section profile-motion-settings" aria-labelledby="profile-motion-title">
          <header><span aria-hidden="true"><Sparkles size={18} /></span><div><h2 id="profile-motion-title">화면 모션</h2><p>선택 화면의 움직임을 조절합니다.</p></div></header>
          <label className="notification-master-setting">
            <span><strong>투표 경쟁 애니메이션</strong><small>투표 창을 열 때 확률과 중앙선이 겨루는 연출</small></span>
            <input className="visually-hidden" type="checkbox" checked={voteMotionEnabled} onChange={(event) => onVoteMotionEnabledChange(event.target.checked)} />
            <i className="notification-switch" aria-hidden="true" />
          </label>
          <p className="profile-motion-note"><CircleHelp size={13} aria-hidden="true" />기기의 ‘모션 줄이기’ 설정은 항상 우선 적용됩니다.</p>
        </section>
      </div>}

      <dialog ref={favoriteTeamDialogRef} className="favorite-team-dialog" aria-labelledby="favorite-team-dialog-title" onCancel={(event) => { event.preventDefault(); closeFavoriteTeamDialog() }} onClose={() => setFavoriteTeamDialogOpen(false)}>
        <section>
          <header><div><h2 id="favorite-team-dialog-title">응원 구단 선택</h2><p>내 팀 피드와 구단 랭킹에 반영됩니다.</p></div><button type="button" aria-label="응원 구단 선택 닫기" onClick={closeFavoriteTeamDialog}><X size={18} /></button></header>
          <label className="favorite-team-search"><Search size={16} aria-hidden="true" /><span className="visually-hidden">구단 검색</span><input value={teamQuery} onChange={(event) => setTeamQuery(event.target.value)} placeholder="구단명 또는 코드 검색" /></label>
          <div className="favorite-team-list" aria-label="메이저리그 구단 목록">
            {filteredTeamOptions.map((team) => <button type="button" className={team.code === favoriteTeamCode ? 'selected' : ''} aria-label={`${team.name} (${team.code})`} aria-pressed={team.code === favoriteTeamCode} onClick={() => selectFavoriteTeam(team.code)} key={team.code}><i aria-hidden="true" style={teamBadgeStyle(team.code)}>{team.code}</i><span><strong>{team.name}</strong><small>{team.code}</small></span>{team.code === favoriteTeamCode && <Check size={15} aria-hidden="true" />}</button>)}
            {filteredTeamOptions.length === 0 && <p className="favorite-team-empty">일치하는 구단이 없습니다.</p>}
          </div>
        </section>
      </dialog>

      {selectedStageAchievement && <AchievementStageDialog dialogRef={achievementStageDialogRef} achievement={selectedStageAchievement} onClose={closeAchievementStages} />}

    </section>
  )
}

export function AdminPage() {
  const [reportState, setReportState] = useState<Record<number, string>>({})
  const reports = [
    { id:1, reason:'욕설 및 선수 비하', target:'댓글 · “그런 실력으로…”', reporter:'3명 신고', user:'FastBat92', received:'2분 전' },
    { id:2, reason:'도배 및 경기방해', target:'게시글 4건 연속 등록', reporter:'자동 감지', user:'HomeRunBot', received:'8분 전' },
    { id:3, reason:'허위 경기 정보', target:'경기 취소 관련 확인되지 않은 정보', reporter:'7명 신고', user:'MLB_inside', received:'13분 전' },
  ]
  const sanctions = [
    { time:'21:31', user:'HomeRunBot', reason:'도배 및 자동화 활동', action:'7일 이용 정지', operator:'admin_02' },
    { time:'20:48', user:'PitchTalker', reason:'욕설 및 비하', action:'댓글 삭제 · 경고', operator:'admin_01' },
    { time:'19:12', user:'TicketSeller', reason:'외부 거래 유도', action:'영구 정지', operator:'admin_02' },
  ]
  return (
    <section className="portal-page admin-page" aria-labelledby="admin-title">
      <section className="admin-command-strip" aria-label="운영 현황 요약">
        <article className="admin-command-item urgent"><span className="admin-command-icon" aria-hidden="true"><Flag size={16} /></span><div><small>처리 대기</small><strong>신고 12건</strong><em>오늘 4건 접수</em></div></article>
        <article className="admin-command-item delayed"><span className="admin-command-icon" aria-hidden="true"><CircleAlert size={16} /></span><div><small>데이터 피드</small><strong>18초 지연</strong><em>LAD vs SF</em></div></article>
        <dl className="admin-command-facts"><div><dt>현재 접속</dt><dd>8,241</dd></div><div><dt>오늘 게시글</dt><dd>386</dd></div></dl>
      </section>

      <div className="admin-workspace">
        <section className="admin-panel admin-report-queue" aria-labelledby="report-queue-title">
          <header><div><span>REVIEW QUEUE</span><h2 id="report-queue-title">신고 검토</h2></div><b>12건 대기</b></header>
          <div className="admin-report-list">
            {reports.map((report) => {
              const result = reportState[report.id]
              return <article className={`admin-report-item ${result ? 'resolved' : ''}`} key={report.id}>
                <span className="admin-report-marker" aria-hidden="true"><Flag size={14} /></span>
                <div className="admin-report-copy"><header><strong>{report.reason}</strong><em>{report.reporter}</em><time>{report.received}</time></header><p>{report.target}</p><small>대상 · <b>{report.user}</b></small></div>
                {result
                  ? <output className={`admin-report-result ${result.includes('제재') ? 'sanctioned' : ''}`} aria-live="polite"><Check size={13} />{result}</output>
                  : <div className="admin-report-actions"><button type="button" onClick={() => setReportState((current) => ({...current,[report.id]:'기각 완료'}))}>기각</button><button type="button" onClick={() => setReportState((current) => ({...current,[report.id]:'제재 완료'}))}><ShieldCheck size={13} />제재</button></div>}
              </article>
            })}
          </div>
        </section>

        <aside className="admin-control-rail" aria-label="운영 도구">
          <details className="admin-panel admin-health-card" open>
            <summary><div><span>SERVICE</span><h2>서비스 상태</h2></div><b><i aria-hidden="true" />1건 지연</b><ChevronDown size={15} /></summary>
            <ul><li><span className="good" />인증 서비스<b>정상</b></li><li><span className="warning" />LAD vs SF 피드<b>18초 지연</b></li><li><span className="good" />커뮤니티 API<b>정상</b></li><li><span className="good" />알림 큐<b>정상</b></li></ul>
          </details>
          <section className="admin-panel admin-pin-card"><header><div><span>PINNED</span><h2>상단 고정 공지</h2></div><b>노출 중</b></header><div><Megaphone size={16} aria-hidden="true" /><h3>커뮤니티 운영 정책 및 경기 중계 예절 안내</h3><p>전체 페이지 · 08.24 09:00부터</p></div><button type="button">공지 관리<ChevronRight size={14} /></button></section>
        </aside>
      </div>

      <section className="admin-panel admin-audit-log" aria-labelledby="audit-log-title">
        <header><div><span>AUDIT LOG</span><h2 id="audit-log-title">최근 운영 조치</h2></div><button type="button">기록 내보내기<ArrowUpRight size={13} /></button></header>
        <div className="admin-audit-list" role="list">
          {sanctions.map((row) => <article role="listitem" key={`${row.time}-${row.user}`}><time>{row.time}</time><div className="admin-audit-subject"><strong>{row.user}</strong><span>{row.reason}</span></div><div className="admin-audit-outcome"><b>{row.action}</b><small>{row.operator}</small></div></article>)}
        </div>
      </section>
    </section>
  )
}

export function NotificationPanel({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const [read, setRead] = useState(() => new Set<number>())
  const notifications = [
    { icon:<Trophy size={16} />, title:'DIAMOND 티어로 승급했어요', detail:'시즌 최고점 8,000점을 돌파했습니다.', time:'3분 전' },
    { icon:<Coins size={16} />, title:'예측 정산 완료 · +113P', detail:'6회 총 득점 예측이 적중했습니다.', time:'12분 전' },
    { icon:<MessageCircle size={16} />, title:'BlueCurve님이 답글을 남겼어요', detail:'“저도 다음 투구는 슬라이더로 봅니다.”', time:'24분 전' },
    { icon:<Bell size={16} />, title:'SD vs SEA 경기가 곧 시작해요', detail:'설정한 경기 시작 10분 전 알림입니다.', time:'1시간 전' },
  ]
  const unreadCount = notifications.length - read.size
  return (
    <section className="notification-panel" aria-labelledby="notification-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <header>
        <div className="notification-panel-heading">
          <h2 id="notification-title">알림</h2>
          <span role="status"><b>{unreadCount}</b>개 읽지 않음</span>
        </div>
        <button type="button" aria-label="알림 닫기" onClick={onClose}><X size={17} /></button>
      </header>
      <ul className="notification-list">
        {notifications.map((item,index) => {
          const isRead = read.has(index)
          return (
            <li key={item.title}>
              <button type="button" className={isRead ? 'read' : ''} onClick={() => setRead((current) => new Set(current).add(index))}>
                <span className="notification-icon" aria-hidden="true">{item.icon}</span>
                <span className="notification-copy">
                  <span className="notification-title-line">
                    <strong>{item.title}</strong>
                    {!isRead && <><i aria-hidden="true" /><span className="visually-hidden">읽지 않음</span></>}
                    <time>{item.time}</time>
                  </span>
                  <small>{item.detail}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <footer>
        <button type="button" disabled={unreadCount === 0} onClick={() => setRead(new Set(notifications.map((_,index) => index)))}>모두 읽음</button>
        <button type="button" onClick={onOpenSettings}>알림 설정</button>
      </footer>
    </section>
  )
}

export function AuthDialog({ mode: initialMode, onClose, onSuccess }: { mode: 'login' | 'signup'; onClose: () => void; onSuccess: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState(initialMode)
  useEffect(() => { const dialog = dialogRef.current; if (dialog && !dialog.open) dialog.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  const submit = (event: FormEvent) => { event.preventDefault(); onSuccess() }
  return <dialog ref={dialogRef} className="portal-native-dialog auth-dialog" aria-labelledby="auth-title" onCancel={(event) => { event.preventDefault(); onClose() }}><header><div><span>BETTER BATTER</span><h2 id="auth-title">{mode === 'login' ? '다시 만나 반가워요' : '새로운 시즌을 시작해요'}</h2><p>{mode === 'login' ? '로그인하고 예측과 커뮤니티에 참여하세요.' : '나만의 티어와 야구 기록을 만들어보세요.'}</p></div><button type="button" aria-label="닫기" onClick={onClose}><X size={18} /></button></header><button className="google-login" type="button" onClick={onSuccess}><span>G</span>Google로 {mode === 'login' ? '로그인' : '가입'}</button><div className="auth-divider"><span>또는 이메일로 계속</span></div><form onSubmit={submit}><label><span>이메일</span><span className="input-shell"><Mail size={15} /><input type="email" required placeholder="fan@example.com" /></span></label><label><span>비밀번호</span><span className="input-shell"><LockKeyhole size={15} /><input type="password" required minLength={8} placeholder="8자 이상 입력" /></span></label>{mode === 'signup' && <label><span>닉네임</span><span className="input-shell"><Users size={15} /><input required placeholder="커뮤니티에서 사용할 이름" /></span></label>}<button className="auth-submit" type="submit">{mode === 'login' ? '로그인' : '회원가입'}</button></form><footer><span>{mode === 'login' ? '아직 계정이 없나요?' : '이미 계정이 있나요?'}</span><button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? '회원가입' : '로그인'}</button></footer></dialog>
}

export function OnboardingDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)
  const steps = [
    { icon:<Gamepad2 size={31} />, label:'01 · LIVE', title:'경기를 보며 예측하세요', detail:'투구와 이닝 흐름에 맞춰 열리는 질문에 참여하면 라이브 점수를 얻을 수 있어요.' },
    { icon:<Trophy size={31} />, label:'02 · TIER', title:'시즌 최고점으로 승급하세요', detail:'한 번 달성한 시즌 최고 티어는 내려가지 않아요. 꾸준히 참여해 ALL-STAR에 도전하세요.' },
    { icon:<Users size={31} />, label:'03 · COMMUNITY', title:'같은 팬들과 함께 응원하세요', detail:'경기별 응원방과 팀 게시판에서 예측 근거와 야구 이야기를 나눠보세요.' },
  ]
  const current = steps[step]
  useEffect(() => { const dialog = dialogRef.current; if (dialog && !dialog.open) dialog.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  return <dialog ref={dialogRef} className="portal-native-dialog onboarding-dialog" aria-labelledby="onboarding-title" onCancel={(event) => { event.preventDefault(); onClose() }}><button className="dialog-x" type="button" aria-label="온보딩 닫기" onClick={onClose}><X size={18} /></button><div className="onboarding-visual"><span>{current.icon}</span><div className="mini-score"><i>SF</i><b>3</b><em>LIVE</em><b>4</b><i>LA</i></div><div className="mini-progress"><span style={{ width: `${45 + step * 22}%` }} /></div></div><div className="onboarding-copy"><span>{current.label}</span><h2 id="onboarding-title">{current.title}</h2><p>{current.detail}</p><div className="onboarding-dots">{steps.map((_,index) => <i className={index === step ? 'active' : ''} key={index} />)}</div><footer>{step > 0 ? <button type="button" onClick={() => setStep((currentStep) => currentStep - 1)}>이전</button> : <button type="button" onClick={onClose}>건너뛰기</button>}<button className="next" type="button" onClick={() => step === steps.length - 1 ? onClose() : setStep((currentStep) => currentStep + 1)}>{step === steps.length - 1 ? '시작하기' : '다음'}<ChevronRight size={15} /></button></footer></div></dialog>
}
