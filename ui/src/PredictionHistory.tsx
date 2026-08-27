import { useMemo, useState, type CSSProperties } from 'react'
import { CalendarCheck, Check, Gift, History } from 'lucide-react'

export type PredictionSide = 'yes' | 'no'

export type PredictionHistoryItem = {
  id: string | number
  time: string
  inning: string
  question: string
  yes: number
  choice: PredictionSide | null
  answer: PredictionSide
  amount?: number
  delta?: number
  competition?: string
  match?: string
  order?: number
}

export type ActivityHistoryItem = {
  id: string | number
  time: string
  dateLabel: string
  title: string
  detail: string
  competition: string
  delta: number
  kind: 'attendance' | 'reward'
  order: number
}

export function PredictionHistoryContent({
  items,
  activityItems = [],
  summaryLabel = '예측 기록 요약',
  showFilters = false,
}: {
  items: PredictionHistoryItem[]
  activityItems?: ActivityHistoryItem[]
  summaryLabel?: string
  showFilters?: boolean
}) {
  const [filter, setFilter] = useState<'all' | 'prediction' | 'bonus'>('all')
  const participations = items.filter((item) => item.choice !== null)
  const wins = participations.filter((item) => item.choice === item.answer).length
  const pointDelta = participations.reduce((sum, item) => sum + (item.delta ?? 0), 0) + activityItems.reduce((sum, item) => sum + item.delta, 0)
  const timelineItems = useMemo(() => [
    ...items.map((item, index) => ({ type: 'prediction' as const, order: item.order ?? 1000 - index, item })),
    ...activityItems.map((item) => ({ type: 'bonus' as const, order: item.order, item })),
  ].filter((entry) => filter === 'all' || entry.type === filter).sort((a, b) => b.order - a.order), [activityItems, filter, items])

  return <>
    <section className="prediction-history-summary" aria-label={summaryLabel}>
      <div className="history-summary-primary">
        <small>참여</small>
        <strong>{participations.length}<em>회</em></strong>
      </div>
      <dl className="history-summary-details">
        <div><dt>적중</dt><dd>{wins}회</dd></div>
        <div><dt>포인트</dt><dd className={pointDelta >= 0 ? 'positive' : 'negative'}>{pointDelta >= 0 ? '+' : ''}{pointDelta.toLocaleString()}P</dd></div>
      </dl>
    </section>

    {showFilters && <div className="activity-history-toolbar">
      <div className="activity-history-filters" role="group" aria-label="활동 기록 종류">
        {([['all', '전체'], ['prediction', '예측'], ['bonus', '보너스']] as const).map(([value, label]) => <button type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{label}</button>)}
      </div>
      <span>{timelineItems.length}건</span>
    </div>}

    {timelineItems.length ? <ol className="prediction-history-timeline activity-history-timeline">
      {timelineItems.map((entry) => {
        if (entry.type === 'bonus') {
          const item = entry.item
          const Icon = item.kind === 'attendance' ? CalendarCheck : Gift
          return <li className={`bonus ${item.kind}`} key={item.id}>
            <div className="history-time"><time>{item.time}</time><span>{item.dateLabel}</span></div>
            <span className="history-node" aria-hidden="true"><Icon size={10} strokeWidth={2.4} /></span>
            <article className="history-bonus-entry">
              <header><span>{item.kind === 'attendance' ? '출석 보너스' : '이벤트 보상'}</span><em>{item.competition}</em></header>
              <h3>{item.title}</h3>
              <footer><span>{item.detail}</span><strong className={item.delta >= 0 ? 'positive' : 'negative'}>{item.delta >= 0 ? '+' : ''}{item.delta.toLocaleString()}P</strong></footer>
            </article>
          </li>
        }

        const item = entry.item
        const participated = item.choice !== null
        const won = participated && item.choice === item.answer
        const resultClass = !participated ? 'missed' : won ? 'won' : 'lost'

        return <li className={resultClass} key={item.id}>
          <div className="history-time"><time>{item.time}</time><span>{item.inning}</span></div>
          <span className="history-node" aria-hidden="true" />
          <article>
            <header><span>{participated ? won ? '적중' : '미적중' : '미참여'}</span>{item.competition && <em>{item.competition}</em>}</header>
            <h3>{item.question}</h3>
            <div className="history-vote-result" style={{ '--history-yes': `${item.yes}%` } as CSSProperties} aria-label={`최종 YES ${item.yes}퍼센트, NO ${100 - item.yes}퍼센트, 정답 ${item.answer.toUpperCase()}`}>
              <span className={item.answer === 'yes' ? 'answer' : ''}><span className="history-answer-label">YES {item.answer === 'yes' && <Check size={11} strokeWidth={3} aria-hidden="true" />}</span><b>{item.yes}%</b></span>
              <span className={item.answer === 'no' ? 'answer' : ''}><span className="history-answer-label">NO {item.answer === 'no' && <Check size={11} strokeWidth={3} aria-hidden="true" />}</span><b>{100 - item.yes}%</b></span>
            </div>
            <footer>
              {participated ? <>
                <span>내 선택 <b className={`history-user-choice ${item.choice}`}>{item.choice?.toUpperCase()}</b></span>
                <span>{item.amount?.toLocaleString()}P 참여</span>
                {item.match && <span className="history-match">{item.match}</span>}
                <strong className={won ? 'positive' : 'negative'}>{(item.delta ?? 0) >= 0 ? '+' : ''}{item.delta?.toLocaleString()}P</strong>
              </> : <><span>이 질문에는 참여하지 않았어요.</span>{item.match && <span className="history-match">{item.match}</span>}</>}
            </footer>
          </article>
        </li>
      })}
    </ol> : <div className="prediction-history-empty"><History size={22} /><strong>조건에 맞는 활동이 없습니다.</strong><span>다른 기록 종류를 선택해보세요.</span></div>}
  </>
}
