// Committee structure: the Student Council office bearers, department
// committee leaders, and the year representatives under each department.

import { useState } from 'react'
import { Building2, Crown, Pencil, UserRound } from 'lucide-react'
import { useApp } from '../../context'
import { DEPARTMENTS, YEARS, academicLine, departmentLabel } from '../../college'
import { Avatar, Card, Field, Modal, PageIntro, Tabs } from '../../components/ui'

function AssignModal({ slot, current, onSave, onClose }) {
  const { voters } = useApp()
  const pool = voters.filter((voter) => {
    if (voter.role === 'admin') return false
    if (slot.kind === 'department' && voter.department !== slot.department) return false
    if (slot.kind === 'department' && slot.seat !== 'leader' && Number(voter.year) !== Number(slot.seat)) return false
    return true
  })
  const [voterId, setVoterId] = useState(current?.voterId || '')
  const [name, setName] = useState(current && !current.voterId ? current.name : '')
  const [error, setError] = useState('')

  const save = () => {
    const picked = pool.find((voter) => voter.voterId === voterId)
    if (picked) {
      onSave({ name: picked.name, department: picked.department, year: picked.year, voterId: picked.voterId })
      return
    }
    if (!name.trim()) {
      setError('Choose a registered student or enter a name.')
      return
    }
    onSave({
      name: name.trim(),
      department: slot.department || '',
      year: slot.kind === 'department' && slot.seat !== 'leader' ? Number(slot.seat) : '',
      voterId: '',
    })
  }

  return (
    <Modal
      title={`Assign ${slot.label}`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          {current && (
            <button type="button" className="btn btn-ghost" onClick={() => onSave(null)}>
              Mark vacant
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Registered student" hint="Registered holders can vote in representative elections.">
          {(id) => (
            <select id={id} className="input" value={voterId} onChange={(event) => setVoterId(event.target.value)}>
              <option value="">Not on the roll — enter a name below</option>
              {pool.map((voter) => (
                <option key={voter.voterId} value={voter.voterId}>
                  {voter.name} · {academicLine(voter.department, voter.year)}
                </option>
              ))}
            </select>
          )}
        </Field>
        {!voterId && (
          <Field label="Name" error={error}>
            {(id) => <input id={id} className="input" value={name} onChange={(event) => setName(event.target.value)} />}
          </Field>
        )}
      </div>
    </Modal>
  )
}

function Seat({ title, holder, onEdit, emphasis }) {
  return (
    <div className={`seat ${emphasis ? 'seat-primary' : ''} ${holder ? '' : 'seat-vacant'}`}>
      {holder ? <Avatar name={holder.name} size="md" /> : <span className="avatar avatar-md avatar-empty" aria-hidden="true"><UserRound size={18} /></span>}
      <span className="seat-text">
        <small>{title}</small>
        <strong>{holder?.name || 'Vacant'}</strong>
        {holder && <span className="muted small">{academicLine(holder.department, holder.year)}</span>}
      </span>
      {onEdit && (
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Assign ${title}`}>
          <Pencil size={15} />
        </button>
      )}
    </div>
  )
}

export function CommitteesPage() {
  const { committee, admin, isAdmin } = useApp()
  const [tab, setTab] = useState('council')
  const [dept, setDept] = useState(DEPARTMENTS[0].id)
  const [editing, setEditing] = useState(null)

  const seatsOf = (id) => committee.departments[id] || { leader: null, years: {} }
  const edit = (slot, current) => (isAdmin ? () => setEditing({ slot, current }) : undefined)

  return (
    <div className="page-stack">
      <PageIntro>
        <p>Current office bearers and representatives. Registered holders vote in representative elections.</p>
      </PageIntro>
      <Tabs
        label="Committee view"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'council', label: 'Student Council' },
          { id: 'departments', label: 'Department Committees' },
        ]}
      />

      {tab === 'council' ? (
        <>
          <Card title="Student Council" subtitle="Office bearers, 2026–27" icon={<Crown size={18} />}>
            <ol className="org-chain">
              {committee.council.map((entry, index) => (
                <li key={entry.role}>
                  <Seat
                    title={entry.title}
                    holder={entry.holder}
                    emphasis={index === 0}
                    onEdit={edit({ kind: 'council', role: entry.role, label: entry.title }, entry.holder)}
                  />
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Department Committee Leaders" icon={<Building2 size={18} />}>
            <div className="card-grid card-grid-3">
              {DEPARTMENTS.map((entry) => (
                <div key={entry.id} className="dept-seat">
                  <p className="dept-seat-name">{entry.short}</p>
                  <Seat
                    title="Committee Leader"
                    holder={seatsOf(entry.id).leader}
                    onEdit={edit(
                      { kind: 'department', department: entry.id, seat: 'leader', label: `${entry.short} Committee Leader` },
                      seatsOf(entry.id).leader,
                    )}
                  />
                  <ul className="rep-list">
                    {[...YEARS].reverse().map((year) => (
                      <li key={year.id}>
                        <span>{year.label}</span>
                        <strong>{seatsOf(entry.id).years?.[year.id]?.name || <span className="muted">Vacant</span>}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card
          title={`${departmentLabel(dept)} Department`}
          icon={<Building2 size={18} />}
          action={
            <label className="select-inline">
              <span className="sr-only">Department</span>
              <select value={dept} onChange={(event) => setDept(event.target.value)}>
                {DEPARTMENTS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.short}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          <ul className="tree">
            {[...YEARS].reverse().map((year) => (
              <li key={year.id}>
                <span className="tree-year">{year.label}</span>
                <div className="tree-branch">
                  <Seat
                    title="Year Representative"
                    holder={seatsOf(dept).years?.[year.id]}
                    onEdit={edit(
                      { kind: 'department', department: dept, seat: year.id, label: `${departmentLabel(dept)} ${year.label} Representative` },
                      seatsOf(dept).years?.[year.id],
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="tree-leader">
            <Seat
              title="Department Committee Leader"
              holder={seatsOf(dept).leader}
              emphasis
              onEdit={edit(
                { kind: 'department', department: dept, seat: 'leader', label: `${departmentLabel(dept)} Committee Leader` },
                seatsOf(dept).leader,
              )}
            />
          </div>
        </Card>
      )}

      {editing && (
        <AssignModal
          slot={editing.slot}
          current={editing.current}
          onClose={() => setEditing(null)}
          onSave={(holder) => {
            admin.assignCommittee(editing.slot, holder)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
