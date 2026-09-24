// Reports: turnout per election, registration by department and the review
// state of nominations, with a CSV export of the turnout table.

import { BarChart3, CheckCircle2, Download, Percent, UsersRound, Vote } from 'lucide-react'
import { useApp } from '../../context'
import { DEPARTMENTS } from '../../college'
import { METHOD_META, electorateOf, formatNumber, formatPeriod, percentOf, scopeLabel } from '../../elections'
import { Card, EmptyState, PageIntro, ProgressBar, StatCard, StatusBadge } from '../../components/ui'

function downloadCsv(filename, rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const { elections, electionState, tallies, voters, committee, candidates, showToast } = useApp()
  const published = elections.filter((election) => election.published)
  const rows = published.map((election) => {
    const electorate = electorateOf(election, voters, committee)
    const cast = tallies[election.id].votesCast
    return { election, electorate, cast, turnout: percentOf(cast, electorate), status: electionState(election).status }
  })
  const withVotes = rows.filter((row) => row.status !== 'upcoming')
  const totalVotes = rows.reduce((sum, row) => sum + row.cast, 0)
  const avgTurnout = withVotes.length
    ? Math.round((withVotes.reduce((sum, row) => sum + row.turnout, 0) / withVotes.length) * 10) / 10
    : 0
  const students = voters.filter((voter) => voter.role !== 'admin')
  const maxDept = Math.max(1, ...DEPARTMENTS.map((dept) => students.filter((voter) => voter.department === dept.id).length))

  const exportTurnout = () => {
    downloadCsv('election-turnout.csv', [
      ['Election', 'Scope', 'Method', 'Voting period', 'Status', 'Eligible voters', 'Votes cast', 'Turnout %'],
      ...rows.map((row) => [
        row.election.title,
        scopeLabel(row.election),
        METHOD_META[row.election.method].label,
        formatPeriod(row.election),
        row.status,
        row.electorate,
        row.cast,
        row.turnout,
      ]),
    ])
    showToast('Turnout report downloaded.')
  }

  const review = ['verified', 'pending', 'rejected'].map((status) => ({
    status,
    count: candidates.filter((entry) => entry.status === status).length,
  }))

  return (
    <div className="page-stack">
      <PageIntro
        actions={
          <button type="button" className="btn btn-secondary" onClick={exportTurnout} disabled={!rows.length}>
            <Download size={16} aria-hidden="true" /> Export CSV
          </button>
        }
      >
        <p>Participation across every published election.</p>
      </PageIntro>

      <div className="stat-grid">
        <StatCard tone="blue" icon={<BarChart3 size={20} />} label="Published elections" value={published.length} />
        <StatCard tone="green" icon={<Vote size={20} />} label="Total votes cast" value={formatNumber(totalVotes)} />
        <StatCard tone="violet" icon={<Percent size={20} />} label="Average turnout" value={`${avgTurnout}%`} hint="Open and closed elections" />
        <StatCard tone="teal" icon={<CheckCircle2 size={20} />} label="Verified candidates" value={review[0].count} />
      </div>

      <Card title="Turnout by election" flush>
        {rows.length === 0 ? (
          <EmptyState compact title="No published elections" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Election</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Eligible
                  </th>
                  <th scope="col" className="num">
                    Votes
                  </th>
                  <th scope="col">Turnout</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.election.id}>
                    <td data-label="Election">
                      <strong>{row.election.title}</strong>
                      <small className="cell-sub">{scopeLabel(row.election)}</small>
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={row.status} />
                    </td>
                    <td data-label="Eligible" className="num">
                      {formatNumber(row.electorate)}
                    </td>
                    <td data-label="Votes" className="num">
                      {formatNumber(row.cast)}
                    </td>
                    <td data-label="Turnout">
                      <span className="turnout-cell">
                        <ProgressBar value={row.turnout} label={`Turnout ${row.turnout}%`} />
                        <small>{row.turnout}%</small>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid-2">
        <Card title="Registered students by department" icon={<UsersRound size={18} />}>
          <ul className="bar-list">
            {DEPARTMENTS.map((dept) => {
              const count = students.filter((voter) => voter.department === dept.id).length
              return (
                <li key={dept.id}>
                  <span className="bar-list-label">{dept.short}</span>
                  <ProgressBar value={(count / maxDept) * 100} label={`${dept.short}: ${count} students`} />
                  <span className="bar-list-value">{count}</span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card title="Candidate review" icon={<CheckCircle2 size={18} />}>
          <ul className="bar-list">
            {review.map((row) => (
              <li key={row.status}>
                <span className="bar-list-label">{row.status[0].toUpperCase() + row.status.slice(1)}</span>
                <ProgressBar
                  value={candidates.length ? (row.count / candidates.length) * 100 : 0}
                  tone={row.status === 'verified' ? 'success' : row.status === 'pending' ? 'warning' : 'error'}
                  label={`${row.status}: ${row.count}`}
                />
                <span className="bar-list-value">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
