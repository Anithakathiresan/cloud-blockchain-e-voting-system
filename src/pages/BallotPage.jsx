// Quick ballot, opened from a "Voting Open" row on the home page. One canvas:
// pick a candidate, press Cast vote, and the button folds into a ring while the
// ballot is sealed with the same castBallot the full ballot uses; the sheet then
// drops into the box, a success badge shows, and the page returns home.

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BarChart3, CalendarDays, CheckCircle2, LockKeyhole, LogIn, Receipt, Vote } from 'lucide-react'
import { useApp } from '../context'
import { METHOD_META, eligibilityLabel, formatDate, formatDateTime, validateSelections } from '../elections'
import { Card, EmptyState, ErrorState, StatusBadge } from '../components/ui'
import { MultipleChoice, RankedChoice, SingleChoice } from './VotePage'

// Long enough for the button to finish folding before the drop starts.
const SEAL_MIN_MS = 900
// The drop and badge, then a beat to read it before going home.
const DONE_HOLD_MS = 2000

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function BallotPage({ id }) {
  const { t, elections, electionState, candidates, navigate, voter, isAdmin, castBallot, ballotDrafts, setBallotDraft, signIn } = useApp()
  // idle → sealing (ring spinner) → done (drop + badge) → home
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const alive = useRef(true)
  const homeTimer = useRef(null)

  useEffect(
    () => () => {
      alive.current = false
      clearTimeout(homeTimer.current)
    },
    [],
  )

  const election = elections.find((entry) => entry.id === id)
  if (!election || !election.published) {
    return (
      <ErrorState title="Ballot not found" copy="We couldn't find this election.">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('home')}>
          <ArrowLeft size={16} aria-hidden="true" /> {t.navHome}
        </button>
      </ErrorState>
    )
  }

  const state = electionState(election)
  const field = candidates.filter((entry) => entry.electionId === election.id && entry.status === 'verified')
  const selections = ballotDrafts[election.id] || {}
  const update = (positionId, picks) => setBallotDraft(election.id, { ...selections, [positionId]: picks })
  const problem = validateSelections(election, field, selections)
  const finished = phase === 'done'

  // Why this student can't vote here, if they can't. Checked in the same order
  // as castBallot, so the canvas never offers a button that would only fail.
  let blocked = null
  if (phase !== 'idle') blocked = null
  else if (isAdmin) blocked = { title: 'Election officers cannot vote', copy: 'Sign in as a student to cast a ballot.' }
  else if (voter && state.voted) blocked = { voted: true, title: t.alreadyVotedTitle, copy: `Your ballot for ${election.title} is sealed on the ledger.` }
  else if (state.status === 'upcoming') blocked = { title: 'Voting has not opened yet', copy: `Voting opens on ${formatDateTime(election.startsAt)}.` }
  else if (state.status === 'closed') blocked = { closed: true, title: 'Voting has closed', copy: `Voting closed on ${formatDateTime(election.closedAt || election.endsAt)}.` }
  else if (voter && !state.eligible) blocked = { title: 'You are not eligible for this ballot', copy: `Voting is limited to ${eligibilityLabel(election).toLowerCase()}.` }

  const submit = async () => {
    if (!voter) {
      signIn()
      return
    }
    if (phase !== 'idle' || problem) return
    setError('')
    setPhase('sealing')
    try {
      await Promise.all([castBallot(election, selections), wait(SEAL_MIN_MS)])
      if (!alive.current) return
      setPhase('done')
      homeTimer.current = setTimeout(() => navigate('home'), DONE_HOLD_MS)
    } catch (err) {
      if (!alive.current) return
      setError(err.message || 'We couldn’t record your ballot. Please try again.')
      setPhase('idle')
    }
  }

  const status = error || (!voter ? 'Sign in with your register number to cast this ballot.' : problem || 'Your selection is complete.')

  return (
    <div className="page-stack quick-ballot">
      <Card className="qb-head">
        <span className="qb-mark" aria-hidden="true">
          <Vote size={22} />
        </span>
        <div className="qb-head-text">
          <p className="eyebrow">{t.siteBrand}</p>
          <h2 className="qb-title">{election.title}</h2>
          <small>
            <CalendarDays size={14} aria-hidden="true" /> {formatDate(election.startsAt)} – {formatDate(election.endsAt)}
            <span aria-hidden="true"> · </span>
            {METHOD_META[election.method].label}
          </small>
        </div>
        <StatusBadge status={state.status} />
      </Card>

      {blocked ? (
        <Card>
          <EmptyState icon={blocked.voted ? <CheckCircle2 size={22} /> : <LockKeyhole size={22} />} title={blocked.title} copy={blocked.copy}>
            {blocked.voted && (
              <button type="button" className="btn btn-primary" onClick={() => navigate('receipt', election.id)}>
                <Receipt size={16} aria-hidden="true" /> {t.viewReceipt}
              </button>
            )}
            {blocked.closed && (
              <button type="button" className="btn btn-primary" onClick={() => navigate('results', election.id)}>
                <BarChart3 size={16} aria-hidden="true" /> View results
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => navigate('home')}>
              <ArrowLeft size={16} aria-hidden="true" /> {t.navHome}
            </button>
          </EmptyState>
        </Card>
      ) : (
        <section className={`qb-canvas is-${phase}`} aria-label={`${election.title} ballot`} aria-busy={phase === 'sealing'}>
          <div className="qb-sheet" inert={phase !== 'idle' ? true : undefined}>
            {election.positions.map((position, index) => {
              const list = field.filter((entry) => entry.positionId === position.id)
              const picks = selections[position.id] || []
              return (
                <fieldset key={position.id} className="qb-position">
                  <legend>
                    <span>{election.positions.length > 1 ? `${index + 1}. ${position.title}` : position.title}</span>
                    <small>
                      {election.method === 'multiple'
                        ? `Choose up to ${position.seats}`
                        : election.method === 'ranked'
                          ? 'Rank in order of preference'
                          : 'Choose one candidate'}
                    </small>
                  </legend>
                  {list.length === 0 ? (
                    <EmptyState compact title="No verified candidates" copy="This position has no candidates on the ballot." />
                  ) : election.method === 'multiple' ? (
                    <MultipleChoice position={position} field={list} picks={picks} onChange={(next) => update(position.id, next)} />
                  ) : election.method === 'ranked' ? (
                    <RankedChoice position={position} field={list} picks={picks} onChange={(next) => update(position.id, next)} />
                  ) : (
                    <SingleChoice position={position} field={list} picks={picks} onChange={(next) => update(position.id, next)} />
                  )}
                </fieldset>
              )
            })}
          </div>

          {/* Drawn over the sheet, so the drop never moves the page. */}
          <div className="qb-drop" aria-hidden={!finished}>
            <span className="qb-box" aria-hidden="true">
              <span className="qb-slip" />
              <span className="qb-box-front">
                <Vote size={22} />
              </span>
            </span>
            <p className="qb-success" role="status">
              {finished && (
                <>
                  <CheckCircle2 size={17} aria-hidden="true" /> Vote Cast Successfully!
                </>
              )}
            </p>
            <small>Returning to the home page…</small>
          </div>

          <footer className="qb-foot">
            <p className={`qb-status ${error ? 'is-error' : ''}`} aria-live="polite">
              {finished ? 'Your ballot is sealed on the ledger.' : status}
            </p>
            <button
              type="button"
              className={`btn btn-vote btn-lg qb-submit ${phase !== 'idle' ? 'is-folded' : ''} ${finished ? 'is-done' : ''}`}
              onClick={submit}
              disabled={phase !== 'idle' || (voter && Boolean(problem))}
              aria-label={phase === 'sealing' ? t.uiSealing : undefined}
            >
              <span className="qb-submit-label">
                {voter ? <LockKeyhole size={17} aria-hidden="true" /> : <LogIn size={17} aria-hidden="true" />}
                {voter ? 'Cast vote' : 'Sign in to vote'}
              </span>
              <span className="qb-ring" aria-hidden="true" />
              <CheckCircle2 className="qb-tick" size={22} aria-hidden="true" />
            </button>
          </footer>
        </section>
      )}
    </div>
  )
}
