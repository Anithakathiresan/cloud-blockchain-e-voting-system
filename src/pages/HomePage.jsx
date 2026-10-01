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

// "Your Vote, Your Voice" -> "Your Vote," + an accented "Your Voice".
function splitTitle(title) {
  const cut = title.indexOf(',')
  if (cut === -1) return [title, '']
  return [title.slice(0, cut + 1), title.slice(cut + 1).trim()]
}

export function HomePage() {
  const { t, navigate, goToVote, voter, elections, candidates, chain, electionState } = useApp()
  const services = serviceTiles(t, { navigate, goToVote })
  const live = elections
    .filter((election) => ['open', 'upcoming'].includes(electionState(election).status))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 4)
  const ballots = chain.filter((block) => block.type !== 'genesis').length
  const [titleLead, titleAccent] = splitTitle(t.heroTitle)

  const figures = [
    { value: elections.filter((election) => election.published).length, label: t.uiElections },
    { value: candidates.length, label: t.uiCandidates },
    { value: ballots, label: t.ballotsOnLedger },
    { value: DEPARTMENTS.length, label: t.uiDepartments },
  ]

  const points = [
    { title: t.aboutPoint1Title, copy: t.aboutPoint1Copy },
    { title: t.aboutPoint2Title, copy: t.aboutPoint2Copy },
    { title: t.aboutPoint3Title, copy: t.aboutPoint3Copy },
    { title: t.aboutPoint4Title, copy: t.aboutPoint4Copy },
  ]

  return (
    <div className="site-stack home">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-pill">
            <span className="hero-pill-dot" aria-hidden="true" /> {t.heroSubtitle}
          </p>
          <h1>
            {titleLead} {titleAccent && <em>{titleAccent}</em>}
          </h1>
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

        <div className="hero-visual">
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

          <p className="hero-chip">
            <span className="hero-chip-icon accent" aria-hidden="true">
              <Vote size={16} />
            </span>
            <span>
              <strong>{ballots}</strong>
              <small>{t.ballotsOnLedger}</small>
            </span>
          </p>
        </div>
      </section>

      <section className="home-figures" aria-label={t.ledgerStatus}>
        {figures.map((figure) => (
          <div key={figure.label} className="home-figure">
            <strong>{figure.value}</strong>
            <span>{figure.label}</span>
          </div>
        ))}
      </section>

      <section className="site-section" aria-labelledby="services-title">
        <div className="section-head home-head">
          <p className="hero-pill">{t.navServicesSite}</p>
          <h2 id="services-title">{t.servicesHeading}</h2>
          <p>{t.servicesSubheading}</p>
        </div>
        <div className="service-grid bento">
          {services.map((service, index) => (
            <button key={service.title} type="button" className="service-tile" onClick={service.go}>
              {index !== 0 && (
                <span className="service-icon" aria-hidden="true">
                  {service.icon}
                </span>
              )}
              {index === 0 && (
                <span className="service-emblem" aria-hidden="true">
                  <UserPlus size={44} strokeWidth={1.75} />
                </span>
              )}
              <span className="service-go-round" aria-hidden="true">
                <ArrowRight size={16} />
              </span>
              <strong>{service.title}</strong>
              <small>{service.sub}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="site-section" aria-labelledby="why-title">
        <div className="section-head home-head">
          <p className="hero-pill">{t.navAboutSite}</p>
          <h2 id="why-title">{t.aboutTitle}</h2>
          <p>{t.aboutSubtitle}</p>
        </div>
        <ol className="home-points">
          {points.map((point, index) => (
            <li key={point.title}>
              <span className="home-point-num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <strong>{point.title}</strong>
              <p>{point.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <CheckDetails />

      <section className="site-section grid-2">
        <NoticesCard />
        <LedgerCard />
      </section>

      <section className="site-section">
        <div className="home-cta">
          <div>
            <h2>{t.aboutProjectTitle}</h2>
            <p>{t.aboutProjectCopy}</p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('about')}>
            {t.learnMore} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
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
