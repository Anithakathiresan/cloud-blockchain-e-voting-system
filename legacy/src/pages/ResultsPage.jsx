// Results dashboard: filter by election, department, year and position; a
// four-figure summary; then each position's standing. Elections configured
// to hide results show nothing until voting closes.

import { useState } from 'react'
import { Blocks, CheckCircle2, EyeOff, ListChecks, Percent, Trophy, UsersRound, Vote } from 'lucide-react'
import { useApp } from '../context'
import { academicLine } from '../college'
import { ballotCount } from '../chain'
import {
  METHOD_META,
  effectiveEligibility,
  electorateOf,
  formatDateTime,
  formatNumber,
  percentOf,
} from '../elections'
import { PositionResults } from '../components/election'
import { Alert, Card, EmptyState, StatCard, StatusBadge } from '../components/ui'
import { ElectionFilters } from './ElectionPages'

function appliesTo(election, department, year) {
  const { departments, years } = effectiveEligibility(election)
  if (department && departments.length && !departments.includes(department)) return false
  if (year && years.length && !years.includes(Number(year))) return false
  return true
}

function RunoffRounds({ result }) {
  const [open, setOpen] = useState(false)
  if (!result.rounds || result.rounds.length < 2) return null
  const name = (candidateId) => result.rows.find((row) => row.candidate.id === candidateId)?.candidate.name || candidateId
  return (
    <div className="rounds">
      <button type="button" className="link-btn" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Hide' : 'Show'} counting rounds ({result.rounds.length})
      </button>
      {open && (
        <div className="table-wrap">
          <table className="table table-compact">
            <thead>
              <tr>
                <th scope="col">Round</th>
                {result.rows.map((row) => (
                  <th key={row.candidate.id} scope="col" className="num">
                    {row.candidate.name}
                  </th>
                ))}
                <th scope="col">Eliminated</th>
              </tr>
            </thead>
            <tbody>
              {result.rounds.map((round, index) => (
                <tr key={index}>
                  <td data-label="Round">{index + 1}</td>
                  {result.rows.map((row) => (
                    <td key={row.candidate.id} data-label={row.candidate.name} className="num">
                      {row.candidate.id in round.counts ? formatNumber(round.counts[row.candidate.id]) : '—'}
                    </td>
                  ))}
                  <td data-label="Eliminated">{round.eliminated ? name(round.eliminated) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function ResultsPage({ id }) {
  const { elections, electionState, tallies, voters, committee, navigate, ledger, chain } = useApp()
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState('')
  const [positionId, setPositionId] = useState('')

  const published = elections.filter((election) => election.published)
  const options = published.filter((election) => appliesTo(election, department, year))
  const rank = { open: 0, closed: 1, upcoming: 2 }
  const fallback = [...options].sort(
    (a, b) =>
      Number(electionState(b).resultsVisible) - Number(electionState(a).resultsVisible) ||
      rank[electionState(a).status] - rank[electionState(b).status],
  )[0]
  const election = options.find((entry) => entry.id === id) || fallback

  if (!election) {
    return (
      <div className="page-stack">
        <div className="toolbar">
          <div className="toolbar-filters">
            <ElectionFilters department={department} setDepartment={setDepartment} year={year} setYear={setYear} />
          </div>
        </div>
        <EmptyState title="No elections match these filters" copy="Clear the department or year filter to see all results." />
      </div>
    )
  }

  const state = electionState(election)
  const tally = tallies[election.id]
  const electorate = electorateOf(election, voters, committee)
  const positions = tally.positions.filter((result) => !positionId || result.position.id === positionId)
  const valid = positions.reduce((max, result) => Math.max(max, result.validVotes), 0)

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div className="toolbar-filters">
          <label className="select-inline wide">
            <span className="sr-only">Election</span>
            <select
              value={election.id}
              onChange={(event) => {
                setPositionId('')
                navigate('results', event.target.value)
              }}
            >
              {options.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
          <ElectionFilters department={department} setDepartment={setDepartment} year={year} setYear={setYear} />
          <label className="select-inline">
            <span className="sr-only">Position</span>
            <select value={positionId} onChange={(event) => setPositionId(event.target.value)}>
              <option value="">All positions</option>
              {election.positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Card className="results-head">
        <div className="election-hero-top">
          <div>
            <p className="eyebrow">
              {METHOD_META[election.method].label} · {election.category}
            </p>
            <h2 className="election-hero-title">{election.title}</h2>
            <p className="muted small">
              {state.status === 'closed'
                ? `Voting closed ${formatDateTime(election.closedAt || election.endsAt)}`
                : state.status === 'open'
                  ? `Voting open until ${formatDateTime(election.endsAt)}`
                  : `Voting opens ${formatDateTime(election.startsAt)}`}
            </p>
          </div>
          <StatusBadge status={state.status} />
        </div>
      </Card>

      <div className="stat-grid">
        <StatCard tone="blue" icon={<UsersRound size={20} />} label="Total Eligible Voters" value={formatNumber(electorate)} />
        <StatCard tone="green" icon={<Vote size={20} />} label="Votes Cast" value={formatNumber(tally.votesCast)} />
        <StatCard tone="violet" icon={<Percent size={20} />} label="Turnout" value={`${percentOf(tally.votesCast, electorate)}%`} />
        <StatCard tone="teal"
          icon={<ListChecks size={20} />}
          label="Valid Votes"
          value={state.resultsVisible ? formatNumber(valid) : '—'}
          hint={state.resultsVisible ? null : 'Shown with the results'}
        />
      </div>

      {!state.resultsVisible ? (
        <Card>
          <EmptyState
            icon={<EyeOff size={22} />}
            title={state.status === 'upcoming' ? 'Voting has not started' : 'Results are hidden until voting closes'}
            copy={
              state.status === 'upcoming'
                ? `Results will appear once voting opens on ${formatDateTime(election.startsAt)}.`
                : `This election publishes results after voting closes on ${formatDateTime(election.endsAt)}.`
            }
          />
        </Card>
      ) : (
        positions.map((result) => {
          const winners = result.rows.filter((row) => row.elected)
          return (
            <Card
              key={result.position.id}
              title={result.position.title}
              subtitle={`${formatNumber(result.validVotes)} valid votes${
                election.method === 'multiple' ? ` · ${result.seats} seats` : ''
              }${election.method === 'ranked' ? ' · counted by instant runoff' : ''}`}
            >
              {winners.length > 0 && (
                <Alert tone="success" icon={<Trophy size={18} />} title={winners.length > 1 ? 'Elected' : 'Winner'}>
                  {winners
                    .map((row) => `${row.candidate.name} (${academicLine(row.candidate.department, row.candidate.year)})`)
                    .join(', ')}
                </Alert>
              )}
              <PositionResults result={result} method={election.method} />
              {election.method === 'ranked' && <RunoffRounds result={result} />}
            </Card>
          )
        })
      )}

      <p className={`ledger-line ledger-${ledger.status}`}>
        {ledger.status === 'valid' ? <CheckCircle2 size={16} aria-hidden="true" /> : <Blocks size={16} aria-hidden="true" />}
        {ledger.status === 'valid'
          ? `Counted from a verified ledger of ${ledger.blocks} block${ledger.blocks === 1 ? '' : 's'} (${ballotCount(chain)} cast online).`
          : ledger.status === 'broken'
            ? `Ledger verification failed at block #${ledger.brokenAt}. Results may be unreliable.`
            : 'Verifying the ledger…'}
      </p>
    </div>
  )
}
