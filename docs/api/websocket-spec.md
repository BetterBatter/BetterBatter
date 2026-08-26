# BetterBatter WebSocket 명세서 초안

> 문서 상태: **Draft v0.1**  
> 프로토콜 버전: `bb-ws/1`  
> 연결 URL: `wss://api.betterbatter.example/ws/v1`  
> 관련 문서: [REST API 명세서](./rest-api-spec.md)

## 1. 목적과 경계

WebSocket은 다음 UI를 실시간으로 갱신한다.

- 라이브 경기의 점수, 이닝, 아웃, B-S-O, 주자, 타자/투수, 수비 위치, 최근 투구
- 경기 데이터 지연·재개·취소 상태
- 현재 예측 질문의 열림/마감/판정과 YES/NO 비율
- 예측 참여/정산으로 인한 사용자 포인트·기록·티어·업적 변화
- 경기별 응원톡
- 커뮤니티 스레드/답글/공감 지표와 고정 공지
- 알림과 읽지 않은 개수
- 랭킹/티어/업적 진행 변화
- 관리자 신고 큐와 서비스 상태

다음 작업은 WebSocket으로 처리하지 않는다.

- 로그인/가입/Google OAuth
- 예측 견적과 참여 확정
- 글·댓글 수정/삭제, 팔로우, 차단, 신고, 알림 읽음
- 전시 배지 변경, 환경 설정 변경, 관리자 제재

이 작업들은 REST가 트랜잭션 기준이며 성공 후 WebSocket 이벤트를 fan-out한다. 채팅 메시지 전송만 낮은 지연을 위해 WebSocket 명령을 허용한다.

## 2. 연결과 인증

### 2.1 사전 티켓

1. 인증 사용자는 `POST /api/v1/auth/ws-ticket`을 호출한다.
2. 서버는 60초 유효, 1회 사용 가능한 `ticket`과 허용 origin을 반환한다.
3. 클라이언트는 아래 URL로 연결한다.

```text
wss://api.betterbatter.example/ws/v1?ticket=wst_01J...
```

- 접근 로그에서 `ticket` query를 반드시 마스킹한다.
- ticket 재사용은 `4401 WS_TICKET_REPLAYED`로 종료한다.
- 게스트는 공개 경기/마켓/커뮤니티 구독만 허용하는 anonymous ticket을 발급받을 수 있다.
- 차단/제재/로그아웃된 세션은 기존 연결도 `session.revoked` 후 종료한다.

### 2.2 연결 수립

서버 최초 메시지:

```json
{
  "v": 1,
  "eventId": "evt_01J...",
  "event": "system.connected",
  "topic": "system",
  "sequence": 1,
  "occurredAt": "2026-08-26T12:36:22.184Z",
  "data": {
    "connectionId": "conn_01J...",
    "userId": "usr_01",
    "heartbeatIntervalMs": 25000,
    "resumeWindowSeconds": 600,
    "maxTopics": 20,
    "serverTime": "2026-08-26T12:36:22.184Z"
  }
}
```

### 2.3 연결 종료 코드

| Code | 이름 | 의미 | 클라이언트 처리 |
|---:|---|---|---|
| `1000` | NORMAL | 정상 종료 | 필요 시 다시 연결 |
| `1001` | GOING_AWAY | 배포/노드 교체 | jitter 재연결 |
| `4000` | PROTOCOL_ERROR | 봉투/버전 오류 | 로깅 후 재연결 금지 |
| `4001` | UNSUPPORTED_VERSION | 미지원 `v` | 앱 업데이트 안내 |
| `4401` | UNAUTHENTICATED | 티켓 만료/재사용/세션 만료 | 새 티켓 발급 후 1회 재시도 |
| `4403` | FORBIDDEN | 구독 권한 없음/제재 | 해당 기능 비활성화 |
| `4408` | HEARTBEAT_TIMEOUT | pong 없음 | 네트워크 상태 표시 후 재연결 |
| `4429` | RATE_LIMITED | 연결/명령 제한 | `retryAfterMs` 준수 |
| `4500` | INTERNAL_ERROR | 서버 오류 | 지수 백오프 |

## 3. 메시지 봉투

### 3.1 클라이언트 → 서버

```ts
type ClientFrame = {
  v: 1
  requestId: string
  op: "subscribe" | "unsubscribe" | "resume" | "ping" | "chat.send" | "chat.typing.set"
  sentAt: string
  data: object
}
```

예시:

```json
{
  "v": 1,
  "requestId": "req_01J...",
  "op": "subscribe",
  "sentAt": "2026-08-26T12:36:23.010Z",
  "data": {
    "topics": ["game:game_lad_sf", "game:game_lad_sf:markets", "game:game_lad_sf:chat"]
  }
}
```

### 3.2 서버 → 클라이언트

```ts
type ServerEvent<T> = {
  v: 1
  eventId: string
  event: string
  topic: string
  sequence: number
  occurredAt: string
  correlationId?: string
  resourceVersion?: number
  data: T
}
```

- `eventId`: 전역 중복 제거 ID.
- `sequence`: topic 안에서 단조 증가. 서로 다른 topic 사이의 전역 순서는 보장하지 않는다.
- `resourceVersion`: 같은 리소스의 REST `version`과 비교한다.
- `correlationId`: REST `X-Request-Id`, `Idempotency-Key`, WebSocket `requestId` 중 원인이 된 값을 연결한다.

### 3.3 명령 ACK/오류

```json
{
  "v": 1,
  "eventId": "evt_ack_01",
  "event": "system.ack",
  "topic": "system",
  "sequence": 7,
  "occurredAt": "2026-08-26T12:36:23.021Z",
  "correlationId": "req_01J...",
  "data": {
    "op": "subscribe",
    "accepted": ["game:game_lad_sf", "game:game_lad_sf:markets"],
    "rejected": []
  }
}
```

```json
{
  "v": 1,
  "eventId": "evt_err_01",
  "event": "system.error",
  "topic": "system",
  "sequence": 8,
  "occurredAt": "2026-08-26T12:36:23.025Z",
  "correlationId": "req_01J...",
  "data": {
    "code": "TOPIC_FORBIDDEN",
    "message": "이 주제를 구독할 권한이 없습니다.",
    "retryable": false,
    "retryAfterMs": null
  }
}
```

## 4. 구독 모델

### 4.1 Topic 목록

| Topic 패턴 | 권한 | 내용 |
|---|---:|---|
| `game:{gameId}` | 공개 | 경기 상황·스코어·데이터 상태 |
| `game:{gameId}:markets` | 공개/개인화 | 예측 마켓·비율·내 참여 상태 |
| `game:{gameId}:chat` | 공개 읽기, M 쓰기 | 경기 응원톡 |
| `post:{postId}` | 공개 | 스레드 상세·답글·지표 |
| `community:feed:{scope}` | 범위별 | 새 글·고정 공지·인기 지표 |
| `ranking:{scope}:{contextId}` | 공개 | 경기/시즌/구단 랭킹 |
| `user:{userId}:private` | 본인 | 포인트·참여·업적·알림·환경 설정 |
| `user:{userId}:profile` | 공개 | 공개 프로필 카운트/전시 배지 변화 |
| `admin:operations` | A | 신고·서비스 상태·감사 작업 |

`community:feed:following`, `user:*:private`, `admin:*`은 권한 검사 후 구독한다.

### 4.2 구독 응답과 스냅샷

구독 성공 뒤 서버는 topic에 따라 다음 중 하나를 보낸다.

1. 작은 리소스: 즉시 `*.snapshot` 이벤트.
2. 큰 피드/과거 내역: `snapshotUrl`을 가진 `system.subscribed`; 클라이언트가 REST로 조회.

```json
{
  "v": 1,
  "eventId": "evt_sub_01",
  "event": "system.subscribed",
  "topic": "community:feed:recommended",
  "sequence": 102,
  "occurredAt": "2026-08-26T12:36:23Z",
  "data": {
    "snapshotUrl": "/api/v1/community/feed?scope=recommended",
    "latestSequence": 102
  }
}
```

## 5. 재연결·재개·정합성

### 5.1 전달 보장

- 전달은 **at-least-once**다.
- 클라이언트는 최근 `eventId`를 LRU로 보관해 중복 적용하지 않는다.
- 같은 topic에서 `sequence`가 이전 값보다 작거나 같으면 무시한다.
- `sequence`가 1 이상 건너뛰면 해당 topic의 적용을 멈추고 resume 또는 REST 재동기화를 수행한다.

### 5.2 Resume

클라이언트는 topic별 마지막 sequence를 보낸다.

```json
{
  "v": 1,
  "requestId": "req_resume_01",
  "op": "resume",
  "sentAt": "2026-08-26T12:37:04Z",
  "data": {
    "topics": [
      { "topic": "game:game_lad_sf", "lastSequence": 885 },
      { "topic": "game:game_lad_sf:markets", "lastSequence": 194 }
    ]
  }
}
```

서버는 10분 또는 topic별 5,000개 이벤트 범위 안에서 재전송한다. 범위를 벗어나면:

```json
{
  "v": 1,
  "eventId": "evt_resync_01",
  "event": "system.resync_required",
  "topic": "game:game_lad_sf",
  "sequence": 910,
  "occurredAt": "2026-08-26T12:37:04Z",
  "data": {
    "reason": "RESUME_WINDOW_EXPIRED",
    "snapshotUrl": "/api/v1/games/game_lad_sf/snapshot",
    "latestSequence": 910
  }
}
```

### 5.3 재연결 백오프

- 즉시 1회: `0~250ms` jitter
- 이후: 1s, 2s, 4s, 8s, 최대 30s + 20% jitter
- 브라우저가 오프라인이면 재시도하지 않고 `online` 이벤트를 기다린다.
- 30초 이상 끊겼으면 상단에 “실시간 연결 재시도 중”을 표시하고, 마지막 갱신 시각을 유지한다.

### 5.4 Heartbeat

서버는 25초마다 WebSocket ping 또는 `system.ping`을 보낸다. 애플리케이션 ping을 쓸 경우:

```json
{ "v": 1, "requestId": "hb_01", "op": "ping", "sentAt": "2026-08-26T12:37:00Z", "data": {} }
```

10초 안에 pong이 없으면 종료한다. 백그라운드 탭의 timer throttling을 고려해 서버 ping/pong을 우선한다.

## 6. 경기 이벤트

### 6.1 이벤트 목록

| Event | Payload 핵심 | UI 반응 |
|---|---|---|
| `game.snapshot` | 전체 `GameSnapshot` | 최초/재동기화 전체 교체 |
| `game.status.changed` | 이전/새 상태, 시각, 사유 | 예정/라이브/종료/취소 레이아웃 전환 |
| `game.score.updated` | away/home 점수, scoringPlay | 점수 강조 후 안정화 |
| `game.situation.updated` | 이닝, half, 아웃, B-S-O, 주자 | 구장·카운트·문구 동시 갱신 |
| `game.pitch.recorded` | 투구 번호, 구종, 속도, 결과 | 하단 LAST PITCH 교체 |
| `game.matchup.changed` | 타자·투수 | 매치업 갱신 |
| `game.defense.updated` | 9개 포지션 좌표/선수 | 마커 이동, 선택 유지 가능 시 유지 |
| `game.lineup.changed` | 교체 선수·수비 이동 | 사용자에게 교체 안내 |
| `game.data_health.changed` | healthy/delayed/unavailable | 지연 배너·예측 CTA 제한 |
| `game.cancelled` | 사유·환불 정책 | 취소 안내, 관련 마켓 상태 전환 |
| `game.finalized` | 최종 스코어·공식화 시각 | 읽기 전용/정산 대기 전환 |

### 6.2 경기 상황 예시

```json
{
  "v": 1,
  "eventId": "evt_game_886",
  "event": "game.situation.updated",
  "topic": "game:game_lad_sf",
  "sequence": 886,
  "occurredAt": "2026-08-26T12:36:25.440Z",
  "resourceVersion": 311,
  "data": {
    "gameId": "game_lad_sf",
    "situation": {
      "inning": 7,
      "half": "bottom",
      "outs": 2,
      "balls": 2,
      "strikes": 1,
      "occupiedBases": ["first", "second"]
    },
    "source": "MLB_PLAY_BY_PLAY"
  }
}
```

### 6.3 데이터 지연 예시

```json
{
  "v": 1,
  "eventId": "evt_health_21",
  "event": "game.data_health.changed",
  "topic": "game:game_lad_sf",
  "sequence": 887,
  "occurredAt": "2026-08-26T12:36:31Z",
  "data": {
    "gameId": "game_lad_sf",
    "status": "delayed",
    "delaySeconds": 18,
    "message": "공식 경기 데이터 반영이 지연되고 있습니다.",
    "predictionCommandsAllowed": false
  }
}
```

지연 중 UI는 마지막 유효 스냅샷을 유지한다. 추정 값을 만들어 점수/아웃을 변경하지 않는다.

## 7. 예측 마켓 이벤트

### 7.1 이벤트 목록

| Event | 설명 | UI 반응 |
|---|---|---|
| `prediction.market.opened` | 새 질문 열림 | 라이브 카드 교체/추가 |
| `prediction.market.updated` | 질문/마감/판정 정책 변경 | `version`이 높을 때 교체 |
| `prediction.odds.updated` | YES/NO 비율·표본 수 | 카드·모달 비율 갱신 |
| `prediction.market.closing` | 임박 상태·남은 초 | 타이머/경고 칩 |
| `prediction.market.closed` | 참여 마감 | CTA 비활성화, 읽기 전용 |
| `prediction.market.resolving` | 공식 판정 대기 | 정산 중 상태 |
| `prediction.market.resolved` | YES/NO 정답·검증 ID | 이전 기록/내 예측 반영 |
| `prediction.market.voided` | 무효·환급 사유 | 환급 안내 |
| `prediction.active.changed` | 라이브 카드가 가리킬 현재 질문 | 채팅 위 떠있는 투표 카드도 동시 교체 |
| `prediction.entry.accepted` | 본인 참여가 다른 기기에서 확정 | 참여 완료·회색 처리 |
| `prediction.entry.settled` | 본인 적중/미적중·수령 | 내 예측·포인트·알림 갱신 |

### 7.2 비율 갱신

```json
{
  "v": 1,
  "eventId": "evt_odds_195",
  "event": "prediction.odds.updated",
  "topic": "game:game_lad_sf:markets",
  "sequence": 195,
  "occurredAt": "2026-08-26T12:36:25.700Z",
  "resourceVersion": 42,
  "data": {
    "marketId": "mkt_7b",
    "yesPercent": 38,
    "noPercent": 62,
    "sampleSize": 184,
    "quoteVersion": 42,
    "updatedAt": "2026-08-26T12:36:25.690Z"
  }
}
```

### 7.3 UI 애니메이션 규칙

WebSocket은 애니메이션 중간 값이나 파티클 좌표를 보내지 않는다. 한 이벤트는 **목표 비율**만 보낸다.

- 예측 모달 최초 진입 시, 클라이언트는 0%에서 목표 비율까지 약 1.6초의 힘겨루기 곡선을 자체 계산한다.
- `preferences.motion.voteClashAnimation=false` 또는 `prefers-reduced-motion: reduce`면 즉시 목표 값으로 바꾼다.
- 마지막 충돌 떨림·VS·중앙선·네온·파티클은 표현 계층이다.
- 이후 `prediction.odds.updated`는 180~300ms 안에서 부드럽게 이동하되 큰 왕복 연출을 반복하지 않는다.
- 파티클은 양쪽 고정 레이어에 남고, 이동하는 clip 경계가 가리는 방식으로 표현한다. 파티클 자체 위치를 서버 이벤트와 함께 움직이지 않는다.
- 1초 안에 다수 비율 이벤트가 오면 마지막 값으로 coalesce할 수 있다. `sequence`는 마지막 이벤트까지 진행한다.

### 7.4 마감/판정

```json
{
  "v": 1,
  "eventId": "evt_market_close_01",
  "event": "prediction.market.closed",
  "topic": "game:game_lad_sf:markets",
  "sequence": 198,
  "occurredAt": "2026-08-26T12:36:30Z",
  "resourceVersion": 45,
  "data": {
    "marketId": "mkt_7b",
    "closedAt": "2026-08-26T12:36:30Z",
    "reason": "NEXT_PITCH_STARTED",
    "lastAcceptedEntryAt": "2026-08-26T12:36:29.998Z"
  }
}
```

서버 수신 시각이 기준이며 클라이언트 클릭 시각은 권한을 만들지 않는다. 동시에 REST 참여가 도착하면 예측 서비스가 원자적으로 접수/거절한다.

## 8. 포인트·참여·랭크·업적 이벤트

이 이벤트는 `user:{userId}:private` topic에서만 전달한다.

| Event | 핵심 데이터 | UI |
|---|---|---|
| `point.balance.updated` | 계정, 이전/현재 잔액, 원인 | 헤더·참여 모달 잔액 갱신 |
| `point.ledger.created` | 원장 항목 | 활동 기록 상단 추가 |
| `prediction.entry.accepted` | 참여 전체 요약 | 다른 탭/기기 동기화 |
| `prediction.entry.settled` | 정답·수령·검증 ID | 내 예측, 토스트, 알림 |
| `rank.score.updated` | 시즌 점수·최고점·순위 | 티어 카드/랭킹 갱신 |
| `tier.promoted` | 이전/새 티어·임계값 | 승급 알림·배지 갱신 |
| `achievement.progress.updated` | 현재 값·단계·진행률 | 업적 카드/타임라인 |
| `achievement.unlocked` | 업적·획득 시각 | 알림·전시 가능 상태 |
| `achievement.stage_advanced` | 이전/새 단계·이미지 | 단계형 배지 이미지 갱신 |
| `achievement.showcase.updated` | 3개 슬롯 | 여러 기기 프로필 동기화 |

포인트 예시:

```json
{
  "v": 1,
  "eventId": "evt_point_01",
  "event": "point.balance.updated",
  "topic": "user:usr_01:private",
  "sequence": 551,
  "occurredAt": "2026-08-26T12:36:24Z",
  "correlationId": "01994d44-8f06-7db5-8aa3-88f682a78818",
  "data": {
    "account": "FAN_POINTS",
    "previousBalance": 1240,
    "balance": 1040,
    "delta": -200,
    "reason": "PREDICTION_STAKE",
    "ledgerEntryId": "ledger_01",
    "reference": { "type": "PREDICTION_ENTRY", "id": "entry_01" }
  }
}
```

티어 상승은 `rank.score.updated` 다음 `tier.promoted` 순서로 같은 topic에서 발행한다.

## 9. 응원톡

### 9.1 과거 조회와 구독

- 과거 메시지: `GET /api/v1/games/{gameId}/chat/messages?before=&limit=50`
- 실시간: `game:{gameId}:chat`
- `scheduled`: 읽기 가능, 쓰기 불가.
- `live`: 읽기/쓰기 가능.
- `final`, `cancelled`: 읽기 전용.

### 9.2 메시지 전송

```json
{
  "v": 1,
  "requestId": "req_chat_01",
  "op": "chat.send",
  "sentAt": "2026-08-26T12:36:28.120Z",
  "data": {
    "gameId": "game_lad_sf",
    "clientMessageId": "01994d44-a3c2-7af6-ae18-a95ddf146abc",
    "body": "저는 변화구 하나 보고 들어갈 것 같아요.",
    "replyToMessageId": null
  }
}
```

- `clientMessageId`는 사용자당 24시간 중복 제거 키다.
- body는 trim 후 1~120자다.
- ACK는 수신/검증 성공을 뜻하며, 실제 표시 기준은 `chat.message.created`다.
- 자신의 메시지도 서버 이벤트를 받아 임시 메시지와 치환한다.

### 9.3 메시지 이벤트

```json
{
  "v": 1,
  "eventId": "evt_chat_813",
  "event": "chat.message.created",
  "topic": "game:game_lad_sf:chat",
  "sequence": 813,
  "occurredAt": "2026-08-26T12:36:28.170Z",
  "correlationId": "req_chat_01",
  "data": {
    "message": {
      "id": "msg_01",
      "clientMessageId": "01994d44-a3c2-7af6-ae18-a95ddf146abc",
      "gameId": "game_lad_sf",
      "author": {
        "id": "usr_01",
        "nickname": "BetterBatter",
        "avatarUrl": null,
        "tier": { "code": "DIAMOND", "badgeUrl": "/tier-badges/diamond.png" }
      },
      "body": "저는 변화구 하나 보고 들어갈 것 같아요.",
      "pollChoice": "NO",
      "createdAt": "2026-08-26T12:36:28.160Z",
      "moderation": { "state": "VISIBLE" }
    }
  }
}
```

`pollChoice`는 현재 활성 마켓에 참여했고 공개 가능한 경우만 제공한다. 참여 금액은 채팅에 노출하지 않는다.

### 9.4 채팅 이벤트 목록

| Event | 용도 |
|---|---|
| `chat.message.created` | 새 메시지 |
| `chat.message.updated` | 운영 마스킹/작성자 허용 수정 정책이 있을 때 |
| `chat.message.deleted` | 작성자 삭제/운영 삭제 tombstone |
| `chat.message.moderated` | 숨김·경고·복구 |
| `chat.presence.updated` | 참여자 수 갱신, 선택 구현 |
| `chat.typing.updated` | 입력 중, 선택 구현·1.5초 TTL |

채팅 UI는 새 메시지가 도착해도 사용자가 과거 메시지를 읽는 중이면 강제 스크롤하지 않고 “새 메시지” 버튼을 표시한다. 맨 아래에 있을 때만 자동 스크롤한다.

## 10. 커뮤니티 이벤트

### 10.1 이벤트 목록

| Event | Topic | UI |
|---|---|---|
| `community.post.created` | `community:feed:*` | 현재 정렬/필터에 맞으면 상단 또는 새 글 배너 |
| `community.post.updated` | feed, `post:{id}` | 내용/태그/이미지 갱신 |
| `community.post.deleted` | feed, `post:{id}` | tombstone/목록 제거 |
| `community.post.metrics.updated` | feed, `post:{id}` | 공감·답글·조회 수 갱신 |
| `community.comment.created` | `post:{id}` | 답글/대댓글 연결선에 추가 |
| `community.comment.updated` | `post:{id}` | 내용 갱신 |
| `community.comment.deleted` | `post:{id}` | 삭제됨 표시 |
| `community.comment.metrics.updated` | `post:{id}` | 답글 공감 갱신 |
| `community.pinned.changed` | feed | 고정 공지/이벤트 교체 |
| `community.popular.changed` | feed | 인기 불꽃 표시/정렬 갱신 |

피드 스크롤 중 새 글을 즉시 삽입해 위치를 밀지 않는다. 상단에 “새 스레드 n개” 배너를 보이고 사용자가 눌렀을 때 합친다.

### 10.2 지표 이벤트

```json
{
  "v": 1,
  "eventId": "evt_post_metric_01",
  "event": "community.post.metrics.updated",
  "topic": "post:post_01",
  "sequence": 73,
  "occurredAt": "2026-08-26T12:36:29Z",
  "resourceVersion": 9,
  "data": {
    "postId": "post_01",
    "metrics": { "comments": 4, "likes": 127, "views": 843 }
  }
}
```

공감 버튼은 REST 목표 상태를 optimistic update한 뒤 실패 시 되돌린다. 소켓 지표는 서버 확정치다.

## 11. 알림 이벤트

`user:{userId}:private`에서 전달한다.

| Event | UI |
|---|---|
| `notification.created` | 헤더 badge +1, 패널 상단 삽입, 설정 허용 시 OS push 별도 |
| `notification.updated` | 읽음/내용 변경을 다른 탭에 동기화 |
| `notification.unread_count.updated` | badge를 서버 확정치로 교체 |
| `notification.deleted` | 만료/회수된 알림 제거 |

```json
{
  "v": 1,
  "eventId": "evt_notif_01",
  "event": "notification.created",
  "topic": "user:usr_01:private",
  "sequence": 552,
  "occurredAt": "2026-08-26T12:42:08Z",
  "data": {
    "notification": {
      "id": "noti_01",
      "type": "PREDICTION_SETTLED",
      "title": "예측 정산 완료 · +113P",
      "detail": "6회 총 득점 예측이 적중했습니다.",
      "target": { "route": "/predictions", "resourceId": "entry_01" },
      "readAt": null,
      "createdAt": "2026-08-26T12:42:08Z"
    },
    "unreadCount": 4
  }
}
```

사용자 설정에서 꺼진 종류는 인앱 알림 생성 정책과 OS push 정책을 분리해 결정해야 한다. 초안은 보안/정산 알림은 항상 인앱에 남기고 푸시만 끌 수 있도록 권장한다.

## 12. 랭킹·프로필·업적 이벤트

### 12.1 랭킹

| Event | Topic | 설명 |
|---|---|---|
| `ranking.entry.updated` | `ranking:{scope}:{id}` | 사용자/구단 점수·순위 변경 |
| `ranking.podium.updated` | 동일 | 1~3위 변경 |
| `ranking.rebuilt` | 동일 | 집계 재계산 완료, REST 재조회 권고 |
| `profile.public_stats.updated` | `user:{id}:profile` | 팔로워·글·공감·전시 배지 |

랭킹 화면은 이벤트 폭주를 막기 위해 최대 1초당 1회 배치 갱신한다. 현재 페이지와 시상대만 patch하고, 정렬 순서가 바뀌면 부드럽게 재배치한다. 검색 중에는 결과를 자동 재정렬하지 않고 “순위가 갱신됨” 표시 후 재조회한다.

### 12.2 업적

```json
{
  "v": 1,
  "eventId": "evt_ach_01",
  "event": "achievement.stage_advanced",
  "topic": "user:usr_01:private",
  "sequence": 553,
  "occurredAt": "2026-08-26T12:42:09Z",
  "data": {
    "achievementId": "ach_clutch",
    "name": "클러치 히터",
    "previousStage": 1,
    "stage": 2,
    "currentValue": 5,
    "nextThreshold": 10,
    "imageUrl": "/achievements/evolution/clutch-hitter-stage-2.png",
    "tooltipLabel": "클러치 히터 · 2단계"
  }
}
```

단계 상승 애니메이션은 사용자의 reduced-motion 설정을 존중한다. 이벤트는 이미지 크기나 DOM transform을 지시하지 않는다.

## 13. 관리자 이벤트

`admin:operations`는 admin 전용이다.

| Event | UI |
|---|---|
| `admin.report.created` | 신고 대기 수/큐 상단 추가 |
| `admin.report.updated` | 담당/상태/중복 수 갱신 |
| `admin.sanction.created` | 신고 행 완료 + 감사 로그 |
| `admin.service_health.changed` | 서비스 상태 카드/지연 표시 |
| `admin.announcement.changed` | 고정 공지 상태 |
| `admin.audit_export.ready` | 내보내기 다운로드 알림 |

```json
{
  "v": 1,
  "eventId": "evt_admin_health_01",
  "event": "admin.service_health.changed",
  "topic": "admin:operations",
  "sequence": 91,
  "occurredAt": "2026-08-26T12:36:31Z",
  "data": {
    "service": "MLB_FEED_LAD_SF",
    "status": "DELAYED",
    "delaySeconds": 18,
    "since": "2026-08-26T12:36:13Z",
    "message": "LAD vs SF 피드 지연"
  }
}
```

관리자가 신고를 처리하는 동안 다른 관리자가 먼저 처리하면 WebSocket 행을 읽기 전용 완료 상태로 바꾸고, REST 명령은 `REPORT_ALREADY_RESOLVED`를 반환한다.

## 14. 성능·백프레셔·레이트 리밋

### 14.1 서버 정책

- 연결당 최대 20 topics.
- 사용자당 브라우저 연결 5개, 초과 시 가장 오래된 idle 연결 종료.
- 이벤트 frame 최대 64KB. 큰 스냅샷은 REST URL 사용.
- `prediction.odds.updated`, `ranking.entry.updated`, `chat.presence.updated`는 coalescible이다.
- `market.closed`, `entry.settled`, `point.*`, `sanction.*`는 절대 drop하지 않는다.

### 14.2 명령 제한 초안

| 명령 | 제한 |
|---|---|
| `subscribe` | 10회/10초, 한 번에 20 topic 이하 |
| `resume` | 6회/분 |
| `chat.send` | 5회/10초, 30회/분 |
| `chat.typing.set` | 1회/초, 변경 없으면 무시 |
| `ping` | 최소 10초 간격 |

제한 시 `system.error`의 `RATE_LIMITED`와 `retryAfterMs`를 보내며 연결 자체는 유지한다. 악성 반복은 `4429`로 종료한다.

## 15. 보안·개인정보·운영

- topic 구독마다 서버가 사용자/역할/차단/제재를 검사한다. topic 문자열을 신뢰하지 않는다.
- 채팅/커뮤니티 메시지는 서버에서 길이, Unicode 정규화, 금칙어/스팸, 링크 정책을 검증한다.
- 클라이언트가 보내는 `tier`, `pollChoice`, `userId`, `point`는 신뢰하지 않는다. 서버가 세션/DB에서 채운다.
- 메시지 본문은 HTML이 아닌 plain text다. 링크 자동 변환은 안전한 renderer가 수행한다.
- 운영 삭제 이벤트는 원문을 일반 사용자에게 보내지 않는다.
- 신고/제재/감사 이벤트는 민감 정보 최소화와 관리자 role을 적용한다.
- 모든 관리자 이벤트 구독과 조치는 감사 로그에 connectionId/requestId를 남긴다.

## 16. UI별 구독 수명

| 경로/상태 | 구독 | 해제 시점 |
|---|---|---|
| 공통 인증 셸 | `user:{me}:private` | 로그아웃/탭 종료 |
| `/live` | `game:{id}`, `game:{id}:markets`, `game:{id}:chat` | 경기 변경/경로 이탈 |
| 예측 모달 | 기존 markets topic 재사용 | 모달만 닫을 때는 유지 |
| 이전 질문 모달 | 소켓 추가 없음 | REST 기록 사용 |
| `/predictions` | `user:{me}:private` | 경로 이탈 후 공통 셸이 유지하면 계속 |
| `/community` 목록 | `community:feed:{scope}` | scope/경로 변경 |
| 스레드 상세 | `post:{postId}` | 목록 복귀 |
| `/rankings` | `ranking:{scope}:{contextId}` | 탭/경기/경로 변경 |
| 사용자 프로필 모달 | `user:{id}:profile` 선택 | 모달 닫기 |
| `/mypage/achievements` | `user:{me}:private` | 공통 유지 |
| `/admin` | `admin:operations` | 경로 이탈/권한 상실 |

라우트 전환 시 unsubscribe ACK를 기다릴 필요는 없지만 이후 도착한 이전 topic 이벤트는 구독 generation이 다르면 UI에 적용하지 않는다.

## 17. 호버·포커스와 WebSocket의 관계

호버 때문에 새로운 WebSocket topic을 만들지 않는다.

| UI | 데이터 원천 | 실시간 처리 |
|---|---|---|
| 예측 양쪽 hover 네온 | 현재 마켓 상태 + 로컬 CSS | target 비율만 이벤트로 갱신 |
| 업적 단계/전시 배지 tooltip | REST 카탈로그 | 단계 상승 이벤트가 tooltipLabel 갱신 |
| 사용자 아바타/이름 hover | REST preview | 프로필 모달을 오래 열 때만 public topic 선택 |
| 랭킹 행 hover | 현재 RankingEntry | 순위 이벤트가 행 데이터 갱신 |
| 수비 마커 hover/click | GameSnapshot.defense | defense.updated가 좌표/선수 갱신 |
| 공감/알림/탭 hover | CSS | 지표/읽음 상태만 이벤트로 갱신 |

포커스와 hover는 같은 정보를 제공해야 하며, touch 환경에서는 클릭/탭으로 접근 가능해야 한다.

## 18. 클라이언트 상태 적용 순서

1. REST 스냅샷을 받고 각 리소스 `version`을 저장한다.
2. WebSocket을 구독하고 `snapshot` 또는 `latestSequence`를 받는다.
3. 이벤트 `resourceVersion <= currentVersion`이면 무시한다.
4. 이벤트를 정규화 store에 적용한다.
5. 파생 UI(현재 active market, expected payout, 참여 완료 카드)를 다시 계산한다.
6. 시각 효과는 환경 설정과 reduced-motion을 확인한 후 실행한다.
7. sequence gap이면 해당 topic만 정지하고 재동기화한다. 다른 topic은 계속 처리한다.

## 19. 관측성

클라이언트 로그/메트릭:

- 연결 성공률, 인증 실패율, reconnect 횟수
- topic 구독/거절 수
- 마지막 이벤트 지연(`now - occurredAt`)
- sequence gap/resync 횟수
- chat ACK 지연과 created 지연
- REST 참여 성공부터 `entry.accepted` 이벤트까지 지연
- 이벤트 중복률/coalesce 수
- 클라이언트 적용 실패 eventId

서버 로그는 `connectionId`, `userId`, `requestId/correlationId`, `topic`, `eventId`, `sequence`를 연결하되 메시지 본문/티켓/토큰은 평문 기록하지 않는다.

## 20. 계약 테스트 체크리스트

### 연결/재개

- [ ] 만료/재사용 티켓 거부
- [ ] 공개/비공개 topic 권한
- [ ] sequence gap 후 REST resync
- [ ] 10분 이내 resume 재전송과 중복 제거
- [ ] heartbeat timeout/reconnect

### 경기/예측

- [ ] 점수·상황·수비·최근 투구의 version 순서
- [ ] 데이터 지연 중 참여 REST 거절과 UI 안내
- [ ] 마감 이벤트와 동시 참여 경쟁 조건
- [ ] 비율 이벤트 coalesce 후 최종 값 일치
- [ ] 모션 on/off/reduced-motion에서 동일 최종 데이터
- [ ] 이미 참여한 마켓의 읽기 전용 동기화
- [ ] voided 마켓의 환급 원장/잔액/알림 순서

### 채팅/커뮤니티

- [ ] `clientMessageId` 재전송 중복 방지
- [ ] 120자/금칙어/제재 사용자 거부
- [ ] 과거 스크롤 중 새 메시지 강제 스크롤 방지
- [ ] 차단 사용자 콘텐츠 필터
- [ ] 댓글 연결선용 `parentId/rootId` 정합성
- [ ] optimistic 공감 실패 rollback

### 사용자/운영

- [ ] 포인트 balance와 ledger의 원자성
- [ ] 티어 승급과 업적 단계 이벤트 순서
- [ ] 전시 3칸의 다중 기기 동기화
- [ ] 알림 설정별 생성/푸시 정책
- [ ] 신고 동시 처리 충돌
- [ ] 관리자 권한 상실 시 즉시 구독 종료

## 21. 확정이 필요한 초안 항목

1. 게스트 WebSocket 연결을 허용할지, 공개 데이터는 SSE/CDN으로 분리할지.
2. resume 보관 범위(현재 제안 10분/5,000 events).
3. odds 이벤트 최대 빈도와 집계 방식.
4. 채팅 typing/presence를 MVP에 포함할지.
5. 차단 사용자의 과거 채팅/댓글을 완전히 숨길지 placeholder를 보일지.
6. 알림 설정이 인앱 생성까지 막는지, OS push만 막는지.
7. 랭킹 이벤트를 실시간으로 계속 갱신할지 일정 주기 batch로 제공할지.
8. 운영 이벤트의 별도 WebSocket gateway/네트워크 분리가 필요한지.

이 항목 확정 후 AsyncAPI 3.x 문서와 event schema registry, replay fixture, consumer contract test로 승격한다.
