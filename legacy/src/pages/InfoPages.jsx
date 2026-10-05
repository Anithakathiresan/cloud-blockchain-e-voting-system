// Information pages reached from the header, the side navigation and the
// home page: about, services, contact and election information.

import { useState } from 'react'
import {
  ArrowRight,
  Blocks,
  Clock3,
  Database,
  Fingerprint,
  Gavel,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../context'
import { compactHash } from '../chain'
import { formatNumber, formatPeriod, scopeLabel } from '../elections'
import { Card, EmptyState, Field, KeyValue, StatusBadge } from '../components/ui'
import { serviceTiles } from './HomePage'

export function AboutPage() {
  const { t, chain, ledger } = useApp()
  const points = [
    { icon: <Database size={20} />, title: t.aboutPoint1Title, copy: t.aboutPoint1Copy },
    { icon: <Blocks size={20} />, title: t.aboutPoint2Title, copy: t.aboutPoint2Copy },
    { icon: <Fingerprint size={20} />, title: t.aboutPoint3Title, copy: t.aboutPoint3Copy },
    { icon: <ShieldCheck size={20} />, title: t.aboutPoint4Title, copy: t.aboutPoint4Copy },
  ]

  return (
    <div className="page-stack">
      <div className="section-head">
        <h1>{t.aboutTitle}</h1>
        <p>{t.aboutSubtitle}</p>
      </div>
      <Card>
        <p className="prose">{t.aboutLead}</p>
      </Card>
      <div className="card-grid card-grid-2">
        {points.map((point) => (
          <Card key={point.title} className="info-card">
            <span className="service-icon" aria-hidden="true">
              {point.icon}
            </span>
            <h2 className="card-title">{point.title}</h2>
            <p className="muted">{point.copy}</p>
          </Card>
        ))}
      </div>
      <Card title={t.ledgerStatus} subtitle={ledger.status === 'valid' ? t.ledgerVerifiedOk : t.ledgerChecking} icon={<Blocks size={18} />}>
        <ol className="chain-strip">
          {chain.slice(-6).map((block) => (
            <li key={block.hash} className="chain-block">
              <strong>#{block.index}</strong>
              <span className="mono">{compactHash(block.hash)}</span>
              <small>{block.type === 'genesis' ? 'Genesis' : 'Ballot'}</small>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}

function serviceCopy(t, title) {
  if (title === t.svcRegister) return t.registerSubtitle
  if (title === t.svcLogin) return t.loginSubtitle
  if (title === t.svcCandidates) return t.meetCandidatesSubtitle
  if (title === t.svcCastVote) return t.castVoteSubtitle
  return t.resultsSubtitle
}

export function ServicesPage() {
  const { t, navigate, goToVote, voter } = useApp()
  const services = [
    ...serviceTiles(t, { navigate, goToVote }).map((service) => ({ ...service, copy: serviceCopy(t, service.title) })),
    {
      icon: <Fingerprint size={20} />,
      title: t.acknowledgement,
      sub: t.yourRecord,
      copy: t.receiptSubtitle,
      go: () => navigate(voter ? 'receipts' : 'login'),
    },
  ]

  return (
    <div className="page-stack">
      <div className="section-head">
        <h1>{t.servicesHeading}</h1>
        <p>{t.servicesSubheading}</p>
      </div>
      <div className="card-grid card-grid-3">
        {services.map((service) => (
          <button key={service.title} type="button" className="service-card" onClick={service.go}>
            <span className="service-icon" aria-hidden="true">
              {service.icon}
            </span>
            <strong>{service.title}</strong>
            <p className="muted">{service.copy}</p>
            <span className="service-go">
              Open <ArrowRight size={14} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ContactPage() {
  const { t, showToast } = useApp()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!form.message.trim()) next.message = 'Enter your message.'
    setErrors(next)
    if (Object.keys(next).length) return
    showToast(t.messageSent)
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="page-stack">
      <div className="section-head">
        <h1>{t.contactTitle}</h1>
        <p>{t.contactSubtitle}</p>
      </div>
      <div className="grid-2">
        <Card title="Election helpdesk">
          <KeyValue
            columns={1}
            items={[
              { icon: <Phone size={15} />, label: t.contactHelpline, value: '+91 98765 43210' },
              { icon: <Mail size={15} />, label: t.contactEmail, value: 'support@e-vote.in' },
              { icon: <MapPin size={15} />, label: t.contactAddress, value: t.contactAddressValue },
              { icon: <Clock3 size={15} />, label: t.contactHours, value: t.contactHoursValue },
            ]}
          />
        </Card>
        <Card title={t.contactFormTitle}>
          <form className="form-stack" onSubmit={submit} noValidate>
            <Field label={t.yourName} required error={errors.name}>
              {(id) => <input id={id} className="input" value={form.name} onChange={update('name')} autoComplete="name" />}
            </Field>
            <Field label={t.yourEmail} required error={errors.email}>
              {(id) => <input id={id} className="input" type="email" value={form.email} onChange={update('email')} autoComplete="email" />}
            </Field>
            <Field label={t.yourMessage} required error={errors.message}>
              {(id) => <textarea id={id} className="input" rows={4} value={form.message} onChange={update('message')} />}
            </Field>
            <button className="btn btn-primary btn-block" type="submit">
              <Send size={16} aria-hidden="true" /> {t.sendMessage}
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export function ElectionInfoPage() {
  const { t, navigate, elections, electionState, tallies } = useApp()
  const published = elections.filter((election) => election.published)
  const current = published.filter((election) => electionState(election).status !== 'closed')
  const past = published.filter((election) => electionState(election).status === 'closed')

  const table = (list) => (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t.colElection}</th>
            <th scope="col">Scope</th>
            <th scope="col">Voting period</th>
            <th scope="col" className="num">
              Votes
            </th>
            <th scope="col">{t.colOutcome}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((election) => (
            <tr key={election.id}>
              <td data-label={t.colElection}>
                <button type="button" className="link-btn" onClick={() => navigate('election', election.id)}>
                  {election.title}
                </button>
              </td>
              <td data-label="Scope">{scopeLabel(election)}</td>
              <td data-label="Voting period">{formatPeriod(election)}</td>
              <td data-label="Votes" className="num">
                {formatNumber(tallies[election.id].votesCast)}
              </td>
              <td data-label={t.colOutcome}>
                <StatusBadge status={electionState(election).status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="page-stack">
      <div className="section-head">
        <h1>{t.electionInfoTitle}</h1>
        <p>{t.electionInfoSubtitle}</p>
      </div>
      <Card title={t.currentElectionHeading} flush>
        {current.length ? table(current) : <EmptyState compact title="No current elections" />}
      </Card>
      <Card title={t.pastElectionsHeading} flush>
        {past.length ? table(past) : <EmptyState compact title="No past elections yet" />}
      </Card>
      <div className="card-grid card-grid-3">
        <Card className="info-card">
          <span className="service-icon" aria-hidden="true">
            <ScrollText size={20} />
          </span>
          <h2 className="card-title">{t.termHousesHeading}</h2>
          <p className="muted">{t.termHousesCopy}</p>
        </Card>
        <Card className="info-card">
          <span className="service-icon" aria-hidden="true">
            <Gavel size={20} />
          </span>
          <h2 className="card-title">{t.modelCodeHeading}</h2>
          <p className="muted">{t.modelCodeCopy}</p>
        </Card>
        <Card className="info-card">
          <span className="service-icon" aria-hidden="true">
            <Database size={20} />
          </span>
          <h2 className="card-title">{t.electoralRollHeading}</h2>
          <p className="muted">{t.electoralRollCopy}</p>
          <button type="button" className="link-btn strong" onClick={() => navigate('check')}>
            {t.dsSearchRoll} <ArrowRight size={14} aria-hidden="true" />
          </button>
        </Card>
      </div>
    </div>
  )
}
