// Candidate management: a searchable table of every nomination with verify,
// reject and edit. Reviews lock once an election opens so the field cannot
// change mid-vote.

import { useState } from 'react'
import { Check, Eye, Lock, Pencil, Plus, X } from 'lucide-react'
import { useApp } from '../../context'
import { DEPARTMENTS, YEARS, departmentLabel, yearLabel } from '../../college'
import { newId } from '../../store'
import { Avatar, Card, ConfirmModal, EmptyState, Field, Modal, PageIntro, ReviewBadge, SearchInput, Tabs } from '../../components/ui'

export function RejectCandidateModal({ candidate, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  return (
    <ConfirmModal
      title="Reject candidate"
      confirmLabel="Reject nomination"
      tone="danger"
      icon={<X size={16} aria-hidden="true" />}
      onCancel={onCancel}
      onConfirm={() => {
        if (!reason.trim()) {
          setError('Give a reason so the candidate knows what to fix.')
          return
        }
        onConfirm(reason.trim())
      }}
    >
      <p>
        Reject the nomination of <strong>{candidate.name}</strong>? They will not appear on the ballot.
      </p>
      <Field label="Reason" required error={error}>
        {(id) => (
          <textarea
            id={id}
            className="input"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: attendance certificate missing"
          />
        )}
      </Field>
    </ConfirmModal>
  )
}

function CandidateModal({ candidate, elections, electionState, onSave, onClose }) {
  const locked = candidate && ['open', 'closed'].includes(electionState(elections.find((e) => e.id === candidate.electionId)).status)
  const editable = elections.filter((election) => ['draft', 'upcoming'].includes(electionState(election).status))
  const [form, setForm] = useState(() => ({
    electionId: candidate?.electionId || editable[0]?.id || '',
    positionId: candidate?.positionId || editable[0]?.positions[0]?.id || '',
    name: candidate?.name || '',
    department: candidate?.department || '',
    year: candidate?.year || '',
    about: candidate?.about || '',
    manifesto: candidate?.manifesto || '',
    priorities: (candidate?.priorities || []).join('\n'),
  }))
  const [errors, setErrors] = useState({})
  const election = elections.find((entry) => entry.id === form.electionId)
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const submit = () => {
    const next = {}
    if (!form.electionId) next.electionId = 'Choose an election.'
    if (!form.positionId) next.positionId = 'Choose a position.'
    if (!form.name.trim()) next.name = 'Enter the candidate’s name.'
    if (!form.department) next.department = 'Select a department.'
    if (!form.year) next.year = 'Select a year.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSave({
      ...(candidate || { id: newId('cand'), status: 'pending', photo: '', baseVotes: 0, submittedAt: new Date().toISOString() }),
      electionId: form.electionId,
      positionId: form.positionId,
      name: form.name.trim(),
      department: form.department,
      year: Number(form.year),
      about: form.about.trim(),
      manifesto: form.manifesto.trim(),
      priorities: form.priorities
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    })
  }

  return (
    <Modal
      title={candidate ? 'Edit candidate' : 'Add candidate'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            {candidate ? 'Save changes' : 'Add candidate'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        {!candidate && editable.length === 0 && (
          <p className="muted">There are no draft or upcoming elections to add candidates to.</p>
        )}
        <div className="form-grid two">
          <Field label="Election" required error={errors.electionId} hint={locked ? 'Locked: voting has opened.' : null}>
            {(id) => (
              <select
                id={id}
                className="input"
                value={form.electionId}
                disabled={locked || Boolean(candidate)}
                onChange={(event) => {
                  const nextElection = elections.find((entry) => entry.id === event.target.value)
                  setForm((prev) => ({ ...prev, electionId: event.target.value, positionId: nextElection?.positions[0]?.id || '' }))
                }}
              >
                {(candidate ? elections : editable).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Position" required error={errors.positionId}>
            {(id) => (
              <select id={id} className="input" value={form.positionId} disabled={locked} onChange={set('positionId')}>
                {(election?.positions || []).map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Candidate name" required error={errors.name}>
            {(id) => <input id={id} className="input" value={form.name} onChange={set('name')} disabled={Boolean(candidate?.i18nKey)} />}
          </Field>
          <Field label="Department" required error={errors.department}>
            {(id) => (
              <select id={id} className="input" value={form.department} onChange={set('department')}>
                <option value="">Select</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.short}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Academic year" required error={errors.year}>
            {(id) => (
              <select id={id} className="input" value={form.year} onChange={set('year')}>
                <option value="">Select</option>
                {YEARS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Short profile" optional>
          {(id) => <input id={id} className="input" value={form.about} onChange={set('about')} maxLength={160} />}
        </Field>
        <Field label="Manifesto" optional>
          {(id) => <textarea id={id} className="input" rows={3} value={form.manifesto} onChange={set('manifesto')} disabled={Boolean(candidate?.i18nKey)} />}
        </Field>
        <Field label="Key priorities" optional hint="One per line.">
          {(id) => <textarea id={id} className="input" rows={3} value={form.priorities} onChange={set('priorities')} />}
        </Field>
      </div>
    </Modal>
  )
}

export function CandidateManagementPage() {
  const { candidates, elections, electionState, navigate, admin } = useApp()
  const [tab, setTab] = useState('pending')
  const [query, setQuery] = useState('')
  const [electionId, setElectionId] = useState('')
  const [department, setDepartment] = useState('')
  const [editing, setEditing] = useState(null)
  const [rejecting, setRejecting] = useState(null)

  const electionOf = (entry) => elections.find((election) => election.id === entry.electionId)
  const lockedFor = (entry) => {
    const election = electionOf(entry)
    return !election || ['open', 'closed'].includes(electionState(election).status)
  }

  const term = query.trim().toLowerCase()
  const matched = candidates.filter((entry) => {
    if (electionId && entry.electionId !== electionId) return false
    if (department && entry.department !== department) return false
    return !term || entry.name.toLowerCase().includes(term)
  })
  const count = (status) => matched.filter((entry) => entry.status === status).length
  const list = matched.filter((entry) => tab === 'all' || entry.status === tab)

  return (
    <div className="page-stack">
      <PageIntro
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={16} aria-hidden="true" /> Add candidate
          </button>
        }
      >
        <p>Verify nominations before voting opens. Only verified candidates appear on the ballot.</p>
      </PageIntro>

      <div className="toolbar">
        <Tabs
          label="Filter by review status"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'pending', label: 'Pending', count: count('pending') },
            { id: 'verified', label: 'Verified', count: count('verified') },
            { id: 'rejected', label: 'Rejected', count: count('rejected') },
            { id: 'all', label: 'All', count: matched.length },
          ]}
        />
        <div className="toolbar-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search candidates" />
          <label className="select-inline">
            <span className="sr-only">Election</span>
            <select value={electionId} onChange={(event) => setElectionId(event.target.value)}>
              <option value="">All elections</option>
              {elections.map((election) => (
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
      </div>

      <Card flush>
        {list.length === 0 ? (
          <EmptyState
            icon={<Check size={22} />}
            title={tab === 'pending' ? 'No nominations waiting' : 'No candidates found'}
            copy={tab === 'pending' ? 'Every nomination has been reviewed.' : 'Try another filter or search term.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Position</th>
                  <th scope="col">Department</th>
                  <th scope="col">Year</th>
                  <th scope="col">Election</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((entry) => {
                  const election = electionOf(entry)
                  const position = election?.positions.find((item) => item.id === entry.positionId)
                  const locked = lockedFor(entry)
                  return (
                    <tr key={entry.id}>
                      <td data-label="Candidate">
                        <span className="cell-person">
                          <Avatar name={entry.name} photo={entry.photo} size="sm" />
                          <span>
                            <strong>{entry.name}</strong>
                            {entry.status === 'rejected' && entry.rejectionReason && (
                              <small className="cell-sub">{entry.rejectionReason}</small>
                            )}
                          </span>
                        </span>
                      </td>
                      <td data-label="Position">{position?.title || '—'}</td>
                      <td data-label="Department">{departmentLabel(entry.department)}</td>
                      <td data-label="Year">{yearLabel(entry.year)}</td>
                      <td data-label="Election">{election?.title || '—'}</td>
                      <td data-label="Status">
                        <ReviewBadge status={entry.status} />
                      </td>
                      <td className="actions">
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('candidate', entry.id)} aria-label={`View ${entry.name}`}>
                            <Eye size={15} aria-hidden="true" /> View
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(entry)} aria-label={`Edit ${entry.name}`}>
                            <Pencil size={15} aria-hidden="true" /> Edit
                          </button>
                          {locked ? (
                            <span className="locked-note" title="Reviews lock once voting opens">
                              <Lock size={14} aria-hidden="true" /> Locked
                            </span>
                          ) : (
                            <>
                              {entry.status !== 'verified' && (
                                <button type="button" className="btn btn-success btn-sm" onClick={() => admin.setCandidateStatus(entry.id, 'verified')}>
                                  <Check size={15} aria-hidden="true" /> Verify
                                </button>
                              )}
                              {entry.status !== 'rejected' && (
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejecting(entry)}>
                                  <X size={15} aria-hidden="true" /> Reject
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <CandidateModal
          candidate={editing === 'new' ? null : editing}
          elections={elections}
          electionState={electionState}
          onClose={() => setEditing(null)}
          onSave={(record) => {
            admin.saveCandidate(record, editing === 'new')
            setEditing(null)
          }}
        />
      )}
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
