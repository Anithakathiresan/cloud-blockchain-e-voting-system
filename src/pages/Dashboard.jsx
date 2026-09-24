// Signed-in home screens: the student dashboard (what do I need to do?), the
// admin dashboard (what needs attention?) and the profile page.

import { useMemo, useState } from 'react'
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
  Phone,
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
  electorateOf,
  formatDate,
  formatNumber,
  formatPeriod,
  percentOf,
  relativeTime,
  scopeLabel,
} from '../elections'
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

function greetingFor(t, date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return t.uiGoodMorning
  if (hour < 17) return t.uiGoodAfternoon
  return t.uiGoodEvening
}

function todayLabel(date = new Date()) {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
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

export function LedgerCard() {
  const { ledger, chain, navigate } = useApp()
  const recent = chain.slice(-4).reverse()
  const label =
    ledger.status === 'valid'
      ? 'Election records verified'
      : ledger.status === 'broken'
        ? `Tampering detected at block #${ledger.brokenAt}`
        : 'Verifying ledger…'

  return (
    <Card
      title="Ledger Status"
      subtitle={`${chain.length} block${chain.length === 1 ? '' : 's'} sealed`}
      icon={<Blocks size={18} />}
      tone="teal"
      action={
        <button type="button" className="link-btn" onClick={() => navigate('ledger')}>
          View Ledger <ArrowRight size={14} aria-hidden="true" />
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
      <p className="list-caption">Recent sealed blocks</p>
      <ul className="block-list">
        {recent.map((block) => (
          <li key={block.hash}>
            <span className="block-index">#{block.index}</span>
            <span className="mono block-hash" title={block.hash}>
              {compactHash(block.hash)}
            </span>
            {ledger.status === 'valid' ? (
              <Badge tone="success">Verified</Badge>
            ) : (
              <Badge tone="neutral" icon={null}>
                {block.type === 'genesis' ? 'Genesis' : 'Ballot'}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function NoticesCard({ limit = 3 }) {
  const { notices, navigate, now } = useApp()
  return (
    <Card
      title="Notices"
      icon={<Megaphone size={18} />}
      tone="amber"
      action={
        <button type="button" className="link-btn" onClick={() => navigate('notices')}>
          View All Notices <ArrowRight size={14} aria-hidden="true" />
        </button>
      }
    >
      {notices.length === 0 ? (
        <EmptyState compact title="No notices" copy="New announcements from the election committee will appear here." />
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
  const { navigate, electionState } = useApp()
  const state = electionState(election)
  const canVote = state.status === 'open' && state.eligible && !state.voted
  const positions = election.positions.length

  return (
    <li className={`election-row election-${state.status}`}>
      <div className="election-row-main">
        <div className="election-row-badges">
          <StatusBadge status={state.status} />
          {state.voted && <Badge tone="success">Voted</Badge>}
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
            <UsersRound size={14} aria-hidden="true" /> {positions} position{positions === 1 ? '' : 's'}
          </span>
        </p>
      </div>
      <div className="election-row-actions">
        {canVote && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('vote', election.id)}>
            <Vote size={15} aria-hidden="true" /> Vote now
          </button>
        )}
        {state.voted && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('receipt', election.id)}>
            View receipt
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
          Details <ArrowRight size={15} aria-hidden="true" />
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
    { label: 'Registered', note: voter.registeredAt ? `On ${voter.registeredAt.split(',')[0]}` : null, state: 'done' },
    {
      label: 'Identity Verified',
      note: voter.status === 'Verified' ? null : 'Awaiting verification by the election office',
      state: voter.status === 'Verified' ? 'done' : 'current',
    },
    {
      label: 'Ballot Available',
      note: !focus
        ? 'No ballot is open for you right now'
        : focusState.status === 'upcoming'
          ? `Opens ${formatDate(focus.startsAt)}`
          : focusState.voted
            ? null
            : `Voting closes ${formatDate(focus.endsAt)}`,
      state: focusState?.status === 'open' ? (focusState.voted ? 'done' : 'current') : focus ? 'current' : 'todo',
    },
    { label: 'Vote Cast', state: focusState?.voted ? 'done' : 'todo' },
    { label: 'Receipt', note: focusState?.voted ? 'Available in My Receipts' : null, state: focusState?.voted ? 'done' : 'todo' },
  ]
  if (voter.status !== 'Verified') journey.slice(2).forEach((step) => (step.state = 'todo'))

  // Live results: a visible result from the student's own elections first.
  const withResults = [...mine]
    .filter((election) => electionState(election).resultsVisible)
    .sort(byOpenThenStart(electionState))
  const preview = withResults[0]
  const hidden = active.find((election) => !electionState(election).resultsVisible)

  return (
    <div className="page-stack dash-flat">
      <section className="welcome">
        <div className="welcome-text">
          <h2>
            {greetingFor(t)}, {voter.name.split(' ')[0]} <span aria-hidden="true">👋</span>
          </h2>
          <p>
            {toVote.length > 0
              ? `You have ${toVote.length} ballot${toVote.length === 1 ? '' : 's'} waiting. Your vote is private and sealed on the ledger.`
              : 'You are all caught up. New ballots will appear here when voting opens.'}
          </p>
          <div className="welcome-meta">
            <span className="welcome-chip">
              <GraduationCap size={14} aria-hidden="true" />
              {academicLine(voter.department, voter.year) || 'Department and year not set'}
            </span>
            <span className="welcome-chip">
              <CalendarDays size={14} aria-hidden="true" /> {todayLabel()}
            </span>
            <span className="welcome-chip">
              <ShieldCheck size={14} aria-hidden="true" /> {voter.status === 'Verified' ? 'Identity verified' : 'Verification pending'}
            </span>
          </div>
        </div>
        <div className="welcome-actions">
          {toVote.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('vote', toVote.length === 1 ? toVote[0].id : null)}>
              <Vote size={17} aria-hidden="true" /> {toVote.length === 1 ? 'Cast your vote' : `Cast your votes (${toVote.length})`}
            </button>
          )}
          {votedCount > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('receipts')}>
              <Receipt size={17} aria-hidden="true" /> {t.uiMyReceipts}
            </button>
          )}
        </div>
      </section>

      <div className="stat-grid">
        <StatCard icon={<ClipboardCheck size={20} />} label="Eligible Elections" value={mine.length} tone="blue" hint="Open, upcoming and closed" onClick={() => navigate('elections')} />
        <StatCard icon={<Vote size={20} />} label="Active Elections" value={active.length} tone="green" hint={toVote.length ? `${toVote.length} awaiting your vote` : active.length ? 'All voted' : 'None open right now'} onClick={() => navigate('vote')} />
        <StatCard icon={<CheckCircle2 size={20} />} label="Votes Cast" value={votedCount} tone="violet" hint={votedCount ? `${votedCount} receipt${votedCount === 1 ? '' : 's'} saved` : 'No ballots cast yet'} onClick={() => navigate('receipts')} />
        <StatCard icon={<CalendarClock size={20} />} label="Upcoming Elections" value={upcoming.length} tone="amber" hint={upcoming[0] ? `Next opens ${formatDate(upcoming[0].startsAt)}` : 'Nothing scheduled'} onClick={() => navigate('elections')} />
      </div>

      {toVote.length > 0 && (
        <Alert tone="info" title={`${toVote.length} election${toVote.length === 1 ? ' is' : 's are'} waiting for your vote`}>
          {toVote.map((election) => `${election.title} (closes ${formatDate(election.endsAt)})`).join(' · ')}
        </Alert>
      )}

      <Card
        title="Ballot Progress"
        subtitle={focus ? focus.title : 'No active ballot'}
        icon={<ShieldCheck size={18} />}
        tone="green"
        action={
          focus && focusState.status === 'open' && !focusState.voted ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('vote', focus.id)}>
              Continue to ballot <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : focus && focusState.voted && receipts[focus.id] ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('receipt', focus.id)}>
              View receipt
            </button>
          ) : null
        }
      >
        <ProgressSteps steps={journey} horizontal />
      </Card>

      <Card
        title="Your Elections"
        subtitle="Open and upcoming elections you are eligible for"
        icon={<CalendarDays size={18} />}
        tone="blue"
        action={
          <button type="button" className="link-btn" onClick={() => navigate('elections')}>
            View all <ArrowRight size={14} aria-hidden="true" />
          </button>
        }
      >
        {featured.length === 0 ? (
          <EmptyState
            title="No active elections"
            copy="There are currently no elections available for you."
          >
            <button type="button" className="btn btn-secondary" onClick={() => navigate('elections')}>
              View Upcoming Elections
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
        title="Live Results"
        subtitle="Shown only where the election publishes live results"
        icon={<BarChart3 size={18} />}
        tone="violet"
        action={
          <button type="button" className="link-btn" onClick={() => navigate('results', preview?.id)}>
            View Full Results <ArrowRight size={14} aria-hidden="true" />
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
          <EmptyState compact icon={<BarChart3 size={20} />} title="No results to show yet" copy="Results appear here once voting opens for elections with live results." />
        )}
        {hidden && (
          <p className="hidden-note">
            <ShieldCheck size={15} aria-hidden="true" /> Results for <strong>{hidden.title}</strong> are hidden until
            voting closes on {formatDate(hidden.endsAt)}.
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
  const electionTitle = (id) => elections.find((election) => election.id === id)?.title || 'Unknown election'
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
        text: `Ballot sealed in block #${block.index} — ${electionTitle(block.electionId || 'general')}`,
      }))
    return [...registry.activity, ...ballots].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8)
    // electionTitle only reads `elections`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, registry.activity, elections])

  const actions = [
    pending.length > 0 && {
      text: `${pending.length} candidate nomination${pending.length === 1 ? '' : 's'} awaiting verification`,
      go: () => navigate('candidate-verification'),
      label: 'Review',
      tone: 'violet',
      icon: <ClipboardCheck size={17} />,
    },
    drafts.length > 0 && {
      text: `${drafts.length} draft election${drafts.length === 1 ? '' : 's'} not yet published`,
      go: () => navigate('manage-elections'),
      label: 'Open',
      tone: 'amber',
      icon: <FilePen size={17} />,
    },
    ...closingToday.map((election) => ({
      text: `${election.title} closes ${formatDate(election.endsAt)} at ${new Date(election.endsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`,
      go: () => navigate('election', election.id),
      label: 'View',
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
            {open.length} election{open.length === 1 ? ' is' : 's are'} open for voting
            {actions.length ? ` and ${actions.length} item${actions.length === 1 ? ' needs' : 's need'} your attention.` : '. Nothing needs your attention.'}
          </p>
          <div className="welcome-meta">
            <span className="welcome-chip">
              <ShieldCheck size={14} aria-hidden="true" /> {t.uiAdmin}
            </span>
            <span className="welcome-chip">
              <CalendarDays size={14} aria-hidden="true" /> {todayLabel()}
            </span>
            <span className="welcome-chip">
              <Blocks size={14} aria-hidden="true" /> {chain.length} ledger block{chain.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="welcome-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('election-new')}>
            <Plus size={17} aria-hidden="true" /> Create election
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('notices')}>
            <Megaphone size={17} aria-hidden="true" /> Post notice
          </button>
        </div>
      </section>

      <div className="stat-grid stat-grid-5">
        <StatCard icon={<UsersRound size={20} />} label="Total Students" value={formatNumber(students.length)} tone="blue" hint="Registered on the roll" onClick={() => navigate('voters')} />
        <StatCard icon={<Vote size={20} />} label="Active Elections" value={open.length} tone="green" hint={`${published.length} published`} onClick={() => navigate('manage-elections')} />
        <StatCard icon={<UserRound size={20} />} label="Candidates" value={candidates.length} tone="violet" hint={`${verified.length} verified`} onClick={() => navigate('candidate-verification')} />
        <StatCard icon={<CheckCircle2 size={20} />} label="Votes Cast" value={formatNumber(totalVotes)} tone="teal" hint="Across published elections" onClick={() => navigate('reports')} />
        <StatCard icon={<ClipboardCheck size={20} />} label="Pending Reviews" value={pending.length} tone={pending.length ? 'amber' : 'green'} hint={pending.length ? 'Nominations to verify' : 'All clear'} onClick={() => navigate('candidate-verification')} />
      </div>

      {actions.length > 0 ? (
        <Card title="Pending Actions" subtitle="Things that need an election officer" icon={<AlertTriangle size={18} />} tone="amber">
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
        <Alert tone="success" title="No pending actions">
          All nominations are reviewed and every election is published.
        </Alert>
      )}

      <Card
        title="Election Activity"
        subtitle="Elections open for voting now"
        icon={<BarChart3 size={18} />}
        tone="blue"
        flush
        action={
          <button type="button" className="link-btn" onClick={() => navigate('manage-elections')}>
            Manage <ArrowRight size={14} aria-hidden="true" />
          </button>
        }
      >
        {open.length === 0 ? (
          <EmptyState compact title="No elections are open" copy="Published elections appear here while voting is open.">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('election-new')}>
              Create election
            </button>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Election</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Closes</th>
                  <th scope="col" className="num">
                    Votes
                  </th>
                  <th scope="col">Turnout</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
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
                      <td data-label="Election">
                        <strong>{election.title}</strong>
                      </td>
                      <td data-label="Scope">{scopeLabel(election)}</td>
                      <td data-label="Closes">{formatDate(election.endsAt)}</td>
                      <td data-label="Votes" className="num">
                        {formatNumber(cast)}
                      </td>
                      <td data-label="Turnout">
                        <span className="turnout-cell">
                          <ProgressBar value={turnout} label={`Turnout ${turnout}%`} />
                          <small>{turnout}%</small>
                        </span>
                      </td>
                      <td className="actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
                          View
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
        title="Candidate Verification"
        subtitle={pending.length ? `${pending.length} pending review` : 'Nothing waiting'}
        icon={<ClipboardCheck size={18} />}
        tone="violet"
        action={
          <button type="button" className="link-btn" onClick={() => navigate('candidate-verification')}>
            View all <ArrowRight size={14} aria-hidden="true" />
          </button>
        }
      >
        {pending.length === 0 ? (
          <EmptyState compact icon={<Check size={20} />} title="All candidates reviewed" copy="New nominations will appear here for verification." />
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
                    <Check size={15} aria-hidden="true" /> Verify
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejecting(entry)}>
                    <X size={15} aria-hidden="true" /> Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent System Activity" subtitle="Latest changes and sealed ballots" icon={<FileText size={18} />} tone="teal">
        <ul className="activity-list">
          {activity.slice(0, 5).map((entry) => {
            const style = activityStyle(entry.text)
            return (
              <li key={entry.id}>
                <span className={`activity-dot tone-${style.tone}`} aria-hidden="true">
                  {style.icon}
                </span>
                <span>
                  <span>{entry.text}</span>
                  <small>{relativeTime(entry.at, now)}</small>
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card
        title="Recent Elections"
        subtitle="The five most recently created elections"
        icon={<CalendarDays size={18} />}
        tone="sky"
        flush
        action={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('election-new')}>
            Create election
          </button>
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Election</th>
                <th scope="col">Status</th>
                <th scope="col">Voting period</th>
                <th scope="col" className="num">
                  Votes
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recentElections.map((election) => (
                <tr key={election.id}>
                  <td data-label="Election">
                    <strong>{election.title}</strong>
                    <small className="cell-sub">{scopeLabel(election)}</small>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={electionState(election).status} />
                  </td>
                  <td data-label="Voting period">{formatPeriod(election)}</td>
                  <td data-label="Votes" className="num">
                    {formatNumber(tallies[election.id].votesCast)}
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
                      View
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
