// Public landing page: what is open now, the student services, the voter
// roll lookup, notices and the ledger status.

import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  LogIn,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  Vote,
} from 'lucide-react'
import { useApp } from '../context'
import { DEPARTMENTS, departmentLabel, yearLabel } from '../college'
import { searchVoters } from '../db'
import { formatDate } from '../elections'
import { Badge, Card, EmptyState, StatusBadge } from '../components/ui'
import { LedgerCard, NoticesCard } from './Dashboard'

export function serviceTiles(t, { navigate, goToVote }) {
  return [
    { icon: <UserPlus size={20} />, title: t.svcRegister, sub: t.svcRegisterSub, go: () => navigate('register') },
    { icon: <LogIn size={20} />, title: t.svcLogin, sub: t.svcLoginSub, go: () => navigate('login') },
    { icon: <UsersRound size={20} />, title: t.svcCandidates, sub: t.svcCandidatesSub, go: () => navigate('candidates') },
    { icon: <Vote size={20} />, title: t.svcCastVote, sub: t.svcCastVoteSub, go: goToVote },
    { icon: <BarChart3 size={20} />, title: t.svcResults, sub: t.svcResultsSub, go: () => navigate('results') },
  ]
}

export function HomePage() {
  const { t, navigate, goToVote, voter, elections, electionState } = useApp()
  const services = serviceTiles(t, { navigate, goToVote })
  const live = elections
    .filter((election) => ['open', 'upcoming'].includes(electionState(election).status))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 4)

  return (
    <div className="site-stack">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">College Election Portal</p>
          <h1>{t.heroTitle}</h1>
          <p className="hero-lead">
            Vote in student council, department and year-wise elections from any device. Every ballot is sealed on a
            tamper-evident ledger the moment you cast it.
          </p>
          <div className="hero-actions">
            {voter ? (
              <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('dashboard')}>
                {t.goToDashboard} <ArrowRight size={17} aria-hidden="true" />
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('login')}>
                  <LogIn size={17} aria-hidden="true" /> Sign in to vote
                </button>
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('register')}>
                  <UserPlus size={17} aria-hidden="true" /> Register
                </button>
              </>
            )}
          </div>
          <p className="hero-note">
            <ShieldCheck size={15} aria-hidden="true" /> {t.heroTagline}
          </p>
        </div>

        <Card
          title="Voting now & upcoming"
          icon={<CalendarDays size={18} />}
          className="hero-panel"
          action={
            <button type="button" className="link-btn" onClick={() => navigate('elections')}>
              All elections <ArrowRight size={14} aria-hidden="true" />
            </button>
          }
        >
          {live.length === 0 ? (
            <EmptyState compact title="No elections scheduled" copy="Upcoming elections will be listed here." />
          ) : (
            <ul className="choice-list">
              {live.map((election) => (
                <li key={election.id}>
                  <div>
                    <strong>{election.title}</strong>
                    <small>
                      {formatDate(election.startsAt)} – {formatDate(election.endsAt)}
                    </small>
                  </div>
                  <StatusBadge status={electionState(election).status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="site-section" aria-labelledby="services-title">
        <div className="section-head">
          <h2 id="services-title">{t.servicesHeading}</h2>
          <p>{t.servicesSubheading}</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <button key={service.title} type="button" className="service-tile" onClick={service.go}>
              <span className="service-icon" aria-hidden="true">
                {service.icon}
              </span>
              <strong>{service.title}</strong>
              <small>{service.sub}</small>
            </button>
          ))}
        </div>
      </section>

      <CheckDetails />

      <section className="site-section grid-2">
        <NoticesCard />
        <LedgerCard />
      </section>

      <section className="site-section">
        <Card className="about-strip">
          <div>
            <h2>{t.aboutProjectTitle}</h2>
            <p className="muted">{t.aboutProjectCopy}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('about')}>
            {t.learnMore} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </Card>
      </section>
    </div>
  )
}

export function CheckDetails({ standalone }) {
  const { t } = useApp()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [matches, setMatches] = useState(null)

  const runSearch = (event) => {
    event.preventDefault()
    if (!query.trim() && !department) {
      setMatches([])
      return
    }
    setMatches(searchVoters(query, department))
  }

  return (
    <section className={standalone ? 'page-stack' : 'site-section'}>
      <Card title={standalone ? t.checkPageTitle : t.checkHeading} subtitle={standalone ? t.checkPageSubtitle : t.checkSubheading} icon={<Search size={18} />}>
        <form className="check-form" onSubmit={runSearch}>
          <label className="field grow">
            <span className="field-label">
              Register number or name
            </span>
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.checkPlaceholder} />
          </label>
          <label className="field">
            <span className="field-label">Department</span>
            <select className="input" value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="">All departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.short}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            <Search size={16} aria-hidden="true" /> {t.search}
          </button>
        </form>

        {matches !== null &&
          (matches.length === 0 ? (
            <p className="inline-note" role="status">
              <AlertCircle size={16} aria-hidden="true" /> {query.trim() || department ? t.checkNoResults : t.checkNoQuery}
            </p>
          ) : (
            <>
              <p className="muted small" role="status">
                {matches.length} {t.checkFound}
              </p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">{t.colName}</th>
                      <th scope="col">Register No.</th>
                      <th scope="col">Department</th>
                      <th scope="col">Year</th>
                      <th scope="col">{t.colBallot}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((record) => (
                      <tr key={record.voterId}>
                        <td data-label={t.colName}>{record.name}</td>
                        <td data-label="Register No." className="mono">
                          {record.voterId}
                        </td>
                        <td data-label="Department">{departmentLabel(record.department) || '—'}</td>
                        <td data-label="Year">{yearLabel(record.year) || '—'}</td>
                        <td data-label={t.colBallot}>
                          {record.hasVoted ? <Badge tone="success">{t.statusVoted}</Badge> : <Badge tone="neutral">{t.statusNotVoted}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ))}
      </Card>
    </section>
  )
}
