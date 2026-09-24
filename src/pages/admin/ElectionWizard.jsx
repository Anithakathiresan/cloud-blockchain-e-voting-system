// Guided election creation: eight short steps instead of one long form.
// Fields appear only when the chosen scope, method or mode needs them.

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Info, Pencil, Plus, Rocket, Save, Trash2, Users } from 'lucide-react'
import { useApp } from '../../context'
import { DEPARTMENTS, YEARS, academicLine } from '../../college'
import { newId } from '../../store'
import {
  METHOD_META,
  MODE_META,
  SCOPE_META,
  committeeVoterIds,
  eligibilityLabel,
  electionStatus,
  formatDateTime,
  registeredEligibleCount,
  scopeLabel,
} from '../../elections'
import { Alert, Avatar, Card, ConfirmModal, EmptyState, Field, ReviewBadge, Stepper } from '../../components/ui'
import { RestrictedPage } from '../SystemPages'

const STEPS = [
  'Election Details',
  'Election Scope',
  'Voting Method',
  'Positions',
  'Eligibility',
  'Candidates',
  'Schedule',
  'Review & Publish',
]

const CATEGORIES = ['Student Council', 'Department Committee', 'Year Representative', 'Committee', 'Club']

function localInput(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function at(days, hour) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function blankElection() {
  return {
    id: newId('election'),
    title: '',
    category: 'Student Council',
    description: '',
    session: '2026–27',
    scope: 'college',
    departmentId: '',
    year: '',
    method: 'single',
    mode: 'direct',
    positions: [{ id: newId('pos'), title: '', seats: 1 }],
    eligibility: { departments: [], years: [] },
    electorate: null,
    baseTurnout: 0,
    startsAt: at(1, 9),
    endsAt: at(2, 17),
    resultsVisibility: 'live',
    published: false,
    closedAt: null,
    createdAt: new Date().toISOString(),
  }
}

function blankCandidate(positionId) {
  return { name: '', department: '', year: '', about: '', manifesto: '', priorities: '', verified: false, positionId }
}

function validate(step, draft, field) {
  const errors = {}
  if (step === 0) {
    if (draft.title.trim().length < 3) errors.title = 'Enter an election name of at least 3 characters.'
  }
  if (step === 1) {
    if (draft.scope !== 'college' && !draft.departmentId) errors.departmentId = 'Select the department.'
    if (draft.scope === 'year' && !draft.year) errors.year = 'Select the academic year.'
  }
  if (step === 3) {
    if (!draft.positions.length) errors.positions = 'Add at least one position.'
    const titles = draft.positions.map((position) => position.title.trim().toLowerCase())
    draft.positions.forEach((position, index) => {
      if (!position.title.trim()) errors[`position-${index}`] = 'Enter the position title.'
      else if (titles.indexOf(position.title.trim().toLowerCase()) !== index) errors[`position-${index}`] = 'Each position needs a different title.'
      const seats = Number(position.seats)
      if (draft.method === 'multiple' && (!Number.isInteger(seats) || seats < 1 || seats > 10)) {
        errors[`seats-${index}`] = 'Seats must be a whole number from 1 to 10.'
      }
    })
  }
  if (step === 4) {
    if (draft.electorate !== null && draft.electorate !== '' && (!Number.isInteger(Number(draft.electorate)) || Number(draft.electorate) < 1)) {
      errors.electorate = 'Enter a whole number, or leave it blank.'
    }
  }
  if (step === 5) {
    draft.positions.forEach((position, index) => {
      if (!field.some((entry) => entry.positionId === position.id)) errors[`cands-${index}`] = `Add at least one candidate for ${position.title || 'this position'}.`
    })
  }
  if (step === 6) {
    if (!draft.startsAt) errors.startsAt = 'Choose when voting opens.'
    if (!draft.endsAt) errors.endsAt = 'Choose when voting closes.'
    if (draft.startsAt && draft.endsAt && Date.parse(draft.endsAt) <= Date.parse(draft.startsAt)) {
      errors.endsAt = 'Voting must close after it opens.'
    }
    if (draft.endsAt && Date.parse(draft.endsAt) <= Date.now()) errors.endsAt = 'Voting must close in the future.'
  }
  return errors
}

function OptionCard({ name, value, checked, onChange, title, hint }) {
  return (
    <label className={`option-card ${checked ? 'selected' : ''}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <span className="ballot-control" aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
    </label>
  )
}

function CheckGroup({ legend, hint, options, values, onChange }) {
  const toggle = (value) => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  return (
    <fieldset className="check-group">
      <legend>{legend}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      <div className="check-grid">
        {options.map((option) => (
          <label key={option.value} className="check">
            <input type="checkbox" checked={values.includes(option.value)} onChange={() => toggle(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function CandidateForm({ positionId, onAdd, onCancel }) {
  const [form, setForm] = useState(blankCandidate(positionId))
  const [errors, setErrors] = useState({})
  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const submit = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'Enter the candidate’s name.'
    if (!form.department) next.department = 'Select a department.'
    if (!form.year) next.year = 'Select a year.'
    setErrors(next)
    if (Object.keys(next).length) return
    onAdd({
      id: newId('cand'),
      positionId,
      name: form.name.trim(),
      department: form.department,
      year: Number(form.year),
      about: form.about.trim(),
      manifesto: form.manifesto.trim(),
      priorities: form.priorities
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      photo: '',
      status: form.verified ? 'verified' : 'pending',
      submittedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="inline-form">
      <div className="form-grid">
        <Field label="Candidate name" required error={errors.name}>
          {(id) => <input id={id} className="input" value={form.name} onChange={set('name')} />}
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
        {(id) => <textarea id={id} className="input" rows={2} value={form.manifesto} onChange={set('manifesto')} />}
      </Field>
      <Field label="Key priorities" optional hint="One per line.">
        {(id) => <textarea id={id} className="input" rows={3} value={form.priorities} onChange={set('priorities')} />}
      </Field>
      <label className="check">
        <input type="checkbox" checked={form.verified} onChange={set('verified')} />
        <span>Nomination documents checked — mark as verified now</span>
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={submit}>
          <Plus size={16} aria-hidden="true" /> Add candidate
        </button>
      </div>
    </div>
  )
}

function ReviewSection({ title, step, onEdit, children }) {
  return (
    <section className="review-section">
      <header>
        <h3>{title}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(step)}>
          <Pencil size={14} aria-hidden="true" /> Edit
        </button>
      </header>
      {children}
    </section>
  )
}

export function ElectionWizardPage({ id }) {
  const { registry, candidates: resolved, voters, committee, navigate, admin } = useApp()
  const existing = id ? registry.elections.find((entry) => entry.id === id) : null

  const [draft, setDraft] = useState(() =>
    existing ? { ...existing, positions: existing.positions.map((position) => ({ ...position })) } : blankElection(),
  )
  const [field, setField] = useState(() => (existing ? registry.candidates.filter((entry) => entry.electionId === existing.id) : []))
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [adding, setAdding] = useState(null)
  const [publishing, setPublishing] = useState(false)

  const repCount = useMemo(() => committeeVoterIds(committee).size, [committee])
  const matching = registeredEligibleCount(draft, voters, committee)

  if (id && !existing) {
    return <RestrictedPage reason="This election no longer exists." />
  }
  if (existing) {
    const status = electionStatus(existing)
    if (status === 'open' || status === 'closed') {
      return <RestrictedPage reason="Elections cannot be edited once voting has opened. You can still close an open election." />
    }
  }

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }))
  const displayName = (entry) => entry.name || resolved.find((item) => item.id === entry.id)?.name || 'Candidate'

  const next = () => {
    const found = validate(step, draft, field)
    setErrors(found)
    if (Object.keys(found).length) return
    setStep((value) => Math.min(value + 1, STEPS.length - 1))
    window.scrollTo({ top: 0 })
  }
  const back = () => {
    setErrors({})
    setStep((value) => Math.max(value - 1, 0))
  }
  const jump = (index) => {
    setErrors({})
    setStep(index)
  }

  // Normalise before saving: seats only matter for multiple choice, and
  // scope pins the eligibility lists.
  const finalElection = (publish) => {
    const positions = draft.positions.map((position) => ({
      ...position,
      title: position.title.trim(),
      seats: draft.method === 'multiple' ? Number(position.seats) || 1 : 1,
    }))
    const eligibility =
      draft.scope === 'year'
        ? { departments: [draft.departmentId], years: [Number(draft.year)] }
        : draft.scope === 'department'
          ? { departments: [draft.departmentId], years: draft.eligibility.years }
          : draft.eligibility
    return {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      departmentId: draft.scope === 'college' ? '' : draft.departmentId,
      year: draft.scope === 'year' ? Number(draft.year) : '',
      positions,
      eligibility,
      electorate: draft.electorate ? Number(draft.electorate) : null,
      published: publish || draft.published,
    }
  }

  const save = (publish) => {
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const found = validate(index, draft, field)
      if (Object.keys(found).length) {
        setErrors(found)
        setStep(index)
        return
      }
    }
    const positionIds = new Set(draft.positions.map((position) => position.id))
    admin.saveElection(
      finalElection(publish),
      field.filter((entry) => positionIds.has(entry.positionId)),
      { publish, isNew: !existing },
    )
    navigate('manage-elections')
  }

  const missingVerified = draft.positions.filter(
    (position) => !field.some((entry) => entry.positionId === position.id && entry.status === 'verified'),
  )

  const stepBody = [
    // 1. Details
    <div className="form-stack" key="details">
      <Field label="Election name" required error={errors.title} hint="For example: Student Council Election 2026">
        {(fieldId) => (
          <input id={fieldId} className="input" value={draft.title} onChange={(event) => update({ title: event.target.value })} maxLength={90} />
        )}
      </Field>
      <div className="form-grid two">
        <Field label="Election type">
          {(fieldId) => (
            <select id={fieldId} className="input" value={draft.category} onChange={(event) => update({ category: event.target.value })}>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Academic session">
          {(fieldId) => (
            <input id={fieldId} className="input" value={draft.session} onChange={(event) => update({ session: event.target.value })} />
          )}
        </Field>
      </div>
      <Field label="Description" optional>
        {(fieldId) => (
          <textarea
            id={fieldId}
            className="input"
            rows={3}
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
          />
        )}
      </Field>
    </div>,

    // 2. Scope
    <div className="form-stack" key="scope">
      <div className="option-grid" role="radiogroup" aria-label="Election scope">
        {Object.entries(SCOPE_META).map(([value, meta]) => (
          <OptionCard
            key={value}
            name="scope"
            value={value}
            checked={draft.scope === value}
            onChange={(scope) => update({ scope })}
            title={meta.label}
            hint={meta.hint}
          />
        ))}
      </div>
      {draft.scope !== 'college' && (
        <div className="form-grid two">
          <Field label="Department" required error={errors.departmentId}>
            {(fieldId) => (
              <select id={fieldId} className="input" value={draft.departmentId} onChange={(event) => update({ departmentId: event.target.value })}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {draft.scope === 'year' && (
            <Field label="Academic year" required error={errors.year}>
              {(fieldId) => (
                <select id={fieldId} className="input" value={draft.year} onChange={(event) => update({ year: event.target.value })}>
                  <option value="">Select year</option>
                  {YEARS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
        </div>
      )}
    </div>,

    // 3. Method
    <div className="form-stack" key="method">
      <fieldset className="check-group">
        <legend>Ballot type</legend>
        <div className="option-grid" role="radiogroup" aria-label="Ballot type">
          {Object.entries(METHOD_META).map(([value, meta]) => (
            <OptionCard
              key={value}
              name="method"
              value={value}
              checked={draft.method === value}
              onChange={(method) => update({ method })}
              title={meta.label}
              hint={meta.hint}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="check-group">
        <legend>Election mode</legend>
        <div className="option-grid two" role="radiogroup" aria-label="Election mode">
          {Object.entries(MODE_META).map(([value, meta]) => (
            <OptionCard
              key={value}
              name="mode"
              value={value}
              checked={draft.mode === value}
              onChange={(mode) => update({ mode })}
              title={meta.label}
              hint={meta.hint}
            />
          ))}
        </div>
      </fieldset>
    </div>,

    // 4. Positions
    <div className="form-stack" key="positions">
      {draft.method === 'ranked' && (
        <Alert tone="info">Ranked choice elects one winner per position by instant runoff.</Alert>
      )}
      {errors.positions && <Alert tone="error">{errors.positions}</Alert>}
      <ol className="position-editor">
        {draft.positions.map((position, index) => (
          <li key={position.id}>
            <span className="position-number" aria-hidden="true">
              {index + 1}
            </span>
            <div className={`form-grid ${draft.method === 'multiple' ? 'position-with-seats' : 'one'}`}>
              <Field label={`Position ${index + 1} title`} required error={errors[`position-${index}`]}>
                {(fieldId) => (
                  <input
                    id={fieldId}
                    className="input"
                    value={position.title}
                    placeholder="For example: President"
                    onChange={(event) =>
                      update({
                        positions: draft.positions.map((item) => (item.id === position.id ? { ...item, title: event.target.value } : item)),
                      })
                    }
                  />
                )}
              </Field>
              {draft.method === 'multiple' && (
                <Field label="Seats" required error={errors[`seats-${index}`]} hint="Voters choose up to this many.">
                  {(fieldId) => (
                    <input
                      id={fieldId}
                      className="input"
                      type="number"
                      min={1}
                      max={10}
                      value={position.seats}
                      onChange={(event) =>
                        update({
                          positions: draft.positions.map((item) => (item.id === position.id ? { ...item, seats: event.target.value } : item)),
                        })
                      }
                    />
                  )}
                </Field>
              )}
            </div>
            <button
              type="button"
              className="icon-btn danger"
              disabled={draft.positions.length === 1}
              onClick={() => {
                update({ positions: draft.positions.filter((item) => item.id !== position.id) })
                setField((prev) => prev.filter((entry) => entry.positionId !== position.id))
              }}
              aria-label={`Remove position ${index + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ol>
      <div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => update({ positions: [...draft.positions, { id: newId('pos'), title: '', seats: 1 }] })}
        >
          <Plus size={16} aria-hidden="true" /> Add position
        </button>
      </div>
    </div>,

    // 5. Eligibility
    <div className="form-stack" key="eligibility">
      {draft.mode === 'representative' ? (
        <Alert tone="info" icon={<Users size={18} />} title="Representative election">
          Only committee representatives vote: {repCount} registered representatives are currently on the committee. Manage
          them under Committees.
        </Alert>
      ) : draft.scope === 'year' ? (
        <Alert tone="info" title="Eligibility is set by the scope">
          {academicLine(draft.departmentId, draft.year)} students can vote in this election.
        </Alert>
      ) : (
        <>
          {draft.scope === 'college' && (
            <CheckGroup
              legend="Departments"
              hint="Leave all unchecked to include every department."
              options={DEPARTMENTS.map((dept) => ({ value: dept.id, label: dept.short }))}
              values={draft.eligibility.departments}
              onChange={(departments) => update({ eligibility: { ...draft.eligibility, departments } })}
            />
          )}
          <CheckGroup
            legend="Academic years"
            hint="Leave all unchecked to include every year."
            options={YEARS.map((entry) => ({ value: entry.id, label: entry.label }))}
            values={draft.eligibility.years}
            onChange={(years) => update({ eligibility: { ...draft.eligibility, years } })}
          />
        </>
      )}
      <Field
        label="Official electorate"
        optional
        error={errors.electorate}
        hint={`Used for turnout. Leave blank to use the ${matching} registered students who match these rules.`}
      >
        {(fieldId) => (
          <input
            id={fieldId}
            className="input narrow-input"
            type="number"
            min={1}
            value={draft.electorate ?? ''}
            onChange={(event) => update({ electorate: event.target.value === '' ? null : event.target.value })}
          />
        )}
      </Field>
      <p className="muted small">
        Eligible: <strong>{eligibilityLabel(finalElection(false))}</strong> · {matching} registered today
      </p>
    </div>,

    // 6. Candidates
    <div className="form-stack" key="candidates">
      <Alert tone="info">
        New candidates start as <strong>Pending</strong>. Only verified candidates appear on the ballot.
      </Alert>
      {draft.positions.map((position, index) => {
        const list = field.filter((entry) => entry.positionId === position.id)
        return (
          <section key={position.id} className="position-block">
            <h3 className="position-title">{position.title || `Position ${index + 1}`}</h3>
            {errors[`cands-${index}`] && <Alert tone="error">{errors[`cands-${index}`]}</Alert>}
            {list.length === 0 ? (
              <EmptyState compact title="No candidates yet" copy="Add the students standing for this position." />
            ) : (
              <ul className="review-list">
                {list.map((entry) => (
                  <li key={entry.id}>
                    <Avatar name={displayName(entry)} photo={entry.photo} size="sm" />
                    <span className="review-text">
                      <strong>{displayName(entry)}</strong>
                      <small>{academicLine(entry.department, entry.year)}</small>
                    </span>
                    <ReviewBadge status={entry.status} />
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setField((prev) => prev.filter((item) => item.id !== entry.id))}
                      aria-label={`Remove ${displayName(entry)}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {adding === position.id ? (
              <CandidateForm
                positionId={position.id}
                onCancel={() => setAdding(null)}
                onAdd={(entry) => {
                  setField((prev) => [...prev, entry])
                  setAdding(null)
                }}
              />
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(position.id)}>
                <Plus size={15} aria-hidden="true" /> Add candidate
              </button>
            )}
          </section>
        )
      })}
    </div>,

    // 7. Schedule
    <div className="form-stack" key="schedule">
      <div className="form-grid two">
        <Field label="Voting opens" required error={errors.startsAt}>
          {(fieldId) => (
            <input
              id={fieldId}
              className="input"
              type="datetime-local"
              value={localInput(draft.startsAt)}
              onChange={(event) => update({ startsAt: fromLocalInput(event.target.value) })}
            />
          )}
        </Field>
        <Field label="Voting closes" required error={errors.endsAt}>
          {(fieldId) => (
            <input
              id={fieldId}
              className="input"
              type="datetime-local"
              value={localInput(draft.endsAt)}
              onChange={(event) => update({ endsAt: fromLocalInput(event.target.value) })}
            />
          )}
        </Field>
      </div>
      <fieldset className="check-group">
        <legend>Results visibility</legend>
        <div className="option-grid two" role="radiogroup" aria-label="Results visibility">
          <OptionCard
            name="visibility"
            value="live"
            checked={draft.resultsVisibility === 'live'}
            onChange={(resultsVisibility) => update({ resultsVisibility })}
            title="Live results"
            hint="Students see the count while voting is open."
          />
          <OptionCard
            name="visibility"
            value="after_close"
            checked={draft.resultsVisibility === 'after_close'}
            onChange={(resultsVisibility) => update({ resultsVisibility })}
            title="Hidden until voting closes"
            hint="Nobody sees results until the election closes."
          />
        </div>
      </fieldset>
    </div>,

    // 8. Review
    <div className="form-stack" key="review">
      {missingVerified.length > 0 && (
        <Alert tone="warning" title="Some positions have no verified candidates">
          {missingVerified.map((position) => position.title).join(', ')} will not appear on the ballot until a candidate is
          verified in Candidate Verification.
        </Alert>
      )}
      <ReviewSection title="Election details" step={0} onEdit={jump}>
        <p>
          <strong>{draft.title}</strong> · {draft.category} · {draft.session}
        </p>
        {draft.description && <p className="muted">{draft.description}</p>}
      </ReviewSection>
      <ReviewSection title="Scope & eligibility" step={1} onEdit={jump}>
        <p>
          {scopeLabel(finalElection(false))} · {eligibilityLabel(finalElection(false))}
          {draft.electorate ? ` · electorate ${draft.electorate}` : ` · ${matching} registered`}
        </p>
      </ReviewSection>
      <ReviewSection title="Voting method" step={2} onEdit={jump}>
        <p>
          {METHOD_META[draft.method].label} · {MODE_META[draft.mode].label}
        </p>
      </ReviewSection>
      <ReviewSection title="Positions & candidates" step={3} onEdit={jump}>
        <ul className="plain-list">
          {draft.positions.map((position) => {
            const list = field.filter((entry) => entry.positionId === position.id)
            return (
              <li key={position.id}>
                <strong>{position.title}</strong>
                {draft.method === 'multiple' && ` (${position.seats} seats)`}: {list.map(displayName).join(', ') || 'no candidates'}
              </li>
            )
          })}
        </ul>
      </ReviewSection>
      <ReviewSection title="Schedule" step={6} onEdit={jump}>
        <p>
          {formatDateTime(draft.startsAt)} – {formatDateTime(draft.endsAt)} ·{' '}
          {draft.resultsVisibility === 'live' ? 'Live results' : 'Results hidden until close'}
        </p>
      </ReviewSection>
    </div>,
  ]

  return (
    <div className="page-stack wizard">
      <Card>
        <Stepper steps={STEPS} current={step} onStepClick={jump} compact />
        <p className="wizard-progress">
          Step {step + 1} of {STEPS.length}: <strong>{STEPS[step]}</strong>
        </p>
      </Card>

      <Card title={STEPS[step]} subtitle={existing ? `Editing ${existing.title}` : 'New election'}>
        {step === 2 && (
          <p className="muted small wizard-hint">
            <Info size={14} aria-hidden="true" /> The next steps adapt to the ballot type and mode you choose.
          </p>
        )}
        {stepBody[step]}
        <div className="wizard-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={step === 0 ? () => navigate('manage-elections') : back}
          >
            <ArrowLeft size={16} aria-hidden="true" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              Next: {STEPS[step + 1]} <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <div className="wizard-final">
              <button type="button" className="btn btn-secondary" onClick={() => save(false)}>
                <Save size={16} aria-hidden="true" /> {draft.published ? 'Save changes' : 'Save as draft'}
              </button>
              {!draft.published && (
                <button type="button" className="btn btn-primary" onClick={() => setPublishing(true)}>
                  <Rocket size={16} aria-hidden="true" /> Publish election
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {publishing && (
        <ConfirmModal
          title="Publish election"
          confirmLabel="Publish election"
          icon={<Rocket size={16} aria-hidden="true" />}
          onCancel={() => setPublishing(false)}
          onConfirm={() => {
            setPublishing(false)
            save(true)
          }}
        >
          <p>
            Publish <strong>{draft.title}</strong>? {eligibilityLabel(finalElection(false))} will see it, and voting opens
            on {formatDateTime(draft.startsAt)}.
          </p>
        </ConfirmModal>
      )}
    </div>
  )
}
