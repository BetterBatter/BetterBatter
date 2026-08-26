# BetterBatter REST API 명세서 초안

> 문서 상태: **Draft v0.1**  
> 기준 UI: 2026-08-26 현재 React 목업의 `/live`, `/predictions`, `/community`, `/rankings`, `/mypage/*`, `/admin` 및 연결된 예측·프로필·업적·인증 모달  
> 기본 경로: `/api/v1`  
> 관련 문서: [WebSocket 명세서](./websocket-spec.md)

## 1. 목적과 범위

이 문서는 현재 목업에 보이는 화면, 클릭/입력/검색/필터/모달/상세 보기/호버 상태를 실제 서비스 계약으로 옮긴 REST API 초안이다. 다음 원칙을 적용한다.

1. **금액·예측 참여·제재처럼 결과가 반드시 한 번만 반영되어야 하는 명령은 REST**로 처리한다.
2. **경기 상황·확률·채팅·알림·정산처럼 서버에서 먼저 발생하는 변화는 WebSocket**으로 전달하고, REST는 최초 조회와 재동기화의 기준이 된다.
3. 호버, 포커스, 선택 강조, 네온/파티클, 카드 상승 효과는 원칙적으로 클라이언트 표현이다. 단, 호버에 표시할 텍스트·권한·단계·통계는 REST 응답에 포함한다.
4. `fanPoints`(무료 참여 포인트), `rankScore`(시즌 랭킹 점수), `oddsPercent`(현재 선택 비율)는 서로 다른 값이며 혼용하지 않는다.
5. 본 문서는 목업을 구현하기 위한 제안 계약이다. 현재 저장소에는 승인된 DB/도메인 계약 루트가 없으므로, 백엔드·데이터 팀 합의 후 `Draft`를 해제한다.

## 2. UI 기능 인벤토리

| 화면/상태 | 확인된 기능 | REST 책임 | 실시간 책임 |
|---|---|---|---|
| 공통 헤더 | 세션, 티어, 포인트, 알림 개수, 프로필 메뉴, 로그아웃 | 세션·요약 조회, 로그아웃 | 알림 개수·포인트·티어 갱신 |
| 라이브 | 경기 선택, 스코어, 이닝/아웃/B-S-O, 주자, 수비 위치, 타자/투수, 최근 투구, 데이터 지연/취소 | 오늘 경기·경기 스냅샷·라인업 조회, 경기 알림 설정 | 경기 상태·투구·수비·지연 상태 |
| 라이브 예측 카드 | 현재 질문, 질문 강조 구간, 마감, YES/NO 비율, 이미 참여한 카드 표시, 이전 질문 기록 | 마켓/기록 조회 | 마켓 교체·비율·마감·결과 |
| 예측 참여 모달 | 판정 기준 툴팁, YES/NO 선택, 10P 이상 직접 입력, ±50/±100, 전액, 예상 수령, 중복 참여 방지 | 견적, 참여 명령, 잔액 원자 차감 | 접수 결과·잔액·정산 알림 |
| 응원톡 | 경기별 메시지, 120자 제한, 사용자 프로필, 현재 투표 선택 표시, 종료/예정 경기 읽기 전용 | 과거 메시지·프로필 조회 | 메시지 송수신·삭제/제재 |
| 내 예측 | 진행/정산 필터, 당시 확률, 예상/실수령, 검증 정보 | 참여 목록·상세·검증 근거 | 진행 상태·정산 완료 |
| 커뮤니티 | 추천/일반/팔로잉/내 팀, 최신/인기, 검색, 태그, 무한 스크롤, 글/이미지, 공감, 답글/대댓글 | 피드·검색·CRUD·업로드·반응 | 지표·답글·공지 갱신 |
| 랭킹 | 경기/시즌/구단, 시상대, 전체 목록, 검색, 페이지, 내 순위 점프, 승급 과정 | 집계 조회·검색·티어 정책 | 순위/점수/승급 갱신 |
| 마이페이지 | 응원 구단, 프로필 통계, 티어 진행, 활동 기록, 포인트 변동 | 프로필·환경 설정·활동/원장 | 통계·포인트·업적 갱신 |
| 업적 | 희귀도, 획득/미획득, 진화 1~4단계, 전시 3칸, 단계 모달, 툴팁 | 카탈로그·진행도·전시 설정 | 진행도·획득·단계 상승 |
| 알림/설정 | 읽음, 모두 읽음, 경기/예측/커뮤니티/업적 설정, 투표 모션 설정 | 알림·환경 설정 변경 | 새 알림 |
| 사용자 프로필 | 전시 배지 툴팁, 팔로우, 랭크/연속 적중, 신고, 차단 | 미리보기·상세·관계·신고 | 팔로우 수·제재 반영 |
| 관리자 | 신고 큐, 기각/제재, 데이터 피드 상태, 고정 공지, 감사 로그 내보내기 | 운영 조회·처분·공지 CRUD·감사 로그 | 서비스 상태·신고 접수 |
| 인증/온보딩 | 이메일 로그인/가입, Google, 닉네임, 3단계 온보딩 | 인증·세션·온보딩 완료 | 해당 없음 |

## 3. 계약 식별자와 핵심 비즈니스 규칙

API/이벤트 구현과 테스트는 아래 식별자를 그대로 참조한다.

### 인증·사용자

- **BR-AUTH-001**: 이메일은 정규화 후 유일해야 하고 비밀번호는 최소 8자다.
- **BR-AUTH-002**: Google OAuth 계정과 동일 이메일의 기존 계정 결합은 명시적 동의 또는 검증된 정책으로만 수행한다.
- **BR-AUTH-003**: 액세스 세션은 짧게 유지하고 리프레시 토큰은 회전한다. 로그아웃 시 현재 리프레시 체인을 폐기한다.
- **BR-USER-001**: 차단하면 팔로우 관계가 자동 해제되고 양쪽 피드·채팅·프로필 상호작용을 제한한다.
- **BR-USER-002**: 신고는 동일 신고자·동일 대상·동일 사유의 반복 접수를 합칠 수 있으나 최초 접수 ID는 안정적으로 반환한다.

### 경기·예측·포인트

- **BR-LIVE-001**: 경기 상태는 `scheduled | live | suspended | delayed | final | cancelled` 중 하나다.
- **BR-LIVE-002**: 데이터가 지연되면 `dataHealth.status=delayed`와 지연 초를 내려 UI가 상태 안내를 표시해야 한다.
- **BR-PRED-001**: 예측 참여는 인증 사용자만 가능하며 `open` 상태와 서버 마감 시각을 모두 만족해야 한다.
- **BR-PRED-002**: 한 사용자는 한 마켓에 한 번만 참여한다. 선택·금액은 접수 후 변경/취소할 수 없다.
- **BR-PRED-003**: 참여 금액은 정수, 최소 10P, 10P 단위, 현재 사용 가능 `fanPoints` 이하다.
- **BR-PRED-004**: 참여 요청은 `Idempotency-Key`와 `quoteVersion`을 요구한다. 재시도는 동일 결과를 반환하고 중복 차감하지 않는다.
- **BR-PRED-005**: 화면 예상 수령액은 서버 견적을 기준으로 한다. 초안 공식은 `floor(amount / (selectedPercent / 100))`이며 정산 정책 확정 전 변경 가능하다.
- **BR-PRED-006**: 판정 기준·공식 데이터 출처·마감 규칙은 참여 전에 조회 가능해야 하고, 접수 시 사용한 정책 버전을 참여 기록에 고정한다.
- **BR-PRED-007**: 경기 취소·무효·데이터 불확정은 마켓을 `voided`로 만들고 참여 원금을 환급한다.
- **BR-POINT-001**: `fanPoints`는 무료 팬 참여 포인트이며 현금 구매·환전·사용자 간 양도가 불가능하다.
- **BR-POINT-002**: 포인트 잔액과 원장은 append-only 원천에서 계산하며, 참여 차감·정산·환급은 하나의 트랜잭션으로 기록한다.
- **BR-RANK-001**: 티어는 시즌 중 달성한 **최고 `rankScore`**로 결정되며 한 번 달성한 최고 티어는 해당 시즌 동안 강등되지 않는다.

### 커뮤니티·업적·운영

- **BR-COM-001**: 스레드 본문은 최대 500자, 태그는 최대 10개, 답글은 최대 300자, 라이브 채팅은 최대 120자다.
- **BR-COM-002**: 고정 공지·이벤트는 노출 범위와 시작/종료 시각을 가지며 피드 상단에 일반 글과 분리해 노출한다.
- **BR-COM-003**: 공감/팔로우/차단/북마크는 멱등 토글이 아니라 목표 상태를 지정하는 `PUT`/`DELETE`로 구현한다.
- **BR-ACH-001**: 전시 배지는 최대 3개이며 순서를 보존한다. 빈 슬롯은 허용한다.
- **BR-ACH-002**: 단계형 업적은 중심 배지를 유지하고 단계별 아트·임계값·현재 진행도를 모두 제공한다. 단일 업적은 단계 배열이 없다.
- **BR-ACH-003**: 프로필 툴팁은 `배지 이름 · n단계`만 표시한다.
- **BR-ADMIN-001**: 제재, 기각, 공지 변경, 감사 로그 내보내기는 관리자 권한과 재인증을 요구하며 모두 감사 로그를 남긴다.
- **BR-ADMIN-002**: 제재 이력은 삭제하지 않고 취소/수정 이벤트를 추가한다.

## 4. 공통 규약

### 4.1 인증과 전송

- 모든 요청은 HTTPS만 허용한다.
- 웹 클라이언트 권장 방식은 `HttpOnly; Secure; SameSite=Lax` 쿠키다.
  - `__Host-bb_access`: 짧은 수명의 액세스 세션
  - `__Host-bb_refresh`: 회전형 리프레시 세션
- 네이티브/외부 클라이언트가 필요하면 `Authorization: Bearer <token>`을 별도 프로파일로 정의한다.
- 상태 변경 요청은 `Origin` 검증과 CSRF 토큰을 적용한다.
- 역할: `guest`, `member`, `moderator`, `admin`.

### 4.2 헤더

| 헤더 | 적용 | 설명 |
|---|---|---|
| `X-Request-Id` | 전 요청 | 클라이언트가 보내거나 서버가 생성하는 추적 ID |
| `Idempotency-Key` | 금액/게시/제재 명령 | UUIDv7 권장, 동일 사용자·경로에서 24시간 보관 |
| `If-Match` | 충돌 가능한 변경 | 응답 `ETag`의 버전과 일치할 때만 변경 |
| `Accept-Language` | 선택 | `ko-KR` 기본, 서버 고정 코드와 표시 문구를 분리 |
| `X-Client-Version` | 전 요청 | 호환성·점진 배포 확인 |

### 4.3 응답 봉투

성공:

```json
{
  "data": {},
  "meta": {
    "requestId": "01J...",
    "serverTime": "2026-08-26T12:36:22.184Z"
  }
}
```

목록:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "opaque-or-null",
    "hasMore": true,
    "total": 30
  }
}
```

오류는 `application/problem+json`을 사용한다.

```json
{
  "type": "https://api.betterbatter.example/problems/market-closed",
  "title": "예측 참여 시간이 끝났습니다.",
  "status": 409,
  "code": "MARKET_CLOSED",
  "detail": "다음 투구가 시작되어 이 예측이 마감되었습니다.",
  "requestId": "01J...",
  "fieldErrors": [],
  "current": {
    "marketStatus": "closed",
    "closedAt": "2026-08-26T12:36:20Z"
  }
}
```

### 4.4 시간·ID·페이지네이션

- 시간은 UTC ISO 8601, 표시만 사용자 타임존으로 변환한다.
- 공개 ID는 추측 불가능한 UUIDv7/ULID 또는 opaque string을 사용한다.
- 피드·채팅 과거 내역·원장은 cursor pagination을 사용한다.
- 전체 랭킹은 UI의 페이지 번호 이동을 위해 `page`/`pageSize`를 허용한다.
- 삭제된 리소스는 식별 가능한 `410 Gone` 또는 tombstone 응답을 사용한다.

### 4.5 캐시와 일관성

- 경기/마켓 스냅샷: `Cache-Control: no-store`, `ETag` 제공.
- 팀·티어·업적 카탈로그: `public, max-age=300, stale-while-revalidate=3600`.
- 프로필 미리보기: `private, max-age=30`.
- 금액·참여·원장: `no-store`.
- REST 조회 후 같은 리소스의 WebSocket `version`이 더 높으면 소켓 데이터를 우선한다.

## 5. 핵심 리소스 스키마

### 5.1 `UserSummary` / `UserProfile`

```ts
type UserSummary = {
  id: string
  nickname: string
  handle: string
  avatarUrl: string | null
  favoriteTeam: { id: string; code: string; name: string } | null
  tier: { code: string; name: string; badgeUrl: string }
  displayedAchievements: Array<{
    achievementId: string
    name: string
    stage: number | null
    imageUrl: string
    tooltipLabel: string
  }>
}

type UserProfile = UserSummary & {
  joinedAt: string
  followersCount: number
  followingCount: number
  postsCount: number
  rank: { scope: "season"; rank: number; score: number; streak: number } | null
  relationship: { following: boolean; followedBy: boolean; blocked: boolean; canReport: boolean }
}
```

### 5.2 `GameSnapshot`

```ts
type GameSnapshot = {
  id: string
  league: "MLB"
  status: "scheduled" | "live" | "suspended" | "delayed" | "final" | "cancelled"
  scheduledAt: string
  venue: { id: string; name: string }
  away: { teamId: string; code: string; name: string; score: number }
  home: { teamId: string; code: string; name: string; score: number }
  situation: {
    inning: number
    half: "top" | "bottom"
    outs: 0 | 1 | 2 | 3
    balls: 0 | 1 | 2 | 3
    strikes: 0 | 1 | 2
    occupiedBases: Array<"first" | "second" | "third">
  } | null
  currentMatchup: {
    batter: { playerId: string; name: string; uniformNumber: number; summary: string }
    pitcher: { playerId: string; name: string; uniformNumber: number; summary: string }
  } | null
  defense: Array<{
    position: "P" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF"
    playerId: string
    playerName: string
    x: number
    y: number
  }>
  lastPitch: { sequence: number; speedMph: number; pitchType: string; result: string; occurredAt: string } | null
  dataHealth: { status: "healthy" | "delayed" | "unavailable"; delaySeconds: number; message: string | null }
  participantsCount: number
  version: number
  updatedAt: string
}
```

`x`, `y`는 실제 수비 위치를 표시하기 위한 서버 데이터가 아니라 기본 배치/시프트를 전달하는 정규화 좌표(0~1)다. UI는 구장 SVG 좌표로 변환하며 위치 호버/클릭 시 같은 객체의 선수명을 표시한다.

### 5.3 `PredictionMarket`

```ts
type PredictionMarket = {
  id: string
  gameId: string
  category: "AT_BAT" | "INNING" | "NEXT_PLAY" | "GAME"
  recommended: boolean
  question: string
  questionParts: Array<{
    text: string
    emphasis: "subject" | "context" | "outcome" | null
  }>
  yesPercent: number
  noPercent: number
  sampleSize: number
  status: "draft" | "open" | "closing" | "closed" | "resolving" | "resolved" | "voided"
  closesAt: string | null
  closeTrigger: "NEXT_PITCH" | "INNING_END" | "GAME_END" | "MANUAL"
  resolution: {
    policyVersion: string
    summary: string
    source: "MLB_PLAY_BY_PLAY" | "OFFICIAL_BOX_SCORE"
  }
  myEntry: {
    entryId: string
    side: "YES" | "NO"
    amount: number
    acceptedPercent: number
    status: "pending" | "accepted" | "won" | "lost" | "refunded"
  } | null
  quoteVersion: number
  version: number
  updatedAt: string
}
```

### 5.4 `PredictionEntry` / `PointLedgerEntry`

```ts
type PredictionEntry = {
  id: string
  marketId: string
  gameId: string
  userId: string
  side: "YES" | "NO"
  amount: number
  acceptedPercent: number
  expectedPayout: number
  status: "accepted" | "won" | "lost" | "refunded"
  resolution: null | {
    answer: "YES" | "NO" | "VOID"
    payout: number
    profit: number
    policyVersion: string
    verifiedAt: string
    verificationId: string
  }
  createdAt: string
}

type PointLedgerEntry = {
  id: string
  account: "FAN_POINTS" | "RANK_SCORE"
  kind: "PREDICTION_STAKE" | "PREDICTION_PAYOUT" | "REFUND" | "ATTENDANCE" | "MISSION" | "ADMIN_ADJUSTMENT"
  delta: number
  balanceAfter: number
  reference: { type: string; id: string } | null
  description: string
  createdAt: string
}
```

### 5.5 `Post` / `Comment`

```ts
type Post = {
  id: string
  author: UserSummary
  category: "ANALYSIS" | "TEAM_LOUNGE" | "BASEBALL" | "FREE"
  title: string
  body: string
  tags: string[]
  media: Array<{ id: string; url: string; thumbnailUrl: string; alt: string }>
  pinned: boolean
  popular: boolean
  metrics: { comments: number; likes: number; views: number }
  viewer: { liked: boolean; bookmarked: boolean }
  createdAt: string
  updatedAt: string
  version: number
}

type Comment = {
  id: string
  postId: string
  parentId: string | null
  rootId: string
  replyToUser: { id: string; nickname: string } | null
  author: UserSummary
  body: string
  likes: number
  viewerLiked: boolean
  createdAt: string
  version: number
}
```

### 5.6 `RankingResponse`

```ts
type RankingResponse = {
  scope: "GAME" | "SEASON" | "TEAM"
  context: { seasonId?: string; gameId?: string; teamId?: string; label: string }
  podium: RankingEntry[]
  rows: RankingEntry[]
  myRank: RankingEntry | null
  skippedBeforeMyRank: { from: number; to: number } | null
  page: number
  pageSize: number
  total: number
  updatedAt: string
}
```

첫 페이지의 플레이어 목록은 시상대 1~3위를 제외하고 4~10위를 반환한다. `myRank`가 현재 페이지 밖이면 별도 spotlight로 제공하고 `pageForMyRank`를 함께 반환한다.

### 5.7 `Achievement`

```ts
type Achievement = {
  id: string
  name: string
  description: string
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY"
  kind: "SINGLE" | "EVOLVING"
  baseImageUrl: string
  stages: Array<{ stage: number; threshold: number; unit: string; imageUrl: string }>
  viewer: {
    earned: boolean
    earnedAt: string | null
    currentValue: number
    currentStage: number | null
    nextThreshold: number | null
    progressPercent: number
    displayed: boolean
  }
}
```

## 6. REST 엔드포인트

표의 `인증` 값은 `-`(공개), `M`(member), `Mod`, `A`(admin)이다.

### 6.1 앱 부트스트랩·카탈로그

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/bootstrap` | 선택 | 세션, 포인트, 알림 개수, 환경 설정, 현재 시즌, 응원 구단을 한 번에 조회 |
| `GET` | `/seasons/current` | - | 현재 시즌·종료 D-day·티어 기준 |
| `GET` | `/teams?league=MLB&q=` | - | 응원 구단 선택/검색 |
| `GET` | `/tiers?seasonId=` | - | ROOKIE~ALL-STAR 임계값·배지 URL |
| `GET` | `/policies/fan-points` | - | 포인트 도움말 툴팁 문구·정책 버전 |

`GET /bootstrap` 예시:

```json
{
  "data": {
    "session": { "authenticated": true, "user": { "id": "usr_01", "nickname": "BetterBatter" } },
    "balances": { "fanPoints": 1240, "rankScore": 8420 },
    "tier": { "code": "DIAMOND", "rank": 23, "nextTier": "ALL_STAR", "remainingScore": 580 },
    "notificationUnreadCount": 4,
    "preferences": {
      "favoriteTeamId": "team_lad",
      "notifications": { "game": true, "prediction": true, "community": true, "achievement": true },
      "motion": { "voteClashAnimation": true }
    },
    "onboarding": { "completed": true, "version": 1 }
  },
  "meta": { "requestId": "01J...", "serverTime": "2026-08-26T12:36:22Z" }
}
```

### 6.2 인증·세션·온보딩

| Method | Path | 인증 | 요청/결과 |
|---|---|---:|---|
| `POST` | `/auth/sign-up` | - | `{email,password,nickname,termsVersion}` → 세션 + 사용자 |
| `POST` | `/auth/sign-in` | - | `{email,password}` → 세션 |
| `GET` | `/auth/google/authorize?returnTo=` | - | Google OAuth 시작, 302 |
| `GET` | `/auth/google/callback` | - | state/code 검증 후 허용된 `returnTo`로 302 |
| `POST` | `/auth/refresh` | 쿠키 | 리프레시 회전 |
| `POST` | `/auth/logout` | M | 현재 세션 폐기, `204` |
| `GET` | `/auth/session` | 선택 | 인증 여부·사용자·역할 |
| `POST` | `/auth/ws-ticket` | M | 60초 유효 WebSocket 1회용 티켓 |
| `PUT` | `/me/onboarding` | M | `{version,completed:true}` |

닉네임은 2~20자, 금칙어/중복 검사를 수행한다. 인증 실패는 계정 존재 여부를 노출하지 않는 동일 메시지를 사용한다.

### 6.3 내 프로필·환경 설정·관계

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/me` | M | 마이페이지 프로필·카운트·티어 요약 |
| `PATCH` | `/me` | M | 닉네임·아바타 등 수정, `If-Match` |
| `GET` | `/me/preferences` | M | 알림/모션/응원 구단 |
| `PATCH` | `/me/preferences` | M | 부분 변경 |
| `PUT` | `/me/favorite-team` | M | `{teamId}` |
| `GET` | `/users/{userId}/preview` | 선택 | 리스트/채팅 프로필 빠른 표시용 작은 응답 |
| `GET` | `/users/{userId}` | 선택 | 프로필 모달 전체 데이터 |
| `GET` | `/users/{userId}/followers?cursor=` | 선택 | 팔로워 목록 |
| `GET` | `/users/{userId}/following?cursor=` | 선택 | 팔로잉 목록 |
| `PUT` | `/users/{userId}/follow` | M | 팔로우 목표 상태, `204` |
| `DELETE` | `/users/{userId}/follow` | M | 팔로우 해제, `204` |
| `PUT` | `/users/{userId}/block` | M | 차단 및 팔로우 해제 |
| `DELETE` | `/users/{userId}/block` | M | 차단 해제 |
| `POST` | `/reports` | M | 사용자/글/댓글/채팅 신고 |

환경 설정 변경 예시:

```http
PATCH /api/v1/me/preferences
If-Match: "pref-v7"
Content-Type: application/json

{
  "notifications": { "prediction": false },
  "motion": { "voteClashAnimation": false }
}
```

모션 설정은 서버에 동기화하되 UI는 마지막 값을 로컬 캐시해 즉시 적용한다. `prefers-reduced-motion: reduce`는 서버 값보다 우선한다.

신고 요청:

```json
{
  "target": { "type": "USER", "id": "usr_bluecurve" },
  "reasonCode": "HARASSMENT",
  "detail": "선수 비하 표현이 반복됩니다.",
  "evidence": [{ "type": "CHAT_MESSAGE", "id": "msg_01" }]
}
```

### 6.4 경기·데이터 상태·알림 설정

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/games?date=2026-08-26&teamId=&status=` | - | 경기 선택 드롭다운/오늘 경기 |
| `GET` | `/games/{gameId}` | - | 경기 기본 정보 |
| `GET` | `/games/{gameId}/snapshot` | - | 스코어·상황·수비·최근 투구 전체 스냅샷 |
| `GET` | `/games/{gameId}/plays?cursor=&limit=` | - | 공식 플레이 흐름 |
| `GET` | `/games/{gameId}/lineups` | - | 선발/교체/수비 위치 |
| `GET` | `/games/{gameId}/data-health` | - | 지연·중단·취소 안내 상세 |
| `GET` | `/games/{gameId}/chat/messages?before=&limit=50` | 선택 | 응원톡 최초/과거 메시지; 이후 변화는 WebSocket |
| `PUT` | `/me/game-reminders/{gameId}` | M | `{minutesBefore:10}` 경기 시작 알림 설정 |
| `DELETE` | `/me/game-reminders/{gameId}` | M | 알림 해제 |

`GET /games`의 각 항목에는 UI가 추가 호출 없이 상태 문구를 만들 수 있도록 점수, 이닝, 시작 시각, 구장, 참가자 수, 읽지 않은 채팅 수, `reminderEnabled`, `dataHealth`를 포함한다.

### 6.5 예측 마켓·견적·참여

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/games/{gameId}/prediction-markets?status=open&cursor=` | 선택 | 현재/열린 질문 목록 |
| `GET` | `/prediction-markets/{marketId}` | 선택 | 판정 기준, 실시간 비율, 내 참여 포함 |
| `POST` | `/prediction-markets/{marketId}/quote` | M | 선택·금액 기준 예상 수령 견적 |
| `POST` | `/prediction-markets/{marketId}/entries` | M | 참여 확정; `Idempotency-Key` 필수 |
| `GET` | `/games/{gameId}/prediction-history?cursor=&limit=` | 선택 | 이전 질문 기록 |
| `GET` | `/me/prediction-entries?status=&gameId=&cursor=` | M | 내 예측 진행/정산 목록 |
| `GET` | `/me/prediction-entries/{entryId}` | M | 참여 상세 |
| `GET` | `/me/prediction-entries/{entryId}/verification` | M | 검증 ID·출처·정책 버전·공식 근거 |

견적 요청/응답:

```http
POST /api/v1/prediction-markets/mkt_7b/quote
Content-Type: application/json

{ "side": "NO", "amount": 200 }
```

```json
{
  "data": {
    "marketId": "mkt_7b",
    "side": "NO",
    "amount": 200,
    "selectedPercent": 62,
    "expectedPayout": 322,
    "expectedProfit": 122,
    "quoteVersion": 41,
    "expiresAt": "2026-08-26T12:36:25Z"
  }
}
```

참여 요청:

```http
POST /api/v1/prediction-markets/mkt_7b/entries
Idempotency-Key: 01994d44-8f06-7db5-8aa3-88f682a78818
Content-Type: application/json

{
  "side": "NO",
  "amount": 200,
  "quoteVersion": 41,
  "clientSubmittedAt": "2026-08-26T12:36:23.440Z"
}
```

성공은 `201 Created`와 `PredictionEntry`, 최신 `fanPointsBalance`, 마켓의 `myEntry`를 반환한다. 이미 성공한 동일 키 재시도는 같은 `201` 본문과 `Idempotent-Replayed: true`를 반환한다.

| 실패 코드 | HTTP | UI 처리 |
|---|---:|---|
| `MARKET_CLOSED` | 409 | 모달을 읽기 전용으로 전환하고 마감 안내 |
| `QUOTE_STALE` | 409 | 새 견적을 받아 예상 수령 갱신 후 재확인 |
| `DUPLICATE_ENTRY` | 409 | 참여 완료 상태로 전환, 기존 `entryId` 제공 |
| `INSUFFICIENT_POINTS` | 422 | 잔액과 입력 오류 표시 |
| `INVALID_POINT_INCREMENT` | 422 | 10P 단위 안내 |
| `GAME_DATA_UNAVAILABLE` | 503 | 참여 중지, 데이터 지연 안내 |

직접 입력 중에는 클라이언트가 즉시 단순 미리보기를 할 수 있지만, 최종 CTA의 금액은 유효한 서버 견적이 있을 때만 활성화한다. 입력 변경은 200~300ms debounce로 견적을 갱신한다.

### 6.6 포인트·활동 기록

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/me/point-accounts` | M | `fanPoints`, `rankScore`, 보류 금액 |
| `GET` | `/me/point-ledger?account=&kind=&cursor=&limit=` | M | 포인트 변동 내역 |
| `GET` | `/me/activity?type=all|prediction|bonus&cursor=` | M | 예측 기록과 보너스를 시간순 통합 |
| `GET` | `/me/prediction-stats?seasonId=&window=30` | M | 적중률·연속 적중·참여 수·수익 |

활동 목록 항목은 `type`, `statusLabel`, `competition`, `question`, `finalPercent`, `answer`, `myChoice`, `stake`, `delta`, `match`, `occurredAt`을 반환한다. 화면의 전체/예측/보너스 필터는 서버 필터를 사용한다.

### 6.7 커뮤니티 피드·검색·미디어

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/community/feed?scope=&sort=&q=&tag=&teamId=&cursor=&limit=` | 선택 | 추천/일반/팔로잉/내 팀 피드 |
| `GET` | `/community/trending-tags?teamId=&limit=` | - | 추천 태그와 숨은 태그 개수 |
| `GET` | `/posts/{postId}` | 선택 | 스레드 상세, 조회수 반영 토큰 포함 |
| `POST` | `/posts` | M | 새 스레드 |
| `PATCH` | `/posts/{postId}` | M | 작성자 수정, `If-Match` |
| `DELETE` | `/posts/{postId}` | M/Mod | 작성자/운영자 삭제 |
| `PUT` | `/posts/{postId}/like` | M | 공감 상태 true |
| `DELETE` | `/posts/{postId}/like` | M | 공감 상태 false |
| `PUT` | `/posts/{postId}/bookmark` | M | 저장 |
| `DELETE` | `/posts/{postId}/bookmark` | M | 저장 해제 |
| `POST` | `/posts/{postId}/view` | 선택 | 중복 완화된 조회 기록, `204` |
| `POST` | `/media/upload-sessions` | M | 이미지 업로드 세션/서명 URL |
| `POST` | `/media/upload-sessions/{id}/complete` | M | MIME·크기·악성코드 확인 후 media ID |

피드 `scope`:

- `recommended`: 개인화 + 인기 + 경기 맥락
- `general`: 전체 공개 최신 피드
- `following`: 팔로우 사용자만; 인증 필수
- `team`: 응원 구단 태그/보드; 인증 필수

글 작성:

```json
{
  "category": "FREE",
  "body": "지금 보고 있는 경기나 야구 이야기를 나눠보세요.",
  "tags": ["#LAD", "#집관"],
  "mediaIds": ["media_01"]
}
```

서버는 첫 비어 있지 않은 줄의 최대 80자를 `title`로 파생하거나, 추후 별도 제목 입력을 도입하면 명시 필드로 전환한다. 미디어에는 접근성용 `alt`를 받는다.

### 6.8 답글·대댓글

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/posts/{postId}/comments?cursor=&limit=&rootId=` | 선택 | 루트 답글과 평탄화된 대댓글 |
| `POST` | `/posts/{postId}/comments` | M | `{body,parentId}` 답글/대댓글 |
| `PATCH` | `/comments/{commentId}` | M | 작성자 수정 |
| `DELETE` | `/comments/{commentId}` | M/Mod | 삭제 tombstone |
| `PUT` | `/comments/{commentId}/like` | M | 답글 공감 |
| `DELETE` | `/comments/{commentId}/like` | M | 답글 공감 해제 |

`parentId`는 직접 답글 대상을, `rootId`는 UI 연결선/접기 그룹을 안정적으로 만들기 위한 최상위 댓글을 가리킨다. 댓글 목록은 `depth`와 `replyToUser`를 함께 반환한다.

### 6.9 공지·이벤트

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/announcements?placement=&activeAt=` | - | 운영 공지/상단 고정 |
| `GET` | `/events?status=active|upcoming&cursor=` | - | 시즌 이벤트 |
| `GET` | `/events/{eventId}` | - | 이벤트 상세·보상 |

공지 목록은 `placement=COMMUNITY_TOP|GLOBAL_BANNER|LIVE_NOTICE`, `startsAt`, `endsAt`, `pinned`, `priority`를 제공한다.

### 6.10 랭킹·티어

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/rankings?scope=season|game|team&seasonId=&gameId=&teamId=&q=&page=1&pageSize=10` | 선택 | 시상대·전체 목록·내 순위 |
| `GET` | `/rankings/me?scope=&seasonId=&gameId=` | M | 내 순위와 해당 페이지 |
| `GET` | `/me/rank-progress?seasonId=` | M | 현재 점수·최고 티어·다음 티어 |
| `GET` | `/tiers/{tierCode}` | - | 배지·임계값·설명 |

`q` 검색 결과가 시상대 1~3위에만 있으면 `podiumMatch=true`, `rows=[]`로 반환한다. “목록에서 보기”는 `pageForMyRank`로 이동하고 해당 행에 포커스를 둔다.

### 6.11 업적·전시 배지

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/achievements?seasonId=&include=viewer` | M | 모든 업적·모든 단계·내 진행 |
| `GET` | `/achievements/{achievementId}` | 선택 | 업적/단계 상세 |
| `GET` | `/me/achievements?earned=&cursor=` | M | 내 업적 |
| `GET` | `/me/achievement-showcase` | M | 3칸 전시 상태 |
| `PUT` | `/me/achievement-showcase` | M | `{slots:[achievementId|null,...]}` |

전시 변경:

```json
{
  "slots": ["ach_clutch", "ach_hot_streak", null]
}
```

검증:

- 정확히 3개 슬롯을 받는다.
- 동일 업적 중복 불가.
- 미획득 업적 전시 불가.
- 초과/중복/미획득은 `422`와 슬롯별 오류를 반환한다.

목록 카드, 프로필, 모달이 동일 이미지를 쓰도록 각 단계의 `imageUrl`, `width`, `height`, `contentBox`를 카탈로그에서 일관되게 관리한다.

### 6.12 알림

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/notifications?unread=&cursor=&limit=` | M | 알림 패널 |
| `PATCH` | `/notifications/{notificationId}` | M | `{read:true}` |
| `POST` | `/notifications/read-all` | M | 기준 시각까지 모두 읽음 |
| `GET` | `/me/notification-preferences` | M | 종류별 설정 |
| `PUT` | `/me/notification-preferences` | M | 전체 교체 |

알림 종류: `GAME_START`, `GAME_STATUS`, `PREDICTION_CLOSING`, `PREDICTION_SETTLED`, `COMMENT_REPLY`, `FOLLOWED`, `TIER_PROMOTED`, `ACHIEVEMENT_UNLOCKED`, `SYSTEM_NOTICE`.

### 6.13 관리자·신고·제재·감사

| Method | Path | 인증 | 용도 |
|---|---|---:|---|
| `GET` | `/admin/dashboard` | A | 대기 신고, 접속, 글 수, 서비스 상태 |
| `GET` | `/admin/reports?status=&reason=&cursor=` | Mod | 신고 큐 |
| `GET` | `/admin/reports/{reportId}` | Mod | 증거·중복 신고·대상 이력 |
| `POST` | `/admin/reports/{reportId}/dismiss` | Mod | 기각 사유, 멱등 키 |
| `POST` | `/admin/reports/{reportId}/sanctions` | Mod | 삭제/경고/기간 정지/영구 정지 |
| `GET` | `/admin/sanctions?userId=&cursor=` | Mod | 제재 이력 |
| `POST` | `/admin/sanctions/{sanctionId}/revoke` | A | 제재 취소 사유 |
| `GET` | `/admin/service-health` | A | 인증·피드·커뮤니티·큐 상태 |
| `POST` | `/admin/announcements` | A | 공지 생성 |
| `PATCH` | `/admin/announcements/{id}` | A | 노출/고정/기간 변경 |
| `DELETE` | `/admin/announcements/{id}` | A | 공지 비활성화 |
| `GET` | `/admin/audit-logs?actor=&action=&from=&to=&cursor=` | A | 감사 로그 |
| `POST` | `/admin/audit-exports` | A | 비동기 내보내기 작업 |
| `GET` | `/admin/audit-exports/{jobId}` | A | 작업 상태/다운로드 URL |

제재 요청:

```json
{
  "action": "SUSPEND",
  "durationDays": 7,
  "reasonCode": "SPAM_AUTOMATION",
  "note": "게시글 4건 연속 등록 및 자동화 패턴 확인",
  "contentActions": [{ "type": "POST", "id": "post_04", "action": "HIDE" }]
}
```

`REPORT_ALREADY_RESOLVED`, `SANCTION_CONFLICT`, `REAUTH_REQUIRED`는 `409` 또는 `403`으로 명확히 구분한다.

## 7. UI 상호작용과 데이터 계약

### 7.1 호버/포커스에 서버 호출이 없어야 하는 항목

| UI 반응 | 필요한 사전 데이터 | 표현 규칙 |
|---|---|---|
| 마켓 카드 상승, 배경 SVG 선명도, 화살표 이동 | `PredictionMarket` | CSS 전환만 사용 |
| YES/NO 호버 네온·파티클 밝기 | 현재 비율, 선택 가능 여부 | REST 호출 없음; `motion` 설정과 reduced-motion 준수 |
| 결과 판정 기준 툴팁 | `market.resolution` | 마켓 상세에 포함; hover/focus/click 모두 열림 |
| 무료 포인트 `?` 툴팁 | `/policies/fan-points` 또는 bootstrap | 정책 버전이 바뀔 때만 재검증 |
| 수비 포지션 마커 | `snapshot.defense` | hover/click 시 선수명, 선택된 위치 강조 |
| 태그·정렬·탭·필터 강조 | 현재 클라이언트 상태 | 검색 결과만 네트워크 사용 |
| 업적 단계 노드 툴팁 | `Achievement.stages` | 단계, 임계값, 잠금/현재 상태 표시 |
| 프로필 전시 배지 툴팁 | `tooltipLabel` | 이름과 단계만 표시 |
| 알림/글/랭킹 행 hover | 응답에 포함된 요약 | 배경/색/밑줄만 변경 |

### 7.2 지연 로드가 허용되는 항목

| 트리거 | 엔드포인트 | UX |
|---|---|---|
| 사용자 이름/아바타에 150ms 이상 머묾 | `GET /users/{id}/preview` | 취소 가능한 prefetch; 클릭 시 전체 프로필 재사용 |
| 정산 행의 “검증 정보” 첫 펼침 | `GET /me/prediction-entries/{id}/verification` | 로딩 skeleton 후 캐시 |
| 랭크 진행 `?` 클릭 | `GET /tiers` + `/me/rank-progress` | 포커스 트랩 모달 |
| 업적 단계 클릭 | 이미 목록에 `stages`가 없을 때만 상세 조회 | 모달 닫힘 시 원래 버튼으로 포커스 복귀 |
| 관리자 서비스 상태 펼침 | `GET /admin/service-health` | 오래된 경우만 재검증 |

### 7.3 모달·키보드·오류 상태

- 예측, 프로필, 업적 단계, 구단 선택, 인증, 온보딩 모달은 `Escape`, X, 허용된 backdrop 클릭으로 닫고 트리거로 포커스를 복귀한다.
- 예측 모달은 URL `#predict`와 동기화해 브라우저 뒤로가기로 닫힌다. 서버 계약은 독립적이다.
- CTA는 `side`, 유효한 금액, 최신 견적이 모두 있을 때만 활성화한다.
- `aria-live` 영역에 참여 처리·완료·오류·알림 읽음·글 게시 완료를 알린다.
- 네트워크 오류는 기존 데이터를 지우지 않고 재시도 버튼과 마지막 갱신 시각을 제공한다.

## 8. 오류 코드 목록

| 코드 | HTTP | 설명 |
|---|---:|---|
| `AUTH_REQUIRED` | 401 | 로그인 필요 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `REAUTH_REQUIRED` | 403 | 관리자 중요 작업 재인증 필요 |
| `RESOURCE_NOT_FOUND` | 404 | 대상 없음/비공개 |
| `VERSION_CONFLICT` | 409 | `If-Match` 불일치 |
| `MARKET_CLOSED` | 409 | 마켓 마감 |
| `QUOTE_STALE` | 409 | 견적 버전 만료 |
| `DUPLICATE_ENTRY` | 409 | 이미 참여 |
| `SHOWCASE_LIMIT` | 422 | 전시 3칸 초과 |
| `ACHIEVEMENT_NOT_EARNED` | 422 | 미획득 배지 전시 시도 |
| `BLOCKED_RELATIONSHIP` | 403 | 차단 관계 상호작용 |
| `CONTENT_LIMIT_EXCEEDED` | 422 | 글/댓글/채팅 길이 초과 |
| `RATE_LIMITED` | 429 | 요청 제한, `Retry-After` 포함 |
| `GAME_DATA_DELAYED` | 503 | 경기 데이터 지연으로 명령 중단 |
| `SERVICE_UNAVAILABLE` | 503 | 일시 장애 |

## 9. 권장 레이트 리밋

| 기능 | 제한 초안 |
|---|---|
| 로그인 | IP+계정당 5회/10분, 점진 지연 |
| 예측 견적 | 사용자당 20회/10초, 마지막 입력 coalesce |
| 예측 참여 | 사용자당 10회/분, 마켓당 1회 |
| 글 작성 | 5회/10분 |
| 댓글 | 20회/10분 |
| 신고 | 10회/일 |
| 검색 | 사용자/IP당 30회/분 |
| 관리자 조치 | 관리자당 30회/분 + 감사 |

## 10. 구현 우선순위

### P0 — 라이브 MVP

1. 인증/세션/부트스트랩
2. 경기 목록·스냅샷·마켓
3. 견적·예측 참여·포인트 원장
4. 내 예측·검증 정보
5. WebSocket 경기/마켓/포인트/채팅

### P1 — 커뮤니티/성장

1. 피드·글·답글·공감·검색·이미지
2. 프로필·팔로우·차단·신고
3. 랭킹·티어·업적·전시
4. 알림·경기 시작 알림·온보딩

### P2 — 운영

1. 신고 큐·제재 이력
2. 공지/이벤트 고정
3. 서비스 상태·감사 로그·내보내기

## 11. 확정이 필요한 초안 항목

1. 예상 수령 공식과 소수점/최대 수령 상한.
2. 마켓 참여 단위가 정확히 10P인지, 모든 정수 P인지.
3. `rankScore` 획득 공식과 `fanPoints` 정산의 관계.
4. 취소 경기에서 일부 확정된 마켓을 유지할지 전부 무효 처리할지.
5. Google 계정과 이메일 계정 자동 병합 정책.
6. 채팅/댓글 보존 기간과 삭제된 콘텐츠의 운영자 열람 기간.
7. 랭킹 동점 순서(최초 달성 시각, 적중률, 참여 수 등).
8. 관리자 제재 단계와 이의 제기 절차.

이 항목이 확정되면 OpenAPI 3.1 파일, 예제 fixture, contract test로 승격한다.
