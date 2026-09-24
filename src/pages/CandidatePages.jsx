// Candidate directory and the candidate profile page.

import { useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Vote } from 'lucide-react'
import { useApp } from '../context'
import { DEPARTMENTS, academicLine, departmentLabel, yearLabel } from '../college'
import { CandidateCard } from '../components/election'
import { Alert, Avatar, Badge, Card, EmptyState, ErrorState, KeyValue, PageIntro, ReviewBadge, SearchInput, StatusBadge } from '../components/ui'

export function CandidatesPage() {
  const { elections, candidates, electionState } = useApp()
  const [electionId, setElectionId] = useState('')
  const [department, setDepartment] = useState('')
  const [query, setQuery] = useState('')

  const visible = elections.filter((election) => election.published)
  const list = candidates.filter((entry) => {
    if (entry.status !== 'verified') return false
    const election = visible.find((item) => item.id === entry.electionId)
    if (!election) return false
    if (electionId && entry.electionId !== electionId) return false
    if (department && entry.department !== department) return false
    const term = query.trim().toLowerCase()
    return !term || entry.name.toLowerCase().includes(term)
  })

  const positionLabel = (entry) => {
    const election = visible.find((item) => item.id === entry.electionId)
    const position = election?.positions.find((item) => item.id === entry.positionId)
    return `${position?.title || ''} · ${election?.title || ''}`
  }

  // Open elections first, so current candidates lead the list.
  const rank = { open: 0, upcoming: 1, closed: 2, draft: 3 }
  const statusOf = (entry) => electionState(visible.find((item) => item.id === entry.electionId)).status
  const sorted = [...list].sort((a, b) => rank[statusOf(a)] - rank[statusOf(b)])

  return (
    <div className="page-stack">
      <PageIntro>
        <p>Read each candidate’s profile, manifesto and priorities before you vote.</p>
      </PageIntro>
      <div className="toolbar">
        <div className="toolbar-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search candidates" />
          <label className="select-inline">
            <span className="sr-only">Election</span>
            <select value={electionId} onChange={(event) => setElectionId(event.target.value)}>
              <option value="">All elections</option>
              {visible.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.title}
                </option>
              ))}
            </select>
          </label>
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
        </div>
        <p className="muted small">{sorted.length} candidates</p>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="No candidates found" copy="Try another election or department, or clear the search." />
      ) : (
        <div className="card-grid card-grid-4">
          {sorted.map((entry) => (
            <CandidateCard key={entry.id} candidate={entry} positionTitle={positionLabel(entry)} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CandidateProfilePage({ id }) {
  const { candidates, elections, electionState, isAdmin, navigate, pickCandidate, voter } = useApp()
  const candidate = candidates.find((entry) => entry.id === id)
  const election = candidate && elections.find((entry) => entry.id === candidate.electionId)

  if (!candidate || !election || (!isAdmin && (candidate.status !== 'verified' || !election.published))) {
    return (
      <ErrorState title="Candidate not found" copy="This candidate profile is not available.">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('candidates')}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to candidates
        </button>
      </ErrorState>
    )
  }

  const position = election.positions.find((entry) => entry.id === candidate.positionId)
  const state = electionState(election)
  const canVote = voter && !isAdmin && state.status === 'open' && state.eligible && !state.voted

  return (
    <div className="page-stack narrow">
      <Card>
        <div className="profile-head">
          <Avatar name={candidate.name} photo={candidate.photo} size="xl" />
          <div className="grow">
            <p className="eyebrow">{position?.title}</p>
            <h2>{candidate.name}</h2>
            <p className="muted">{academicLine(candidate.department, candidate.year)}</p>
            <div className="badge-row">
              <StatusBadge status={state.status} />
              {isAdmin && <ReviewBadge status={candidate.status} />}
            </div>
          </div>
        </div>
        <KeyValue
          columns={3}
          items={[
            { label: 'Position', value: position?.title || '—' },
            { label: 'Department', value: departmentLabel(candidate.department) || '—' },
            { label: 'Academic Year', value: yearLabel(candidate.year) || '—' },
            { label: 'Election', value: election.title },
            ...(candidate.panel ? [{ label: 'Panel', value: candidate.panel }] : []),
          ]}
        />
        <div className="card-foot-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('election', election.id)}>
            <CalendarDays size={16} aria-hidden="true" /> View election
          </button>
          {canVote && (
            <button type="button" className="btn btn-primary" onClick={() => pickCandidate(election, candidate)}>
              <Vote size={16} aria-hidden="true" /> Vote for this candidate <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
          {state.voted && (
            <Badge tone="success" icon={<CheckCircle2 size={14} aria-hidden="true" />}>
              You have voted in this election
            </Badge>
          )}
        </div>
      </Card>

      {candidate.status === 'rejected' && candidate.rejectionReason && (
        <Alert tone="error" title="Nomination rejected">
          {candidate.rejectionReason}
        </Alert>
      )}

      <Card title="About Candidate">
        <p className="prose">{candidate.about || 'No profile provided.'}</p>
      </Card>
      <Card title="Manifesto">
        <p className="prose">{candidate.manifesto || 'No manifesto provided.'}</p>
      </Card>
      <Card title="Key Priorities">
        {candidate.priorities?.length ? (
          <ol className="priority-list">
            {candidate.priorities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">No priorities listed.</p>
        )}
      </Card>
    </div>
  )
}
