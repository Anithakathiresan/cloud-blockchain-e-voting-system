// Glass "quick view" over the home page: the elections voting now or coming up,
// the ledger count and the sign-in actions. It reads the same live data as the
// hero panel, so the two never disagree.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, CalendarDays, LogIn, ShieldCheck, UserPlus, Vote, X } from 'lucide-react'
import { useApp } from '../context'
import { formatDate } from '../elections'
import { EmptyState, StatusBadge } from './ui'

const LOAD_MS = 650
const EXIT_MS = 200

export function ElectionSpotlight({ onClose }) {
  const { t, navigate, signIn, voter, elections, chain, electionState } = useApp()
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const ref = useRef(null)

  const live = elections
    .filter((election) => ['open', 'upcoming'].includes(electionState(election).status))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 4)
  const ballots = chain.filter((block) => block.type !== 'genesis').length

  const close = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onClose, EXIT_MS)
  }
  const go = (page, id) => {
    onClose()
    navigate(page, id)
  }

  // Short skeleton pass so the list settles in like a live fetch.
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), LOAD_MS)
    return () => clearTimeout(timer)
  }, [])

  // Focus in, Escape closes, Tab stays inside; the page behind stops scrolling
  // without its scrollbar vanishing and the layout jumping sideways.
  useEffect(() => {
    const previous = document.activeElement
    const node = ref.current
    const focusables = () => node.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
    node.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') close()
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const gutter = window.innerWidth - document.documentElement.clientWidth
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      if (previous && previous.focus) previous.focus()
    }
    // Only on mount: the dialog owns focus for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div
      className={`spotlight-backdrop ${leaving ? 'leaving' : ''}`}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div className="spotlight" role="dialog" aria-modal="true" aria-labelledby="spotlight-title" ref={ref} tabIndex={-1}>
        <button type="button" className="spotlight-close" onClick={close} aria-label="Close quick view">
          <X size={18} />
        </button>

        <header className="spotlight-head">
          <span className="spotlight-mark" aria-hidden="true">
            <Vote size={22} />
          </span>
          <div>
            <h2 id="spotlight-title">{t.siteBrand}</h2>
            <small>Election Portal</small>
          </div>
        </header>

        <div className="spotlight-bar">
          <p className="spotlight-tag">
            <span className="hero-pill-dot" aria-hidden="true" /> Voting now &amp; upcoming
          </p>
          <button type="button" className="link-btn" onClick={() => go('elections')}>
            All elections <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="spotlight-canvas" aria-busy={loading}>
          {loading ? (
            <ul className="spotlight-list" aria-hidden="true">
              {Array.from({ length: Math.max(live.length, 1) }, (_, index) => (
                <li key={index} className="spotlight-row is-skeleton">
                  <span className="spotlight-row-icon skeleton" />
                  <span className="spotlight-row-text">
                    <span className="skeleton" style={{ width: `${78 - index * 9}%` }} />
                    <span className="skeleton short" />
                  </span>
                  <span className="skeleton pill" />
                </li>
              ))}
            </ul>
          ) : live.length === 0 ? (
            <EmptyState compact title="No elections scheduled" copy="Upcoming elections will be listed here." />
          ) : (
            <ul className="spotlight-list">
              {live.map((election, index) => (
                <li
                  key={election.id}
                  className={`spotlight-row ${electionState(election).status === 'open' ? 'row-link' : ''}`}
                  style={{ '--i': index }}
                >
                  {electionState(election).status === 'open' && (
                    <button
                      type="button"
                      className="row-hit"
                      onClick={() => go('ballot', election.id)}
                      aria-label={`Vote in ${election.title}`}
                    />
                  )}
                  <span className="spotlight-row-icon" aria-hidden="true">
                    <CalendarDays size={16} />
                  </span>
                  <span className="spotlight-row-text">
                    <strong>{election.title}</strong>
                    <small>
                      {formatDate(election.startsAt)} – {formatDate(election.endsAt)}
                    </small>
                  </span>
                  <StatusBadge status={electionState(election).status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="spotlight-ledger">
          <span className="hero-chip-icon accent" aria-hidden="true">
            <Vote size={16} />
          </span>
          <span>
            <strong>{ballots}</strong> {t.ballotsOnLedger}
          </span>
          <small>
            <ShieldCheck size={14} aria-hidden="true" /> {t.heroTagline}
          </small>
        </div>

        <footer className="spotlight-foot">
          {voter ? (
            <button type="button" className="btn btn-primary" onClick={() => go('dashboard')}>
              {t.goToDashboard} <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => go('register')}>
                <UserPlus size={16} aria-hidden="true" /> Register
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose()
                  signIn()
                }}
              >
                <LogIn size={16} aria-hidden="true" /> Sign in to vote
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  )
}
