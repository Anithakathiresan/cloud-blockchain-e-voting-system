// The ballot: 1 select → 2 review → 3 confirm (dialog) → 4 receipt.
// Selections adapt to the election's method: one radio per position, a
// capped set of checkboxes, or an ordered ranking.

import { useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Loader2,
  Lock,
  LockKeyhole,
  Plus,
  Receipt,
  UsersRound,
  X,
} from 'lucide-react'
import { useApp } from '../context'
import { academicLine } from '../college'
import { compactHash } from '../chain'
import { METHOD_META, eligibilityLabel, formatDate, formatDateTime, validateSelections } from '../elections'
import { Alert, Avatar, Badge, Card, EmptyState, ErrorState, Modal, Stepper } from '../components/ui'

function ballotSteps(t) {
  return [t.uiStepSelect, t.uiStepReview, t.uiStepConfirm, t.uiStepReceipt]
}

// ---------------------------------------------------------- chooser ---

function BallotChooser() {
  const { elections, electionState, navigate } = useApp()
  const mine = elections.filter((election) => electionState(election).eligible)
  const open = mine.filter((election) => electionState(election).status === 'open')
  const toVote = open.filter((election) => !electionState(election).voted)
  const done = open.filter((election) => electionState(election).voted)
  const upcoming = mine.filter((election) => electionState(election).status === 'upcoming')

  return (
    <div className="page-stack narrow">
      <Card title="Choose a ballot" subtitle="Elections open for you right now">
        {toVote.length === 0 ? (
          <EmptyState
            title={done.length ? 'You have voted in every open election' : 'No active elections'}
            copy={done.length ? 'Your receipts are saved in My Receipts.' : 'There are currently no elections available for you.'}
          >
            <button type="button" className="btn btn-secondary" onClick={() => navigate('elections')}>
              View Upcoming Elections
            </button>
          </EmptyState>
        ) : (
          <ul className="choice-list">
            {toVote.map((election) => (
              <li key={election.id}>
                <div>
                  <strong>{election.title}</strong>
                  <small>
                    {election.positions.map((position) => position.title).join(', ')} · {METHOD_META[election.method].label} · closes{' '}
                    {formatDate(election.endsAt)}
                  </small>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('vote', election.id)}>
                  Start ballot <ArrowRight size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card title="Already voted">
          <ul className="choice-list">
            {done.map((election) => (
              <li key={election.id}>
                <div>
                  <strong>{election.title}</strong>
                  <small>
                    <CheckCircle2 size={13} aria-hidden="true" /> Vote recorded
                  </small>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('receipt', election.id)}>
                  View receipt
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card title="Opening soon">
          <ul className="choice-list">
            {upcoming.map((election) => (
              <li key={election.id}>
                <div>
                  <strong>{election.title}</strong>
                  <small>
                    <Clock3 size={13} aria-hidden="true" /> Opens {formatDateTime(election.startsAt)}
                  </small>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
                  Details
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

// ------------------------------------------------------- selections ---

function SingleChoice({ position, field, picks, onChange }) {
  return (
    <div className="ballot-options" role="radiogroup" aria-label={position.title}>
      {field.map((entry) => {
        const checked = picks[0] === entry.id
        return (
          <label key={entry.id} className={`ballot-option ${checked ? 'selected' : ''}`}>
            <input
              type="radio"
              name={`pos-${position.id}`}
              value={entry.id}
              checked={checked}
              onChange={() => onChange([entry.id])}
            />
            <span className="ballot-control" aria-hidden="true" />
            <Avatar name={entry.name} photo={entry.photo} size="md" />
            <span className="ballot-text">
              <strong>{entry.name}</strong>
              <small>{academicLine(entry.department, entry.year)}</small>
            </span>
          </label>
        )
      })}
    </div>
  )
}

function MultipleChoice({ position, field, picks, onChange }) {
  const max = position.seats || 1
  const toggle = (candidateId) =>
    onChange(picks.includes(candidateId) ? picks.filter((idValue) => idValue !== candidateId) : [...picks, candidateId])
  return (
    <>
      <p className="ballot-counter" aria-live="polite">
        {picks.length} of {max} selected
      </p>
      <div className="ballot-options" role="group" aria-label={position.title}>
        {field.map((entry) => {
          const checked = picks.includes(entry.id)
          const disabled = !checked && picks.length >= max
          return (
            <label key={entry.id} className={`ballot-option ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(entry.id)} />
              <span className="ballot-control square" aria-hidden="true" />
              <Avatar name={entry.name} photo={entry.photo} size="md" />
              <span className="ballot-text">
                <strong>{entry.name}</strong>
                <small>{academicLine(entry.department, entry.year)}</small>
              </span>
            </label>
          )
        })}
      </div>
    </>
  )
}

function RankedChoice({ position, field, picks, onChange }) {
  const byId = Object.fromEntries(field.map((entry) => [entry.id, entry]))
  const unranked = field.filter((entry) => !picks.includes(entry.id))
  const move = (index, delta) => {
    const next = [...picks]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }
  return (
    <div className="ranked">
      <div>
        <p className="list-caption">Your ranking</p>
        {picks.length === 0 ? (
          <p className="ranked-empty">Add candidates in your order of preference. Your first choice is rank 1.</p>
        ) : (
          <ol className="ranked-list" aria-label={`${position.title} ranking`}>
            {picks.map((candidateId, index) => {
              const entry = byId[candidateId]
              if (!entry) return null
              return (
                <li key={candidateId} className="ranked-item">
                  <span className="rank-badge" aria-hidden="true">
                    {index + 1}
                  </span>
                  <Avatar name={entry.name} photo={entry.photo} size="sm" />
                  <span className="ballot-text">
                    <strong>{entry.name}</strong>
                    <small>
                      Preference {index + 1} · {academicLine(entry.department, entry.year)}
                    </small>
                  </span>
                  <span className="ranked-actions">
                    <button type="button" className="icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${entry.name} up`}>
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => move(index, 1)}
                      disabled={index === picks.length - 1}
                      aria-label={`Move ${entry.name} down`}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onChange(picks.filter((idValue) => idValue !== candidateId))}
                      aria-label={`Remove ${entry.name} from ranking`}
                    >
                      <X size={16} />
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
      {unranked.length > 0 && (
        <div>
          <p className="list-caption">Not ranked</p>
          <ul className="ranked-pool">
            {unranked.map((entry) => (
              <li key={entry.id} className="ranked-item">
                <Avatar name={entry.name} photo={entry.photo} size="sm" />
                <span className="ballot-text">
                  <strong>{entry.name}</strong>
                  <small>{academicLine(entry.department, entry.year)}</small>
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([...picks, entry.id])}>
                  <Plus size={15} aria-hidden="true" /> Rank #{picks.length + 1}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------- ballot ---

function Gate({ icon, title, copy, children }) {
  return (
    <div className="page-stack narrow">
      <Card>
        <EmptyState icon={icon} title={title} copy={copy}>
          {children}
        </EmptyState>
      </Card>
    </div>
  )
}

export function VotePage({ id }) {
  const { t, elections, electionState, candidates, navigate, voter, castBallot, ballotDrafts, setBallotDraft } = useApp()
  const [step, setStep] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!id) return <BallotChooser />

  const election = elections.find((entry) => entry.id === id)
  if (!election || !election.published) {
    return (
      <ErrorState title="Ballot not found" copy="We couldn't find this election. Please choose a ballot again.">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('vote')}>
          <ArrowLeft size={16} aria-hidden="true" /> Choose a ballot
        </button>
      </ErrorState>
    )
  }

  const state = electionState(election)
  if (state.voted) {
    return (
      <Gate icon={<CheckCircle2 size={22} />} title={t.alreadyVotedTitle} copy={`Your ballot for ${election.title} is sealed on the ledger. Thank you for voting.`}>
        <button type="button" className="btn btn-primary" onClick={() => navigate('receipt', election.id)}>
          <Receipt size={16} aria-hidden="true" /> {t.viewReceipt}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('vote')}>
          Other ballots
        </button>
      </Gate>
    )
  }
  if (!state.eligible) {
    return (
      <Gate icon={<LockKeyhole size={22} />} title="You are not eligible for this ballot" copy={`Voting is limited to ${eligibilityLabel(election).toLowerCase()}.`}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('vote')}>
          Choose another ballot
        </button>
      </Gate>
    )
  }
  if (state.status === 'upcoming') {
    return (
      <Gate icon={<CalendarClock size={22} />} title="Voting has not opened yet" copy={`Voting for ${election.title} opens on ${formatDateTime(election.startsAt)}.`}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('election', election.id)}>
          View election
        </button>
      </Gate>
    )
  }
  if (state.status === 'closed') {
    return (
      <Gate icon={<Clock3 size={22} />} title="Voting has closed" copy={`Voting for ${election.title} closed on ${formatDateTime(election.closedAt || election.endsAt)}.`}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('results', election.id)}>
          <BarChart3 size={16} aria-hidden="true" /> View results
        </button>
      </Gate>
    )
  }

  const field = candidates.filter((entry) => entry.electionId === election.id && entry.status === 'verified')
  const selections = ballotDrafts[election.id] || {}
  const update = (positionId, picks) => setBallotDraft(election.id, { ...selections, [positionId]: picks })
  const problem = validateSelections(election, field, selections)
  const nameOf = (candidateId) => field.find((entry) => entry.id === candidateId)?.name || 'Unknown'

  const singleName =
    election.positions.length === 1 && election.method === 'single' ? nameOf(selections[election.positions[0].id]?.[0]) : null

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await castBallot(election, selections)
      setConfirming(false)
      navigate('confirmation', election.id)
    } catch (err) {
      setError(err.message || 'We couldn’t record your ballot. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack ballot-page">
      <Card className="ballot-head">
        <div className="ballot-head-row">
          <div>
            <p className="eyebrow">{METHOD_META[election.method].label}</p>
            <h2 className="ballot-title">{election.title}</h2>
            <p className="muted small">
              {voter.name} · Voting closes {formatDateTime(election.endsAt)}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('election', election.id)}>
            <UsersRound size={15} aria-hidden="true" /> Candidate profiles
          </button>
        </div>
        <Stepper steps={ballotSteps(t)} current={confirming ? 2 : step} />
      </Card>

      <Alert tone="warning" icon={<Lock size={18} />}>
        {t.uiConfidential}
      </Alert>

      {step === 0 && (
        <>
          {election.positions.map((position, index) => {
            const list = field.filter((entry) => entry.positionId === position.id)
            const picks = selections[position.id] || []
            return (
              <Card
                key={position.id}
                title={election.positions.length > 1 ? `${index + 1}. ${position.title}` : position.title}
                subtitle={
                  election.method === 'multiple'
                    ? `Choose up to ${position.seats}`
                    : election.method === 'ranked'
                      ? 'Rank one or more candidates in order of preference'
                      : 'Choose one candidate'
                }
              >
                {list.length === 0 ? (
                  <EmptyState compact title="No verified candidates" copy="This position has no candidates on the ballot." />
                ) : election.method === 'multiple' ? (
                  <MultipleChoice position={position} field={list} picks={picks} onChange={(next) => update(position.id, next)} />
                ) : election.method === 'ranked' ? (
                  <RankedChoice position={position} field={list} picks={picks} onChange={(next) => update(position.id, next)} />
                ) : (
                  <SingleChoice position={position} field={list} picks={picks} onChange={(next) => update(position.id, next)} />
                )}
              </Card>
            )
          })}
          <div className="ballot-actions">
            <p className="muted small" aria-live="polite">
              {problem || 'Your selection is complete.'}
            </p>
            <button type="button" className="btn btn-primary btn-lg" disabled={Boolean(problem)} onClick={() => setStep(1)}>
              {t.uiContinue} <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <Card title={t.uiStepReview} subtitle="Check every position before you confirm.">
          <ul className="review-selection">
            {election.positions.map((position) => {
              const picks = selections[position.id] || []
              return (
                <li key={position.id}>
                  <span className="review-position">{position.title}</span>
                  <span className="review-label">{t.uiYouSelected}:</span>
                  {election.method === 'ranked' ? (
                    <ol className="review-picks">
                      {picks.map((candidateId) => (
                        <li key={candidateId}>{nameOf(candidateId)}</li>
                      ))}
                    </ol>
                  ) : (
                    <ul className="review-picks plain">
                      {picks.map((candidateId) => (
                        <li key={candidateId}>
                          <strong>{nameOf(candidateId)}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="ballot-actions">
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setStep(0)}>
              <ArrowLeft size={17} aria-hidden="true" /> {t.uiChangeSelection}
            </button>
            <button type="button" className="btn btn-vote btn-lg" onClick={() => setConfirming(true)}>
              <LockKeyhole size={17} aria-hidden="true" /> {t.uiConfirmVote}
            </button>
          </div>
        </Card>
      )}

      {confirming && (
        <Modal
          title={t.uiConfirmVote}
          size="sm"
          busy={busy}
          onClose={() => !busy && setConfirming(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>
                {t.uiCancel}
              </button>
              <button type="button" className="btn btn-vote" onClick={submit} disabled={busy}>
                {busy ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
                {busy ? t.uiSealing : t.uiConfirmVote}
              </button>
            </>
          }
        >
          {error && (
            <Alert tone="error" title="Your vote was not submitted">
              {error}
            </Alert>
          )}
          <p className="confirm-lead">
            {singleName
              ? t.uiConfirmVoteCopy.replace('{name}', singleName)
              : `You are about to submit your ballot for ${election.title}.`}
          </p>
          {!singleName && (
            <ul className="confirm-picks">
              {election.positions.map((position) => (
                <li key={position.id}>
                  <span>{position.title}</span>
                  <strong>{(selections[position.id] || []).map(nameOf).join(election.method === 'ranked' ? ' → ' : ', ')}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="confirm-warning">
            <LockKeyhole size={15} aria-hidden="true" /> {t.uiCannotChange}
          </p>
        </Modal>
      )}
    </div>
  )
}

// --------------------------------------------------------- receipt step ---

export function ConfirmationPage({ id }) {
  const { t, elections, receipts, receiptsReady, ledger, navigate, electionState } = useApp()
  const election = elections.find((entry) => entry.id === id)
  const receipt = receipts[id]

  if (!election) {
    return (
      <ErrorState title="Election not found" copy="We couldn't find this election.">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('dashboard')}>
          {t.goToDashboard}
        </button>
      </ErrorState>
    )
  }

  return (
    <div className="page-stack narrow">
      <Card className="ballot-head">
        <Stepper steps={ballotSteps(t)} current={receipt ? 4 : 3} />
      </Card>
      <Card className="success-card">
        <span className="success-icon" aria-hidden="true">
          <CheckCircle2 size={40} />
        </span>
        <h2>{t.uiVoteRecorded}</h2>
        <p className="muted">Thank you for voting in {election.title}. Your choice stays confidential.</p>

        {!receipt && !receiptsReady ? (
          <p className="muted">
            <Loader2 size={15} className="spin" aria-hidden="true" /> Loading your receipt…
          </p>
        ) : receipt ? (
          <dl className="receipt-summary">
            <div>
              <dt>Receipt ID</dt>
              <dd className="mono">{compactHash(receipt.hash)}</dd>
            </div>
            <div>
              <dt>Block</dt>
              <dd className="mono">#{receipt.index}</dd>
            </div>
            <div>
              <dt>Recorded at</dt>
              <dd>{formatDateTime(receipt.timestamp)}</dd>
            </div>
            <div>
              <dt>Ledger</dt>
              <dd>
                {ledger.status === 'valid' ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Checking</Badge>}
              </dd>
            </div>
          </dl>
        ) : (
          <Alert tone="warning">We couldn’t find a receipt for this election yet. Check My Receipts in a moment.</Alert>
        )}

        <div className="success-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('receipt', election.id)}>
            <Receipt size={16} aria-hidden="true" /> View full receipt
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('dashboard')}>
            <LayoutDashboard size={16} aria-hidden="true" /> {t.goToDashboard}
          </button>
          {electionState(election).resultsVisible && (
            <button type="button" className="btn btn-ghost" onClick={() => navigate('results', election.id)}>
              <BarChart3 size={16} aria-hidden="true" /> {t.viewResultsBtn}
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}
