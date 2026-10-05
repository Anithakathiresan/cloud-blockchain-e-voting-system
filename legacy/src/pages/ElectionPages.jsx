// Elections list (filterable by status, department and year) and the
// election details page with its candidates grouped by position.

import { useState } from 'react'
import { ArrowLeft, BarChart3, CalendarDays, CheckCircle2, Info, Pencil, Plus, Receipt, Vote } from 'lucide-react'
import { useApp } from '../context'
import { DEPARTMENTS, YEARS, departmentLabel, yearLabel } from '../college'
import {
  METHOD_META,
  MODE_META,
  SCOPE_META,
  effectiveEligibility,
  electorateOf,
  eligibilityLabel,
  formatDateTime,
  formatNumber,
  resultsAvailability,
} from '../elections'
import { CandidateCard, ElectionCard } from '../components/election'
import { Alert, Badge, Card, EmptyState, ErrorState, KeyValue, PageIntro, SearchInput, StatusBadge, Tabs } from '../components/ui'

// An election "applies" to a department/year when its eligibility covers it.
function appliesTo(election, department, year) {
  const { departments, years } = effectiveEligibility(election)
  if (department && departments.length && !departments.includes(department)) return false
  if (year && years.length && !years.includes(Number(year))) return false
  return true
}

export function ElectionFilters({ department, setDepartment, year, setYear }) {
  return (
    <>
      <label className="select-inline">
        <span className="sr-only">Department</span>
        <select value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.short}
            </option>
          ))}
        </select>
      </label>
      <label className="select-inline">
        <span className="sr-only">Academic year</span>
        <select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">All years</option>
          {YEARS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

export function ElectionsPage() {
  const { elections, electionState, isAdmin, voter, navigate } = useApp()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState('')
  const [onlyMine, setOnlyMine] = useState(Boolean(voter) && !isAdmin)

  const scoped = elections.filter((election) => {
    if (onlyMine && !electionState(election).eligible) return false
    if (!appliesTo(election, department, year)) return false
    const term = query.trim().toLowerCase()
    if (term && !`${election.title} ${election.category} ${election.positions.map((p) => p.title).join(' ')}`.toLowerCase().includes(term))
      return false
    return true
  })
  const count = (status) => scoped.filter((election) => electionState(election).status === status).length
  const tabs = [
    { id: 'all', label: 'All', count: scoped.length },
    { id: 'open', label: 'Voting Open', count: count('open') },
    { id: 'upcoming', label: 'Upcoming', count: count('upcoming') },
    { id: 'closed', label: 'Closed', count: count('closed') },
    ...(isAdmin ? [{ id: 'draft', label: 'Drafts', count: count('draft') }] : []),
  ]
  const order = { open: 0, upcoming: 1, draft: 2, closed: 3 }
  const list = scoped
    .filter((election) => tab === 'all' || electionState(election).status === tab)
    .sort((a, b) => order[electionState(a).status] - order[electionState(b).status] || Date.parse(a.startsAt) - Date.parse(b.startsAt))

  return (
    <div className="page-stack">
      <PageIntro
        actions={
          isAdmin && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('election-new')}>
              <Plus size={16} aria-hidden="true" /> Create election
            </button>
          )
        }
      >
        <p>Every election, its voting dates, and when results will be published.</p>
      </PageIntro>

      <div className="toolbar">
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Filter by status" />
        <div className="toolbar-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search elections" />
          <ElectionFilters department={department} setDepartment={setDepartment} year={year} setYear={setYear} />
          {voter && !isAdmin && (
            <label className="check">
              <input type="checkbox" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
              <span>Only elections I can vote in</span>
            </label>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title={tab === 'open' ? 'No active elections' : 'No elections found'}
          copy={
            tab === 'open'
              ? 'There are currently no elections available for you.'
              : 'Try a different status, department or year.'
          }
        >
          {tab !== 'upcoming' && (
            <button type="button" className="btn btn-secondary" onClick={() => setTab('upcoming')}>
              View Upcoming Elections
            </button>
          )}
        </EmptyState>
      ) : (
        <div className="card-grid card-grid-3">
          {list.map((election) => (
            <ElectionCard key={election.id} election={election} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ElectionDetailPage({ id }) {
  const { elections, electionState, candidates, isAdmin, voter, navigate, voters, committee, tallies } = useApp()
  const election = elections.find((entry) => entry.id === id)

  if (!election) {
    return (
      <ErrorState title="Election not found" copy="We couldn't find this election. It may have been removed or is not published yet.">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('elections')}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to elections
        </button>
      </ErrorState>
    )
  }

  const state = electionState(election)
  const field = candidates.filter((entry) => entry.electionId === election.id && (isAdmin || entry.status === 'verified'))
  const electorate = electorateOf(election, voters, committee)
  const canEdit = isAdmin && (state.status === 'draft' || state.status === 'upcoming')

  const info = [
    { label: 'Election Type', value: `${SCOPE_META[election.scope].label} · ${election.category}` },
    { label: 'Department', value: election.scope === 'college' ? 'All departments' : departmentLabel(election.departmentId) },
    { label: 'Academic Year', value: election.scope === 'year' ? yearLabel(election.year) : 'All years' },
    { label: 'Eligible Voters', value: `${eligibilityLabel(election)} (${formatNumber(electorate)})` },
    { label: 'Voting Opens', value: formatDateTime(election.startsAt) },
    { label: 'Voting Closes', value: formatDateTime(election.endsAt) },
    { label: 'Voting Method', value: `${METHOD_META[election.method].label} · ${MODE_META[election.mode].label}` },
    { label: 'Results', value: resultsAvailability(election, state.status) },
  ]

  return (
    <div className="page-stack">
      <Card className="election-hero">
        <div className="election-hero-top">
          <div>
            <p className="eyebrow">{election.category}</p>
            <h2 className="election-hero-title">{election.title}</h2>
            {election.description && <p className="muted">{election.description}</p>}
          </div>
          <StatusBadge status={state.status} />
        </div>

        <div className="election-hero-actions">
          {!isAdmin && voter && state.status === 'open' && state.eligible && !state.voted && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('vote', election.id)}>
              <Vote size={17} aria-hidden="true" /> Vote now
            </button>
          )}
          {state.voted && (
            <>
              <Badge tone="success" icon={<CheckCircle2 size={14} aria-hidden="true" />}>
                You have voted
              </Badge>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('receipt', election.id)}>
                <Receipt size={16} aria-hidden="true" /> View receipt
              </button>
            </>
          )}
          {state.resultsVisible && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('results', election.id)}>
              <BarChart3 size={16} aria-hidden="true" /> View results
            </button>
          )}
          {canEdit && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('election-edit', election.id)}>
              <Pencil size={16} aria-hidden="true" /> Edit election
            </button>
          )}
          {!voter && state.status === 'open' && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('login')}>
              Sign in to vote
            </button>
          )}
        </div>

        {voter && !isAdmin && !state.eligible && state.status !== 'closed' && (
          <Alert tone="warning" title="You are not eligible for this election">
            Voting is limited to {eligibilityLabel(election).toLowerCase()}.
          </Alert>
        )}
        {state.status === 'upcoming' && (
          <Alert tone="info" icon={<Info size={18} />}>
            Voting opens on {formatDateTime(election.startsAt)}.
          </Alert>
        )}
        {isAdmin && (
          <p className="muted small">
            {formatNumber(tallies[election.id].votesCast)} votes cast so far.
          </p>
        )}
      </Card>

      <Card title="Election Information">
        <KeyValue items={info} columns={3} />
      </Card>

      <Card title="Candidates" subtitle={`${election.positions.length} position${election.positions.length === 1 ? '' : 's'}`}>
        {election.positions.map((position) => {
          const list = field.filter((entry) => entry.positionId === position.id)
          return (
            <section key={position.id} className="position-block">
              <h3 className="position-title">
                {position.title}
                {election.method === 'multiple' && <small> · {position.seats} seats</small>}
              </h3>
              {list.length === 0 ? (
                <EmptyState compact title="No verified candidates yet" copy="Candidates appear here after the election office verifies their nomination." />
              ) : (
                <div className="card-grid card-grid-4">
                  {list.map((entry) => (
                    <CandidateCard key={entry.id} candidate={entry} positionTitle={position.title} showStatus={isAdmin} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </Card>
    </div>
  )
}
