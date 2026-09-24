// Department overview, department drill-down and the academic-year matrix.

import { ArrowLeft, ArrowRight, Building2, CalendarDays, Crown, GraduationCap, UserRound, UsersRound } from 'lucide-react'
import { useApp } from '../../context'
import { DEPARTMENTS, YEARS, departmentName } from '../../college'
import { effectiveEligibility, formatPeriod, scopeLabel } from '../../elections'
import { Avatar, Card, EmptyState, ErrorState, PageIntro, ReviewBadge, StatCard, StatusBadge } from '../../components/ui'

function electionsFor(elections, departmentId) {
  return elections.filter((election) => {
    if (election.scope === 'college') return false
    return effectiveEligibility(election).departments.includes(departmentId)
  })
}

function HolderLine({ holder, empty = 'Vacant' }) {
  return holder ? (
    <span className="holder">
      <Avatar name={holder.name} size="sm" />
      <span>{holder.name}</span>
    </span>
  ) : (
    <span className="muted">{empty}</span>
  )
}

export function DepartmentsPage() {
  const { voters, candidates, elections, committee, navigate } = useApp()
  return (
    <div className="page-stack">
      <PageIntro>
        <p>Select a department to see its academic years, students, candidates, elections and committee leaders.</p>
      </PageIntro>
      <div className="card-grid card-grid-3">
        {DEPARTMENTS.map((dept) => {
          const students = voters.filter((voter) => voter.role !== 'admin' && voter.department === dept.id)
          const deptCandidates = candidates.filter((entry) => entry.department === dept.id && entry.status !== 'rejected')
          const leader = committee.departments[dept.id]?.leader
          return (
            <button key={dept.id} type="button" className="dept-card" onClick={() => navigate('department', dept.id)}>
              <span className="dept-card-head">
                <span className="dept-icon" aria-hidden="true">
                  <Building2 size={20} />
                </span>
                <span>
                  <strong>{dept.short}</strong>
                  <small>{dept.name}</small>
                </span>
              </span>
              <span className="dept-stats">
                <span>
                  <strong>{students.length}</strong> students
                </span>
                <span>
                  <strong>{deptCandidates.length}</strong> candidates
                </span>
                <span>
                  <strong>{electionsFor(elections, dept.id).length}</strong> elections
                </span>
              </span>
              <span className="dept-leader">
                <Crown size={14} aria-hidden="true" /> Leader: {leader?.name || 'Vacant'}
              </span>
              <span className="dept-go">
                View department <ArrowRight size={15} aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DepartmentDetailPage({ id }) {
  const { voters, candidates, elections, electionState, committee, navigate } = useApp()
  const dept = DEPARTMENTS.find((entry) => entry.id === id)

  if (!dept) {
    return (
      <ErrorState title="Department not found" copy="This department does not exist.">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('departments')}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to departments
        </button>
      </ErrorState>
    )
  }

  const students = voters.filter((voter) => voter.role !== 'admin' && voter.department === dept.id)
  const deptCandidates = candidates.filter((entry) => entry.department === dept.id)
  const deptElections = electionsFor(elections, dept.id)
  const seats = committee.departments[dept.id] || { leader: null, years: {} }
  const electionTitle = (entry) => elections.find((election) => election.id === entry.electionId)?.title || '—'

  return (
    <div className="page-stack">
      <PageIntro>
        <p>{departmentName(dept.id)}</p>
      </PageIntro>

      <div className="stat-grid">
        <StatCard tone="blue" icon={<UsersRound size={20} />} label="Students" value={students.length} />
        <StatCard tone="green" icon={<UserRound size={20} />} label="Candidates" value={deptCandidates.length} />
        <StatCard tone="violet" icon={<CalendarDays size={20} />} label="Department elections" value={deptElections.length} />
        <StatCard tone="teal" icon={<Crown size={20} />} label="Committee leader" value={seats.leader?.name || 'Vacant'} />
      </div>

      <Card title="Academic Years" icon={<GraduationCap size={18} />}>
        <div className="year-grid">
          {[...YEARS].reverse().map((year) => (
            <div key={year.id} className="year-card">
              <strong>{year.label}</strong>
              <span className="muted small">
                {students.filter((voter) => Number(voter.year) === year.id).length} registered students
              </span>
              <span className="year-rep-label">Year Representative</span>
              <HolderLine holder={seats.years?.[year.id]} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Committee Leaders" icon={<Crown size={18} />} action={
          <button type="button" className="link-btn" onClick={() => navigate('committees')}>
            Manage <ArrowRight size={14} aria-hidden="true" />
          </button>
        }>
          <ul className="holder-list">
            <li>
              <span className="holder-role">Department Committee Leader</span>
              <HolderLine holder={seats.leader} />
            </li>
            {[...YEARS].reverse().map((year) => (
              <li key={year.id}>
                <span className="holder-role">{year.label} Representative</span>
                <HolderLine holder={seats.years?.[year.id]} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Elections" icon={<CalendarDays size={18} />}>
          {deptElections.length === 0 ? (
            <EmptyState compact title="No department elections" copy="Department and year-wise elections for this department appear here." />
          ) : (
            <ul className="choice-list">
              {deptElections.map((election) => (
                <li key={election.id}>
                  <div>
                    <strong>{election.title}</strong>
                    <small>
                      {scopeLabel(election)} · {formatPeriod(election)}
                    </small>
                  </div>
                  <StatusBadge status={electionState(election).status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Candidates" flush>
        {deptCandidates.length === 0 ? (
          <EmptyState compact title="No candidates from this department" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Year</th>
                  <th scope="col">Election</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {deptCandidates.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label="Candidate">
                      <button type="button" className="link-btn" onClick={() => navigate('candidate', entry.id)}>
                        {entry.name}
                      </button>
                    </td>
                    <td data-label="Year">{YEARS.find((year) => year.id === Number(entry.year))?.label}</td>
                    <td data-label="Election">{electionTitle(entry)}</td>
                    <td data-label="Status">
                      <ReviewBadge status={entry.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Students" flush>
        {students.length === 0 ? (
          <EmptyState compact title="No registered students" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Register No.</th>
                  <th scope="col">Year</th>
                  <th scope="col">Roll status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((voter) => (
                  <tr key={voter.voterId}>
                    <td data-label="Student">{voter.name}</td>
                    <td data-label="Register No." className="mono">
                      {voter.voterId}
                    </td>
                    <td data-label="Year">{YEARS.find((year) => year.id === Number(voter.year))?.label || '—'}</td>
                    <td data-label="Roll status">{voter.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export function AcademicYearsPage() {
  const { voters, elections, electionState, committee } = useApp()
  const students = voters.filter((voter) => voter.role !== 'admin')
  const cell = (deptId, yearId) =>
    students.filter((voter) => voter.department === deptId && Number(voter.year) === yearId).length

  return (
    <div className="page-stack">
      <PageIntro>
        <p>Registered students by department and year, with each year’s representative and year-wise elections.</p>
      </PageIntro>

      <Card title="Students by department and year" flush>
        <div className="table-wrap">
          <table className="table matrix">
            <thead>
              <tr>
                <th scope="col">Department</th>
                {YEARS.map((year) => (
                  <th key={year.id} scope="col" className="num">
                    {year.label}
                  </th>
                ))}
                <th scope="col" className="num">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((dept) => (
                <tr key={dept.id}>
                  <th scope="row" data-label="Department">
                    {dept.short}
                  </th>
                  {YEARS.map((year) => (
                    <td key={year.id} data-label={year.label} className="num">
                      {cell(dept.id, year.id)}
                    </td>
                  ))}
                  <td data-label="Total" className="num">
                    <strong>{students.filter((voter) => voter.department === dept.id).length}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="card-grid card-grid-2">
        {[...YEARS].reverse().map((year) => {
          const yearElections = elections.filter((election) => election.scope === 'year' && Number(election.year) === year.id)
          return (
            <Card key={year.id} title={year.label} subtitle={`${students.filter((voter) => Number(voter.year) === year.id).length} registered students`}>
              <p className="list-caption">Year Representatives</p>
              <ul className="holder-list compact">
                {DEPARTMENTS.map((dept) => (
                  <li key={dept.id}>
                    <span className="holder-role">{dept.short}</span>
                    <HolderLine holder={committee.departments[dept.id]?.years?.[year.id]} />
                  </li>
                ))}
              </ul>
              {yearElections.length > 0 && (
                <>
                  <p className="list-caption">Year-wise elections</p>
                  <ul className="choice-list">
                    {yearElections.map((election) => (
                      <li key={election.id}>
                        <div>
                          <strong>{election.title}</strong>
                          <small>{formatPeriod(election)}</small>
                        </div>
                        <StatusBadge status={electionState(election).status} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
