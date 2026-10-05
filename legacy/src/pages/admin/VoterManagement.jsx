// Voter management: the student roll with department / year filters, and an
// edit dialog for the fields that decide eligibility.

import { useState } from 'react'
import { CheckCircle2, Clock3, Pencil, UsersRound, Vote } from 'lucide-react'
import { useApp } from '../../context'
import { DEPARTMENTS, YEARS, departmentLabel, yearLabel } from '../../college'
import { Avatar, Badge, Card, EmptyState, Field, Modal, PageIntro, SearchInput, StatCard } from '../../components/ui'

function EditVoterModal({ voter, onSave, onClose }) {
  const [form, setForm] = useState({ department: voter.department || '', year: voter.year || '', status: voter.status })
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
  return (
    <Modal
      title={`Edit ${voter.name}`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(form)}>
            Save changes
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Department">
          {(id) => (
            <select id={id} className="input" value={form.department} onChange={set('department')}>
              <option value="">Not set</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Academic year">
          {(id) => (
            <select id={id} className="input" value={form.year} onChange={set('year')}>
              <option value="">Not set</option>
              {YEARS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Roll status" hint="Only verified students can vote.">
          {(id) => (
            <select id={id} className="input" value={form.status} onChange={set('status')}>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
            </select>
          )}
        </Field>
      </div>
    </Modal>
  )
}

export function VoterManagementPage() {
  const { voters, admin } = useApp()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState('')
  const [editing, setEditing] = useState(null)

  const students = voters.filter((voter) => voter.role !== 'admin')
  const term = query.trim().toLowerCase()
  const list = students.filter((voter) => {
    if (department && voter.department !== department) return false
    if (year && Number(voter.year) !== Number(year)) return false
    return !term || voter.name.toLowerCase().includes(term) || voter.voterId.toLowerCase().includes(term)
  })

  return (
    <div className="page-stack">
      <PageIntro>
        <p>Department, year and roll status decide which elections a student can vote in.</p>
      </PageIntro>

      <div className="stat-grid">
        <StatCard tone="blue" icon={<UsersRound size={20} />} label="Registered students" value={students.length} />
        <StatCard tone="green" icon={<CheckCircle2 size={20} />} label="Verified" value={students.filter((v) => v.status === 'Verified').length} tone="success" />
        <StatCard tone="violet" icon={<Clock3 size={20} />} label="Pending" value={students.filter((v) => v.status !== 'Verified').length} tone="warning" />
        <StatCard tone="teal" icon={<Vote size={20} />} label="Have voted" value={students.filter((v) => v.hasVoted).length} hint="In at least one election" />
      </div>

      <div className="toolbar">
        <div className="toolbar-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or register number" />
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
        </div>
        <p className="muted small">{list.length} students</p>
      </div>

      <Card flush>
        {list.length === 0 ? (
          <EmptyState title="No students found" copy="Try another department, year or search term." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Register No.</th>
                  <th scope="col">Department</th>
                  <th scope="col">Year</th>
                  <th scope="col">Roll status</th>
                  <th scope="col">Participation</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((voter) => (
                  <tr key={voter.voterId}>
                    <td data-label="Student">
                      <span className="cell-person">
                        <Avatar name={voter.name} size="sm" />
                        <span>
                          <strong>{voter.name}</strong>
                          <small className="cell-sub">{voter.email || 'No email'}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Register No." className="mono">
                      {voter.voterId}
                    </td>
                    <td data-label="Department">{departmentLabel(voter.department) || <span className="muted">Not set</span>}</td>
                    <td data-label="Year">{yearLabel(voter.year) || <span className="muted">Not set</span>}</td>
                    <td data-label="Roll status">
                      <Badge tone={voter.status === 'Verified' ? 'success' : 'warning'}>{voter.status}</Badge>
                    </td>
                    <td data-label="Participation">
                      {voter.hasVoted ? <Badge tone="info">Voted</Badge> : <span className="muted">Not yet</span>}
                    </td>
                    <td className="actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(voter)} aria-label={`Edit ${voter.name}`}>
                        <Pencil size={15} aria-hidden="true" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <EditVoterModal
          voter={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            admin.updateVoter(editing.voterId, patch)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
