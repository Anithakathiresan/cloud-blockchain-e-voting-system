// Signed-in home screens: the student dashboard (what do I need to do?), the
// admin dashboard (what needs attention?) and the profile page.

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Blocks,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FilePen,
  FileText,
  GraduationCap,
  IdCard,
  Lock,
  Mail,
  Megaphone,
  Pause,
  Phone,
  Play,
  Plus,
  Receipt,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
  Vote,
  X,
  XCircle,
} from 'lucide-react'
import { useApp } from '../context'
import { academicLine, departmentLabel, yearLabel } from '../college'
import { compactHash } from '../chain'
import {
  IST_ZONE,
  countdownParts,
  electorateOf,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPeriod,
  formatTime,
  istHour,
  percentOf,
  relativeTime,
  scopeLabel,
} from '../elections'
import { countText, dateLocale, fill } from '../locale'
import { CandidateCard, PositionResults } from '../components/election'
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  KeyValue,
  ProgressBar,
  ProgressSteps,
  StatCard,
  StatusBadge,
} from '../components/ui'
import { RejectCandidateModal } from './admin/CandidateManagement'

function greetingFor(t) {
  const hour = istHour()
  if (hour < 12) return t.uiGoodMorning
  if (hour < 17) return t.uiGoodAfternoon
  return t.uiGoodEvening
}

function todayLabel(date = new Date()) {
  return date.toLocaleDateString(dateLocale(), { timeZone: IST_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Colour and icon for an activity-log line, read from its wording.
function activityStyle(text) {
  if (text.startsWith('Ballot sealed')) return { tone: 'green', icon: <Vote size={14} /> }
  if (/^(Nomination|Candidate updated)/.test(text)) return { tone: 'amber', icon: <UserPlus size={14} /> }
  if (/^Candidates? verified/.test(text)) return { tone: 'violet', icon: <Check size={14} /> }
  if (/^Candidate rejected/.test(text)) return { tone: 'rose', icon: <XCircle size={14} /> }
  if (/^Election (published|updated)/.test(text)) return { tone: 'blue', icon: <CalendarDays size={14} /> }
  if (/^Election closed/.test(text)) return { tone: 'slate', icon: <Lock size={14} /> }
  if (/^(Draft|Election created)/.test(text)) return { tone: 'amber', icon: <FilePen size={14} /> }
  if (/^Notice/.test(text)) return { tone: 'sky', icon: <Megaphone size={14} /> }
  return { tone: 'teal', icon: <FileText size={14} /> }
}

function byOpenThenStart(state) {
  const order = { open: 0, upcoming: 1, closed: 2, draft: 3 }
  return (a, b) =>
    order[state(a).status] - order[state(b).status] ||
    (state(a).status === 'open' ? Date.parse(a.endsAt) - Date.parse(b.endsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt))
}

// ------------------------------------------------------------ shared ---

// A clock that re-renders its owner once a second.
function useSecondClock() {
  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return clock
}

const pad2 = (value) => String(value).padStart(2, '0')

function shortCountdown(t, ms) {
  const { days, hours, minutes, seconds } = countdownParts(ms)
  const time = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  return days ? `${countText(t, 'dashCountdownDaysShort', days)} ${time}` : time
}

// The live election closing soonest, or else the next one to open, counted
// down to the second. Other open or upcoming elections are listed below it.
export function ElectionCountdown({ elections }) {
  const { t, electionState, navigate, isAdmin } = useApp()
  const clock = useSecondClock()

  const statusOf = (election) => electionState(election).status
  const live = elections
    .filter((election) => statusOf(election) === 'open')
    .sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))
  const soon = elections
    .filter((election) => statusOf(election) === 'upcoming')
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const [main, ...rest] = [...live, ...soon]
  if (!main) return null

  const state = electionState(main)
  const isLive = state.status === 'open'
  const target = Date.parse(isLive ? main.endsAt : main.startsAt)
  const label = isLive ? t.dashCountdownClosesIn : t.dashCountdownOpensIn
  const parts = countdownParts(target - clock)
  const units = [
    { value: parts.days, label: t.dashCountdownDays },
    { value: parts.hours, label: t.dashCountdownHours },
    { value: parts.minutes, label: t.dashCountdownMinutes },
    { value: parts.seconds, label: t.dashCountdownSeconds },
  ]
  const canVote = !isAdmin && isLive && state.eligible && !state.voted

  return (
    <section className={`countdown ${isLive ? 'countdown-live' : 'countdown-soon'}`} aria-labelledby="countdown-title">
      <div className="countdown-main">
        <div className="countdown-info">
          <span className="countdown-flag">
            {isLive ? <span className="live-dot" aria-hidden="true" /> : <CalendarClock size={14} aria-hidden="true" />}
            {isLive ? t.dashCountdownLive : t.dashCountdownUpcoming}
          </span>
          <h2 id="countdown-title">{main.title}</h2>
          <dl className="countdown-times">
            <div>
              <dt>{t.dashCountdownStarts}</dt>
              <dd>{formatDateTime(main.startsAt)}</dd>
            </div>
            <div>
              <dt>{t.dashCountdownEnds}</dt>
              <dd>{formatDateTime(main.endsAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="countdown-clock">
          <p className="countdown-label">{label}</p>
          <div className="countdown-digits" role="timer" aria-label={`${label} ${shortCountdown(t, target - clock)}`}>
            {units.map((unit, index) => (
              <Fragment key={unit.label}>
                {index > 0 && (
                  <span className="countdown-sep" aria-hidden="true">
                    :
                  </span>
                )}
                <span className="countdown-unit" aria-hidden="true">
                  <span className="countdown-num">{pad2(unit.value)}</span>
                  <span className="countdown-unit-label">{unit.label}</span>
                </span>
              </Fragment>
            ))}
          </div>
          <div className="countdown-actions">
            {canVote ? (
              <button type="button" className="btn btn-primary" onClick={() => navigate('vote', main.id)}>
                <Vote size={17} aria-hidden="true" /> {t.dashCountdownVoteNow}
              </button>
            ) : (
              <>
                {!isAdmin && state.voted && (
                  <span className="countdown-voted">
                    <CheckCircle2 size={15} aria-hidden="true" /> {t.dashCountdownVoted}
                  </span>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => navigate('election', main.id)}>
                  {t.dashCountdownView} <ArrowRight size={15} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="countdown-more">
          <p className="countdown-more-title">{t.dashCountdownAlso}</p>
          <ul>
            {rest.slice(0, 3).map((election) => {
              const open = statusOf(election) === 'open'
              const target = Date.parse(open ? election.endsAt : election.startsAt)
              return (
                <li key={election.id}>
                  <button type="button" onClick={() => navigate('election', election.id)}>
                    <span className={`countdown-dot ${open ? 'is-open' : 'is-soon'}`} aria-hidden="true" />
                    <span className="countdown-more-name">{election.title}</span>
                    <span className="countdown-more-when">{open ? t.dashCountdownClosesIn : t.dashCountdownOpensIn}</span>
                    <span className="countdown-more-time">{shortCountdown(t, target - clock)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="countdown-zone">{t.dashCountdownIst}</p>
    </section>
  )
}

// "What's New": running elections (then upcoming ones) scrolling right to
// left. Each item opens its election. Hovering or focusing pauses it; the
// button stops it.
const TICKER_SPEED = 70 // pixels per second

export function NewsTicker({ elections }) {
  const { t, electionState, navigate } = useApp()
  const [paused, setPaused] = useState(false)
  const [duration, setDuration] = useState(40)
  const groupRef = useRef(null)

  const items = [
    ...elections
      .filter((election) => electionState(election).status === 'open')
      .sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))
      .map((election) => ({
        id: `open-${election.id}`,
        tag: t.dashTickerLive,
        tone: 'live',
        text: fill(t.dashTickerOpen, { title: election.title, date: formatDateTime(election.endsAt) }),
        go: () => navigate('election', election.id),
      })),
    ...elections
      .filter((election) => electionState(election).status === 'upcoming')
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .slice(0, 3)
      .map((election) => ({
        id: `soon-${election.id}`,
        tag: t.dashTickerUpcoming,
        tone: 'soon',
        text: fill(t.dashTickerSoon, { title: election.title, date: formatDateTime(election.startsAt) }),
        go: () => navigate('election', election.id),
      })),
  ]
  const signature = items.map((item) => item.text).join('|')

  // Keep the speed steady however long the list is.
  useLayoutEffect(() => {
    const width = groupRef.current?.offsetWidth
    if (width) setDuration(Math.max(20, Math.round(width / TICKER_SPEED)))
  }, [signature])

  if (items.length === 0) return null

  const group = (copy) => (
    <ul className="ticker-group" ref={copy ? null : groupRef} aria-hidden={copy || undefined}>
      {items.map((item) => (
        <li key={item.id} className="ticker-item">
          <button type="button" onClick={item.go} tabIndex={copy ? -1 : undefined}>
            <span className="ticker-text">{item.text}</span>
            <span className={`ticker-tag ticker-tag-${item.tone}`}>{item.tag}</span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <section className={`ticker${paused ? ' is-paused' : ''}`} aria-label={t.dashTickerTitle}>
      <p className="ticker-label">{t.dashTickerTitle}</p>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
          {group(false)}
          {group(true)}
        </div>
      </div>
      <button
        type="button"
        className="ticker-toggle"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? t.dashTickerPlay : t.dashTickerPause}
        title={paused ? t.dashTickerPlay : t.dashTickerPause}
      >
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      </button>
    </section>
  )
}

export function LedgerCard() {
  const { t, ledger, chain, navigate } = useApp()
  const recent = chain.slice(-4).reverse()
  const label =
    ledger.status === 'valid'
      ? t.dashLedgerVerified
      : ledger.status === 'broken'
        ? fill(t.dashLedgerBroken, { n: ledger.brokenAt })
        : t.dashLedgerChecking

  return (
    <Card
      title={t.dashLedgerStatus}
      subtitle={countText(t, 'dashBlocksSealed', chain.length)}
      icon={<Blocks size={18} />}
      tone="teal"
      action={
        <button type="button" className="link-btn" onClick={() => navigate('ledger')}>
          {t.dashViewLedger} <ArrowRight size={14} aria-hidden="true" />
        </button>
      }
    >
      <p className={`ledger-line ledger-${ledger.status}`}>
        {ledger.status === 'valid' ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : (
          <AlertTriangle size={16} aria-hidden="true" />
        )}
        {label}
      </p>
      <p className="list-caption">{t.dashRecentBlocks}</p>
      <ul className="block-list">
        {recent.map((block) => (
          <li key={block.hash}>
            <span className="block-index">#{block.index}</span>
            <span className="mono block-hash" title={block.hash}>
              {compactHash(block.hash)}
            </span>
            {ledger.status === 'valid' ? (
              <Badge tone="success">{t.dashVerified}</Badge>
            ) : (
              <Badge tone="neutral" icon={null}>
                {block.type === 'genesis' ? t.dashGenesis : t.dashBallot}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function NoticesCard({ limit = 3 }) {
  const { t, notices, navigate, now } = useApp()
  return (
    <Card
      title={t.uiNotices}
      icon={<Megaphone size={18} />}
      tone="amber"
      action={
        <button type="button" className="link-btn" onClick={() => navigate('notices')}>
          {t.dashViewAllNotices} <ArrowRight size={14} aria-hidden="true" />
        </button>
      }
    >
      {notices.length === 0 ? (
        <EmptyState compact title={t.dashNoNotices} copy={t.dashNoNoticesCopy} />
      ) : (
        <ul className="notice-list">
          {notices.slice(0, limit).map((notice) => (
            <li key={notice.id}>
              <span className="notice-icon tone-amber" aria-hidden="true">
                <Megaphone size={16} />
              </span>
              <span>
                <strong>{notice.title}</strong>
                <small>{relativeTime(notice.createdAt, now)}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ----------------------------------------------------------- student ---

// One election as a list row: status, title, key facts and the next action.
function ElectionRow({ election }) {
  const { t, navigate, electionState } = useApp()
  const state = electionState(election)
  const canVote = state.status === 'open' && state.eligible && !state.voted
  const positions = election.positions.length

  return (
    <li className={`election-row election-${state.status}`}>
      <div className="election-row-main">
        <div className="election-row-badges">
          <StatusBadge status={state.status} />
          {state.voted && <Badge tone="success">{t.dashVoted}</Badge>}
        </div>
        <h3 className="election-row-title">{election.title}</h3>
        <p className="election-row-facts">
          <span>
            <CalendarDays size={14} aria-hidden="true" /> {formatPeriod(election)}
          </span>
          <span>
            <Building2 size={14} aria-hidden="true" /> {scopeLabel(election)}
          </span>
          <span>
            <UsersRound size={14} aria-hidden="true" /> {countText(t, 'dashPositions', positions)}
          </span>
        </p>
      </div>
      <div className="election-row-actions">
        {canVote && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('vote', election.id)}>
            <Vote size={15} aria-hidden="true" /> {t.dashVoteNow}
          </button>
        )}
        {state.voted && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('receipt', election.id)}>
            {t.dashViewReceipt}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
          {t.dashDetails} <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

export function StudentDashboard() {
  const { t, voter, elections, electionState, tallies, navigate, receipts } = useApp()

  const mine = elections.filter((election) => {
    const state = electionState(election)
    return state.eligible && state.status !== 'draft'
  })
  const active = mine.filter((election) => electionState(election).status === 'open')
  const upcoming = mine.filter((election) => electionState(election).status === 'upcoming')
  const toVote = active.filter((election) => !electionState(election).voted)
  const votedCount = mine.filter((election) => electionState(election).voted).length
  const featured = [...active, ...upcoming].sort(byOpenThenStart(electionState)).slice(0, 4)

  // The ballot journey follows the election most in need of attention.
  const focus =
    toVote.sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))[0] ||
    active.find((election) => electionState(election).voted) ||
    upcoming[0] ||
    null
  const focusState = focus ? electionState(focus) : null

  const journey = [
    {
      label: t.dashStepRegistered,
      note: voter.registeredAt ? fill(t.dashRegisteredOn, { date: voter.registeredAt.split(',')[0] }) : null,
      state: 'done',
    },
    {
      label: t.dashStepIdentity,
      note: voter.status === 'Verified' ? null : t.dashAwaitingVerification,
      state: voter.status === 'Verified' ? 'done' : 'current',
    },
    {
      label: t.dashStepBallot,
      note: !focus
        ? t.dashNoBallotOpen
        : focusState.status === 'upcoming'
          ? fill(t.dashOpensOn, { date: formatDate(focus.startsAt) })
          : focusState.voted
            ? null
            : fill(t.dashClosesOn, { date: formatDate(focus.endsAt) }),
      state: focusState?.status === 'open' ? (focusState.voted ? 'done' : 'current') : focus ? 'current' : 'todo',
    },
    { label: t.dashStepVoteCast, state: focusState?.voted ? 'done' : 'todo' },
    { label: t.dashStepReceipt, note: focusState?.voted ? t.dashReceiptInReceipts : null, state: focusState?.voted ? 'done' : 'todo' },
  ]
  if (voter.status !== 'Verified') journey.slice(2).forEach((step) => (step.state = 'todo'))

  // Live results: a visible result from the student's own elections first.
  const withResults = [...mine]
    .filter((election) => electionState(election).resultsVisible)
    .sort(byOpenThenStart(electionState))
  const preview = withResults[0]
  const hidden = active.find((election) => !electionState(election).resultsVisible)
  // The election title is bold, so the sentence is split around it.
  const [hiddenBefore, hiddenAfter = ''] = t.dashResultsHidden.split('{title}')

  return (
    <div className="page-stack dash-flat">
      <section className="welcome">
        <div className="welcome-text">
          <h2>
            {greetingFor(t)}, {voter.name.split(' ')[0]} <span aria-hidden="true">👋</span>
          </h2>
          <p>
            {toVote.length > 0 ? countText(t, 'dashBallotsWaiting', toVote.length) : t.dashAllCaughtUp}
          </p>
          <div className="welcome-meta">
            <span className="welcome-chip">
              <GraduationCap size={14} aria-hidden="true" />
              {academicLine(voter.department, voter.year) || t.dashNoDeptYear}
            </span>
            <span className="welcome-chip">
              <CalendarDays size={14} aria-hidden="true" /> {todayLabel()}
            </span>
            <span className="welcome-chip">
              <ShieldCheck size={14} aria-hidden="true" /> {voter.status === 'Verified' ? t.dashIdentityVerified : t.dashVerificationPending}
            </span>
          </div>
        </div>
        <div className="welcome-actions">
          {toVote.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('vote', toVote.length === 1 ? toVote[0].id : null)}>
              <Vote size={17} aria-hidden="true" /> {toVote.length === 1 ? t.dashCastYourVote : fill(t.dashCastYourVotes, { n: toVote.length })}
            </button>
          )}
          {votedCount > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('receipts')}>
              <Receipt size={17} aria-hidden="true" /> {t.uiMyReceipts}
            </button>
          )}
        </div>
      </section>

      <NewsTicker elections={mine} />

      <ElectionCountdown elections={mine} />

      <div className="stat-grid">
        <StatCard icon={<ClipboardCheck size={20} />} label={t.dashEligibleElections} value={mine.length} tone="blue" hint={t.dashEligibleHint} onClick={() => navigate('elections')} />
        <StatCard icon={<Vote size={20} />} label={t.dashActiveElections} value={active.length} tone="green" hint={toVote.length ? countText(t, 'dashAwaitingVote', toVote.length) : active.length ? t.dashAllVoted : t.dashNoneOpen} onClick={() => navigate('vote')} />
        <StatCard icon={<CheckCircle2 size={20} />} label={t.dashVotesCast} value={votedCount} tone="violet" hint={votedCount ? countText(t, 'dashReceiptsSaved', votedCount) : t.dashNoBallotsYet} onClick={() => navigate('receipts')} />
        <StatCard icon={<CalendarClock size={20} />} label={t.dashUpcomingElections} value={upcoming.length} tone="amber" hint={upcoming[0] ? fill(t.dashNextOpens, { date: formatDate(upcoming[0].startsAt) }) : t.dashNothingScheduled} onClick={() => navigate('elections')} />
      </div>

      {toVote.length > 0 && (
        <Alert tone="info" title={countText(t, 'dashWaitingTitle', toVote.length)}>
          {toVote.map((election) => fill(t.dashClosesParen, { title: election.title, date: formatDate(election.endsAt) })).join(' · ')}
        </Alert>
      )}

      <Card
        title={t.dashBallotProgress}
        subtitle={focus ? focus.title : t.dashNoActiveBallot}
        icon={<ShieldCheck size={18} />}
        tone="green"
        action={
          focus && focusState.status === 'open' && !focusState.voted ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('vote', focus.id)}>
              {t.dashContinueBallot} <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : focus && focusState.voted && receipts[focus.id] ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('receipt', focus.id)}>
              {t.dashViewReceipt}
            </button>
          ) : null
        }
      >
        <ProgressSteps steps={journey} horizontal />
      </Card>

      <Card
        title={t.dashYourElections}
        subtitle={t.dashYourElectionsSub}
        icon={<CalendarDays size={18} />}
        tone="blue"
        action={
          <button type="button" className="link-btn" onClick={() => navigate('elections')}>
            {t.dashViewAll} <ArrowRight size={14} aria-hidden="true" />
          </button>
        }
      >
        {featured.length === 0 ? (
          <EmptyState title={t.dashNoActiveElections} copy={t.dashNoActiveElectionsCopy}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('elections')}>
              {t.dashViewUpcoming}
            </button>
          </EmptyState>
        ) : (
          <ul className="election-rows">
            {featured.map((election) => (
              <ElectionRow key={election.id} election={election} />
            ))}
          </ul>
        )}
      </Card>

      <Card
        title={t.dashLiveResults}
        subtitle={t.dashLiveResultsSub}
        icon={<BarChart3 size={18} />}
        tone="violet"
        action={
          <button type="button" className="link-btn" onClick={() => navigate('results', preview?.id)}>
            {t.dashViewFullResults} <ArrowRight size={14} aria-hidden="true" />
          </button>
        }
      >
        {preview ? (
          <div className="preview-results">
            <p className="preview-title">
              <strong>{preview.title}</strong>
              <StatusBadge status={electionState(preview).status} />
            </p>
            {tallies[preview.id].positions.slice(0, 1).map((result) => (
              <div key={result.position.id}>
                <p className="list-caption">{result.position.title}</p>
                <PositionResults result={result} method={preview.method} compact limit={3} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<BarChart3 size={20} />} title={t.dashNoResults} copy={t.dashNoResultsCopy} />
        )}
        {hidden && (
          <p className="hidden-note">
            <ShieldCheck size={15} aria-hidden="true" /> {hiddenBefore}
            <strong>{hidden.title}</strong>
            {fill(hiddenAfter, { date: formatDate(hidden.endsAt) })}
          </p>
        )}
      </Card>

      <NoticesCard />
      <LedgerCard />
    </div>
  )
}

// ------------------------------------------------------------- admin ---

export function AdminDashboard() {
  const { t, voter, elections, electionState, tallies, candidates, voters, chain, registry, navigate, now, admin, committee } =
    useApp()
  const [rejecting, setRejecting] = useState(null)

  const students = voters.filter((voter) => voter.role !== 'admin')
  const open = elections.filter((election) => electionState(election).status === 'open')
  const drafts = elections.filter((election) => electionState(election).status === 'draft')
  const verified = candidates.filter((entry) => entry.status === 'verified')
  const pending = candidates.filter((entry) => entry.status === 'pending')
  const published = elections.filter((election) => election.published)
  const totalVotes = published.reduce((sum, election) => sum + tallies[election.id].votesCast, 0)
  const closingToday = open.filter((election) => Date.parse(election.endsAt) - now < 24 * 60 * 60 * 1000)
  const electionTitle = (id) => elections.find((election) => election.id === id)?.title || t.dashUnknownElection
  const positionTitle = (entry) =>
    elections.find((election) => election.id === entry.electionId)?.positions.find((p) => p.id === entry.positionId)?.title

  const recentElections = [...elections].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5)

  const activity = useMemo(() => {
    const ballots = chain
      .filter((block) => block.type === 'ballot')
      .slice(-10)
      .map((block) => ({
        id: block.hash,
        at: block.timestamp,
        // `text` stays English so activityStyle can read it; `label` is shown.
        text: 'Ballot sealed',
        label: fill(t.dashBallotSealedIn, { n: block.index, title: electionTitle(block.electionId || 'general') }),
      }))
    return [...registry.activity, ...ballots].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8)
    // electionTitle only reads `elections` and `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, registry.activity, elections, t])

  const actions = [
    pending.length > 0 && {
      text: countText(t, 'dashNominationsAwaiting', pending.length),
      go: () => navigate('candidate-verification'),
      label: t.dashReview,
      tone: 'violet',
      icon: <ClipboardCheck size={17} />,
    },
    drafts.length > 0 && {
      text: countText(t, 'dashDraftsUnpublished', drafts.length),
      go: () => navigate('manage-elections'),
      label: t.dashOpen,
      tone: 'amber',
      icon: <FilePen size={17} />,
    },
    ...closingToday.map((election) => ({
      text: fill(t.dashClosesAt, { title: election.title, date: formatDate(election.endsAt), time: formatTime(election.endsAt) }),
      go: () => navigate('election', election.id),
      label: t.dashView,
      tone: 'rose',
      icon: <Clock3 size={17} />,
    })),
  ].filter(Boolean)

  return (
    <div className="page-stack dash-flat">
      <section className="welcome">
        <div className="welcome-text">
          <h2>
            {greetingFor(t)}, {voter.name} <span aria-hidden="true">👋</span>
          </h2>
          <p>
            {countText(t, 'dashOpenForVoting', open.length)}{' '}
            {actions.length ? countText(t, 'dashNeedsAttention', actions.length) : t.dashNothingNeedsAttention}
          </p>
          <div className="welcome-meta">
            <span className="welcome-chip">
              <ShieldCheck size={14} aria-hidden="true" /> {t.uiAdmin}
            </span>
            <span className="welcome-chip">
              <CalendarDays size={14} aria-hidden="true" /> {todayLabel()}
            </span>
            <span className="welcome-chip">
              <Blocks size={14} aria-hidden="true" /> {countText(t, 'dashLedgerBlocks', chain.length)}
            </span>
          </div>
        </div>
        <div className="welcome-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('election-new')}>
            <Plus size={17} aria-hidden="true" /> {t.dashCreateElection}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('notices')}>
            <Megaphone size={17} aria-hidden="true" /> {t.dashPostNotice}
          </button>
        </div>
      </section>

      <NewsTicker elections={published} />

      <ElectionCountdown elections={published} />

      <div className="stat-grid stat-grid-5">
        <StatCard icon={<UsersRound size={20} />} label={t.dashTotalStudents} value={formatNumber(students.length)} tone="blue" hint={t.dashRegisteredRoll} onClick={() => navigate('voters')} />
        <StatCard icon={<Vote size={20} />} label={t.dashActiveElections} value={open.length} tone="green" hint={fill(t.dashPublishedCount, { n: published.length })} onClick={() => navigate('manage-elections')} />
        <StatCard icon={<UserRound size={20} />} label={t.dashCandidates} value={candidates.length} tone="violet" hint={fill(t.dashVerifiedCount, { n: verified.length })} onClick={() => navigate('candidate-verification')} />
        <StatCard icon={<CheckCircle2 size={20} />} label={t.dashVotesCast} value={formatNumber(totalVotes)} tone="teal" hint={t.dashAcrossPublished} onClick={() => navigate('reports')} />
        <StatCard icon={<ClipboardCheck size={20} />} label={t.dashPendingReviews} value={pending.length} tone={pending.length ? 'amber' : 'green'} hint={pending.length ? t.dashNominationsToVerify : t.dashAllClear} onClick={() => navigate('candidate-verification')} />
      </div>

      {actions.length > 0 ? (
        <Card title={t.dashPendingActions} subtitle={t.dashPendingActionsSub} icon={<AlertTriangle size={18} />} tone="amber">
          <ul className="action-list">
            {actions.map((action) => (
              <li key={action.text}>
                <span className={`action-icon tone-${action.tone}`} aria-hidden="true">
                  {action.icon}
                </span>
                <span className="action-text">{action.text}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={action.go}>
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Alert tone="success" title={t.dashNoPendingActions}>
          {t.dashNoPendingActionsCopy}
        </Alert>
      )}

      <Card
        title={t.dashElectionActivity}
        subtitle={t.dashElectionActivitySub}
        icon={<BarChart3 size={18} />}
        tone="blue"
        flush
        action={
          <button type="button" className="link-btn" onClick={() => navigate('manage-elections')}>
            {t.dashManage} <ArrowRight size={14} aria-hidden="true" />
          </button>
        }
      >
        {open.length === 0 ? (
          <EmptyState compact title={t.dashNoOpenElections} copy={t.dashNoOpenElectionsCopy}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('election-new')}>
              {t.dashCreateElection}
            </button>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t.dashColElection}</th>
                  <th scope="col">{t.dashColScope}</th>
                  <th scope="col">{t.dashColCloses}</th>
                  <th scope="col" className="num">
                    {t.dashColVotes}
                  </th>
                  <th scope="col">{t.dashColTurnout}</th>
                  <th scope="col">
                    <span className="sr-only">{t.dashColActions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {open.map((election) => {
                  const cast = tallies[election.id].votesCast
                  const electorate = electorateOf(election, voters, committee)
                  const turnout = percentOf(cast, electorate)
                  return (
                    <tr key={election.id}>
                      <td data-label={t.dashColElection}>
                        <strong>{election.title}</strong>
                      </td>
                      <td data-label={t.dashColScope}>{scopeLabel(election)}</td>
                      <td data-label={t.dashColCloses}>{formatDate(election.endsAt)}</td>
                      <td data-label={t.dashColVotes} className="num">
                        {formatNumber(cast)}
                      </td>
                      <td data-label={t.dashColTurnout}>
                        <span className="turnout-cell">
                          <ProgressBar value={turnout} label={fill(t.dashTurnoutLabel, { n: turnout })} />
                          <small>{turnout}%</small>
                        </span>
                      </td>
                      <td className="actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
                          {t.dashView}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={t.dashCandidateVerification}
        subtitle={pending.length ? fill(t.dashPendingReview, { n: pending.length }) : t.dashNothingWaiting}
        icon={<ClipboardCheck size={18} />}
        tone="violet"
        action={
          <button type="button" className="link-btn" onClick={() => navigate('candidate-verification')}>
            {t.dashViewAll} <ArrowRight size={14} aria-hidden="true" />
          </button>
        }
      >
        {pending.length === 0 ? (
          <EmptyState compact icon={<Check size={20} />} title={t.dashAllReviewed} copy={t.dashAllReviewedCopy} />
        ) : (
          <ul className="review-list">
            {pending.slice(0, 4).map((entry) => (
              <li key={entry.id}>
                <Avatar name={entry.name} photo={entry.photo} size="sm" />
                <span className="review-text">
                  <strong>{entry.name}</strong>
                  <small title={`${positionTitle(entry)} · ${electionTitle(entry.electionId)}`}>
                    {positionTitle(entry)} · {electionTitle(entry.electionId)}
                  </small>
                </span>
                <span className="review-actions">
                  <button type="button" className="btn btn-success btn-sm" onClick={() => admin.setCandidateStatus(entry.id, 'verified')}>
                    <Check size={15} aria-hidden="true" /> {t.dashVerify}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejecting(entry)}>
                    <X size={15} aria-hidden="true" /> {t.dashReject}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t.dashRecentActivity} subtitle={t.dashRecentActivitySub} icon={<FileText size={18} />} tone="teal">
        <ul className="activity-list">
          {activity.slice(0, 5).map((entry) => {
            const style = activityStyle(entry.text)
            return (
              <li key={entry.id}>
                <span className={`activity-dot tone-${style.tone}`} aria-hidden="true">
                  {style.icon}
                </span>
                <span>
                  <span>{entry.label || entry.text}</span>
                  <small>{relativeTime(entry.at, now)}</small>
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card
        title={t.dashRecentElections}
        subtitle={t.dashRecentElectionsSub}
        icon={<CalendarDays size={18} />}
        tone="sky"
        flush
        action={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('election-new')}>
            {t.dashCreateElection}
          </button>
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t.dashColElection}</th>
                <th scope="col">{t.dashColStatus}</th>
                <th scope="col">{t.dashColPeriod}</th>
                <th scope="col" className="num">
                  {t.dashColVotes}
                </th>
                <th scope="col">
                  <span className="sr-only">{t.dashColActions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recentElections.map((election) => (
                <tr key={election.id}>
                  <td data-label={t.dashColElection}>
                    <strong>{election.title}</strong>
                    <small className="cell-sub">{scopeLabel(election)}</small>
                  </td>
                  <td data-label={t.dashColStatus}>
                    <StatusBadge status={electionState(election).status} />
                  </td>
                  <td data-label={t.dashColPeriod}>{formatPeriod(election)}</td>
                  <td data-label={t.dashColVotes} className="num">
                    {formatNumber(tallies[election.id].votesCast)}
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
                      {t.dashView}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {rejecting && (
        <RejectCandidateModal
          candidate={rejecting}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => {
            admin.setCandidateStatus(rejecting.id, 'rejected', reason)
            setRejecting(null)
          }}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------- profile ---

export function ProfilePage() {
  const { t, voter, isAdmin, elections, electionState, navigate, downloadCard, candidates } = useApp()
  const votedIn = elections.filter((election) => electionState(election).voted)
  const standing = candidates.filter((entry) => entry.name === voter.name && entry.department === voter.department)

  const rows = [
    { icon: <UserRound size={15} />, label: t.colName, value: voter.name },
    { icon: <IdCard size={15} />, label: isAdmin ? 'Username' : 'Register number', value: voter.voterId, mono: true },
    ...(isAdmin
      ? [{ icon: <ShieldCheck size={15} />, label: 'Role', value: t.uiAdmin }]
      : [
          { icon: <GraduationCap size={15} />, label: 'Department', value: departmentLabel(voter.department) || '—' },
          { icon: <CalendarDays size={15} />, label: 'Academic year', value: yearLabel(voter.year) || '—' },
          { icon: <CalendarDays size={15} />, label: t.dobLabel, value: voter.dob || '—' },
        ]),
    { icon: <Mail size={15} />, label: t.contactEmail, value: voter.email || t.notProvided },
    { icon: <Phone size={15} />, label: t.mobileLabel, value: voter.mobile || t.notProvided },
    { icon: <CalendarClock size={15} />, label: t.registeredOn, value: voter.registeredAt },
  ]

  return (
    <div className="page-stack narrow">
      <Card>
        <div className="profile-head">
          <Avatar name={voter.name} size="xl" />
          <div>
            <h2>{voter.name}</h2>
            <p className="muted">{isAdmin ? t.uiAdmin : academicLine(voter.department, voter.year)}</p>
            <div className="badge-row">
              <Badge tone={voter.status === 'Verified' ? 'success' : 'warning'}>{voter.status}</Badge>
              {!isAdmin && (
                <Badge tone="info" icon={<Vote size={13} aria-hidden="true" />}>
                  Voted in {votedIn.length} election{votedIn.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Account details">
        <KeyValue items={rows} />
        {!isAdmin && (
          <div className="card-foot-actions">
            <button type="button" className="btn btn-secondary" onClick={downloadCard}>
              <Download size={16} aria-hidden="true" /> {t.downloadEpic}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('receipts')}>
              <Receipt size={16} aria-hidden="true" /> {t.uiMyReceipts}
            </button>
          </div>
        )}
      </Card>

      {standing.length > 0 && (
        <Card title="Your candidacies">
          <div className="card-grid">
            {standing.map((entry) => (
              <CandidateCard key={entry.id} candidate={entry} showStatus />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
