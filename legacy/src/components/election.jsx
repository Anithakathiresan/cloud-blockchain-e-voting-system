// Election-specific building blocks: election cards, candidate cards and
// the per-position results list.

import { ArrowRight, Award, Building2, CalendarDays, CheckCircle2, Trophy, Vote } from 'lucide-react'
import { useApp } from '../context'
import { academicLine } from '../college'
import { METHOD_META, formatNumber, formatPeriod, resultsAvailability, scopeLabel } from '../elections'
import { Avatar, Badge, ProgressBar, ReviewBadge, StatusBadge } from './ui'

export function ElectionCard({ election }) {
  const { navigate, electionState, isAdmin } = useApp()
  const state = electionState(election)
  const positions = election.positions.map((position) => position.title).join(', ')
  const canVote = !isAdmin && state.status === 'open' && state.eligible && !state.voted

  return (
    <article className={`election-card election-${state.status}`}>
      <div className="election-card-top">
        <StatusBadge status={state.status} />
        {state.voted && <Badge tone="success">Voted</Badge>}
        {!isAdmin && !state.eligible && state.status !== 'draft' && <Badge tone="neutral">Not eligible</Badge>}
      </div>
      <h3 className="election-card-title">{election.title}</h3>
      <p className="election-card-positions">{positions}</p>
      <dl className="election-card-facts">
        <div>
          <dt>
            <Building2 size={14} aria-hidden="true" /> Scope
          </dt>
          <dd>{scopeLabel(election)}</dd>
        </div>
        <div>
          <dt>
            <CalendarDays size={14} aria-hidden="true" /> Voting
          </dt>
          <dd>{formatPeriod(election)}</dd>
        </div>
        <div>
          <dt>
            <Vote size={14} aria-hidden="true" /> Method
          </dt>
          <dd>{METHOD_META[election.method]?.label}</dd>
        </div>
        <div>
          <dt>
            <Award size={14} aria-hidden="true" /> Results
          </dt>
          <dd>{resultsAvailability(election, state.status)}</dd>
        </div>
      </dl>
      <div className="election-card-actions">
        {canVote && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('vote', election.id)}>
            Vote now
          </button>
        )}
        {state.voted && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('receipt', election.id)}>
            View receipt
          </button>
        )}
        <button
          type="button"
          className={`btn btn-sm ${canVote || state.voted ? 'btn-ghost' : 'btn-secondary'}`}
          onClick={() => navigate('election', election.id)}
        >
          View Election <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

export function CandidateCard({ candidate, positionTitle, showStatus }) {
  const { navigate } = useApp()
  return (
    <article className="candidate-card">
      <Avatar name={candidate.name} photo={candidate.photo} size="lg" />
      <div className="candidate-card-body">
        <h3>{candidate.name}</h3>
        <p className="candidate-card-meta">{academicLine(candidate.department, candidate.year)}</p>
        {positionTitle && <p className="candidate-card-position">{positionTitle}</p>}
        {showStatus && <ReviewBadge status={candidate.status} />}
        {candidate.about && <p className="candidate-card-about">{candidate.about}</p>}
      </div>
      <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => navigate('candidate', candidate.id)}>
        View Profile
      </button>
    </article>
  )
}

// Results for one position. `compact` drops photos for the dashboard preview.
export function PositionResults({ result, method, compact, limit }) {
  const rows = limit ? result.rows.slice(0, limit) : result.rows
  const total = result.validVotes

  if (!result.rows.length) {
    return <p className="muted">No verified candidates for this position.</p>
  }

  return (
    <ol className={`results-list ${compact ? 'compact' : ''}`}>
      {rows.map((row, index) => (
        <li key={row.candidate.id} className={`result-row ${row.winning ? 'is-leading' : ''}`}>
          {!compact && <span className="result-rank">{row.rank}</span>}
          {!compact && <Avatar name={row.candidate.name} photo={row.candidate.photo} size="md" />}
          <div className="result-main">
            <div className="result-head">
              <span className="result-name">
                <strong>{row.candidate.name}</strong>
                {!compact && <small>{academicLine(row.candidate.department, row.candidate.year)}</small>}
              </span>
              <span className="result-figures">
                <strong>{row.percent}%</strong>
                {!compact && <small>{formatNumber(row.votes)} votes</small>}
              </span>
            </div>
            <ProgressBar
              value={row.percent}
              tone={`rank-${Math.min(index + 1, 5)}`}
              label={`${row.candidate.name}: ${row.percent}%`}
            />
            {!compact && (
              <div className="result-tags">
                {row.elected && (
                  <Badge tone="success" icon={<Trophy size={13} aria-hidden="true" />}>
                    Elected
                  </Badge>
                )}
                {!row.elected && row.winning && <Badge tone="info">Leading</Badge>}
                {method === 'ranked' && (
                  <small className="muted">{formatNumber(row.firstPreferences)} first preferences</small>
                )}
                {row.eliminatedInRound && <small className="muted">Eliminated in round {row.eliminatedInRound}</small>}
              </div>
            )}
          </div>
        </li>
      ))}
      {compact && total > 0 && (
        <li className="results-total">
          <CheckCircle2 size={14} aria-hidden="true" /> {formatNumber(total)} valid votes
        </li>
      )}
    </ol>
  )
}
